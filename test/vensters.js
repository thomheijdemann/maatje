'use strict';
/* MAATJE - test with REAL windows: does he find the windows on your screen, and does he stand on them?
   node test/vensters.js   (or: npm run test:windows)
   For about half a minute a few plain windows appear and disappear in the left of your screen (they do not take
   the focus from what you are doing). Part 1 asks the window finder (app/vensters.cs) what it sees:
   the right place and size, the right order (who is in front), nothing it should skip (hidden, minimized,
   Maatje's own see-through window), and no titles. Part 2 starts the real program with a made-up desktop of
   3840 x 1040 pixels, lets him jump onto one of those windows, moves the window, and closes it.
   Exit code 1 on a failure. */
const cp = require('child_process');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const { zoekElectron, vraag, leeft, slaap } = require('../maatje.js');
const vensters = require('../app/vensters.js');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'maatje-vensters-'));
let fout = 0;
const test = (naam, goed, extra) => { if (!goed) fout++; console.log((goed ? '  ok    ' : '  FAIL  ') + naam + (!goed && extra !== undefined ? '   -> ' + JSON.stringify(extra).slice(0, 500) : '')); };
const gelijk = (a, b, m) => Math.abs(a - b) <= (m === undefined ? 2 : m);
const past = (w, r, m) => gelijk(w.x, r.x, m) && gelijk(w.y, r.y, m) && gelijk(w.w, r.width, m) && gelijk(w.h, r.height, m);

async function hoofd() {
  if (process.platform !== 'win32') { console.log('Maatje only works on Windows.'); return 1; }
  console.log('A few plain windows appear in the left of your screen for about half a minute.\n');
  const ex = zoekElectron();

  // ---- the windows ----
  const eigenaar = cp.spawn(ex, [path.join(__dirname, 'vensters-app')], { stdio: 'ignore' });
  const antwoorden = [];
  let buf = '', gereed = null, sock = null;
  const klaar = new Promise(r => { gereed = r; });
  for (let i = 0; i < 100 && !sock; i++) {                    // wait until the little app listens, then connect
    await slaap(200);
    sock = await new Promise(res => { const s = net.connect('\\\\.\\pipe\\maatje-vensters-test'); s.once('connect', () => res(s)); s.once('error', () => res(null)); });
  }
  if (!sock) { console.log('The test windows do not start.'); eigenaar.kill(); return 1; }
  sock.setEncoding('utf8');
  sock.on('data', d => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const regel = buf.slice(0, i); buf = buf.slice(i + 1);
      let o; try { o = JSON.parse(regel); } catch (e) { continue; }
      if (o.klaar) gereed(o); else { const f = antwoorden.shift(); if (f) f(o); }
    }
  });
  sock.on('error', () => {});
  const stuur = c => new Promise(res => { antwoorden.push(res); sock.write(JSON.stringify(c) + '\n'); setTimeout(() => res({ fout: 'no answer' }), 15000); });
  const start = await Promise.race([klaar, slaap(20000).then(() => null)]);
  if (!start) { console.log('The test windows do not start.'); eigenaar.kill(); return 1; }
  const opruimen = async () => { try { sock.end(); } catch (e) { /* al weg */ } await slaap(300); try { eigenaar.kill(); } catch (e) { /* al weg */ } };

  const A = (await stuur({ maak: { naam: 'A', x: 200, y: 300, w: 400, h: 250, titel: 'Maatje test A (secret title 1)', kleur: '#3a5a8a' } })).fysiek;
  const B = (await stuur({ maak: { naam: 'B', x: 450, y: 420, w: 420, h: 260, titel: 'Maatje test B (secret title 2)', kleur: '#8a4a3a' } })).fysiek;
  await stuur({ maak: { naam: 'C', x: 100, y: 700, w: 300, h: 200, titel: 'Maatje test C hidden', toon: false } });
  const D = (await stuur({ maak: { naam: 'D', x: 700, y: 700, w: 300, h: 200, titel: 'Maatje test D minimized' } })).fysiek;
  await stuur({ min: 'D' });
  const O = (await stuur({ overlay: { x: 120, y: 120, w: 340, h: 220 } })).fysiek;
  await slaap(400);

  // ---- part 1: the window finder ----
  let laatste = null;
  const zoeker = vensters.start({ cacheMap: TMP, bijLijst: l => { laatste = l; }, bijFout: t => console.log('  window finder: ' + t) });
  const wacht = async (pred, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 4000)) { if (laatste && pred(laatste)) return true; await slaap(40); } return false; };
  const vind = (l, r) => l.find(w => past(w, r));
  test('the window finder starts and reports', await wacht(() => true, 30000), zoeker.stand());
  test('it sees both plain windows, in the right place and of the right size', await wacht(l => vind(l, A) && vind(l, B)), { A, B, ziet: (laatste || []).slice(0, 6) });
  const l1 = laatste || [];
  const wa = vind(l1, A), wb = vind(l1, B);
  test('and the name of the program that owns them (electron), nothing else about them', !!wa && !!wb && wa.p === 'electron' && wb.p === 'electron' && Object.keys(wa).sort().join() === 'h,i,p,w,x,y', wa);
  test('the one in front comes first in the list', !!wa && !!wb && l1.indexOf(wb) < l1.indexOf(wa), { a: l1.indexOf(wa), b: l1.indexOf(wb) });
  test('a window that is hidden is not in the list', !vind(l1, { x: 100, y: 700, width: 300, height: 200 }), l1.length);
  test('a window that is minimized is not in the list', !vind(l1, D) && !vind(l1, { x: 700, y: 700, width: 300, height: 200 }), D);
  test('Maatje\'s own see-through window is not in the list', !vind(l1, O) && !vind(l1, { x: 120, y: 120, width: 340, height: 220 }), O);
  test('no title of any window is passed on', !JSON.stringify(l1).includes('secret') && !JSON.stringify(l1).includes('Maatje test'), 'title found');
  await stuur({ boven: 'A' });
  test('bringing a window to the front changes the order', await wacht(l => { const a = vind(l, A), b = vind(l, B); return a && b && l.indexOf(a) < l.indexOf(b); }), 'order');
  const A2 = (await stuur({ zet: { naam: 'A', x: 260, y: 340, w: 380, h: 240 } })).fysiek;
  test('moving and resizing a window shows up within a second', await wacht(l => vind(l, A2) && !vind(l, A), 1500), A2);
  await stuur({ toon: 'D' });
  await stuur({ sluit: 'B' });
  test('a window that is closed disappears', await wacht(l => !vind(l, B), 1500), B);
  let lijsten = 0;
  const tel = vensters.start({ cacheMap: TMP, bijLijst: () => { lijsten++; } });
  await slaap(3000);
  tel.stop();
  test('when nothing changes on the screen almost no lists are sent, so Maatje has no work (' + lijsten + ' lists in 3 seconds)', lijsten >= 1 && lijsten <= 12, lijsten);
  zoeker.stop();
  await slaap(300);
  test('stopping the window finder stops the little program too', !zoeker.stand().loopt, zoeker.stand());

  // ---- part 2: the real program, a made-up desktop, real windows ----
  const PIJP = '\\\\.\\pipe\\maatje-proef';
  const v = (b, ms) => vraag(b, PIJP, ms || 60000);
  const instPad = path.join(TMP, 'settings.json');
  if (await leeft(PIJP)) { await v({ wat: 'afsluiten' }).catch(() => {}); await slaap(800); }
  await stuur({ sluit: 'A' }); await stuur({ sluit: 'D' }); await stuur({ sluit: 'C' });
  const E1 = (await stuur({ maak: { naam: 'E1', x: 200, y: 400, w: 420, h: 260, titel: 'Maatje test E1', kleur: '#3a5a8a' } })).bounds;
  const E2 = (await stuur({ maak: { naam: 'E2', x: 1000, y: 620, w: 420, h: 260, titel: 'Maatje test E2', kleur: '#8a4a3a' } })).bounds;
  const EXE = process.env.MAATJE_EXE ? path.resolve(process.env.MAATJE_EXE) : null;      // set MAATJE_EXE to test the built program (with its own vensters.exe) instead of the source
  const prog = cp.spawn(EXE || ex, (EXE ? [] : [path.join(__dirname, '..', 'app')]).concat(['--proef', '--echte-vensters', '--wereld=3840x1040x2']), { stdio: 'ignore', env: Object.assign({}, process.env, { MAATJE_SETTINGS: instPad }) });
  let op = false;
  for (let i = 0; i < 80 && !op; i++) { await slaap(250); op = await leeft(PIJP); }
  if (!op) { test('the program starts', false); prog.kill(); await opruimen(); return 1; }
  try {
    await v({ wat: 'doe', regels: ['roam off', 'run s1:middle'] }); await v({ wat: 'stap', sec: 12 });
    let s;
    for (let i = 0; i < 160; i++) { s = await v({ wat: "status" }); if (s.vensters.platforms >= 2) break; await slaap(150); }      // the first start of a new little program can take a while (Windows checks it)
    const lijst = s.vensters.lijst.filter(p => p.prog === 'electron');
    test('the real program sees the test windows as platforms, in his own coordinates', lijst.some(p => gelijk(p.x0, E1.x) && gelijk(p.y, E1.y)) && lijst.some(p => gelijk(p.x0, E2.x) && gelijk(p.y, E2.y)), { E1, E2, lijst });
    await v({ wat: 'doe', regels: ['perch electron'] }); await v({ wat: 'stap', sec: 3.5, dt: 1 / 30 }); s = await v({ wat: 'status' });
    const doel = [E1, E2].find(e => gelijk(e.y, s.hoofd.y, 1));
    test('perch electron: he jumps onto one of the real windows and stands on its top edge', !!doel && s.vensters.staOp === 'electron' && !s.hoofd.lucht && s.hoofd.x >= doel.x && s.hoofd.x <= doel.x + doel.width, { hoofd: s.hoofd, E1, E2 });
    const naam = doel === E1 ? 'E1' : 'E2', x0 = s.hoofd.x;
    await stuur({ zet: { naam, x: doel.x + 150, y: doel.y, w: doel.width, h: doel.height } });
    await slaap(600); await v({ wat: 'stap', sec: 0.3, dt: 1 / 30 }); s = await v({ wat: 'status' });
    test('the real window is dragged to the side: he rides along', gelijk(s.hoofd.x, x0 + 150, 3) && gelijk(s.hoofd.y, doel.y, 1) && s.vensters.staOp === 'electron', { x0, x: s.hoofd.x, y: s.hoofd.y });
    await stuur({ zet: { naam, x: doel.x + 150, y: doel.y + 70, w: doel.width, h: doel.height } });
    await slaap(600); await v({ wat: 'stap', sec: 0.3, dt: 1 / 30 }); s = await v({ wat: 'status' });
    test('the real window is dragged down: he goes down with it', gelijk(s.hoofd.y, doel.y + 70, 1) && s.vensters.staOp === 'electron', s.hoofd);
    await v({ wat: 'foto', pad: path.join(TMP, 'op-venster.png'), rond: true, kleur: '#262a31' });
    await stuur({ sluit: naam });
    await slaap(700); await v({ wat: 'stap', sec: 2.5, dt: 1 / 30 }); s = await v({ wat: 'status' });
    test('the real window is closed: he falls down to the floor', s.hoofd.y === 1040 && !s.vensters.staOp && !s.hoofd.lucht, s.hoofd);
    s = await v({ wat: 'status' });
    test('not a single error in the program', s.foutTel === 0, s.fouten);
  } catch (e) { test('the test ran all the way through', false, e.message); }
  await v({ wat: 'afsluiten' }).catch(() => {});
  await slaap(300);
  try { prog.kill(); } catch (e) { /* al weg */ }
  await opruimen();
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* niet erg */ }
  console.log('\n' + (fout ? fout + ' failed.' : 'All good.'));
  return fout ? 1 : 0;
}
hoofd().then(c => process.exit(c), e => { console.log('The test failed: ' + e.stack); process.exit(1); });
