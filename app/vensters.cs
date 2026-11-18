// MAATJE - the little window finder.
// Maatje can stand on your windows. For that he has to know where the windows on your screen are, and this
// small program tells him: it prints a line with the position and size of every real window, in the order
// they are stacked (the one on top comes first), and prints a new line whenever something changes.
// It only looks at WHERE the windows are. It never reads what is in them: not the title, not the content.
// (It does check that a window has a title, and it prints the name of the program that owns the window,
// for example "chrome", so you can tell Maatje "perch chrome".)
//
// With --elementen (only when you switched "Stand on things in web pages" on) it also looks INSIDE web browsers
// (Chrome, Edge, Firefox ...) with the accessibility of Windows (UI Automation): which boxes, buttons, links and
// pictures are on the page, and where. Only the kind (box, button, link, picture ...) and the place of each one.
// It never reads the text, the name or the address of anything, and it asks for nothing else.
//
// vensters.exe <process number of Maatje> [how many milliseconds between two looks] [--elementen]
// It stops by itself when Maatje is gone.
// Built with the C# compiler that comes with Windows (see vensters.js). Plain C# 5 on purpose.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
#if UIA
using System.Windows.Automation;
#endif

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
    static readonly string[] BROWSERS = { "chrome", "msedge", "firefox", "brave", "opera", "vivaldi", "chromium" };

    static Dictionary<uint, string> namen = new Dictionary<uint, string>();
    static DateTime namenSchoon = DateTime.UtcNow;

    // the web pages: which browser windows there are (set by the window loop), and what is in them (set by the page loop)
    static bool elementenAan = false;
    static int alleenPid = 0;                                                                    // (test only) look inside the windows of this one program only
    static object slot = new object();
    static List<long> browserVensters = new List<long>();
    static List<int[]> browserRects = new List<int[]>();
    static Dictionary<long, string> elementen = new Dictionary<long, string>();

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
        List<long> bv = new List<long>();
        List<int[]> br = new List<int[]>();
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
            string prog = Programma(pid);
            if (!eerste) uit.Append(',');
            eerste = false;
            uit.Append("{\"i\":").Append(h.ToInt64()).Append(",\"x\":").Append(r.L).Append(",\"y\":").Append(r.T)
               .Append(",\"w\":").Append(b).Append(",\"h\":").Append(hg).Append(",\"p\":\"").Append(prog).Append("\"").Append(h == voorgrond ? ",\"a\":1" : "");
            if (elementenAan && Array.IndexOf(BROWSERS, prog) >= 0 && (alleenPid == 0 || pid == (uint)alleenPid))
            {
                if (bv.Count < 3) { bv.Add(h.ToInt64()); br.Add(new int[] { r.L, r.T, r.R, r.B }); }      // the page loop looks inside the three topmost browser windows
                string e;
                lock (slot) { elementen.TryGetValue(h.ToInt64(), out e); }
                if (e != null) uit.Append(",\"e\":").Append(e);
            }
            uit.Append("}");
            return true;
        }, IntPtr.Zero);
        lock (slot) { browserVensters = bv; browserRects = br; }
        return uit.Append(']').ToString();
    }

#if UIA
    // what is on the page of this browser window: [[x,y,w,h,kind,id], ...]  kind: 1 box, 2 button, 3 link, 4 picture, 5 choice list, 6 checkbox/radio
    static string Scan(long hwnd, int[] venster)
    {
        AutomationElement root = AutomationElement.FromHandle(new IntPtr(hwnd));
        Condition soorten = new OrCondition(
            new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Edit),
            new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Button),
            new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Hyperlink),
            new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Image),
            new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.ComboBox),
            new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.CheckBox),
            new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.RadioButton));
        CacheRequest cr = new CacheRequest();                                                      // only the place and the kind: never the name, the text or the address
        cr.Add(AutomationElement.BoundingRectangleProperty);
        cr.Add(AutomationElement.ControlTypeProperty);
        AutomationElementCollection col;
        using (cr.Activate())
        {
            col = root.FindAll(TreeScope.Descendants, new AndCondition(soorten, new PropertyCondition(AutomationElement.IsOffscreenProperty, false)));
        }
        List<int[]> lijst = new List<int[]>();
        int bw = venster[2] - venster[0], bh = venster[3] - venster[1];
        foreach (AutomationElement el in col)
        {
            System.Windows.Rect r = el.Cached.BoundingRectangle;
            if (double.IsInfinity(r.X) || double.IsInfinity(r.Y) || r.Width < 50 || r.Height < 16) continue;
            int x = (int)r.X, y = (int)r.Y, w = (int)r.Width, h = (int)r.Height;
            int cx = x + w / 2, cy = y + h / 2;
            if (cx < venster[0] || cx > venster[2] || cy < venster[1] || cy > venster[3]) continue;
            if (w > bw * 0.92 && h > bh * 0.5) continue;
            ControlType ct = el.Cached.ControlType;
            int soort = ct == ControlType.Edit ? 1 : ct == ControlType.Button ? 2 : ct == ControlType.Hyperlink ? 3 : ct == ControlType.Image ? 4 : ct == ControlType.ComboBox ? 5 : 6;
            lijst.Add(new int[] { x, y, w, h, soort });
        }
        lijst.Sort(delegate (int[] a, int[] b) { return a[1] != b[1] ? a[1].CompareTo(b[1]) : a[0].CompareTo(b[0]); });
        List<int[]> goed = new List<int[]>();
        foreach (int[] c in lijst)                                                                  // one platform per spot: a link and its picture are the same place
        {
            bool dubbel = false;
            foreach (int[] g in goed)
            {
                if (Math.Abs(g[1] - c[1]) > 3) continue;
                int over = Math.Min(g[0] + g[2], c[0] + c[2]) - Math.Max(g[0], c[0]);
                if (over >= 0.6 * Math.Min(g[2], c[2])) { dubbel = true; break; }
            }
            if (!dubbel) goed.Add(c);
            if (goed.Count >= 80) break;
        }
        Dictionary<string, int> teller = new Dictionary<string, int>();
        StringBuilder uit = new StringBuilder("[");
        for (int i = 0; i < goed.Count; i++)
        {
            int[] c = goed[i];
            string sleutel = c[4] + ":" + (c[2] / 4) + ":" + (c[3] / 4);                            // the same element keeps the same number while the page scrolls
            int nr;
            teller.TryGetValue(sleutel, out nr);
            teller[sleutel] = nr + 1;
            long hash = 5381;
            foreach (char ch in sleutel + "#" + nr) hash = ((hash << 5) + hash + ch) & 0x7fffffff;
            if (i > 0) uit.Append(',');
            uit.Append('[').Append(c[0]).Append(',').Append(c[1]).Append(',').Append(c[2]).Append(',').Append(c[3]).Append(',').Append(c[4]).Append(',').Append(hash % 1000000).Append(']');
        }
        return uit.Append(']').ToString();
    }
#endif

    // the page loop: looks inside the browser windows now and then (slower when a page is heavy)
    static void PaginaLus()
    {
        while (true)
        {
            List<long> doel; List<int[]> rects;
            lock (slot) { doel = new List<long>(browserVensters); rects = new List<int[]>(browserRects); }
            int begin = Environment.TickCount;
            for (int i = 0; i < doel.Count; i++)
            {
                string j = null;
#if UIA
                try { j = Scan(doel[i], rects[i]); } catch { j = null; }
#endif
                lock (slot) { if (j != null) elementen[doel[i]] = j; else elementen.Remove(doel[i]); }
            }
            lock (slot)
            {
                foreach (long k in new List<long>(elementen.Keys)) if (!doel.Contains(k)) elementen.Remove(k);
            }
            Thread.Sleep(Math.Max(250, (Environment.TickCount - begin) * 2));
        }
    }

    static bool OuderWeg(int pid)
    {
        try { return Process.GetProcessById(pid).HasExited; } catch { return true; }
    }

    static int Main(string[] args)
    {
        int ouder = 0, ms = 80, n = 0;
        foreach (string a in args)
        {
            if (a == "--elementen") elementenAan = true;
            else if (a.StartsWith("--alleen-pid=")) alleenPid = int.Parse(a.Substring(13));
            else if (n == 0) { ouder = int.Parse(a); n++; }
            else if (n == 1) { ms = int.Parse(a); n++; }
        }
        try { if (!SetProcessDpiAwarenessContext(new IntPtr(-4))) SetProcessDPIAware(); } catch { try { SetProcessDPIAware(); } catch { } }      // real pixels, not scaled ones
        if (elementenAan)
        {
            Thread t = new Thread(PaginaLus);
            t.IsBackground = true;
            t.Start();
        }
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
