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
// The same goes for the Claude app (it is a browser inside), where it also looks for text blocks, list rows and groups.
// A window that fills a whole screen without a title bar (a video in full screen, a game) gets "f":1 in the list, and
// nothing is looked for inside it: Maatje steps out of the way there.
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
    [StructLayout(LayoutKind.Sequential)]
    struct MONITORINFO { public int cbSize; public RECT rcMonitor; public RECT rcWork; public uint dwFlags; }
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
    [DllImport("user32.dll")] static extern IntPtr MonitorFromWindow(IntPtr h, uint flags);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern bool GetMonitorInfoW(IntPtr m, ref MONITORINFO mi);

    const int GWL_EXSTYLE = -20, GWL_STYLE = -16;
    const long WS_EX_TRANSPARENT = 0x20, WS_EX_TOOLWINDOW = 0x80, WS_EX_APPWINDOW = 0x40000, WS_EX_NOACTIVATE = 0x08000000;
    const long WS_CAPTION = 0xC00000;                                                            // the title bar (a window in full screen has none)
    static readonly string[] SKIP = { "Progman", "WorkerW", "Shell_TrayWnd", "Shell_SecondaryTrayWnd", "Windows.UI.Core.CoreWindow", "NotifyIconOverflowWindow", "TopLevelWindowForOverflowXamlIsland" };
    // the programs he may look inside (only with "elementen" on): the web browsers, and the Claude app (that is a browser too, inside)
    static readonly string[] BROWSERS = { "chrome", "msedge", "firefox", "brave", "opera", "vivaldi", "chromium", "claude" };
    static bool breedAltijd = false;                                                             // (test only) also look for text blocks and list items in every program

    static Dictionary<uint, string> namen = new Dictionary<uint, string>();
    static DateTime namenSchoon = DateTime.UtcNow;

    // the web pages: which browser windows there are (set by the window loop), and what is in them (set by the page loop)
    static bool elementenAan = false;
    static int alleenPid = 0;                                                                    // (test only) look inside the windows of this one program only
    static object slot = new object();
    static List<long> browserVensters = new List<long>();
    static List<int[]> browserRects = new List<int[]>();
    static List<bool> browserBreed = new List<bool>();                                           // per window: look for more kinds of things (text blocks, list items, groups)?
    static Dictionary<long, string> elementen = new Dictionary<long, string>();

    // does this window fill a whole screen without a title bar? (a video in full screen, a game). A maximized window has a title bar, so it never counts.
    static bool VolScherm(IntPtr h, RECT r)
    {
        long stijl = GetWindowLongPtr(h, GWL_STYLE).ToInt64();
        if ((stijl & WS_CAPTION) == WS_CAPTION) return false;
        IntPtr m = MonitorFromWindow(h, 2);                                                      // 2 = the screen it is mostly on
        MONITORINFO mi = new MONITORINFO();
        mi.cbSize = Marshal.SizeOf(typeof(MONITORINFO));
        if (m == IntPtr.Zero || !GetMonitorInfoW(m, ref mi)) return false;
        return r.L <= mi.rcMonitor.L + 2 && r.T <= mi.rcMonitor.T + 2 && r.R >= mi.rcMonitor.R - 2 && r.B >= mi.rcMonitor.B - 2;
    }

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
        List<bool> bb = new List<bool>();
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
            bool vol = VolScherm(h, r);
            if (!eerste) uit.Append(',');
            eerste = false;
            uit.Append("{\"i\":").Append(h.ToInt64()).Append(",\"x\":").Append(r.L).Append(",\"y\":").Append(r.T)
               .Append(",\"w\":").Append(b).Append(",\"h\":").Append(hg).Append(",\"p\":\"").Append(prog).Append("\"").Append(h == voorgrond ? ",\"a\":1" : "").Append(vol ? ",\"f\":1" : "");
            // never look inside a window in full screen (a video: that costs the browser work, and the controls come and go)
            if (elementenAan && !vol && (alleenPid != 0 ? pid == (uint)alleenPid : Array.IndexOf(BROWSERS, prog) >= 0))
            {
                if (bv.Count < 3) { bv.Add(h.ToInt64()); br.Add(new int[] { r.L, r.T, r.R, r.B }); bb.Add(breedAltijd || prog == "claude"); }      // the page loop looks inside the three topmost windows of these programs
                string e;
                lock (slot) { elementen.TryGetValue(h.ToInt64(), out e); }
                if (e != null) uit.Append(",\"e\":").Append(e);
            }
            uit.Append("}");
            return true;
        }, IntPtr.Zero);
        lock (slot) { browserVensters = bv; browserRects = br; browserBreed = bb; }
        return uit.Append(']').ToString();
    }

#if UIA
    // what is on the page of this browser window: [[x,y,w,h,kind,id], ...]  kind: 1 box, 2 button, 3 link, 4 picture, 5 choice list, 6 checkbox/radio
    // kind numbers: 1 box, 2 button, 3 link, 4 picture, 5 choice list, 6 checkbox/radio, and only for "breed" windows (the Claude app): 7 text block, 8 list item or tab, 9 group
    static int Soort(ControlType ct)
    {
        if (ct == ControlType.Edit) return 1;
        if (ct == ControlType.Button) return 2;
        if (ct == ControlType.Hyperlink) return 3;
        if (ct == ControlType.Image) return 4;
        if (ct == ControlType.ComboBox) return 5;
        if (ct == ControlType.Text) return 7;
        if (ct == ControlType.ListItem || ct == ControlType.TabItem) return 8;
        if (ct == ControlType.Group) return 9;
        return 6;
    }
    static string Scan(long hwnd, int[] venster, bool breed)
    {
        AutomationElement root = AutomationElement.FromHandle(new IntPtr(hwnd));
        List<Condition> kinds = new List<Condition>();
        kinds.Add(new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Edit));
        kinds.Add(new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Button));
        kinds.Add(new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Hyperlink));
        kinds.Add(new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Image));
        kinds.Add(new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.ComboBox));
        kinds.Add(new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.CheckBox));
        kinds.Add(new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.RadioButton));
        if (breed)                                                                                   // a chat window is mostly text blocks, list rows and groups: he can walk over those too
        {
            kinds.Add(new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Text));
            kinds.Add(new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.ListItem));
            kinds.Add(new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.TabItem));
            kinds.Add(new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Group));
        }
        Condition soorten = new OrCondition(kinds.ToArray());
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
            int soort = Soort(ct);
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
            if (goed.Count >= (breed ? 140 : 80)) break;
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
            List<long> doel; List<int[]> rects; List<bool> breed;
            lock (slot) { doel = new List<long>(browserVensters); rects = new List<int[]>(browserRects); breed = new List<bool>(browserBreed); }
            int begin = Environment.TickCount;
            for (int i = 0; i < doel.Count; i++)
            {
                string j = null;
#if UIA
                try { j = Scan(doel[i], rects[i], i < breed.Count && breed[i]); } catch { j = null; }
#endif
                lock (slot) { if (j != null) elementen[doel[i]] = j; else elementen.Remove(doel[i]); }
            }
            lock (slot)
            {
                foreach (long k in new List<long>(elementen.Keys)) if (!doel.Contains(k)) elementen.Remove(k);
            }
            Thread.Sleep(Math.Max(300, (Environment.TickCount - begin) * 4));      // a heavy page (a video page) gets a rest of four times the time a look took: at most a fifth of the time
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
            else if (a == "--breed") breedAltijd = true;
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
