'use strict';
/* MAATJE - test without a window.  node test/proef.js [folder for pictures]   (or: npm test)
   Starts the real program with --proef (invisible, its own pipe "maatje-proef", does not touch your
   settings, a world of two screens side by side), moves time forward by hand and checks: every command,
   the places, the mouse, following along with Claude, whether nothing is left on the canvas after
   erasing, and ten minutes of wandering by himself. Writes pictures to look at. Exit code 1 on a failure.
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

async function hoofd() {
  fs.mkdirSync(UIT, { recursive: true });
  if (await leeft(PIJP)) { await v({ wat: 'afsluiten' }).catch(() => {}); await slaap(800); }
  const kind = cp.spawn(zoekElectron(), [path.join(__dirname, '..', 'app'), '--proef', '--wereld=3840x1040x2'], { stdio: 'ignore' });
  let op = false;
  for (let i = 0; i < 80 && !op; i++) { await slaap(250); op = await leeft(PIJP); }
  if (!op) { console.log('The test version does not start.'); kind.kill(); return 1; }
  try { await proeven(); }
  catch (e) { test('the test ran all the way through', false, e.message); }
  await v({ wat: 'afsluiten' }).catch(() => {});
  await slaap(300);
  try { kind.kill(); } catch (e) { /* already gone */ }
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
  await doe('stop', 'cleanup', 'land', 'color orange', 'hat none', 'eyes normal', 'rainbow off', 'roam off', 'run s1:middle'); await stap(12);
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

  // ---- ten minutes by himself ----
  await doe('stop', 'roam on');
  const f1 = (await status()).foutTel, xs = new Set();
  let binnen = true;
  for (let i = 0; i < 40; i++) {
    await stap(15, 1 / 30);
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
