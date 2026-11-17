'use strict';
/* MAATJE - proef zonder venster.  node maatje/test/proef.js [map voor plaatjes]
   Start het echte programma met --proef (onzichtbaar, eigen pijp "maatje-proef", raakt je instellingen
   niet aan, wereld van twee schermen naast elkaar), zet de tijd met de hand vooruit en kijkt na:
   elke opdracht, de plekken, de muis, of er na het wissen echt niets op het doek blijft staan,
   en tien minuten uit zichzelf rondlopen. Schrijft plaatjes om te bekijken. Exitcode 1 bij een fout. */
const cp = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { zoekElectron, vraag, leeft, slaap } = require('../maatje.js');

const PIJP = '\\\\.\\pipe\\maatje-proef';
const UIT = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'maatje-proef-uit'));
const v = (b, ms) => vraag(b, PIJP, ms || 60000);
const uitslag = [];
function test(naam, goed, extra) { uitslag.push({ naam, goed: !!goed }); console.log((goed ? '  goed  ' : '  FOUT  ') + naam + (extra !== undefined && !goed ? '   -> ' + JSON.stringify(extra) : '')); }
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
  if (!op) { console.log('De proefversie start niet.'); kind.kill(); return 1; }
  try { await proeven(); }
  catch (e) { test('de proef liep helemaal door', false, e.message); }
  await v({ wat: 'afsluiten' }).catch(() => {});
  await slaap(300);
  try { kind.kill(); } catch (e) { /* al weg */ }
  const fout = uitslag.filter(u => !u.goed).length;
  console.log('\n' + uitslag.length + ' controles, ' + fout + ' fout. Plaatjes in ' + UIT);
  return fout ? 1 : 0;
}

async function proeven() {
  let s, u;
  const W = 3840, VL = 1040, MAR = 44;
  await doe('vrij uit');                              // anders gaat hij tussendoor vanzelf wandelen
  await stap(1);
  s = await status();
  test('begin: op de vloer van scherm 1', s.hoofd.y === VL && dichtbij(s.hoofd.x, 1382) && s.schermen.length === 2, s.hoofd);

  // ---- de lijst met opdrachten ----
  const hulp = (await v({ wat: 'hulp' })).opdrachten;
  test('hulp: minstens 45 opdrachten, elk met uitleg en voorbeeld', hulp.length >= 45 && hulp.every(o => o.hulp && o.vb && o.soort), hulp.length);

  // ---- plekken ----
  const plek = async (regel, x, sec) => { await doe('stop', regel); await stap(sec || 14); s = await status(); test(regel + ' -> x ' + x, dichtbij(s.hoofd.x, x) && s.hoofd.y === VL && !s.bezig, s.hoofd); };
  await plek('loop midden', 960);
  await plek('ren s2:50%', 2880);
  await plek('ren 25%', 2400);
  await plek('ren links', 1920 + MAR);
  await plek('ren rechts', W - MAR);
  await plek('ren s1:links', MAR, 16);
  await plek('ren 100', 100);
  await plek('loop +200', 300);
  await plek('loop -100', 200);
  await plek('ren s2:300', 2220);
  await plek('ren s1:midden', 960);

  // ---- springen ----
  await doe('spring');
  await stap(0.3); s = await status();
  const hoog = VL - s.hoofd.y;
  await stap(1.5); s = await status();
  test('spring: van de grond en weer terug', hoog > 60 && s.hoofd.y === VL && !s.hoofd.lucht && !s.bezig, { hoog, y: s.hoofd.y });
  await doe('salto'); await stap(0.35); s = await status();
  const rol = Math.abs(s.hoofd.rol);
  await stap(1.5); s = await status();
  test('salto: draait in de lucht en staat daarna recht', rol > 0.5 && s.hoofd.rol === 0 && s.hoofd.y === VL, { rol, na: s.hoofd.rol });

  // ---- praten ----
  await doe('zeg Hallo, dit is een proef met een lange zin die over meer dan een regel moet lopen, zodat de ballon breed wordt.');
  await stap(0.5); s = await status();
  test('zeg: ballon in beeld, hij wacht', s.hoofd.zegt && s.hoofd.doet === 'zeg' && s.hoofd.bel.x >= 0 && s.hoofd.bel.x + s.hoofd.bel.w <= 1920 && s.hoofd.bel.y >= 0, s.hoofd.bel);
  await foto('zeg', { rond: true });
  await stap(14); s = await status();
  test('zeg: ballon gaat vanzelf weg', !s.hoofd.zegt && !s.bezig, s.hoofd);
  await doe('stop', 'ren s1:links'); await stap(8);
  await doe('roep HELEMAAL LINKS!'); await stap(1.2); s = await status();
  test('ballon blijft binnen het scherm (links)', s.hoofd.bel && s.hoofd.bel.x >= 0, s.hoofd.bel);
  await foto('roep-links', { rond: true });
  await doe('stop', 'ren s1:rechts'); await stap(8);
  await doe('denk Rechts op scherm 1...'); await stap(1.5); s = await status();
  test('ballon blijft op zijn eigen scherm (rechts)', s.hoofd.bel && s.hoofd.bel.x + s.hoofd.bel.w <= 1920, s.hoofd.bel);
  await foto('denk-rechts', { rond: true });
  await doe('stop', 'ren s1:midden'); await stap(6);
  await doe('+zeg Ik praat terwijl ik loop', 'loop +300'); await stap(0.6); s = await status();
  test('+ ervoor: praat en loopt tegelijk', s.hoofd.zegt && s.hoofd.doet === 'loop' && s.hoofd.x > 965, s.hoofd);
  await stap(8);
  await doe('zeg café één, twee: gekïg! €5 (ja?)'); await stap(1.6);
  await foto('letters', { rond: true });
  await doe('stop');

  // ---- fouten in de taal ----
  u = await doe('loop nergens');
  test('fout: onbekende plek wordt geweigerd met regelnummer', !u.ok && u.fouten[0].regel === 1, u);
  u = await doe('zeg');
  test('fout: zeg zonder tekst', !u.ok, u);
  u = await doe('spring', 'sprng');
  test('fout: tikfout geeft een voorstel en er gebeurt niets', !u.ok && /spring/.test(u.fouten[0].tekst) && u.fouten[0].regel === 2 && !(await status()).bezig, u);
  u = await doe('herhaal 3', 'spring laag', 'einde');
  test('herhaal 3 ... einde = drie keer', u.ok && u.aantal === 3, u);
  await stap(4);
  u = await doe('herhaal 2', 'spring');
  test('fout: herhaal zonder einde', !u.ok, u);
  u = await doe('# uitleg', '', '// ook uitleg', 'knik');
  test('uitleg-regels worden overgeslagen', u.ok && u.aantal === 1, u);
  await stap(2);
  await doe('loop rechts', 'stop', 'zit'); await stap(1); s = await status();
  test('stop gooit weg wat ervoor stond', s.hoofd.houding === 'zit' && dichtbij(s.hoofd.x, 1260, 3), s.hoofd);
  await doe('sta'); await stap(1);

  // ---- elke opdracht: loopt hij zonder fouten, en blijft het doek schoon? ----
  const fout0 = (await status()).foutTel;
  const kapot = [], smeer = [];
  for (const o of hulp) {
    if (['weg', 'kom', 'stop', 'rondje'].includes(o.naam)) continue;
    const voor = (await status()).foutTel;
    u = await doe('stop', 'opruimen', 'maat gewoon', 'ren s1:midden', o.vb);
    if (!u.ok) { kapot.push(o.naam + ': ' + JSON.stringify(u.fouten)); continue; }
    await stap(o.naam === 'sneeuw' ? 3 : 7, 1 / 30);
    s = await status();
    if (s.foutTel !== voor) kapot.push(o.naam + ': ' + s.fouten.join(' | '));
    const sc = await v({ wat: 'schoon' });
    if (sc.vuil) smeer.push(o.naam + ' ' + sc.vuil + ' pixels bij ' + JSON.stringify(sc.eerste));
  }
  test('elk voorbeeld uit de hulp loopt zonder fouten', !kapot.length, kapot);
  test('na elk voorbeeld blijft er na het wissen niets op het doek staan', !smeer.length, smeer);
  await doe('stop', 'opruimen', 'land', 'kleur oranje', 'hoed geen', 'ogen normaal', 'regenboog uit', 'vrij uit', 'ren s1:midden'); await stap(12);
  s = await status();
  test('terug naar gewoon: op de vloer, oranje, alleen', s.hoofd.y === VL && s.hoofd.waar === 'vloer' && s.figuren === 1 && s.hoofd.kleur === '#d97757' && s.hoofd.maat === 6, s.hoofd);

  // ---- plaatjes van de houdingen en hoeden ----
  let nr = 0;
  for (const h of ['geen', 'kroon', 'bril', 'pet', 'hoed', 'koptelefoon', 'ninja', 'tovenaar', 'halo']) {
    await doe('hoed ' + h, 'kijk voor'); await stap(0.8);
    await foto('hoed-' + (nr++) + '-' + h, { gebied: { x: 860, y: 880, w: 200, h: 160 } });
  }
  await doe('hoed geen'); nr = 0;
  for (const o of ['normaal', 'groot', 'blij', 'boos', 'sip', 'kruis', 'hart', 'ster', 'knipoog', 'slaap', 'duizelig']) {
    await doe('ogen ' + o + ' 5'); await stap(0.3);
    await foto('ogen-' + String(nr++).padStart(2, '0') + '-' + o, { gebied: { x: 860, y: 880, w: 200, h: 160 } });
  }
  await doe('ogen normaal 0.1'); await stap(0.3);
  const scene = async (naam, regels, sec, opt) => { await doe('stop', ...regels); await stap(sec); await foto(naam, opt || { rond: true }); };
  await scene('zwaai', ['zwaai'], 0.5);
  await scene('juich', ['juich'], 0.5);
  await scene('ren', ['regenboog aan', 'ren +600'], 0.9);
  await doe('regenboog uit');
  await scene('zit', ['zit'], 1);
  await scene('slaap', ['slaap'], 3.4);
  await scene('typ', ['typ 5'], 1.7);
  await scene('zwaard', ['zwaard'], 0.36, { gebied: { x: 0, y: 440, w: 1920, h: 600 } });
  await scene('laser', ['laser'], 0.5, { gebied: { x: 0, y: 440, w: 1920, h: 600 } });
  await scene('bliksem', ['bliksem'], 0.1, { gebied: { x: 400, y: 0, w: 1120, h: 1040 } });
  await stap(0.4); await foto('geblakerd', { rond: true });
  await stap(3);
  await scene('vuurwerk', ['ren s1:midden', 'vuurwerk 10'], 2.2, { gebied: { x: 0, y: 0, w: 1920, h: 1040 } });
  await stap(4);
  await scene('titel', ['titel MAATJE'], 1.6, { gebied: { x: 0, y: 0, w: 1920, h: 1040 } });
  await stap(3.4); await foto('titel-knal', { gebied: { x: 0, y: 0, w: 1920, h: 1040 } });
  await stap(3);
  await scene('vriendjes', ['kloon 5', 'wacht 1.5', 'dans 4'], 3.2);
  await scene('vlieg', ['opruimen', 'vlieg 55% 40%', 'zeg Ik vlieg!'], 2.4);
  await scene('bal', ['land', 'bal', 'voetbal 6'], 3.2, { gebied: { x: 0, y: 440, w: 1920, h: 600 } });
  await scene('sneeuw', ['opruimen', 'sneeuw 8', 'hoed koptelefoon'], 5, { gebied: { x: 0, y: 0, w: 1920, h: 1040 } });
  await scene('reus', ['opruimen', 'hoed kroon', 'maat reus', 'zeg Ik ben groot!'], 1.6, { gebied: { x: 400, y: 440, w: 1120, h: 600 } });
  await doe('stop', 'opruimen', 'maat gewoon', 'hoed geen'); await stap(2);

  // ---- klimmen, rondje, vliegen ----
  await doe('ren s2:midden', 'klim rechts 50%'); await stap(14); s = await status();
  test('klim rechts 50%: hangt halverwege de rechtermuur', s.hoofd.waar === 'rechtermuur' && s.hoofd.x === W && dichtbij(s.hoofd.y, 520, 2), s.hoofd);
  await doe('zeg Ik hang aan de muur'); await stap(1.3); s = await status();
  test('ballon aan de muur blijft in beeld', s.hoofd.bel && s.hoofd.bel.x + s.hoofd.bel.w <= W && s.hoofd.bel.y >= 0, s.hoofd.bel);
  await foto('muur', { rond: true });
  await doe('stop', 'loop midden'); await stap(10); s = await status();
  test('loop vanaf de muur: valt eerst en loopt dan', s.hoofd.waar === 'vloer' && s.hoofd.y === VL && dichtbij(s.hoofd.x, 2880), s.hoofd);
  await doe('rondje');
  const gezien = {};
  let plafond = false;
  for (let i = 0; i < 60; i++) { await stap(0.5, 1 / 30); s = await status(); gezien[s.hoofd.waar] = 1; if (s.hoofd.waar === 'plafond' && !plafond) { plafond = true; await doe('+zeg Ondersteboven!'); await stap(1); await foto('plafond', { rond: true }); } if (!s.bezig) break; }
  test('rondje: over rechtermuur, plafond en linkermuur terug naar de vloer', gezien.rechtermuur && gezien.plafond && gezien.linkermuur && s.hoofd.waar === 'vloer' && s.hoofd.y === VL && dichtbij(s.hoofd.x, 2880) && !s.bezig, { gezien, hoofd: s.hoofd });
  await doe('klim links'); await stap(20); s = await status();
  test('klim links: aan de linkermuur', s.hoofd.waar === 'linkermuur' && s.hoofd.x === 0, s.hoofd);
  await doe('vlieg s1:50% 20%'); await stap(6); s = await status();
  test('vlieg: zweeft op de gevraagde plek', s.hoofd.vliegt && dichtbij(s.hoofd.x, 960) && dichtbij(s.hoofd.y, 208), s.hoofd);
  await doe('land'); await stap(4); s = await status();
  test('land: weer op de vloer', !s.hoofd.vliegt && s.hoofd.y === VL, s.hoofd);
  await doe('vlieg 50% midden', 'spring'); await stap(8); s = await status();
  test('spring na vliegen: valt eerst naar de grond', !s.hoofd.vliegt && s.hoofd.y === VL && !s.bezig, s.hoofd);

  // ---- uiterlijk en vriendjes ----
  await doe('kleur blauw', 'maat 9', 'hoed kroon'); await stap(2); s = await status();
  test('kleur, maat en hoed', s.hoofd.kleur === '#6a9bcc' && s.hoofd.maat === 9 && s.hoofd.hoed === 'kroon', s.hoofd);
  await doe('kleur #f80', 'maat gewoon', 'hoed geen', 'kleur oranje'); await stap(2);
  await doe('kloon 3'); await stap(3); s = await status();
  test('kloon 3: vier poppetjes', s.figuren === 4, s.figuren);
  await doe('kloon 12'); await stap(3); s = await status();
  test('hooguit 12 vriendjes', s.figuren === 13, s.figuren);
  await doe('ren s1:20%', 'juich'); await stap(9);
  await doe('opruimen'); await stap(1); s = await status();
  test('opruimen: weer alleen', s.figuren === 1 && !s.bal, s.figuren);

  // ---- bal ----
  await doe('ren s1:midden', 'bal', 'wacht 1.5', 'trap'); await stap(8); s = await status();
  test('trap: de bal is weggeschoten', s.bal && (Math.abs(s.bal.vx) > 20 || Math.abs(s.bal.x - s.hoofd.x) > 150), s.bal);
  await doe('opruimen'); await stap(0.5);

  // ---- de muis ----
  s = await status();
  const mx = s.hoofd.x, my = s.hoofd.y - 30;
  u = await v({ wat: 'muis', x: mx - 400, y: my - 300 });
  test('muis ernaast: klikken gaan door het venster heen', !u.vast, u);
  u = await v({ wat: 'muis', x: mx, y: my });
  test('muis op het poppetje: nu kun je hem pakken', u.vast, u);
  await v({ wat: 'muis', soort: 'neer' });
  for (let i = 1; i <= 12; i++) { await v({ wat: 'muis', x: mx + i * 30, y: my - i * 30 }); await stap(1 / 60); }
  s = await status();
  test('oppakken: hij hangt aan de muis', s.hoofd.gepakt && s.hoofd.y < VL - 200, s.hoofd);
  await foto('gepakt', { rond: true });
  await v({ wat: 'muis', soort: 'op' });
  s = await status();
  test('loslaten: hij vliegt weg', s.hoofd.lucht && !s.hoofd.gepakt, s.hoofd);
  await stap(4); s = await status();
  test('gegooid: landt weer op de vloer, binnen beeld', s.hoofd.y === VL && s.hoofd.x >= MAR && s.hoofd.x <= W - MAR && !s.hoofd.lucht, s.hoofd);
  await stap(3); s = await status();
  await v({ wat: 'muis', x: s.hoofd.x, y: s.hoofd.y - 30 });
  await v({ wat: 'muis', soort: 'neer' }); await v({ wat: 'muis', soort: 'op' });
  await stap(0.2); s = await status();
  test('aanklikken: hartje en een sprongetje', s.hoofd.emotie === 'hart', s.hoofd);
  await stap(2);
  await v({ wat: 'muis', x: 5, y: 5 });
  u = await v({ wat: 'muis', x: 6, y: 6 });
  test('muis weg: klikken gaan weer door', !u.vast, u);

  // ---- verbergen ----
  await doe('weg'); await stap(1.5); s = await status();
  test('weg: verborgen', s.verborgen, s.verborgen);
  u = await doe('spring');
  test('opdracht terwijl hij verborgen is: melding erbij', u.ok && u.let_op, u);
  u = await doe('kom'); s = await status();
  test('kom: weer zichtbaar', !s.verborgen && s.hoofd.zichtbaar, s);
  await stap(3);

  // ---- meeleven met Claude ----
  const leef = (g, sessie, tool) => v({ wat: 'meeleven', gebeurtenis: g, sessie: sessie || 'a', tool });
  const haak = (h, pijp, ruw) => cp.spawnSync(process.execPath, [path.join(__dirname, '..', 'haak.js')], { input: ruw || JSON.stringify(h), env: Object.assign({}, process.env, { MAATJE_PIJP: pijp || 'maatje-proef' }), encoding: 'utf8', timeout: 6000 });
  const stil = r => r.status === 0 && !r.stdout && !r.stderr;
  await doe('stop', 'opruimen', 'vrij uit', 'ren s1:midden'); await stap(13.5);
  u = await leef('aan');
  await stap(1.2); s = await status();
  test('meeleven: Claude werkt -> hij gaat zitten typen (ook met vrij uit)', u.werkt && s.meeleven.typt && s.hoofd.doet === 'werk', s.meeleven);
  await stap(40); s = await status();
  test('meeleven: blijft typen zolang Claude bezig is', s.meeleven.typt, s.meeleven);
  await leef('hulpje', 'a', 'Agent'); await leef('hulpje', 'a', 'Agent'); await stap(5); s = await status();
  test('meeleven: twee hulpjes ingezet -> twee vriendjes erbij', s.figuren === 3 && s.meeleven.hulpjes === 2, s.meeleven);
  await foto('meeleven-werk', { rond: true });
  await leef('hulpjeweg'); await stap(4); s = await status();
  test('meeleven: een hulpje klaar -> een vriendje weg', s.figuren === 2 && s.meeleven.hulpjes === 1, s.meeleven);
  await doe('zeg Even iets anders'); await stap(0.5); s = await status();
  test('meeleven: een opdracht gaat voor het typen', s.hoofd.doet === 'zeg' && !s.meeleven.typt, s.hoofd);
  await stap(18); s = await status();
  test('meeleven: 12 s na de opdracht typt hij weer', s.meeleven.typt, s.meeleven);
  await leef('nodig'); await stap(0.6); s = await status();
  test('meeleven: Claude heeft je nodig -> stopt met typen en zwaait', !s.meeleven.werkt && !s.meeleven.typt && /kijken/.test(s.hoofd.zegt || ''), s.hoofd);
  await foto('meeleven-nodig', { rond: true });
  await stap(6); s = await status();
  test('meeleven: zolang Claude op je wacht typt hij niet', !s.meeleven.typt, s.meeleven);
  await leef('aan'); await stap(1.5); s = await status();
  test('meeleven: Claude gaat verder -> typt weer', s.meeleven.typt, s.meeleven);
  await leef('klaar'); await stap(0.5); s = await status();
  test('meeleven: klaar -> roept Klaar! en juicht', s.hoofd.zegt === 'Klaar!' && !s.meeleven.werkt && s.meeleven.sessies === 0, s.hoofd);
  await foto('meeleven-klaar', { rond: true });
  await stap(6); s = await status();
  test('meeleven: na afloop zijn de hulpjes weg en typt hij niet meer', s.figuren === 1 && !s.meeleven.typt, s.meeleven);
  await leef('aan', 'a'); await leef('aan', 'b'); await stap(4);
  await leef('klaar', 'a'); await stap(7); s = await status();
  test('meeleven: twee sessies, een is klaar -> typt verder voor de andere', s.meeleven.typt && s.meeleven.sessies === 1, s.meeleven);
  await v({ wat: 'stap', sec: 905, dt: 0.05, teken: false }, 300000); s = await status();
  test('meeleven: een sessie die 15 minuten niets laat horen wordt vergeten', !s.meeleven.werkt && s.meeleven.sessies === 0 && !s.meeleven.typt, s.meeleven);
  // het echte haak-script, met de gegevens zoals Claude Code ze geeft
  let r = haak({ hook_event_name: 'UserPromptSubmit', session_id: 'h1', prompt: 'iets wat Maatje niet hoort te zien' });
  await stap(1.5); s = await status();
  test('haak.js: bericht van de gebruiker -> typt; het script zegt niets terug', stil(r) && s.meeleven.typt, { code: r.status, uit: r.stdout, fout: r.stderr, m: s.meeleven });
  r = haak({ hook_event_name: 'PreToolUse', session_id: 'h1', tool_name: 'Agent', tool_input: { prompt: 'x'.repeat(300000) } });
  await stap(3); s = await status();
  test('haak.js: Claude zet een hulpje in -> vriendje erbij (ook met heel veel invoer)', stil(r) && s.meeleven.hulpjes === 1, { code: r.status, m: s.meeleven });
  r = haak({ hook_event_name: 'SubagentStop', session_id: 'h1' }); await stap(4); s = await status();
  test('haak.js: hulpje klaar -> vriendje weg', stil(r) && s.meeleven.hulpjes === 0 && s.figuren === 1, s.meeleven);
  r = haak({ hook_event_name: 'PreToolUse', session_id: 'h1', tool_name: 'AskUserQuestion' }); await stap(0.6); s = await status();
  test('haak.js: Claude stelt je een vraag -> zwaait', stil(r) && /kijken/.test(s.hoofd.zegt || '') && !s.meeleven.werkt, s.hoofd);
  r = haak({ hook_event_name: 'PostToolUse', session_id: 'h1', tool_name: 'AskUserQuestion' }); await stap(5); s = await status();
  test('haak.js: vraag beantwoord -> typt weer', stil(r) && s.meeleven.typt, s.meeleven);
  r = haak({ hook_event_name: 'Notification', session_id: 'h1', notification_type: 'idle_prompt', message: 'Claude is waiting for your input' }); await stap(1); s = await status();
  test('haak.js: melding "wacht op invoer" verandert niets', stil(r) && s.meeleven.typt, s.meeleven);
  r = haak({ hook_event_name: 'PermissionRequest', session_id: 'h1', tool_name: 'Bash' }); await stap(1); s = await status();
  test('haak.js: Claude vraagt toestemming -> stopt met typen', stil(r) && !s.meeleven.werkt, s.meeleven);
  r = haak({ hook_event_name: 'Stop', session_id: 'h1' }); await stap(0.5); s = await status();
  test('haak.js: Claude is klaar -> Klaar!', stil(r) && s.hoofd.zegt === 'Klaar!' && s.meeleven.sessies === 0, s.hoofd);
  r = haak({ hook_event_name: 'SessionEnd', session_id: 'h1' });
  test('haak.js: einde van de sessie', stil(r), r.status);
  let t0 = Date.now();
  r = haak({ hook_event_name: 'Stop', session_id: 'x' }, 'maatje-bestaat-niet');
  test('haak.js: als Maatje niet loopt gebeurt er niets (snel, zonder fout)', stil(r) && Date.now() - t0 < 1400, { code: r.status, ms: Date.now() - t0 });
  r = haak(null, null, 'dit is geen json');
  test('haak.js: onleesbare invoer geeft geen fout', stil(r), r.status);
  await stap(5);
  await doe('meeleven uit'); await stap(0.5); u = await leef('aan'); await stap(14); s = await status();
  test('meeleven uit: gebeurtenissen doen niets meer', u.meeleven === false && !s.meeleven.typt && s.meeleven.sessies === 0, s.meeleven);
  await doe('meeleven aan'); await stap(1);
  u = await v({ wat: 'schoon' });
  test('meeleven: doek blijft schoon', u.vuil === 0, u);
  await doe('zeg Hoi {naam}!'); await stap(0.4); s = await status();
  test('{naam} in een tekst wordt een naam', s.hoofd.zegt === 'Hoi jij!', s.hoofd.zegt);
  await doe('stop');

  // ---- koppelen met Claude Code: in een proefbestand, niet in je echte instellingen ----
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'maatje-koppel-')), instPad = path.join(tmp, 'settings.json');
  const cli = (...a) => cp.spawnSync(process.execPath, [path.join(__dirname, '..', 'maatje.js'), ...a], { env: Object.assign({}, process.env, { MAATJE_SETTINGS: instPad }), encoding: 'utf8', timeout: 20000 });
  const leesInst = () => JSON.parse(fs.readFileSync(instPad, 'utf8'));
  const onze = j => Object.keys(j.hooks || {}).reduce((n, ev) => n + j.hooks[ev].reduce((m, g) => m + g.hooks.filter(h => (h.args || []).some(x => /haak\.js$/.test(x))).length, 0), 0);
  r = cli('koppel');
  let j = leesInst();
  test('koppel: maakt de instellingen aan met 8 hooks', r.status === 0 && onze(j) === 8 && j.hooks.PostToolUse[0].matcher === 'AskUserQuestion|ExitPlanMode' && j.hooks.Stop[0].hooks[0].async === true, { uit: r.stdout, j });
  fs.writeFileSync(instPad, JSON.stringify({ theme: 'dark', permissions: { allow: ['Bash(ls)'] }, hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo klaar' }] }], PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo bash' }] }] } }));
  cli('koppel'); cli('koppel'); j = leesInst();
  test('koppel: wat er al stond blijft staan, en twee keer koppelen geeft geen dubbele hooks', j.theme === 'dark' && j.permissions.allow[0] === 'Bash(ls)' && onze(j) === 8 && j.hooks.Stop.length === 2 && j.hooks.Stop[0].hooks[0].command === 'echo klaar' && j.hooks.PreToolUse.length === 2 && fs.existsSync(instPad + '.maatje-reservekopie'), j);
  r = cli('ontkoppel'); j = leesInst();
  test('ontkoppel: alleen de hooks van Maatje zijn weg', r.status === 0 && onze(j) === 0 && j.hooks.Stop.length === 1 && j.hooks.PreToolUse[0].matcher === 'Bash' && !j.hooks.SessionEnd && j.theme === 'dark', j);
  r = cli('ontkoppel');
  test('ontkoppel als er niets gekoppeld is: verandert niets', /niets veranderd/.test(r.stdout), r.stdout);
  fs.writeFileSync(instPad, '{ kapot');
  r = cli('koppel');
  test('koppel: een kapot instellingenbestand wordt niet aangeraakt', r.status !== 0 && fs.readFileSync(instPad, 'utf8') === '{ kapot', { code: r.status, uit: r.stdout });
  fs.rmSync(tmp, { recursive: true, force: true });

  // ---- tien minuten uit zichzelf ----
  await doe('stop', 'vrij aan');
  const f1 = (await status()).foutTel, xs = new Set();
  let binnen = true;
  for (let i = 0; i < 40; i++) {
    await stap(15, 1 / 30);
    s = await status();
    xs.add(Math.round(s.hoofd.x / 100));
    if (s.hoofd.x < 0 || s.hoofd.x > W || s.hoofd.y > VL || s.hoofd.y < 0) binnen = false;
    if (i === 6) await foto('vanzelf', { rond: true });
  }
  s = await status();
  test('10 minuten vanzelf: geen fouten', s.foutTel === f1, s.fouten);
  test('10 minuten vanzelf: blijft binnen beeld en komt op veel plekken', binnen && xs.size >= 5, { binnen, plekken: xs.size });
  u = await v({ wat: 'schoon' });
  test('10 minuten vanzelf: doek blijft schoon', u.vuil === 0, u);
  s = await status();
  test('er zijn geluiden gevraagd (spring, land, praat)', s.klanken.spring > 0 && s.klanken.land > 0 && s.klanken.praat > 0, s.klanken);
  test('in de hele proef geen enkele fout in het programma', s.foutTel === 0 && fout0 === 0, s.fouten);
}

hoofd().then(c => process.exit(c), e => { console.log('Proef mislukt: ' + e.stack); process.exit(1); });
