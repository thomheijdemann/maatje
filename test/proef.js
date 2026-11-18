'use strict';
/* MAATJE - test without a window.  node test/proef.js [folder for pictures]   (or: npm test)
   Starts the real program with --proef (invisible, its own pipe "maatje-proef", does not touch your
   settings, a world of two screens side by side), moves time forward by hand and checks: every command,
   the places, the mouse, following along with Claude, every single animation, your own animations (a GIF,
   a picture, a text file), the app window, whether nothing is left on the canvas after erasing, and ten
   minutes of wandering by himself. Writes pictures to look at. Exit code 1 on a failure.
   To test the built program instead of the source:  set MAATJE_EXE=dist\Maatje-win32-x64\Maatje.exe
   Most commands in this test are the Dutch words on purpose: that checks that they still work. */
const cp = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { zoekElectron, vraag, leeft, slaap } = require('../maatje.js');

const PIJP = '\\\\.\\pipe\\maatje-proef';
const UIT = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'maatje-test-pictures'));
const v = (b, ms) => vraag(b, PIJP, ms || 60000);
const uitslag = [];
function test(naam, goed, extra) { uitslag.push({ naam, goed: !!goed }); console.log((goed ? '  ok    ' : '  FAIL  ') + naam + (extra !== undefined && !goed ? '   -> ' + JSON.stringify(extra) : '')); }
const doe = (...regels) => v({ wat: 'doe', regels });
const stap = (sec, dt) => v({ wat: 'stap', sec, dt: dt || 1 / 60 }, 300000);
const status = () => v({ wat: 'status' });
const foto = (naam, opt) => v(Object.assign({ wat: 'foto', pad: path.join(UIT, naam + '.png'), kleur: '#262a31' }, opt || {}));
const dichtbij = (a, b, m) => Math.abs(a - b) <= (m === undefined ? 1 : m);

/* the program under test: the source (Electron + the folder app), or the built Maatje.exe */
const EXE = process.env.MAATJE_EXE ? path.resolve(process.env.MAATJE_EXE) : null;
const programma = extra => (EXE ? [EXE, extra] : [zoekElectron(), [path.join(__dirname, '..', 'app')].concat(extra)]);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'maatje-test-'));
const APPINST = path.join(TMP, 'claude-settings-of-the-app.json');     // the app window may only ever connect to this file, never to your real settings
const ENV = Object.assign({}, process.env, { MAATJE_SETTINGS: APPINST });

/* a tiny GIF made right here: w x h pixels, every frame a list with a color 0-3 per pixel (0 = see-through) */
function maakGif(w, h, beelden, honderdsten) {
  const delen = [Buffer.from('GIF89a', 'latin1'), Buffer.from([w & 255, w >> 8, h & 255, h >> 8, 0x91, 0, 0]), Buffer.from([0, 0, 0, 217, 119, 87, 106, 155, 204, 255, 255, 255])];
  for (const px of beelden) {
    delen.push(Buffer.from([0x21, 0xf9, 4, 0x09, honderdsten & 255, honderdsten >> 8, 0, 0, 0x2c, 0, 0, 0, 0, w & 255, w >> 8, h & 255, h >> 8, 0, 2]));
    const codes = [];
    for (let i = 0; i < px.length; i += 2) { codes.push(4, px[i]); if (i + 1 < px.length) codes.push(px[i + 1]); }      // 4 = start again, so every code stays 3 bits
    codes.push(5);
    const bytes = [];
    let acc = 0, n = 0;
    for (const c of codes) { acc |= c << n; n += 3; while (n >= 8) { bytes.push(acc & 255); acc >>= 8; n -= 8; } }
    if (n) bytes.push(acc & 255);
    for (let i = 0; i < bytes.length; i += 255) { const stuk = bytes.slice(i, i + 255); delen.push(Buffer.from([stuk.length].concat(stuk))); }
    delen.push(Buffer.from([0]));
  }
  delen.push(Buffer.from([0x3b]));
  return Buffer.concat(delen);
}

async function hoofd() {
  fs.mkdirSync(UIT, { recursive: true });
  if (await leeft(PIJP)) { await v({ wat: 'afsluiten' }).catch(() => {}); await slaap(800); }
  const [exe, args] = programma(['--proef', '--wereld=3840x1040x2']);
  console.log('Testing ' + (EXE ? 'the built program ' + EXE : 'the source') + '\n');
  const kind = cp.spawn(exe, args, { stdio: 'ignore', env: ENV });
  let op = false;
  for (let i = 0; i < 80 && !op; i++) { await slaap(250); op = await leeft(PIJP); }
  if (!op) { console.log('The test version does not start.'); kind.kill(); return 1; }
  try { await proeven(); }
  catch (e) { test('the test ran all the way through', false, e.message); }
  await v({ wat: 'eigen-leeg' }).catch(() => {});
  await v({ wat: 'afsluiten' }).catch(() => {});
  await slaap(300);
  try { kind.kill(); } catch (e) { /* already gone */ }
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* not important */ }
  const fout = uitslag.filter(u => !u.goed).length;
  console.log('\n' + uitslag.length + ' checks, ' + fout + ' failed. Pictures in ' + UIT);
  return fout ? 1 : 0;
}

async function proeven() {
  let s, u;
  const W = 3840, VL = 1040, MAR = 44;
  await doe('vrij uit');                              // otherwise he starts wandering in between
  await stap(1);
  s = await status();
  test('start: on the floor of screen 1', s.hoofd.y === VL && dichtbij(s.hoofd.x, 1382) && s.schermen.length === 2, s.hoofd);

  // ---- the list of commands ----
  const hulp = (await v({ wat: 'hulp' })).opdrachten;
  test('help: at least 45 commands, each with an explanation and an example', hulp.length >= 45 && hulp.every(o => o.hulp && o.vb && o.soort), hulp.length);
  test('help: English names first, the Dutch word listed as well', hulp.some(o => o.naam === 'walk' && o.ook.includes('loop')) && hulp.some(o => o.naam === 'say' && o.ook.includes('zeg')), hulp.slice(0, 2));

  // ---- places (English words) ----
  const plek = async (regel, x, sec) => { await doe('stop', regel); await stap(sec || 14); s = await status(); test(regel + ' -> x ' + x, dichtbij(s.hoofd.x, x) && s.hoofd.y === VL && !s.bezig, s.hoofd); };
  await plek('walk middle', 960);
  await plek('run s2:50%', 2880);
  await plek('run 25%', 2400);
  await plek('run left', 1920 + MAR);
  await plek('run right', W - MAR);
  await plek('run screen1:left', MAR, 16);
  await plek('run 100', 100);
  await plek('walk +200', 300);
  await plek('walk -100', 200);
  await plek('run s2:300', 2220);
  await plek('run s1:center', 960);
  // ---- and the Dutch words still work ----
  await plek('ren s2:midden', 2880);
  await plek('ren scherm1:links', MAR, 16);
  await plek('loop +100', MAR + 100);
  await plek('ren s1:midden', 960);

  // ---- jumping ----
  await doe('jump');
  await stap(0.3); s = await status();
  const hoog = VL - s.hoofd.y;
  await stap(1.5); s = await status();
  test('jump: off the ground and back again', hoog > 60 && s.hoofd.y === VL && !s.hoofd.lucht && !s.bezig, { hoog, y: s.hoofd.y });
  await doe('salto'); await stap(0.35); s = await status();
  const rol = Math.abs(s.hoofd.rol);
  await stap(1.5); s = await status();
  test('flip: turns in the air and stands straight afterwards', rol > 0.5 && s.hoofd.rol === 0 && s.hoofd.y === VL, { rol, na: s.hoofd.rol });

  // ---- talking ----
  await doe('say Hello, this is a test with a long sentence that has to run over more than one line, so that the bubble gets wide.');
  await stap(0.5); s = await status();
  test('say: bubble in view, he waits', s.hoofd.zegt && s.hoofd.doet === 'zeg' && s.hoofd.bel.x >= 0 && s.hoofd.bel.x + s.hoofd.bel.w <= 1920 && s.hoofd.bel.y >= 0, s.hoofd.bel);
  await foto('say', { rond: true });
  await stap(14); s = await status();
  test('say: the bubble goes away by itself', !s.hoofd.zegt && !s.bezig, s.hoofd);
  await doe('stop', 'ren s1:links'); await stap(8);
  await doe('shout ALL THE WAY LEFT!'); await stap(1.2); s = await status();
  test('the bubble stays inside the screen (left)', s.hoofd.bel && s.hoofd.bel.x >= 0, s.hoofd.bel);
  await foto('shout-left', { rond: true });
  await doe('stop', 'ren s1:rechts'); await stap(8);
  await doe('think On the right of screen 1...'); await stap(1.5); s = await status();
  test('the bubble stays on his own screen (right)', s.hoofd.bel && s.hoofd.bel.x + s.hoofd.bel.w <= 1920, s.hoofd.bel);
  await foto('think-right', { rond: true });
  await doe('stop', 'ren s1:midden'); await stap(6);
  await doe('+zeg Ik praat terwijl ik loop', 'loop +300'); await stap(0.6); s = await status();
  test('+ in front: talks and walks at the same time', s.hoofd.zegt && s.hoofd.doet === 'loop' && s.hoofd.x > 965, s.hoofd);
  await stap(8);
  await doe('zeg café één, twee: gekïg! €5 (ja?)'); await stap(1.6);
  await foto('letters', { rond: true });
  await doe('stop');

  // ---- mistakes in the language ----
  u = await doe('walk nowhere');
  test('error: an unknown place is refused, with the line number, in English', !u.ok && u.fouten[0].regel === 1 && /where to/.test(u.fouten[0].tekst), u);
  u = await doe('say');
  test('error: say without text', !u.ok, u);
  u = await doe('jump', 'jmp');
  test('error: a typo gives a suggestion and nothing happens', !u.ok && /did you mean jump/.test(u.fouten[0].tekst) && u.fouten[0].regel === 2 && !(await status()).bezig, u);
  u = await doe('hat banana');
  test('error: a wrong choice lists the English options', !u.ok && /crown/.test(u.fouten[0].tekst) && /glasses/.test(u.fouten[0].tekst), u);
  u = await doe('repeat 3', 'jump low', 'end');
  test('repeat 3 ... end = three times', u.ok && u.aantal === 3, u);
  await stap(4);
  u = await doe('herhaal 2', 'spring laag', 'einde');
  test('herhaal 2 ... einde (Dutch) = two times', u.ok && u.aantal === 2, u);
  await stap(3);
  u = await doe('repeat 2', 'jump');
  test('error: repeat without end', !u.ok, u);
  u = await doe('# explanation', '', '// also explanation', 'nod');
  test('lines of explanation are skipped', u.ok && u.aantal === 1, u);
  await stap(2);
  await doe('walk right', 'stop', 'sit'); await stap(1); s = await status();
  test('stop throws away what came before it', s.hoofd.houding === 'zit' && dichtbij(s.hoofd.x, 1260, 3), s.hoofd);
  await doe('stand'); await stap(1);

  // ---- every command: does it run without errors, and does the canvas stay clean? ----
  const fout0 = (await status()).foutTel;
  const kapot = [], smeer = [];
  for (const o of hulp) {
    if (['hide', 'come', 'stop', 'lap'].includes(o.naam)) continue;
    const voor = (await status()).foutTel;
    u = await doe('stop', 'cleanup', 'size normal', 'run s1:middle', o.vb);
    if (!u.ok) { kapot.push(o.naam + ': ' + JSON.stringify(u.fouten)); continue; }
    await stap(o.naam === 'snow' ? 3 : 7, 1 / 30);
    s = await status();
    if (s.foutTel !== voor) kapot.push(o.naam + ': ' + s.fouten.join(' | '));
    const sc = await v({ wat: 'schoon' });
    if (sc.vuil) smeer.push(o.naam + ' ' + sc.vuil + ' pixels at ' + JSON.stringify(sc.eerste));
  }
  test('every example from the help runs without errors', !kapot.length, kapot);
  test('after every example nothing is left on the canvas once it is erased', !smeer.length, smeer);
  await doe('stop', 'cleanup', 'land', 'color orange', 'unique classic', 'name Maatje', 'windows on','hat none', 'eyes normal', 'rainbow off', 'roam off', 'run s1:middle'); await stap(12);     // (the help example "unique milo" gave him another look)
  s = await status();
  test('back to normal: on the floor, orange, alone', s.hoofd.y === VL && s.hoofd.waar === 'vloer' && s.figuren === 1 && s.hoofd.kleur === '#d97757' && s.hoofd.maat === 6, s.hoofd);

  // ---- pictures of the poses and the hats ----
  let nr = 0;
  for (const h of ['none', 'crown', 'glasses', 'cap', 'tophat', 'headphones', 'ninja', 'wizard', 'halo']) {
    await doe('hat ' + h, 'look ahead'); await stap(0.8);
    await foto('hat-' + (nr++) + '-' + h, { gebied: { x: 860, y: 880, w: 200, h: 160 } });
  }
  await doe('hat none'); nr = 0;
  for (const o of ['normal', 'big', 'happy', 'angry', 'sad', 'cross', 'heart', 'star', 'wink', 'sleepy', 'dizzy']) {
    await doe('eyes ' + o + ' 5'); await stap(0.3);
    await foto('eyes-' + String(nr++).padStart(2, '0') + '-' + o, { gebied: { x: 860, y: 880, w: 200, h: 160 } });
  }
  await doe('eyes normal 0.1'); await stap(0.3);
  const scene = async (naam, regels, sec, opt) => { await doe('stop', ...regels); await stap(sec); await foto(naam, opt || { rond: true }); };
  await scene('wave', ['wave'], 0.5);
  await scene('cheer', ['cheer'], 0.5);
  await scene('run', ['rainbow on', 'run +600'], 0.9);
  await doe('rainbow off');
  await scene('sit', ['sit'], 1);
  await scene('sleep', ['sleep'], 3.4);
  await scene('type', ['type 5'], 1.7);
  await scene('sword', ['sword'], 0.36, { gebied: { x: 0, y: 440, w: 1920, h: 600 } });
  await scene('laser', ['laser'], 0.5, { gebied: { x: 0, y: 440, w: 1920, h: 600 } });
  await scene('lightning', ['lightning'], 0.1, { gebied: { x: 400, y: 0, w: 1120, h: 1040 } });
  await stap(0.4); await foto('scorched', { rond: true });
  await stap(3);
  await scene('fireworks', ['run s1:middle', 'fireworks 10'], 2.2, { gebied: { x: 0, y: 0, w: 1920, h: 1040 } });
  await stap(4);
  await scene('title', ['title MAATJE'], 1.6, { gebied: { x: 0, y: 0, w: 1920, h: 1040 } });
  await stap(3.4); await foto('title-burst', { gebied: { x: 0, y: 0, w: 1920, h: 1040 } });
  await stap(3);
  await scene('friends', ['clone 5', 'wait 1.5', 'dance 4'], 3.2);
  await scene('fly', ['cleanup', 'fly 55% 40%', "say I'm flying!"], 2.4);
  await scene('ball', ['land', 'ball', 'soccer 6'], 3.2, { gebied: { x: 0, y: 440, w: 1920, h: 600 } });
  await scene('snow', ['cleanup', 'snow 8', 'hat headphones'], 5, { gebied: { x: 0, y: 0, w: 1920, h: 1040 } });
  await scene('giant', ['cleanup', 'hat crown', 'size giant', "say I'm big!"], 1.6, { gebied: { x: 400, y: 440, w: 1120, h: 600 } });
  await doe('stop', 'cleanup', 'size normal', 'hat none'); await stap(2);

  // ---- climbing, a lap, flying ----
  await doe('ren s2:midden', 'klim rechts 50%'); await stap(14); s = await status();
  test('climb right 50%: hangs halfway up the right wall', s.hoofd.waar === 'rechtermuur' && s.hoofd.x === W && dichtbij(s.hoofd.y, 520, 2), s.hoofd);
  await doe('say I am hanging on the wall'); await stap(1.3); s = await status();
  test('a bubble on the wall stays in view', s.hoofd.bel && s.hoofd.bel.x + s.hoofd.bel.w <= W && s.hoofd.bel.y >= 0, s.hoofd.bel);
  await foto('wall', { rond: true });
  await doe('stop', 'loop midden'); await stap(10); s = await status();
  test('walk from the wall: drops first and then walks', s.hoofd.waar === 'vloer' && s.hoofd.y === VL && dichtbij(s.hoofd.x, 2880), s.hoofd);
  await doe('lap');
  const gezien = {};
  let plafond = false;
  for (let i = 0; i < 60; i++) { await stap(0.5, 1 / 30); s = await status(); gezien[s.hoofd.waar] = 1; if (s.hoofd.waar === 'plafond' && !plafond) { plafond = true; await doe('+say Upside down!'); await stap(1); await foto('ceiling', { rond: true }); } if (!s.bezig) break; }
  test('lap: over the right wall, ceiling and left wall back to the floor', gezien.rechtermuur && gezien.plafond && gezien.linkermuur && s.hoofd.waar === 'vloer' && s.hoofd.y === VL && dichtbij(s.hoofd.x, 2880) && !s.bezig, { gezien, hoofd: s.hoofd });
  await doe('climb left'); await stap(20); s = await status();
  test('climb left: on the left wall', s.hoofd.waar === 'linkermuur' && s.hoofd.x === 0, s.hoofd);
  await doe('fly s1:50% 20%'); await stap(6); s = await status();
  test('fly: hovers at the place that was asked', s.hoofd.vliegt && dichtbij(s.hoofd.x, 960) && dichtbij(s.hoofd.y, 208), s.hoofd);
  await doe('land'); await stap(4); s = await status();
  test('land: on the floor again', !s.hoofd.vliegt && s.hoofd.y === VL, s.hoofd);
  await doe('vlieg 50% midden', 'spring'); await stap(8); s = await status();
  test('jump after flying: drops to the ground first', !s.hoofd.vliegt && s.hoofd.y === VL && !s.bezig, s.hoofd);

  // ---- looks and friends ----
  await doe('color blue', 'size 9', 'hat crown', 'eyes happy 30'); await stap(2); s = await status();
  test('color, size, hat and eyes (English words)', s.hoofd.kleur === '#6a9bcc' && s.hoofd.maat === 9 && s.hoofd.hoed === 'kroon' && s.hoofd.hoedEn === 'crown' && s.hoofd.ogen === 'blij', s.hoofd);
  await doe('kleur #f80', 'maat gewoon', 'hoed geen', 'kleur oranje', 'ogen sip 30'); await stap(2); s = await status();
  test('kleur, maat, hoed and ogen (Dutch words)', s.hoofd.kleur === '#d97757' && s.hoofd.maat === 6 && s.hoofd.hoed === 'geen' && s.hoofd.ogen === 'sip', s.hoofd);
  await doe('ogen normaal 0.1'); await stap(0.3);
  await doe('clone 3'); await stap(3); s = await status();
  test('clone 3: four of them', s.figuren === 4, s.figuren);
  await doe('kloon 12'); await stap(3); s = await status();
  test('at most 12 friends', s.figuren === 13, s.figuren);
  await doe('ren s1:20%', 'juich'); await stap(9);
  await doe('cleanup'); await stap(1); s = await status();
  test('cleanup: alone again', s.figuren === 1 && !s.bal, s.figuren);

  // ---- ball ----
  await doe('run s1:middle', 'ball', 'wait 1.5', 'kick'); await stap(8); s = await status();
  test('kick: the ball has been kicked away', s.bal && (Math.abs(s.bal.vx) > 20 || Math.abs(s.bal.x - s.hoofd.x) > 150), s.bal);
  await doe('cleanup'); await stap(0.5);

  // ---- the mouse ----
  s = await status();
  const mx = s.hoofd.x, my = s.hoofd.y - 30;
  u = await v({ wat: 'muis', x: mx - 400, y: my - 300 });
  test('mouse next to him: clicks go through the window', !u.vast, u);
  u = await v({ wat: 'muis', x: mx, y: my });
  test('mouse on him: now you can grab him', u.vast, u);
  await v({ wat: 'muis', soort: 'neer' });
  for (let i = 1; i <= 12; i++) { await v({ wat: 'muis', x: mx + i * 30, y: my - i * 30 }); await stap(1 / 60); }
  s = await status();
  test('picking up: he hangs from the mouse', s.hoofd.gepakt && s.hoofd.y < VL - 200, s.hoofd);
  await foto('picked-up', { rond: true });
  await v({ wat: 'muis', soort: 'op' });
  s = await status();
  test('letting go: he flies away', s.hoofd.lucht && !s.hoofd.gepakt, s.hoofd);
  await stap(4); s = await status();
  test('thrown: lands on the floor again, inside the screen', s.hoofd.y === VL && s.hoofd.x >= MAR && s.hoofd.x <= W - MAR && !s.hoofd.lucht, s.hoofd);
  await stap(3); s = await status();
  await v({ wat: 'muis', x: s.hoofd.x, y: s.hoofd.y - 30 });
  await v({ wat: 'muis', soort: 'neer' }); await v({ wat: 'muis', soort: 'op' });
  await stap(0.2); s = await status();
  test('clicking him: a heart and a little hop', s.hoofd.emotie === 'hart', s.hoofd);
  await stap(2);
  await v({ wat: 'muis', x: 5, y: 5 });
  u = await v({ wat: 'muis', x: 6, y: 6 });
  test('mouse away: clicks go through again', !u.vast, u);

  // ---- hiding ----
  await doe('hide'); await stap(1.5); s = await status();
  test('hide: hidden', s.verborgen, s.verborgen);
  u = await doe('jump');
  test('a command while he is hidden: a note comes with it', u.ok && /come/.test(u.let_op || ''), u);
  u = await doe('come'); s = await status();
  test('come: visible again', !s.verborgen && s.hoofd.zichtbaar, s);
  await stap(3);

  // ---- following along with Claude ----
  const leef = (g, sessie, tool) => v({ wat: 'meeleven', gebeurtenis: g, sessie: sessie || 'a', tool });
  const haak = (h, pijp, ruw, bestand) => cp.spawnSync(process.execPath, [path.join(__dirname, '..', bestand || 'hook.js')], { input: ruw || JSON.stringify(h), env: Object.assign({}, process.env, { MAATJE_PIJP: pijp || 'maatje-proef' }), encoding: 'utf8', timeout: 6000 });
  const stil = r => r.status === 0 && !r.stdout && !r.stderr;
  await doe('stop', 'cleanup', 'roam off', 'run s1:middle'); await stap(13.5);
  u = await leef('aan');
  await stap(1.2); s = await status();
  test('follow: Claude is working -> he sits down and types (also with roam off)', u.werkt && s.meeleven.typt && s.hoofd.doet === 'werk' && s.hoofd.doetEn === 'work', s.meeleven);
  await stap(40); s = await status();
  test('follow: keeps typing for as long as Claude is busy', s.meeleven.typt, s.meeleven);
  await leef('hulpje', 'a', 'Agent'); await leef('hulpje', 'a', 'Agent'); await stap(5); s = await status();
  test('follow: two helpers started -> two friends join', s.figuren === 3 && s.meeleven.hulpjes === 2, s.meeleven);
  await foto('follow-working', { rond: true });
  await leef('hulpjeweg'); await stap(4); s = await status();
  test('follow: one helper done -> one friend leaves', s.figuren === 2 && s.meeleven.hulpjes === 1, s.meeleven);
  await doe('say Something else for a moment'); await stap(0.5); s = await status();
  test('follow: a command goes before the typing', s.hoofd.doet === 'zeg' && !s.meeleven.typt, s.hoofd);
  await stap(18); s = await status();
  test('follow: 12 s after the command he types again', s.meeleven.typt, s.meeleven);
  await leef('nodig'); await stap(0.6); s = await status();
  test('follow: Claude needs you -> stops typing and waves', !s.meeleven.werkt && !s.meeleven.typt && /look/.test(s.hoofd.zegt || ''), s.hoofd);
  await foto('follow-needs-you', { rond: true });
  await stap(6); s = await status();
  test('follow: he does not type while Claude is waiting for you', !s.meeleven.typt, s.meeleven);
  await leef('aan'); await stap(1.5); s = await status();
  test('follow: Claude carries on -> types again', s.meeleven.typt, s.meeleven);
  await leef('klaar'); await stap(0.5); s = await status();
  test('follow: done -> shouts Done! and cheers', s.hoofd.zegt === 'Done!' && !s.meeleven.werkt && s.meeleven.sessies === 0, s.hoofd);
  await foto('follow-done', { rond: true });
  await stap(6); s = await status();
  test('follow: afterwards the helpers are gone and he no longer types', s.figuren === 1 && !s.meeleven.typt, s.meeleven);
  await leef('aan', 'a'); await leef('aan', 'b'); await stap(4);
  await leef('klaar', 'a'); await stap(7); s = await status();
  test('follow: two sessions, one is done -> keeps typing for the other', s.meeleven.typt && s.meeleven.sessies === 1, s.meeleven);
  await v({ wat: 'stap', sec: 905, dt: 0.05, teken: false }, 300000); s = await status();
  test('follow: a session that is silent for 15 minutes is forgotten', !s.meeleven.werkt && s.meeleven.sessies === 0 && !s.meeleven.typt, s.meeleven);
  // the real hook script, with the data the way Claude Code passes it
  let r = haak({ hook_event_name: 'UserPromptSubmit', session_id: 'h1', prompt: 'something Maatje should never see' });
  await stap(1.5); s = await status();
  test('hook.js: a message from the user -> types; the script says nothing back', stil(r) && s.meeleven.typt, { code: r.status, uit: r.stdout, fout: r.stderr, m: s.meeleven });
  r = haak({ hook_event_name: 'PreToolUse', session_id: 'h1', tool_name: 'Agent', tool_input: { prompt: 'x'.repeat(300000) } });
  await stap(3); s = await status();
  test('hook.js: Claude starts a helper -> a friend joins (also with a lot of input)', stil(r) && s.meeleven.hulpjes === 1, { code: r.status, m: s.meeleven });
  r = haak({ hook_event_name: 'SubagentStop', session_id: 'h1' }); await stap(4); s = await status();
  test('hook.js: helper done -> friend leaves', stil(r) && s.meeleven.hulpjes === 0 && s.figuren === 1, s.meeleven);
  r = haak({ hook_event_name: 'PreToolUse', session_id: 'h1', tool_name: 'AskUserQuestion' }); await stap(0.6); s = await status();
  test('hook.js: Claude asks you a question -> waves', stil(r) && /look/.test(s.hoofd.zegt || '') && !s.meeleven.werkt, s.hoofd);
  r = haak({ hook_event_name: 'PostToolUse', session_id: 'h1', tool_name: 'AskUserQuestion' }, null, null, 'haak.js'); await stap(5); s = await status();
  test('haak.js (the old file name): question answered -> types again', stil(r) && s.meeleven.typt, s.meeleven);
  r = haak({ hook_event_name: 'Notification', session_id: 'h1', notification_type: 'idle_prompt', message: 'Claude is waiting for your input' }); await stap(1); s = await status();
  test('hook.js: the notice "waiting for input" changes nothing', stil(r) && s.meeleven.typt, s.meeleven);
  r = haak({ hook_event_name: 'PermissionRequest', session_id: 'h1', tool_name: 'Bash' }); await stap(1); s = await status();
  test('hook.js: Claude asks permission -> stops typing', stil(r) && !s.meeleven.werkt, s.meeleven);
  r = haak({ hook_event_name: 'Stop', session_id: 'h1' }); await stap(0.5); s = await status();
  test('hook.js: Claude is done -> Done!', stil(r) && s.hoofd.zegt === 'Done!' && s.meeleven.sessies === 0, s.hoofd);
  r = haak({ hook_event_name: 'SessionEnd', session_id: 'h1' });
  test('hook.js: end of the session', stil(r), r.status);
  let t0 = Date.now();
  r = haak({ hook_event_name: 'Stop', session_id: 'x' }, 'maatje-does-not-exist');
  test('hook.js: if Maatje is not running nothing happens (quickly, without an error)', stil(r) && Date.now() - t0 < 1400, { code: r.status, ms: Date.now() - t0 });
  r = haak(null, null, 'this is not json');
  test('hook.js: unreadable input gives no error', stil(r), r.status);
  await stap(5);
  await doe('follow off'); await stap(0.5); u = await leef('aan'); await stap(14); s = await status();
  test('follow off: events do nothing any more', u.meeleven === false && !s.meeleven.typt && s.meeleven.sessies === 0, s.meeleven);
  await doe('follow on'); await stap(1);
  u = await v({ wat: 'schoon' });
  test('follow: the canvas stays clean', u.vuil === 0, u);
  await doe('say Hi {name}!'); await stap(0.4); s = await status();
  test('{name} in a text becomes a name', s.hoofd.zegt === 'Hi you!', s.hoofd.zegt);
  await doe('stop', 'zeg Hoi {naam}!'); await stap(0.4); s = await status();
  test('{naam} (Dutch) works as well', s.hoofd.zegt === 'Hoi you!', s.hoofd.zegt);
  await doe('stop');

  // ---- the remote control (maatje.js) in English ----
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'maatje-connect-')), instPad = path.join(tmp, 'settings.json');
  const cli = (...a) => cp.spawnSync(process.execPath, [path.join(__dirname, '..', 'maatje.js'), ...a], { env: Object.assign({}, process.env, { MAATJE_SETTINGS: instPad }), encoding: 'utf8', timeout: 20000 });
  r = cli('--proef', 'status');
  let st = null;
  try { st = JSON.parse(r.stdout); } catch (e) { /* checked below */ }
  test('maatje.js status: English words', !!st && st.pet.on === 'floor' && st.pet.posture === 'standing' && st.pet.hat === 'none' && typeof st.follow.on === 'boolean' && st.world.screens.length === 2, r.stdout.slice(0, 300));
  r = cli('--proef', 'help');
  test('maatje.js help: English, with the Dutch words in brackets', /COMMANDS FOR MAATJE/.test(r.stdout) && /walk \(loop\)/.test(r.stdout) && /e\.g\.: walk middle/.test(r.stdout), r.stdout.slice(0, 300));
  r = cli('--proef', 'say Hi; jump');
  test('maatje.js: two commands in one go', r.status === 0 && /OK: 2 commands/.test(r.stdout), r.stdout);
  await stap(4);
  r = cli('--proef', 'jmp');
  test('maatje.js: a typo gives the line and a suggestion, exit code 1', r.status === 1 && /Line 1: /.test(r.stdout) && /did you mean jump/.test(r.stdout), r.stdout);

  // ---- connecting to Claude Code: in a test file, not in your real settings ----
  const leesInst = () => JSON.parse(fs.readFileSync(instPad, 'utf8'));
  const tel = (j, naam) => Object.keys(j.hooks || {}).reduce((n, ev) => n + j.hooks[ev].reduce((m, g) => m + g.hooks.filter(h => (h.args || []).some(x => x.endsWith('/' + naam))).length, 0), 0);
  r = cli('connect');
  let j = leesInst();
  test('connect: creates the settings with 8 hooks', r.status === 0 && tel(j, 'hook.js') === 8 && j.hooks.PostToolUse[0].matcher === 'AskUserQuestion|ExitPlanMode' && j.hooks.Stop[0].hooks[0].async === true, { uit: r.stdout, j });
  fs.writeFileSync(instPad, JSON.stringify({ theme: 'dark', permissions: { allow: ['Bash(ls)'] }, hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo done' }] }], PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo bash' }] }] } }));
  cli('connect'); cli('koppel'); j = leesInst();
  test('connect: what was there stays, and connecting twice gives no double hooks', j.theme === 'dark' && j.permissions.allow[0] === 'Bash(ls)' && tel(j, 'hook.js') === 8 && j.hooks.Stop.length === 2 && j.hooks.Stop[0].hooks[0].command === 'echo done' && j.hooks.PreToolUse.length === 2 && fs.existsSync(instPad + '.maatje-backup'), j);
  const oud = path.join(__dirname, '..', 'haak.js').replace(/\\/g, '/');
  fs.writeFileSync(instPad, JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'node', args: [oud], async: true }] }], PreToolUse: [{ hooks: [{ type: 'command', command: 'node', args: [oud], async: true }] }] } }));
  cli('connect'); j = leesInst();
  test('connect: old lines that point at haak.js are replaced by hook.js', tel(j, 'haak.js') === 0 && tel(j, 'hook.js') === 8 && j.hooks.Stop.length === 1, j);
  fs.writeFileSync(instPad, JSON.stringify({ theme: 'dark', hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo done' }] }], PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo bash' }] }] } }));
  cli('connect');
  r = cli('disconnect'); j = leesInst();
  test('disconnect: only the hooks of Maatje are gone', r.status === 0 && tel(j, 'hook.js') === 0 && j.hooks.Stop.length === 1 && j.hooks.PreToolUse[0].matcher === 'Bash' && !j.hooks.SessionEnd && j.theme === 'dark', j);
  r = cli('ontkoppel');
  test('disconnect when nothing is connected: changes nothing', /Nothing changed/.test(r.stdout), r.stdout);
  fs.writeFileSync(instPad, '{ broken');
  r = cli('connect');
  test('connect: a broken settings file is not touched', r.status !== 0 && fs.readFileSync(instPad, 'utf8') === '{ broken', { code: r.status, uit: r.stdout });
  fs.rmSync(tmp, { recursive: true, force: true });

  // ---- the animations: every single one ----
  await doe('stop', 'cleanup', 'roam off', 'run s1:middle'); await stap(8);
  let an = await v({ wat: 'anims' });
  const namen = an.lijst.map(a => a.naam);
  test('animations: at least 500, every line can be read, all names different', an.lijst.length >= 500 && an.fouten.length === 0 && new Set(namen).size === namen.length, { aantal: an.lijst.length, fouten: an.fouten.slice(0, 5) });
  test('animations: sorted into at least 10 kinds', an.soorten.length >= 10 && an.soorten.includes('dance') && an.soorten.includes('idle'), an.soorten);
  const stuk = [], vies = [], scheef = [];
  let gespeeld = 0;
  for (const a of an.lijst) {
    if (gespeeld % 40 === 0) { await doe('stop', 'run s1:middle'); await stap(7, 1 / 30); }
    const voor = (await status()).foutTel;
    u = await doe('anim ' + a.naam);
    if (!u.ok) { stuk.push(a.naam + ': ' + JSON.stringify(u.fouten)); continue; }
    await stap(a.duur + 0.5, 1 / 30);
    s = await status();
    if (s.foutTel !== voor) stuk.push(a.naam + ': ' + s.fouten.slice(-1));
    const h = s.hoofd, q = s.animaties;
    if (s.bezig || h.y !== VL || h.rol !== 0 || q.rol !== 0 || q.dy !== 0 || q.prop || h.waar !== 'vloer' || h.x < MAR || h.x > W - MAR) scheef.push(a.naam + ' ' + JSON.stringify({ bezig: s.bezig, x: h.x, y: h.y, rol: h.rol, q }));
    if (++gespeeld % 20 === 0) { const sc = await v({ wat: 'schoon' }); if (sc.vuil) vies.push(a.naam + ' ' + sc.vuil + ' pixels at ' + JSON.stringify(sc.eerste)); }
  }
  test('animations: all ' + gespeeld + ' play without an error in the program', gespeeld === an.lijst.length && !stuk.length, stuk.slice(0, 8));
  test('animations: afterwards he always stands on the floor again, upright, with empty hands', !scheef.length, scheef.slice(0, 8));
  test('animations: nothing is left on the canvas', !vies.length, vies.slice(0, 8));
  await doe('stop', 'run s1:middle'); await stap(7);
  u = await doe('anim victory-danse');
  test('anim: a typo gives a suggestion', !u.ok && /did you mean victory-dance/.test(u.fouten[0].tekst), u);
  u = await doe('anim random nothing');
  test('anim random: an unknown kind lists the kinds', !u.ok && /dance/.test(u.fouten[0].tekst), u);
  u = await doe('anim random dance'); await stap(0.3); s = await status();
  test('anim random dance: he plays one', u.ok && s.hoofd.doet === 'animatie' && s.hoofd.doetEn === 'anim', s.hoofd);
  await doe('stop'); await stap(0.5);
  const vd = an.lijst.find(a => a.naam === 'victory-dance');
  await doe('animatie victory-dance 3'); await stap(vd.duur * 2 + 0.4); s = await status();
  const nogBezig = s.hoofd.doet === 'animatie';
  await stap(vd.duur + 0.4); s = await status();
  test('anim <name> 3 (also with the Dutch word): three times in a row', nogBezig && !s.bezig, { nogBezig, bezig: s.bezig });
  await doe('anim weightlifting'); await stap(1.2); s = await status();
  test('an animation with a thing: he holds it while it plays', s.animaties.prop === 'barbell', s.animaties);
  await foto('anim-weightlifting', { rond: true });
  await stap(4); s = await status();
  test('and the thing is gone afterwards', !s.animaties.prop && !s.bezig, s.animaties);
  nr = 0;
  for (const [naam, sec] of [['victory-dance', 2.2], ['moonwalk', 0.6], ['hula', 1.5], ['sword-kata', 0.5], ['handstand', 1], ['ghost', 1.2], ['birthday', 2.6], ['reading-docs', 1.5], ['frog', 0.75], ['sneeze', 1.2]]) {
    await doe('stop', 'run s1:middle', 'anim ' + naam); await stap(sec, 1 / 60);
    await foto('anim-' + String(nr++).padStart(2, '0') + '-' + naam, { gebied: { x: 760, y: 780, w: 400, h: 260 } });
    await stap(6);
  }
  await doe('clone 2', 'wait 1', 'anim victory-dance', 'anim random'); await stap(12); s = await status();
  test('friends copy an animation without errors', s.figuren === 3 && s.foutTel === 0, s.fouten);
  await doe('cleanup'); await stap(1);

  // ---- your own animations: a GIF, a picture, a text file ----
  const { png, poppetje } = require('../tools/build-exe.js');
  const leg = (naam, inhoud) => { const p = path.join(TMP, naam); fs.writeFileSync(p, inhoud); return p; };
  const erbij = async (naam, inhoud) => { const r2 = await v({ wat: 'eigen-erbij', bestand: leg(naam, inhoud) }); await v({ wat: 'eigen' }); return r2; };
  const kader = Array.from({ length: 120 }, (x, i) => (i % 12 === 0 || i % 12 === 11 || i < 12 || i >= 108 ? 1 : 2));
  const kruis = Array.from({ length: 120 }, (x, i) => (i % 12 === Math.floor(i / 12) || i % 12 === 9 - Math.floor(i / 12) ? 3 : 0));
  const gif = maakGif(12, 10, [kader, kruis], 20);
  await v({ wat: 'eigen-leeg' });
  u = await erbij('My Cool GIF!.gif', gif);
  test('own: a GIF is taken and gets a tidy name', u.ok && u.naam === 'my-cool-gif' && u.ext === 'gif', u);
  an = await v({ wat: 'anims' });
  let eg = an.lijst.find(a => a.naam === 'my-cool-gif');
  test('own: the GIF is an animation of the kind "mine", with both frames and the right speed', !!eg && eg.eigen && eg.cat === 'mine' && eg.soort === 'beeld' && eg.beelden === 2 && dichtbij(eg.duur, 0.4, 0.02) && an.soorten.includes('mine'), eg);
  await doe('anim my-cool-gif 4'); await stap(0.3); s = await status();
  test('own: while it plays he IS the GIF', s.animaties.beeld === 'my-cool-gif' && s.hoofd.doet === 'animatie', s.animaties);
  await foto('own-gif', { gebied: { x: 760, y: 780, w: 400, h: 260 } });
  await stap(3); s = await status();
  test('own: afterwards he is himself again', !s.animaties.beeld && !s.bezig, s.animaties);
  u = await erbij('pet.png', png(poppetje(32), 32));
  an = await v({ wat: 'anims' }); eg = an.lijst.find(a => a.naam === 'pet');
  test('own: a picture is one frame that stays for two seconds', u.ok && !!eg && eg.soort === 'beeld' && eg.beelden === 1 && eg.duur === 2, eg);
  u = await erbij('spin-jump.txt', '# my own moves\njump&spin !stars\nprop:flag wave\n');
  an = await v({ wat: 'anims' }); eg = an.lijst.find(a => a.naam === 'spin-jump');
  test('own: a text file with moves becomes an animation', u.ok && !!eg && eg.soort === 'moves' && eg.eigen && eg.duur > 1, eg);
  await doe('anim spin-jump'); await stap(1); s = await status();
  test('own: and it plays (he holds the flag)', s.animaties.prop === 'flag', s.animaties);
  await stap(3);
  u = await erbij('oops.txt', 'hop flyaway spin');
  an = await v({ wat: 'anims' });
  test('own: a text file with a wrong word is reported, the rest keeps working', u.ok && !an.lijst.some(a => a.naam === 'oops') && an.eigenFouten.some(t => /oops\.txt: .*flyaway/.test(t)) && an.lijst.some(a => a.naam === 'pet'), an.eigenFouten);
  u = await erbij('not-a-picture.gif', 'this is just text');
  an = await v({ wat: 'anims' });
  test('own: a broken picture is reported in plain words', an.eigenFouten.some(t => /not-a-picture\.gif: I cannot read this as a picture/.test(t)), an.eigenFouten);
  u = await v({ wat: 'eigen-erbij', bestand: leg('virus.exe', 'MZ') });
  test('own: other kinds of files are refused', !u.ok && /gif/.test(u.fout), u);
  u = await v({ wat: 'eigen-erbij', bestand: leg('empty.gif', '') });
  const u2 = await v({ wat: 'eigen-erbij', bestand: leg('huge.gif', Buffer.alloc(8 * 1024 * 1024 + 1, 1)) });
  test('own: an empty file and a file over 8 MB are refused', !u.ok && !u2.ok && /8 MB/.test(u2.fout), { u, u2 });
  u = await erbij('victory-dance.txt', 'hop*2');
  an = await v({ wat: 'anims' });
  test('own: the same name as a built-in one gets "-mine" behind it, the built-in one stays', an.lijst.some(a => a.naam === 'victory-dance-mine' && a.eigen) && an.lijst.some(a => a.naam === 'victory-dance' && !a.eigen), an.lijst.filter(a => /victory-dance/.test(a.naam)));
  u = await erbij('my-cool-gif.png', png(poppetje(16), 16));
  an = await v({ wat: 'anims' }); eg = an.lijst.find(a => a.naam === 'my-cool-gif');
  test('own: the same name again replaces the old one', an.lijst.filter(a => a.naam === 'my-cool-gif').length === 1 && eg.beelden === 1, eg);
  u = await doe('skin victory-dance');
  test('skin: only one of your own pictures can be his look', !u.ok && /pet/.test(u.fouten[0].tekst), u);
  await doe('skin pet', 'walk +200'); await stap(0.8); s = await status();
  test('skin: he looks like your picture all the time, also while he walks', s.animaties.skin === 'pet' && s.animaties.beeld === 'pet' && s.hoofd.doet === 'loop', s.animaties);
  await foto('own-skin', { rond: true });
  await stap(5);
  await v({ wat: 'eigen-weg', naam: 'pet' }); await v({ wat: 'eigen' }); s = await status(); an = await v({ wat: 'anims' });
  test('own: deleting the picture he looks like makes him himself again', !an.lijst.some(a => a.naam === 'pet') && !s.animaties.skin, s.animaties);
  await erbij('pet.png', png(poppetje(32), 32));
  await doe('skin pet'); await stap(0.5); await doe('skin off'); await stap(0.5); s = await status();
  test('skin off: himself again', !s.animaties.skin && !s.animaties.beeld, s.animaties);
  u = await v({ wat: 'schoon' });
  test('own: the canvas stays clean', u.vuil === 0 && (await status()).foutTel === 0, u);

  // ---- the app window ----
  const pj = async js => { const r2 = await v({ wat: 'paneel-js', js }, 180000); if (!r2.ok) throw new Error('the window: ' + r2.fout); return r2.uit; };
  let p = await pj('P.wacht().then(() => P.staat())');
  for (let i = 0; i < 60 && p.plaatjesTeGaan; i++) { await slaap(250); p = await pj('P.staat()'); }
  an = await v({ wat: 'anims' });
  test('window: lists every animation, also your own, and the kinds', p.animaties === an.lijst.length && p.kaarten === p.animaties && p.chips.includes('mine') && p.chips.includes('dance') && p.eigen.length === an.lijst.filter(a => a.eigen).length, { p: p.animaties, d: an.lijst.length, chips: p.chips });
  const getekend = await pj("['victory-dance', 'moonwalk', 'weightlifting', 'frog', 'my-cool-gif', 'spin-jump'].map(n => P.plaatje(n))");
  test('window: every card has a little picture of the animation', p.plaatjesTeGaan === 0 && getekend.every(n => n > 150), getekend);
  const nDans = an.lijst.filter(a => a.cat === 'dance').length;
  u = await pj("[P.zoek('dance'), P.zoek('zzzz'), P.zoek(''), P.soort('dance'), P.soort('all')]");
  test('window: searching and choosing a kind', u[0] >= nDans && u[0] < p.kaarten && u[1] === 0 && u[2] === p.kaarten && u[3] === nDans && u[4] === p.kaarten, u);
  u = await pj("P.kies('victory-dance') && P.stap(0.6) && P.staat()");
  test('window: clicking a card shows it on the stage', u.keuze === 'victory-dance' && u.naam === 'victory-dance' && u.podium.doet === 'animatie' && /dance/.test(u.meta), u.podium);
  u = await pj('P.stap(' + (vd.duur + 1.3) + ') && P.staat().podium');
  test('window: the stage plays it again and again', u.doet === 'animatie', u);
  await pj('P.speelOpBureau()'); await stap(0.4); s = await status();
  u = await pj('P.staat().uit');
  test('window: "Play on the desktop" makes the real one do it', s.hoofd.doet === 'animatie' && /desktop/.test(u), { doet: s.hoofd.doet, u });
  await stap(vd.duur + 1);
  await foto('window-animations-desktop', { rond: true });
  await v({ wat: 'paneel-foto', pad: path.join(UIT, 'window-1-animations.png') });
  u = await pj("P.tab('eigen'), document.getElementById('m-naam').value = 'Test Dance!', document.getElementById('m-tekst').value = 'prop:flag hop*2 raise !confetti spin', P.probeer() && P.stap(1.3) && P.staat()");
  test('window: typed moves play on the stage straight away', u.proef && u.podium.prop === 'flag' && /That works/.test(u.typUit), { podium: u.podium, uit: u.typUit });
  await v({ wat: 'paneel-foto', pad: path.join(UIT, 'window-2-my-own.png') });
  u = await pj('P.bewaarTypvak().then(() => P.staat())');
  await v({ wat: 'eigen' }); an = await v({ wat: 'anims' });
  test('window: Save turns them into an animation of your own, on the desktop too', /Saved as "test-dance"/.test(u.typUit) && u.keuze === 'test-dance' && an.lijst.some(a => a.naam === 'test-dance' && a.eigen), u.typUit);
  u = await pj("document.getElementById('m-tekst').value = 'hop zzzap', P.probeer(), P.staat().typUit");
  test('window: a wrong word in typed moves is explained', /I do not know the move "zzzap"/.test(u), u);
  u = await pj('P.voegToe([new File([new Uint8Array(' + JSON.stringify([...gif]) + ")], 'From The Window.gif', { type: 'image/gif' }), new File(['x'], 'nope.pdf')]).then(r => ({ r, s: P.staat() }))");
  test('window: adding a file works, a wrong file is refused with a reason', u.r.goed[0] === 'from-the-window' && u.r.fout.some(t => /nope\.pdf/.test(t)) && u.s.keuze === 'from-the-window' && u.s.rijen.some(t => /from-the-window/.test(t)) && /Added: from-the-window/.test(u.s.eigenUit), u.r);
  await pj("maatjePaneel.eigenWeg('from-the-window').then(() => new Promise(r => setTimeout(r, 400))).then(() => P.wacht())");
  u = await pj('P.staat()');
  test('window: Delete takes it out of the list again', !u.rijen.some(t => /from-the-window/.test(t)) && !u.eigen.some(e => e.naam === 'from-the-window') && u.kaarten === u.animaties, u.rijen);
  u = await pj("maatjePaneel.koppel(true).then(k => P.ververs().then(() => ({ k, s: P.staat().gekoppeld })))");
  let aj = {};
  try { aj = JSON.parse(fs.readFileSync(APPINST, 'utf8')); } catch (e) { /* checked below */ }
  const haken = Object.keys(aj.hooks || {}).map(ev => aj.hooks[ev][0].hooks[0]);
  const goedeHaak = h => (EXE ? /Maatje\.exe$/i.test(h.command) && h.args[0] === '--hook' : h.command === 'node' && /\/hook\.js$/.test(h.args[0]));
  test('window: Connect writes the 8 hooks (to a test file here): ' + (EXE ? 'the program itself with --hook' : 'node hook.js'), u.k.ok && u.s === true && haken.length === 8 && haken.every(goedeHaak), { u, haak: haken[0] });
  u = await pj("maatjePaneel.koppel(false).then(k => P.ververs().then(() => ({ k, s: P.staat().gekoppeld })))");
  try { aj = JSON.parse(fs.readFileSync(APPINST, 'utf8')); } catch (e) { aj = { hooks: 'unreadable' }; }
  test('window: Disconnect takes them out again', u.k.ok && u.s === false && !aj.hooks, aj);
  u = await pj("P.tab('inst'), P.ververs().then(() => document.getElementById('g-stand').textContent)");
  test('window: Settings shows how his little brain feels', /He feels/.test(u) && /Energy [0-9]+%/.test(u), u);
  await pj("P.tab('inst'), document.getElementById('blad-inst').scrollTop = 0, 1");
  await v({ wat: 'paneel-foto', pad: path.join(UIT, 'window-3-settings.png') });
  u = await pj("P.tab('anims'), P.staat()");
  test('window: not a single error in the window', u.fouten.length === 0, u.fouten);

  // ---- the program itself: as a hook, and started a second time ----
  await doe('stop', 'follow on', 'run s1:middle'); await stap(13.5);
  let [px, pa] = programma(['--hook']);
  r = cp.spawnSync(px, pa, { input: JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: 'exe1', prompt: 'never passed on' }), env: Object.assign({}, process.env, { MAATJE_PIJP: 'maatje-proef' }), encoding: 'utf8', timeout: 20000 });
  await stap(1.5); s = await status();
  test('the program as a hook (--hook): passes the event on, says nothing, ends well', r.status === 0 && !r.stdout.trim() && s.meeleven.typt, { code: r.status, uit: r.stdout, fout: (r.stderr || '').slice(0, 200), m: s.meeleven });
  r = cp.spawnSync(px, pa, { input: JSON.stringify({ hook_event_name: 'Stop', session_id: 'exe1' }), env: Object.assign({}, process.env, { MAATJE_PIJP: 'maatje-proef' }), encoding: 'utf8', timeout: 20000 });
  await stap(6);
  [px, pa] = programma(['--proef', '--do=say Second start; jump']);
  r = cp.spawnSync(px, pa, { env: ENV, encoding: 'utf8', timeout: 20000 });
  await slaap(600); await stap(0.4); s = await status();
  test('starting it a second time with --do= hands the commands to the one that is running', r.status === 0 && s.hoofd.zegt === 'Second start', { code: r.status, zegt: s.hoofd.zegt });
  await stap(6); await doe('stop');

  // ---- standing on windows (made-up windows here; the real ones are tested in test/vensters.js) ----
  const WIN = (i, x, y, w, h, p) => ({ i, x, y, w, h, p: p || 'testapp' });
  const vens = lijst => v({ wat: 'vensters', lijst });
  const reset = async () => { await vens([]); await doe('stop', 'cleanup', 'roam off', 'size normal', 'hat none', 'land', 'run s1:middle'); await stap(10); };
  const A = WIN(1001, 300, 600, 500, 300, 'notepad'), B = WIN(1002, 1000, 400, 400, 500, 'chrome');
  await reset();
  u = await vens([A, B, WIN(1003, 0, 0, 1920, 1040, 'maximized'), WIN(1004, 1200, 40, 300, 200, 'toohigh')]);
  test('windows: only windows he can really stand on count (not a maximized one, not one too high to fit under)', u.platforms === 2, u);
  await doe('perch chrome'); await stap(0.5); s = await status();
  const hoogteBegin = s.hoofd.y;
  test('perch: he jumps up into the air', s.hoofd.lucht && s.hoofd.y < VL - 100, s.hoofd);
  await foto('perch-in-the-air', { gebied: { x: 700, y: 200, w: 900, h: 840 } });
  await stap(2.6); s = await status();
  test('perch chrome: he lands exactly on top of the window (inside its left edge)', !s.hoofd.lucht && s.hoofd.y === 400 && dichtbij(s.hoofd.x, 1042, 6) && s.vensters.staOp === 'chrome', { hoofd: s.hoofd, v: s.vensters.staOp });
  await foto('perch-on-window', { gebied: { x: 700, y: 200, w: 900, h: 840 } });
  await doe('walk 1300'); await stap(4); s = await status();
  test('walking along the top of the window: he stays up there', dichtbij(s.hoofd.x, 1300) && s.hoofd.y === 400 && s.vensters.staOp === 'chrome', s.hoofd);
  await doe('jump'); await stap(0.4); s = await status(); const sprong = 400 - s.hoofd.y;
  await stap(2); s = await status();
  test('jumping on the window: up and back down onto the same window', sprong > 40 && s.hoofd.y === 400 && s.vensters.staOp === 'chrome', { sprong, y: s.hoofd.y });
  await doe('walk 1500'); await stap(7); s = await status();
  test('walking over the edge: he falls off and walks on at the floor', dichtbij(s.hoofd.x, 1500) && s.hoofd.y === VL && !s.vensters.staOp && !s.hoofd.lucht, s.hoofd);
  await doe('perch chrome'); await stap(3.2); s = await status(); const xv = s.hoofd.x;
  await vens([A, WIN(1002, 1200, 400, 400, 500, 'chrome')]); await stap(0.3); s = await status();
  test('the window is moved sideways: he rides along', dichtbij(s.hoofd.x, xv + 200, 2) && s.hoofd.y === 400 && s.vensters.staOp === 'chrome', { xv, x: s.hoofd.x });
  await vens([A, WIN(1002, 1200, 460, 400, 500, 'chrome')]); await stap(0.3); s = await status();
  test('the window is moved down: he goes down with it', s.hoofd.y === 460 && s.vensters.staOp === 'chrome', s.hoofd);
  await vens([A]); await stap(2.5); s = await status();
  test('the window is closed: he falls down to the floor', s.hoofd.y === VL && !s.vensters.staOp && !s.hoofd.lucht, s.hoofd);
  await vens([A, B]); await doe('perch chrome'); await stap(3.2);
  await vens([WIN(2001, 900, 350, 600, 200, 'popup'), A, B]); await stap(2.5); s = await status();
  test('another window slides in front of the top edge: he falls', s.hoofd.y === VL && !s.vensters.staOp, s.hoofd);
  await vens([WIN(2002, 950, 380, 250, 200, 'popup'), A, B]); await doe('perch chrome'); await stap(3.2); s = await status();
  test('a window that covers part of the edge: he only stands on the part you can see', s.vensters.staOp === 'chrome' && s.hoofd.x >= 1200 && s.hoofd.y === 400, s.hoofd);
  await vens([WIN(2002, 1100, 380, 400, 200, 'popup'), A, B]); await stap(2.5); s = await status();
  test('and when that window covers the spot where he stands: he falls', s.hoofd.y === VL && !s.vensters.staOp, s.hoofd);
  await vens([A, B]); await doe('perch chrome'); await stap(3.2); await doe('land'); await stap(2.5); s = await status();
  test('land: from a window back down to the floor', s.hoofd.y === VL && !s.vensters.staOp && !s.hoofd.lucht, s.hoofd);
  await doe('perch chrome'); await stap(3.2); await doe('windows off'); await stap(2.5); s = await status();
  test('windows off: he falls down and the windows are ignored', s.hoofd.y === VL && s.vensters.platforms === 0 && !s.vensters.aan, s.vensters);
  await doe('perch chrome'); await stap(2.5); s = await status();
  test('perch with windows off: he looks puzzled and stays on the floor', s.hoofd.y === VL && !s.vensters.staOp && !s.hoofd.lucht, s.hoofd);
  await doe('windows on'); await stap(0.3); s = await status();
  test('windows on: the windows count again', s.vensters.aan && s.vensters.platforms === 2, s.vensters);
  u = await doe('perch zzz-no-such-program'); await stap(0.6); s = await status();
  test('perch for a program that has no window: a puzzled "?" and nothing else happens', u.ok && s.hoofd.emotie === 'vraag' && s.hoofd.y === VL, s.hoofd);
  await stap(2);
  u = await doe('perch ??');
  test('perch: something that is not a word is explained', !u.ok && /random/.test(u.fouten[0].tekst), u);
  // other commands from a window
  await doe('perch chrome'); await stap(3.2); await doe('walk 1200', 'anim victory-dance'); await stap(8); s = await status();
  test('an animation on a window: he stays on the window', s.hoofd.y === 400 && s.vensters.staOp === 'chrome' && !s.bezig, s.hoofd);
  await doe('anim moonwalk'); await stap(4); s = await status();
  test('a moonwalk on a window: he slides back and forth and stays up there', s.hoofd.y === 400 && s.vensters.staOp === 'chrome' && !s.bezig, s.hoofd);
  await doe('sit', 'wait 1', 'say Up here!'); await stap(1.5); s = await status();
  test('sitting and talking on a window works as usual', s.hoofd.houding === 'zit' && s.hoofd.y === 400 && /Up here/.test(s.hoofd.zegt || ''), s.hoofd);
  await foto('sitting-on-window', { gebied: { x: 700, y: 200, w: 900, h: 840 } });
  await doe('stop', 'stand'); await stap(1);
  s = await status();
  const mx2 = s.hoofd.x, my2 = s.hoofd.y - 30;
  await v({ wat: 'muis', x: mx2 - 400, y: my2 - 200 }); u = await v({ wat: 'muis', x: mx2, y: my2 });
  await v({ wat: 'muis', soort: 'neer' }); await v({ wat: 'muis', soort: 'op' }); await stap(2.5); s = await status();
  test('clicking him on a window: a heart and a hop, and he is still up there', u.vast && s.hoofd.y === 400 && s.vensters.staOp === 'chrome', s.hoofd);
  await v({ wat: 'muis', x: 5, y: 5 }); await v({ wat: 'muis', x: 6, y: 6 });
  await doe('climb right 40%'); await stap(30); s = await status();
  test('climb from a window: he first goes down to the floor and then climbs the wall', s.hoofd.waar === 'rechtermuur' && !s.vensters.staOp, s.hoofd);
  await reset();
  // jumping from window to window, many times
  await vens([A, B, WIN(1005, 1600, 300, 450, 400, 'editor'), WIN(1006, 2300, 700, 700, 250, 'player')]);
  const staatNu = async () => { const st = await status(); const p = [A, B, WIN(1005, 1600, 300, 450, 400, 'editor'), WIN(1006, 2300, 700, 700, 250, 'player')].find(w => w.p === st.vensters.staOp); return { st, p }; };
  const misser = [], plekken = new Set();
  for (let i = 0; i < 16; i++) {
    await doe('perch random'); await stap(3.6, 1 / 30);
    const { st, p } = await staatNu();
    if (!p || st.hoofd.y !== p.y || st.hoofd.x < p.x || st.hoofd.x > p.x + p.w || st.hoofd.lucht) misser.push(i + ': ' + JSON.stringify(st.hoofd) + ' ' + st.vensters.staOp);
    else plekken.add(p.p);
  }
  test('perch random, 16 times in a row from window to window: he always lands on a window', !misser.length && plekken.size >= 3, { misser: misser.slice(0, 3), plekken: [...plekken] });
  await foto('windows-scene', { gebied: { x: 200, y: 200, w: 3000, h: 840 } });
  await doe('perch higher'); await stap(3.6, 1 / 30); s = await status();
  test('perch higher: to a window that is higher than where he stands', !!s.vensters.staOp, s.hoofd);
  // by himself, all the time, with windows around: nobody tells him anything
  await v({ wat: 'geest', zet: { energie: 0.9, verveling: 0.3, gezelligheid: 0.4, vergeet: true } });      // (after all those animations his brain would be very tired)
  await doe('stop', 'land'); await stap(5); await doe('roam on');
  let eerst = -1;
  for (let i = 0; i < 40 && eerst < 0; i++) { await stap(1, 1 / 30); s = await status(); if (s.vensters.staOp) eerst = i + 1; }
  test('roam on with windows around: within half a minute he has jumped up onto one by himself', eerst > 0 && eerst <= 30, eerst);
  let opVenster = 0, f2 = (await status()).foutTel, binnen2 = true, laatste2 = null, wissels = 0;
  const bezocht = new Set();
  for (let i = 0; i < 72; i++) {
    await v({ wat: 'muis', x: 10 + (i % 7) * 3, y: 10 }); await stap(5, 1 / 30); s = await status();      // somebody is at the computer (the mouse moves a little, far away from him)
    const nu = s.vensters.staOp ? s.vensters.gId : null;
    if (nu) { opVenster++; bezocht.add(nu); if (laatste2 && laatste2 !== nu) wissels++; laatste2 = nu; }
    if (s.hoofd.x < 0 || s.hoofd.x > W || s.hoofd.y > VL || s.hoofd.y < 0) binnen2 = false;
  }
  s = await status();
  test('6 minutes by himself with windows around: he is up on them most of the time (' + opVenster + ' of 72 looks)', opVenster >= 50, { opVenster });
  test('... and he jumps from one window to another again and again, on all of them (' + wissels + ' jumps, ' + bezocht.size + ' windows)', wissels >= 8 && bezocht.size >= 3, { wissels, bezocht: bezocht.size });
  test('... stays on screen and there are no errors', binnen2 && s.foutTel === f2, { binnen2, fouten: s.fouten });
  await vens([]); await doe('stop', 'roam off'); await stap(4); s = await status();
  test('all windows gone: he is back on the floor', s.hoofd.y === VL && !s.vensters.staOp && !s.hoofd.lucht, s.hoofd);
  u = await v({ wat: 'schoon' });
  test('standing on windows: the canvas stays clean', u.vuil === 0, u);
  await reset();

  // ---- his own look ----
  s = await status();
  test('look: by default he looks exactly like the little guy you know: nothing extra', s.uiterlijk.stijl.top === 'geen' && s.uiterlijk.stijl.vlek === 'geen' && s.uiterlijk.stijl.wangen === false && s.uiterlijk.kleur === '#d97757', s.uiterlijk);
  await foto('look-default', { gebied: { x: 860, y: 880, w: 200, h: 160 } });
  await doe('unique top antennae', 'unique pattern belly', 'unique cheeks on'); await stap(0.3); s = await status();
  test('look: antennae, a belly patch and rosy cheeks are there when you ask for them', s.uiterlijk.stijl.top === 'antenne' && s.uiterlijk.stijl.vlek === 'buik' && s.uiterlijk.stijl.wangen === true, s.uiterlijk);
  await foto('look-antennae', { gebied: { x: 860, y: 880, w: 200, h: 160 } });
  await doe('unique milo'); await stap(0.3); const e1 = (await status()).uiterlijk;
  await doe('unique anna'); await stap(0.3); const e2 = (await status()).uiterlijk;
  await doe('unique MILO '); await stap(0.3); const e3 = (await status()).uiterlijk;
  test('unique <name>: the same name always gives the same look, another name another look', JSON.stringify(e1) === JSON.stringify(e3) && JSON.stringify(e1) !== JSON.stringify(e2), { e1, e2, e3 });
  const verschil = new Set();
  for (const n of ['maatje', 'robin', 'sam', 'lotte', 'mila', 'daan', 'noor', 'finn', 'tess', 'liam', 'eva', 'jesse', 'luuk', 'zoe', 'bram', 'fleur', 'sven', 'isa', 'tim', 'lena']) { await doe('unique ' + n); await stap(0.05); const ee = (await status()).uiterlijk; verschil.add(ee.kleur + JSON.stringify(ee.stijl)); }
  test('unique: twenty names give at least fifteen different looks', verschil.size >= 15, verschil.size);
  await doe('unique top horns', 'unique pattern stripes', 'unique cheeks off'); await stap(0.5); s = await status();
  test('unique top / pattern / cheeks: one thing at a time', s.uiterlijk.stijl.top === 'hoorns' && s.uiterlijk.stijl.vlek === 'strepen' && s.uiterlijk.stijl.wangen === false, s.uiterlijk);
  u = await doe('unique top banana');
  test('unique top: a wrong word is explained', !u.ok && /antennae\|ears\|horns\|tuft\|none/.test(u.fouten[0].tekst), u);
  u = await doe('unique cheeks maybe');
  test('unique cheeks: only on or off', !u.ok, u);
  await doe('unique classic'); await stap(0.3); s = await status();
  test('unique classic: back to the normal look, nothing extra', s.uiterlijk.stijl.top === 'geen' && s.uiterlijk.stijl.vlek === 'geen' && s.uiterlijk.stijl.wangen === false, s.uiterlijk);
  await doe('unique milo', 'unique default'); await stap(0.3); s = await status();
  test('unique default means the same: the normal look (the colour goes back to orange too with "color orange")', s.uiterlijk.stijl.top === 'geen' && s.uiterlijk.stijl.vlek === 'geen' && s.uiterlijk.stijl.wangen === false, s.uiterlijk);
  await doe('color orange');
  await doe('unique', 'wait 0.3'); await stap(0.6); const w1 = (await status()).uiterlijk;
  await doe('unique'); await stap(0.6); const w2 = (await status()).uiterlijk;
  test('unique (no name): a surprise every time', JSON.stringify(w1) !== JSON.stringify(w2), { w1, w2 });
  await doe('unique top antennae', 'color orange', 'clone 2'); await stap(2); s = await status();
  test('friends have the same look as he has', s.figuren === 3 && s.uiterlijk.stijl.top === 'antenne', s.uiterlijk);
  await doe('cleanup'); await stap(0.5);
  nr = 0;
  const NAMEN = ['classic', 'milo', 'anna', 'maatje', 'robin', 'sam', 'lotte', 'mila', 'daan', 'noor', 'finn', 'tess', 'liam', 'eva', 'jesse', 'luuk', 'zoe', 'bram', 'fleur', 'sven', 'isa', 'tim', 'lena'];
  for (const n of NAMEN) {
    await doe('hat none', 'unique ' + n); await stap(0.4);
    await foto('unique-' + String(nr++).padStart(2, '0') + '-' + n, { gebied: { x: 860, y: 900, w: 200, h: 140 } });
  }
  for (const h of ['crown', 'cap', 'tophat', 'headphones']) { await doe('unique top antennae', 'unique pattern belly', 'unique cheeks on', 'hat ' + h); await stap(0.4); await foto('unique-hat-' + h, { gebied: { x: 860, y: 900, w: 200, h: 140 } }); }
  await doe('hat none', 'unique classic', 'color orange'); await stap(0.5);
  u = await v({ wat: 'schoon' });
  test('his own look: the canvas stays clean', u.vuil === 0, u);

  // ---- standing on things in web pages (made-up elements here; the real ones are tested in test/vensters.js) ----
  const EL = (x, y, w, h, t, id) => [x, y, w, h, t, id];
  const PAGINA = dy => [EL(300, 300 + dy, 600, 46, 1, 111), EL(500, 400 + dy, 100, 36, 2, 222), EL(300, 500 + dy, 560, 22, 3, 333), EL(1000, 650 + dy, 270, 92, 4, 444), EL(100, 60 + dy, 300, 30, 1, 555)];
  const CHROME = (dy, extra) => Object.assign({ i: 5000, x: 0, y: 0, w: 1920, h: 1040, p: 'chrome', a: 1, e: PAGINA(dy) }, extra || {});
  const ELEM = nr => 5000 * 1000000 + nr + 1;
  await reset(); await doe('elements off'); await stap(0.5);
  await vens([CHROME(0)]); s = await status();
  test('web pages: with "elements" off (the default) the things in a page do not count', s.vensters.elementen === 0 && s.vensters.platforms === 0 && !s.vensters.elementenAan, s.vensters);
  await doe('elements on'); await stap(0.3); s = await status();
  test('elements on: boxes, buttons, links and pictures in the page become places to stand, even though the window fills the screen (4 of 5: one is too high to fit above)', s.vensters.elementenAan && s.vensters.elementen === 4 && s.vensters.platforms === 0, s.vensters);
  test('... and the page is not "a new window": it does not make him curious', s.geest.nieuw === 0, s.geest);
  await doe('perch #' + ELEM(111)); await stap(3.8, 1 / 30); s = await status();
  test('perch on the search box: he lands exactly on top of it', s.hoofd.y === 300 && s.vensters.gId === ELEM(111) && s.vensters.staOp === 'chrome' && s.hoofd.x >= 300 && s.hoofd.x <= 900 && !s.hoofd.lucht, { hoofd: s.hoofd, gId: s.vensters.gId });
  await foto('on-element', { gebied: { x: 200, y: 150, w: 900, h: 400 } });
  const ex0 = s.hoofd.x;
  await vens([CHROME(-100)]); await stap(0.3); s = await status();
  test('the page is scrolled: the box moves up and he rides along', s.hoofd.y === 200 && dichtbij(s.hoofd.x, ex0, 1) && s.vensters.gId === ELEM(111), s.hoofd);
  await vens([CHROME(0, { e: [] })]); await stap(2.5); s = await status();
  test('the page changes and the box is gone: he falls down to the floor', s.hoofd.y === VL && !s.vensters.staOp && !s.hoofd.lucht, s.hoofd);
  await vens([CHROME(0)]); await doe('perch #' + ELEM(111)); await stap(3.8, 1 / 30);
  await vens([WIN(6000, 250, 280, 700, 200, 'popup'), CHROME(0)]); await stap(2.5); s = await status();
  test('a window slides in front of the box: he is no longer on it, he falls down (here onto the link below it)', s.hoofd.y > 300 && s.vensters.gId !== ELEM(111) && !s.hoofd.lucht, s.hoofd);
  await vens([CHROME(0)]); await doe('perch chrome'); await stap(3.8, 1 / 30); s = await status();
  test('perch chrome: he finds something to stand on in the browser, also with the window itself filling the screen', s.vensters.staOp === 'chrome' && !s.hoofd.lucht && s.hoofd.y !== VL, s.hoofd);
  await doe('elements off'); await stap(2.5); s = await status();
  test('elements off: he falls down and the page is ignored again', s.hoofd.y === VL && s.vensters.elementen === 0 && !s.vensters.elementenAan, { hoofd: s.hoofd, v: s.vensters });
  await doe('elements on'); await vens([CHROME(0), WIN(7000, 100, 700, 500, 250, 'notepad')]); await stap(0.3);
  const alleEl = new Set([300, 400, 500, 650, 700]);
  const mis = []; const soorten = new Set();
  for (let i = 0; i < 14; i++) {
    await doe('perch random'); await stap(3.8, 1 / 30); s = await status();
    if (!s.vensters.staOp || s.hoofd.lucht || !alleEl.has(s.hoofd.y)) mis.push(i + ': ' + JSON.stringify(s.hoofd) + ' ' + s.vensters.staOp);
    else soorten.add(s.vensters.gId > 5000000000 ? 'element' : 'window');
  }
  test('perch random, 14 times in a row between boxes, buttons, links, pictures and a window: he always lands', !mis.length && soorten.has('element'), { mis: mis.slice(0, 2), soorten: [...soorten] });
  await v({ wat: 'geest', zet: { energie: 0.9, verveling: 0.3, gezelligheid: 0.6, vergeet: true } }); await doe('stop', 'land'); await stap(4); await doe('roam on');
  let opIets = 0; const bezocht2 = new Set();
  for (let i = 0; i < 24; i++) { await v({ wat: 'muis', x: 10 + (i % 7) * 3, y: 10 }); await stap(5, 1 / 30); s = await status(); if (s.vensters.staOp) { opIets++; bezocht2.add(s.vensters.gId); } }
  test('2 minutes by himself with a page open: he is up on its boxes and buttons most of the time (' + opIets + ' of 24 looks, ' + bezocht2.size + ' different places)', opIets >= 10 && bezocht2.size >= 2, { opIets, plekken: bezocht2.size });
  await doe('elements off'); await vens([]); await doe('stop', 'roam off'); await stap(4); s = await status();
  test('web pages: all gone and off again: he is back on the floor', s.hoofd.y === VL && !s.vensters.staOp, s.hoofd);
  u = await v({ wat: 'schoon' });
  test('web pages: the canvas stays clean', u.vuil === 0 && (await status()).foutTel === 0, u);
  await reset();

  // ---- full screen: the things in a page are ignored in a window that fills a whole screen (the real deciding is done by the main program: see test/volscherm.js and test/vensters.js) ----
  const VOL = extra => Object.assign({ i: 8000, x: 0, y: 0, w: 1920, h: 1080, p: 'chrome', a: 1, f: 1 }, extra || {});      // a full screen window is as high as the whole screen, taskbar included
  await reset(); await doe('elements on'); await stap(0.3);
  await vens([VOL({ e: PAGINA(0) })]); s = await status();
  test('full screen: the things in a page are ignored there (the player controls come and go)', s.vensters.elementen === 0 && s.vensters.platforms === 0 && s.vensters.volscherm, s.vensters);
  await vens([CHROME(0)]); s = await status();
  test('... but in a window that is not in full screen they count as before', s.vensters.elementen === 4, s.vensters);
  await doe('elements off'); await vens([]); await doe('fullscreen off'); await stap(0.3); s = await status();
  test('fullscreen off: the setting is remembered in his status', s.vensters.volscherm === false, s.vensters);
  await doe('fullscreen on'); await stap(0.3); s = await status();
  test('fullscreen on again', s.vensters.volscherm === true, s.vensters);
  await reset();

  // ---- the Claude app: text blocks, list rows and groups are places to stand too ----
  const CLAUDE = { i: 9100, x: 0, y: 0, w: 1920, h: 1040, p: 'claude', a: 1, e: [EL(700, 200, 800, 24, 7, 11), EL(700, 260, 800, 24, 7, 12), EL(200, 300, 300, 40, 8, 13), EL(700, 700, 800, 90, 9, 14), EL(700, 880, 800, 60, 1, 15)] };
  await doe('elements on'); await stap(0.3); await vens([CLAUDE]); s = await status();
  test('the Claude app: boxes, text blocks, list rows and groups (5 things) are places to stand', s.vensters.elementen === 5 && s.vensters.lijst.every(p => p.prog === 'claude'), s.vensters);
  await doe('perch #' + (9100 * 1000000 + 12 + 1)); await stap(3.8, 1 / 30); s = await status();
  test('perch on a text block of the Claude app: he lands exactly on top of it', s.hoofd.y === 260 && s.vensters.staOp === 'claude' && s.hoofd.x >= 700 && s.hoofd.x <= 1500 && !s.hoofd.lucht, s.hoofd);
  await foto('on-claude-text', { gebied: { x: 500, y: 100, w: 1100, h: 400 } });
  await doe('elements off'); await vens([]); await reset();

  // ---- Claude takes over your pc (computer use): he moves along with the mouse ----
  await doe('follow on'); await v({ wat: 'geest', zet: { energie: 0.9, verveling: 0.3, gezelligheid: 0.5, vergeet: true } });
  await v({ wat: 'muis', x: 1500, y: 800 }); await stap(0.5);
  u = await leef('overname', 'c1', 'left_click'); await stap(0.6, 1 / 30); s = await status();
  test('takeover: Claude uses the mouse -> he notices and says so (only the tool name came along: ' + s.meeleven.overnameTool + ')', u.ok && s.meeleven.overname && /wheel/i.test(s.hoofd.zegt || '') && s.meeleven.overnameTool === 'left_click', { hoofd: s.hoofd, m: s.meeleven });
  await foto('takeover-announce', { rond: true });
  await stap(2.6, 1 / 30); await leef('overname', 'c1', 'mouse_move'); await stap(3.5, 1 / 30); s = await status();
  test('takeover: he runs to the mouse and stays near it', dichtbij(s.hoofd.x, 1500, 70) && s.hoofd.y === VL && s.meeleven.overname, s.hoofd);
  await v({ wat: 'muis', x: 400, y: 800 }); await leef('overname', 'c1', 'mouse_move'); await stap(4.5, 1 / 30); await leef('overname', 'c1', 'mouse_move'); s = await status();
  test('takeover: the mouse moves away -> he follows', dichtbij(s.hoofd.x, 400, 70), s.hoofd);
  await vens([A, B]); await v({ wat: 'muis', x: 500, y: 640 }); await leef('overname', 'c1', 'mouse_move'); await stap(5.5, 1 / 30); await leef('overname', 'c1', 'mouse_move'); s = await status();
  test('takeover: the mouse is over a window -> he jumps onto it and stands on its top edge', s.vensters.staOp === 'notepad' && s.hoofd.y === 600 && !s.hoofd.lucht, { hoofd: s.hoofd, v: s.vensters.staOp });
  await foto('takeover-on-window', { gebied: { x: 100, y: 300, w: 1100, h: 500 } });
  await leef('overname', 'c1', 'left_click'); await stap(0.4, 1 / 30); s = await status();
  const klikT = s.hoofd.doet;
  await stap(3, 1 / 30);
  await leef('overname', 'c1', 'type'); await stap(1.2, 1 / 30); s = await status();
  test('takeover: Claude types -> he sits down and types along', s.hoofd.doet === 'werk' && s.meeleven.typt, s.hoofd);
  await foto('takeover-typing', { rond: true });
  await leef('overname', 'c1', 'screenshot'); await stap(3.5, 1 / 30); await leef('overname', 'c1', 'screenshot'); await stap(2, 1 / 30); s = await status();
  test('takeover: Claude stops typing -> he stops too and watches the mouse', s.hoofd.doet !== 'werk' && s.meeleven.overname, s.hoofd);
  await stap(10, 1 / 30); s = await status();
  test('takeover: 9 seconds without anything from Claude -> it is over (then the normal typing takes over: ' + (s.meeleven.typt ? 'he types' : 'quiet') + ')', !s.meeleven.overname, s.meeleven);
  await doe('say Hello'); await stap(0.4); await leef('overname', 'c1', 'left_click'); await stap(1, 1 / 30); s = await status();
  test('takeover: an order from you goes first', /Hello/.test(s.hoofd.zegt || '') || s.hoofd.doet === 'zeg', s.hoofd);
  await stap(5); await doe('follow off'); await stap(0.3);
  u = await leef('overname', 'c1', 'left_click'); await stap(1.5, 1 / 30); s = await status();
  test('follow off: he does not move along with Claude', u.meeleven === false && !s.meeleven.overname && !/wheel/i.test(s.hoofd.zegt || ''), { u, hoofd: s.hoofd });
  await doe('follow on'); await stap(0.3); await vens([]); await reset(); await doe('follow on'); await stap(0.3);
  // the real hook script: only computer use counts as "taking over", and only its name goes along
  r = haak({ hook_event_name: 'PreToolUse', session_id: 'h9', tool_name: 'mcp__computer-use__left_click', tool_input: { coordinate: [10, 10], text: 'a secret that must not go along' } }); await stap(0.5); s = await status();
  test('hook.js: a computer-use tool -> "takeover", with only the tool name (left_click)', stil(r) && s.meeleven.overname && s.meeleven.overnameTool === 'left_click', { code: r.status, m: s.meeleven });
  r = haak({ hook_event_name: 'PreToolUse', session_id: 'h9', tool_name: 'mcp__remote-devices__computer_type' }); await stap(0.3); s = await status();
  test('hook.js: the same computer-use tool from the remote kind of connection counts too', stil(r) && s.meeleven.overnameTool === 'type', s.meeleven);
  await stap(10); await leef('einde', 'h9');
  await v({ wat: 'zet', pad: 'werk.overname.t', waarde: -1e9 }); r = haak({ hook_event_name: 'PreToolUse', session_id: 'h9', tool_name: 'Bash' }); await stap(0.3); s = await status();
  test('hook.js: any other tool (Bash) is plain "working", not a takeover', stil(r) && !s.meeleven.overname && s.meeleven.werkt, s.meeleven);
  await leef('einde', 'h9'); await reset();
  await v({ wat: 'zet', pad: 'werk.overname.t', waarde: -1e9 }); s = await status();
  test('takeover: nothing left behind (no sessions, no takeover) before the next part', s.meeleven.sessies === 0 && !s.meeleven.overname && !s.meeleven.werkt, s.meeleven);

  // ---- his little mind ----
  const gz = (zet, extra) => v(Object.assign({ wat: 'geest', zet }, extra || {}));
  const fris = { energie: 0.9, verveling: 0.3, gezelligheid: 0.4, vergeet: true, aan: true };
  const muisAan = (i, x) => v({ wat: 'muis', x: x === undefined ? 10 + (i % 7) * 3 : x, y: 10 });          // somebody moves the mouse, far away from him
  await reset(); await gz(fris);
  s = await status();
  test('mind: he has feelings (energy, boredom, wanting company) and a mood', !!s.geest && s.geest.aan && s.geest.energie > 0.8 && typeof s.geest.stemming === 'string' && s.geest.verveling >= 0 && s.geest.gezelligheid >= 0, s.geest);
  await doe('stop', 'run left', 'run right', 'run left', 'run right', 'run left', 'run right', 'run left', 'run right'); await stap(70, 1 / 30); s = await status();
  const moe1 = s.geest.energie;
  test('mind: moving around makes him tired', moe1 < 0.86, moe1);
  await doe('stop', 'sit', 'wait 80'); await stap(60, 1 / 30); s = await status();
  test('mind: sitting still makes him rest: his energy comes back', s.geest.energie > moe1 + 0.12, { voor: moe1, na: s.geest.energie });
  await doe('stop', 'stand'); await stap(1);
  await reset(); await gz({ energie: 0.1, verveling: 0.2, gezelligheid: 0.2, vergeet: true });
  await doe('roam on'); let rustte = false;
  for (let i = 0; i < 40 && !rustte; i++) { await muisAan(i); await stap(3, 1 / 30); s = await status(); if (['rest', 'sleep'].includes(s.geest.doel) || s.hoofd.houding) rustte = true; }
  test('mind: when he is tired he rests (sits down, yawns or sleeps) instead of running around', rustte && /tired|worn/.test(s.geest.reden), s.geest);
  await doe('stop', 'stand', 'wake'); await reset(); await gz(fris);
  // a new window: he goes to look at it
  await vens([A, B]); await doe('roam on'); await stap(2);
  for (let i = 0; i < 20; i++) { await muisAan(i); await stap(3, 1 / 30); }
  await vens([A, B, WIN(3000, 2100, 500, 400, 300, 'newapp')]); s = await status();
  test('mind: a new window shows up and he notices it', s.geest.nieuw === 1, s.geest);
  let naarNieuw = -1;
  for (let i = 0; i < 20 && naarNieuw < 0; i++) { await muisAan(i); await stap(2, 1 / 30); s = await status(); if (s.vensters.staOp === 'newapp') naarNieuw = (i + 1) * 2; }
  test('mind: and goes to look at it within 40 seconds (' + naarNieuw + ' s)', naarNieuw > 0, s.geest);
  s = await status();
  test('mind: once he has been there it is not new any more', s.geest.nieuw === 0, s.geest);
  // the window you are working in: he keeps you company
  await vens([A, B, WIN(3000, 2100, 500, 400, 300, 'newapp'), WIN(1005, 1600, 300, 450, 400, 'editor')].map(w => (w.p === 'chrome' ? Object.assign({ a: 1 }, w) : w)));
  await vens([Object.assign({ a: 1 }, B), A, WIN(3000, 2100, 500, 400, 300, 'newapp'), WIN(1005, 1600, 300, 450, 400, 'editor')]);
  await gz({ gezelligheid: 0.9, energie: 0.9, verveling: 0.3 });
  let opVoorgrond = 0, opAnder = 0;
  for (let i = 0; i < 60; i++) {
    await muisAan(i, 1100 + (i % 5) * 40); await stap(3, 1 / 30); s = await status();
    if (s.vensters.staOp === 'chrome') opVoorgrond++; else if (s.vensters.staOp) opAnder++;
    if (i % 4 === 0) await gz({ gezelligheid: 0.9, energie: 0.9 });
  }
  test('mind: he mostly hangs out on the window you are working in (' + opVoorgrond + ' of ' + (opVoorgrond + opAnder) + ' looks, with four windows)', opVoorgrond >= (opVoorgrond + opAnder) * 0.36, { opVoorgrond, opAnder });
  // you are away, and you come back
  await doe('stop'); await gz(fris); await vens([A, B]);
  let sliep = false;
  for (let i = 0; i < 40 && !sliep; i++) { await stap(15, 1 / 20); s = await status(); if (s.hoofd.houding === 'slaap') sliep = true; }
  test('mind: when you are away for a long time he gets sleepy and falls asleep', sliep && s.geest.weg, { geest: s.geest, houding: s.hoofd.houding });
  await muisAan(0); await muisAan(1); await stap(1.5, 1 / 30); await muisAan(2); await stap(2, 1 / 30); s = await status();
  test('mind: you are back: he wakes up and is happy to see you', s.hoofd.houding !== 'slaap' && !s.geest.weg && (s.hoofd.doet === 'zwaai' || s.hoofd.emotie === 'ster' || s.hoofd.doet === 'kijk' || s.geest.doel === 'wave hello'), { hoofd: s.hoofd, geest: s.geest });
  await stap(8, 1 / 30);
  // learning: petting makes him like a program, being thrown makes him dislike it
  await reset(); await gz({ vergeet: true, energie: 0.9, verveling: 0.3, gezelligheid: 0.4 });
  await vens([A, B, WIN(1005, 1600, 300, 450, 400, 'editor')]);
  await doe('perch notepad'); await stap(3.5, 1 / 30);
  for (let i = 0; i < 4; i++) await gz({}, { actie: 'aai' });
  await doe('perch chrome'); await stap(3.5, 1 / 30);
  for (let i = 0; i < 3; i++) await gz({}, { actie: 'gegooid', prog: 'chrome' });
  s = await status();
  const vk = {}; for (const x of s.geest.voorkeur) vk[x.prog] = x.waarde;
  test('mind: petting him on a notepad window made him like notepad, being thrown off chrome made him dislike it', vk.notepad >= 0.6 && vk.chrome <= -0.5, vk);
  await reset(); await vens([A, B, WIN(1005, 1600, 300, 450, 400, 'editor')]); await gz({ energie: 0.9, verveling: 0.6, gezelligheid: 0.3 });
  const telling = { 1001: 0, 1002: 0, 1005: 0 };
  for (let i = 0; i < 300; i++) { const k = await gz({ energie: 0.9, verveling: 0.6 }, { actie: 'kies' }); const m = /^perch #(\d+)/.exec((k.regels || []).find(r => /^perch #/.test(r)) || ''); if (m) telling[m[1]]++; }
  test('mind: afterwards he chooses the window he likes most often (notepad ' + telling[1001] + ', editor ' + telling[1005] + ', chrome ' + telling[1002] + ')', telling[1001] > telling[1005] && telling[1005] > telling[1002] && telling[1001] > 2 * telling[1002], telling);
  // a click on a window he stands on
  await gz({ vergeet: true }); await doe('perch editor'); await stap(3.5, 1 / 30); s = await status();
  const hx = s.hoofd.x, hy = s.hoofd.y - 30;
  await v({ wat: 'muis', x: hx - 400, y: hy - 200 }); await v({ wat: 'muis', x: hx, y: hy }); await v({ wat: 'muis', soort: 'neer' }); await v({ wat: 'muis', soort: 'op' }); await stap(0.5);
  await v({ wat: 'muis', x: 5, y: 5 }); await v({ wat: 'muis', x: 6, y: 6 }); s = await status();
  const vk2 = {}; for (const x of s.geest.voorkeur) vk2[x.prog] = x.waarde;
  test('mind: a click on him while he stands on an editor window makes him like editors a little more', vk2.editor > 0.05, vk2);
  // remembering
  await gz({}, { actie: 'aai' });
  const bew = (await gz({}, { actie: 'exporteer' })).uit;
  await gz({ vergeet: true }); const leeg = await status();
  const terug = await gz({}, { actie: 'importeer', data: bew });
  const slecht = await gz({}, { actie: 'importeer', data: { aan: true, voorkeur: { '../hack': 1, 'ok': 'x', 'good': 0.5, 'nan': NaN }, gezien: {} } });
  test('mind: what he learned can be saved and read back; strange data is ignored', leeg.geest.voorkeur.length === 0 && terug.status.voorkeur.some(x => x.prog === 'editor') && bew.aan === true && !slecht.status.voorkeur.some(x => x.prog === '../hack' || x.prog === 'ok' || x.prog === 'nan') && slecht.status.voorkeur.some(x => x.prog === 'good'), { leeg: leeg.geest.voorkeur, terug: terug.status.voorkeur, slecht: slecht.status.voorkeur });
  // the command
  await reset(); await gz({ vergeet: true, energie: 0.9 });
  await doe('mind'); await stap(0.8); s = await status();
  test('mind (the command): he says how he feels', /I feel/.test(s.hoofd.zegt || ''), s.hoofd.zegt);
  await doe('stop', 'quiet');
  await doe('mind off'); await stap(1); s = await status();
  test('mind off: the little brain is off', s.geest.aan === false, s.geest);
  await vens([A, B]); await gz({ aan: false }); await doe('roam on'); let nogUp = -1;
  for (let i = 0; i < 60 && nogUp < 0; i++) { await muisAan(i); await stap(1, 1 / 30); s = await status(); if (s.vensters.staOp) nogUp = i + 1; }
  test('mind off: he still lives on the windows, like before (' + nogUp + ' s)', nogUp > 0, s.hoofd);
  await doe('mind on'); await stap(1); s = await status();
  test('mind on: and the brain is back', s.geest.aan === true, s.geest);
  await gz({}, { actie: 'aai' }); await doe('mind forget'); await stap(1); s = await status();
  test('mind forget: he forgets what he learned', s.geest.voorkeur.length === 0, s.geest);
  u = await doe('mind banana');
  test('mind: a strange word is explained', !u.ok && /mind off/.test(u.fouten[0].tekst), u);
  await reset(); await gz(fris);
  u = await v({ wat: 'schoon' });
  test('mind: the canvas stays clean', u.vuil === 0 && (await status()).foutTel === 0, u);

  // ---- his name ----
  s = await status();
  test('name: he is called Maatje until you say otherwise', s.naam === 'Maatje', s.naam);
  await doe('name Claude', 'say Hi, I am {pet}!'); await stap(0.6); s = await status();
  test('name Claude: he is called Claude and says so when you use {pet}', s.naam === 'Claude' && /Hi, I am Claude!/.test(s.hoofd.zegt || ''), { naam: s.naam, zegt: s.hoofd.zegt });
  u = await doe('name');
  test('name: a name is needed', !u.ok, u);
  u = await doe('name ' + 'x'.repeat(21));
  test('name: at most 20 letters', !u.ok && /20/.test(u.fouten[0].tekst), u);
  u = await doe('name <b>hi</b>');
  test('name: no strange signs', !u.ok, u);
  await doe('stop', 'name Maatje'); await stap(0.3); s = await status();
  test('name: and back again', s.naam === 'Maatje', s.naam);

  // ---- the shows in the folder "shows" ----
  const showFouten = [];
  for (const b of fs.readdirSync(path.join(__dirname, '..', 'shows')).filter(n => /\.txt$/.test(n))) {
    u = await doe(...fs.readFileSync(path.join(__dirname, '..', 'shows', b), 'utf8').replace(/^﻿/, '').split(/\r?\n/));
    if (!u.ok) showFouten.push(b + ': ' + JSON.stringify(u.fouten));
    await doe('stop', 'cleanup', 'land', 'roam off', 'rainbow off', 'hat none'); await stap(3);
  }
  test('every show in the folder "shows" is written without mistakes', !showFouten.length, showFouten);

  // ---- the list of animations on the command line ----
  r = cli('--proef', 'anims');
  test('maatje.js anims: the whole list, per kind', r.status === 0 && /ANIMATIONS/.test(r.stdout) && /DANCE \(\d+\)/.test(r.stdout) && /victory-dance/.test(r.stdout) && /MINE \(\d+\)/.test(r.stdout), r.stdout.slice(0, 200));
  r = cli('--proef', 'anims', 'frog');
  test('maatje.js anims frog: searching', r.status === 0 && /frog-jumps/.test(r.stdout) && !/victory-dance/.test(r.stdout), r.stdout.slice(0, 200));
  await v({ wat: 'eigen-leeg' }); await v({ wat: 'eigen' });

  // ---- ten minutes by himself ----
  await v({ wat: 'geest', zet: { energie: 0.9, verveling: 0.3, gezelligheid: 0.4, vergeet: true } });
  await doe('stop', 'roam on');
  const f1 = (await status()).foutTel, xs = new Set();
  let binnen = true;
  for (let i = 0; i < 40; i++) {
    await v({ wat: 'muis', x: 10 + (i % 7) * 3, y: 10 }); await stap(15, 1 / 30);
    s = await status();
    xs.add(Math.round(s.hoofd.x / 100));
    if (s.hoofd.x < 0 || s.hoofd.x > W || s.hoofd.y > VL || s.hoofd.y < 0) binnen = false;
    if (i === 6) await foto('by-himself', { rond: true });
  }
  s = await status();
  test('10 minutes by himself: no errors', s.foutTel === f1, s.fouten);
  test('10 minutes by himself: stays inside the screen and gets to many places', binnen && xs.size >= 5, { binnen, plekken: xs.size });
  u = await v({ wat: 'schoon' });
  test('10 minutes by himself: the canvas stays clean', u.vuil === 0, u);
  s = await status();
  test('sounds were asked for (jump, land, talking)', s.klanken.spring > 0 && s.klanken.land > 0 && s.klanken.praat > 0, s.klanken);
  test('not a single error in the program during the whole test', s.foutTel === 0 && fout0 === 0, s.fouten);
}

hoofd().then(c => process.exit(c), e => { console.log('The test failed: ' + e.stack); process.exit(1); });
