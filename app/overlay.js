'use strict';
/* MAATJE - how the big see-through window over the desktop is made.
   In its own file, so that the window test (test/window.js) uses exactly the same settings as the app.

   type 'toolbar' is important. Normally clicks go straight through this window. But while your mouse is
   on the little guy, the window has to catch the mouse, and for that moment Windows no longer marks it as
   "see-through". Chrome (and every other program built on Chromium) then thinks a solid window covers the
   whole screen, stops drawing, and stays frozen until something else happens to a window: a YouTube video
   under Maatje froze as soon as you clicked him. Programs skip "tool windows" when they check whether they
   are covered, so as a tool window Maatje never freezes anything.
   The code below is written in Dutch. */
module.exports = function overlayOpties(vak, preload, proef) {
  return {
    x: vak.x, y: vak.y, width: vak.w, height: vak.h,
    type: 'toolbar',
    show: false, frame: false, transparent: true, backgroundColor: '#00000000',
    resizable: false, movable: false, minimizable: false, maximizable: false, fullscreenable: false,
    skipTaskbar: true, focusable: false, hasShadow: false, thickFrame: false, alwaysOnTop: !proef, title: 'Maatje',
    webPreferences: { preload, contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false },
  };
};
