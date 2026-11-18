// MAATJE - the little window finder.
// Maatje can stand on your windows. For that he has to know where the windows on your screen are, and this
// small program tells him: it prints a line with the position and size of every real window, in the order
// they are stacked (the one on top comes first), and prints a new line whenever something changes.
// It only looks at WHERE the windows are. It never reads what is in them: not the title, not the content.
// (It does check that a window has a title, and it prints the name of the program that owns the window,
// for example "chrome", so you can tell Maatje "perch chrome".)
//
// vensters.exe <process number of Maatje> [how many milliseconds between two looks]
// It stops by itself when Maatje is gone.
// Built with the C# compiler that comes with Windows (see vensters.js). Plain C# 5 on purpose.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

static class Vensters
{
    [StructLayout(LayoutKind.Sequential)]
    struct RECT { public int L, T, R, B; }
    delegate bool Terug(IntPtr h, IntPtr l);

    [DllImport("user32.dll")] static extern bool EnumWindows(Terug f, IntPtr l);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] static extern int GetWindowTextLengthW(IntPtr h);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassNameW(IntPtr h, StringBuilder s, int n);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtrW")] static extern IntPtr GetWindowLongPtr(IntPtr h, int i);
    [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr c);
    [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr h, int a, out RECT r, int size);
    [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr h, int a, out int v, int size);

    const int GWL_EXSTYLE = -20;
    const long WS_EX_TRANSPARENT = 0x20, WS_EX_TOOLWINDOW = 0x80, WS_EX_APPWINDOW = 0x40000, WS_EX_NOACTIVATE = 0x08000000;
    static readonly string[] SKIP = { "Progman", "WorkerW", "Shell_TrayWnd", "Shell_SecondaryTrayWnd", "Windows.UI.Core.CoreWindow", "NotifyIconOverflowWindow", "TopLevelWindowForOverflowXamlIsland" };

    static Dictionary<uint, string> namen = new Dictionary<uint, string>();
    static DateTime namenSchoon = DateTime.UtcNow;

    static string Programma(uint pid)
    {
        string n;
        if (namen.TryGetValue(pid, out n)) return n;
        try { n = Process.GetProcessById((int)pid).ProcessName; } catch { n = "?"; }
        StringBuilder s = new StringBuilder();
        foreach (char c in n) if (char.IsLetterOrDigit(c) || c == '.' || c == '-' || c == '_') s.Append(c);
        n = s.Length > 0 ? s.ToString().ToLowerInvariant() : "?";
        namen[pid] = n;
        return n;
    }

    // one look: a line of JSON with every window, topmost first
    static string Kijk()
    {
        StringBuilder uit = new StringBuilder("[");
        bool eerste = true;
        IntPtr voorgrond = GetForegroundWindow();                                                // the window you are working in ("a":1 in the list)
        EnumWindows(delegate (IntPtr h, IntPtr l)
        {
            if (!IsWindowVisible(h) || IsIconic(h)) return true;
            long ex = GetWindowLongPtr(h, GWL_EXSTYLE).ToInt64();
            if ((ex & WS_EX_TRANSPARENT) != 0 || (ex & WS_EX_NOACTIVATE) != 0) return true;      // click-through overlays and popups that never take focus
            if ((ex & WS_EX_TOOLWINDOW) != 0 && (ex & WS_EX_APPWINDOW) == 0) return true;
            if (GetWindowTextLengthW(h) == 0) return true;
            int weg;
            if (DwmGetWindowAttribute(h, 14, out weg, 4) == 0 && weg != 0) return true;           // cloaked: a window that is there but hidden (other virtual desktop, ...)
            StringBuilder k = new StringBuilder(80);
            GetClassNameW(h, k, 80);
            string klasse = k.ToString();
            foreach (string s in SKIP) if (klasse == s) return true;
            RECT r;
            if (DwmGetWindowAttribute(h, 9, out r, 16) != 0 && !GetWindowRect(h, out r)) return true;      // the frame you really see, without the invisible edge
            int b = r.R - r.L, hg = r.B - r.T;
            if (b < 100 || hg < 60) return true;
            uint pid;
            GetWindowThreadProcessId(h, out pid);
            if (!eerste) uit.Append(',');
            eerste = false;
            uit.Append("{\"i\":").Append(h.ToInt64()).Append(",\"x\":").Append(r.L).Append(",\"y\":").Append(r.T)
               .Append(",\"w\":").Append(b).Append(",\"h\":").Append(hg).Append(",\"p\":\"").Append(Programma(pid)).Append("\"").Append(h == voorgrond ? ",\"a\":1" : "").Append("}");
            return true;
        }, IntPtr.Zero);
        return uit.Append(']').ToString();
    }

    static bool OuderWeg(int pid)
    {
        try { return Process.GetProcessById(pid).HasExited; } catch { return true; }
    }

    static int Main(string[] args)
    {
        int ouder = args.Length > 0 ? int.Parse(args[0]) : 0, ms = args.Length > 1 ? int.Parse(args[1]) : 80;
        try { if (!SetProcessDpiAwarenessContext(new IntPtr(-4))) SetProcessDPIAware(); } catch { try { SetProcessDPIAware(); } catch { } }      // real pixels, not scaled ones
        TextWriter uit = new StreamWriter(Console.OpenStandardOutput(), new UTF8Encoding(false));
        string vorige = null;
        int ronde = 0;
        while (true)
        {
            string nu = Kijk();
            if (nu != vorige) { uit.Write(nu + "\n"); uit.Flush(); vorige = nu; }
            Thread.Sleep(ms);
            if (++ronde % 25 == 0)
            {
                if (ouder != 0 && OuderWeg(ouder)) return 0;
                if ((DateTime.UtcNow - namenSchoon).TotalSeconds > 20) { namen.Clear(); namenSchoon = DateTime.UtcNow; vorige = null; }      // program names are looked up again now and then
            }
        }
    }
}
