'use strict';
/* MAATJE - test with REAL windows.   node test/window.js   (or: npm run test:window)
   The big test (test/proef.js) runs without a window, so it cannot see what Maatje's window does to the
   other programs on your screen. This one can. For about ten seconds a tiny window appears in the top
   left corner, with Maatje's see-through window over it (made with the same settings as the app). It
   checks that a window under Maatje keeps drawing while your mouse is on him and afterwards. If it does
   not, a YouTube video under Maatje freezes as soon as you click him.
   It runs twice: once the real way, and once with the important setting taken out, to prove that this
   test really can see the problem on this pc. Exit code 1 on a failure. */
const cp = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { zoekElectron } = require('../maatje.js');

function draai(controle) {
  const uit = path.join(os.tmpdir(), 'maatje-window-test-' + process.pid + (controle ? '-control' : '') + '.json');
  try { fs.rmSync(uit, { force: true }); } catch (e) { /* not there */ }
  cp.spawnSync(zoekElectron(), [path.join(__dirname, 'window-app')].concat(controle ? ['--control'] : []), { env: Object.assign({}, process.env, { MAATJE_WINDOW_OUT: uit }), stdio: 'ignore', timeout: 60000 });
  let m = [];
  try { m = JSON.parse(fs.readFileSync(uit, 'utf8')); fs.rmSync(uit, { force: true }); } catch (e) { /* checked below */ }
  const bij = wat => m.find(x => x.wat === wat) || { zichtbaar: false, beelden: 0 };
  const tekent = wat => bij(wat).zichtbaar && bij(wat).beelden > 10;
  return { m, rust: tekent('rust'), op: tekent('muis-op-hem'), weg: tekent('muis-weg') };
}

let fout = 0;
const test = (naam, goed, extra) => { if (!goed) fout++; console.log((goed ? '  ok    ' : '  FAIL  ') + naam + (!goed && extra ? '   -> ' + JSON.stringify(extra) : '')); };
if (process.platform !== 'win32') { console.log('Maatje only works on Windows.'); process.exit(1); }
console.log('A tiny test window appears in the top left corner for about ten seconds.\n');
const echt = draai(false);
test('the test window draws while clicks go through Maatje', echt.rust, echt.m);
test('a window under Maatje keeps drawing while the mouse is on him', echt.op, echt.m);
test('and it still draws after the mouse has left him', echt.weg, echt.m);
const controle = draai(true);
if (controle.rust && !controle.op) console.log('  ok    control: without the "tool window" setting the window underneath freezes, so this test can see it');
else console.log('  note  control: on this pc the window underneath did not freeze even without the setting, so the test above proves less here');
console.log('\n' + (fout ? fout + ' failed.' : 'All good.'));
process.exit(fout ? 1 : 0);
