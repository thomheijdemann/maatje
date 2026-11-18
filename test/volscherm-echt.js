'use strict';
/* MAATJE - the real test of "full screen" on the REAL Maatje that is running now, with your real screens.
   It puts an empty, see-through window over screen 2 for about 8 seconds (test/vol-app: you see nothing and it does not take the
   focus, but for Maatje it is a window that fills a screen without a title bar, like a video in full screen) and watches what he does:
   his world should shrink to screen 1 (his window no longer lies over screen 2), and come back when the cover is gone.
   Needs: Maatje running (node maatje.js start), and two screens next to each other.   node test/volscherm-echt.js
   It does not start or stop anything of yours and never covers screen 1 (where you probably work). */
const cp = require('child_process');
const path = require('path');
const { zoekElectron, vraag, slaap } = require('../maatje.js');

const PIJP = '\\\\.\\pipe\\' + (process.env.MAATJE_PIJP || 'maatje');
let fout = 0;
function test(naam, goed, extra) { if (!goed) fout++; console.log((goed ? '  ok    ' : '  FAIL  ') + naam + (extra !== undefined && !goed ? '   -> ' + JSON.stringify(extra) : '')); }
const status = () => vraag({ wat: 'status' }, PIJP, 8000);
async function wacht(pred, ms) { const t0 = Date.now(); let s = null; while (Date.now() - t0 < ms) { try { s = await status(); if (pred(s)) return s; } catch (e) { /* even later nog eens */ } await slaap(300); } return s; }

(async () => {
  let s0;
  try { s0 = await status(); } catch (e) { console.log('Maatje is not running (start him first: node maatje.js start)'); process.exit(2); }
  if (!s0.volscherm) { console.log('This Maatje is too old: it does not know "full screen".'); process.exit(2); }
  const schermen = s0.volscherm.wereld.schermen;
  if (schermen < 2) { console.log('skip: this test needs two screens (he has ' + schermen + ' in his world now)'); process.exit(0); }
  if (s0.volscherm.volle.length) { console.log('skip: something is in full screen right now (' + s0.volscherm.volle.length + ' screen)'); process.exit(0); }
  console.log('Before: his window is ' + s0.venster.width + ' x ' + s0.venster.height + ' at ' + s0.venster.x + ',' + s0.venster.y + ' (' + schermen + ' screens), visible: ' + s0.vensterZichtbaar);
  test('before: he hides for full screen is switched on', s0.volscherm.aan);

  const kind = cp.spawn(zoekElectron(), [path.join(__dirname, 'vol-app'), '--scherm=1', '--sec=9'], { stdio: 'ignore' });
  let s = await wacht(x => x.volscherm && x.volscherm.volle.length === 1, 7000);
  test('a window fills screen 2: the main program notices it (after the 0,7 s wait)', s && s.volscherm.volle.length === 1, s && s.volscherm);
  s = await wacht(x => x.volscherm && x.volscherm.wereld.schermen === 1, 3000);
  test('his world shrinks to the other screen, and his window with it (it no longer lies over screen 2)', s && s.volscherm.wereld.schermen === 1 && s.venster.width <= 1930 && s.venster.x === s0.venster.x, s && { v: s.venster, w: s.volscherm.wereld });
  test('... and he is still there (not hidden: screen 1 is free)', s && s.vensterZichtbaar && !s.volscherm.verborgen, s && s.volscherm);
  test('... and no errors in the program', s && s.foutTel === 0, s && s.fouten);

  await new Promise(res => { kind.once('exit', res); setTimeout(res, 12000); });
  try { kind.kill(); } catch (e) { /* al weg */ }
  s = await wacht(x => x.volscherm && x.volscherm.volle.length === 0 && x.volscherm.wereld.schermen === schermen, 7000);
  test('the cover is gone: both screens are his world again', s && s.volscherm.volle.length === 0 && s.volscherm.wereld.schermen === schermen && s.venster.width === s0.venster.width, s && { v: s.venster, w: s.volscherm });
  test('... he is visible, and nothing went wrong', s && s.vensterZichtbaar && !s.volscherm.verborgen && s.foutTel === 0, s && { z: s.vensterZichtbaar, f: s.fouten });
  console.log('\n' + (fout ? fout + ' failed.' : 'All good.'));
  process.exit(fout ? 1 : 0);
})();
