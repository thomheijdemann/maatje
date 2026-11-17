'use strict';
/* MAATJE - the little app behind test/window.js. It opens two real windows for a few seconds:
   A = an ordinary window that counts how many frames it draws (it stands in for Chrome with a video);
   B = Maatje's see-through window, made with the very same settings as in the app (app/overlay.js), on top of A.
   Then B does what Maatje does when your mouse is on him (catch the mouse, let it go again) and we watch whether A
   keeps drawing.  --control = the same without the "tool window" setting, to prove that this test can see the problem.
   The code below is written in Dutch. */
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const overlayOpties = require('../../app/overlay.js');

const CONTROLE = process.argv.includes('--control');
const UIT = process.env.MAATJE_WINDOW_OUT;
app.setPath('userData', path.join(app.getPath('temp'), 'maatje-window-test'));
const slaap = ms => new Promise(r => setTimeout(r, ms));

app.whenReady().then(async () => {
  const metingen = [];
  try {
    const A = new BrowserWindow({ x: 40, y: 40, width: 280, height: 150, show: false, title: 'Maatje test (closes by itself)', backgroundColor: '#24221f' });
    A.setMenu(null);
    await A.loadURL('data:text/html,<body style="background:%2324221f;color:white;font:13px sans-serif">Maatje window test. Closes by itself.<script>window.n=0;(function f(){window.n++;requestAnimationFrame(f)})()</script></body>');
    A.showInactive();
    const opt = overlayOpties({ x: 20, y: 10, w: 340, h: 220 }, undefined, false);
    if (CONTROLE) delete opt.type;
    const B = new BrowserWindow(opt);
    B.setMenu(null);
    await B.loadURL('data:text/html,<body style="background:transparent"></body>');
    B.setIgnoreMouseEvents(true, { forward: true });
    B.showInactive();
    B.setAlwaysOnTop(true, 'screen-saver');
    let vorige = 0;
    const meet = async wat => {
      await slaap(1200);
      const [zicht, n] = (await A.webContents.executeJavaScript('document.visibilityState + "|" + window.n')).split('|');
      metingen.push({ wat, zichtbaar: zicht === 'visible', beelden: +n - vorige });
      vorige = +n;
    };
    await meet('start');
    await meet('rust');                                      // clicks go through: A must simply draw
    B.setIgnoreMouseEvents(false);                           // the mouse is on him: the window catches the mouse
    B.setBounds({ x: 21, y: 10, width: 340, height: 220 });   // ... and something happens to a window (as with a click)
    await meet('muis-op-hem');
    B.setIgnoreMouseEvents(true, { forward: true });          // the mouse is gone again
    await meet('muis-weg');
  } catch (e) { metingen.push({ wat: 'fout', tekst: String(e && e.message ? e.message : e) }); }
  if (UIT) fs.writeFileSync(UIT, JSON.stringify(metingen));
  app.quit();
});
