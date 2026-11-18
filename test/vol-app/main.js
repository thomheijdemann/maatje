'use strict';
/* MAATJE - test helper for "full screen" (used by test/volscherm-echt.js).
   Puts a see-through, empty window over a whole screen for a few seconds, without taking the focus: you see nothing, but for
   Maatje it is a window that fills a screen without a title bar, just like a video in full screen.
   electron test/vol-app --scherm=1 --sec=8     (screen numbers from the left, starting at 0; several: --scherm=0,1) */
const { app, BrowserWindow, screen } = require('electron');
const arg = naam => { const a = process.argv.find(x => x.startsWith('--' + naam + '=')); return a ? a.slice(naam.length + 3) : null; };
const schermen = (arg('scherm') || '1').split(',').map(Number);
const sec = Math.min(30, Math.max(2, parseFloat(arg('sec') || '8')));

app.whenReady().then(() => {
  const ds = screen.getAllDisplays().sort((a, b) => a.bounds.x - b.bounds.x);
  for (const i of schermen) {
    const d = ds[i];
    if (!d) continue;
    const w = new BrowserWindow({
      x: d.bounds.x, y: d.bounds.y, width: d.bounds.width, height: d.bounds.height, frame: false, transparent: true, backgroundColor: '#00000000',
      hasShadow: false, show: false, resizable: false, thickFrame: false, title: 'maatje vol-test', webPreferences: { backgroundThrottling: false },
    });
    w.once('ready-to-show', () => { w.setBounds({ x: d.bounds.x, y: d.bounds.y, width: d.bounds.width, height: d.bounds.height }); w.showInactive(); });
    w.loadURL('data:text/html,<body style="background:transparent;margin:0"></body>');
  }
  console.log('cover on screens ' + schermen.join(',') + ' for ' + sec + ' s');
  setTimeout(() => app.quit(), sec * 1000);
});
app.on('window-all-closed', () => { /* stays until the timer ends */ });
