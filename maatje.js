#!/usr/bin/env node
'use strict';
/* MAATJE - the remote control. This is how Claude (or you) tells the little guy what to do.

   node maatje.js start                 start Maatje (does nothing if he is already running)
   node maatje.js quit                  shut Maatje down
   node maatje.js status                where he is and what he is doing
   node maatje.js help                  every command, with an example
   node maatje.js <commands>            for example:  node maatje.js "walk middle; say Hi!; jump"
   node maatje.js play <file>           a whole story from a text file (one command per line)
   node maatje.js show                  the show from shows/show.txt
   node maatje.js photo <file.png>      a picture of what he is drawing right now (--around = only around him)
   node maatje.js anims [word]          the list of all animations (anims dance = one kind, anims jump = search)
   node maatje.js open                  open the Maatje window (all animations, your own animations, settings)
   node maatje.js connect               let Maatje follow along with Claude Code (adds hooks to ~/.claude/settings.json)
   node maatje.js disconnect            removes those hooks again

   --wait = only come back when he is done          --proef = talk to the test version without a window
   The Dutch words still work too: sluit, hulp, speel, foto, koppel, ontkoppel, --wacht, --rond.
   The code below is written in Dutch. */
const net = require('net');
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const HIER = __dirname;
const { koppel } = require('./koppel.js');
/* zit dit bestand in de verpakte app (Maatje.exe met de map resources/app ernaast)? dan is dat het programma */
const EXE = path.join(HIER, '..', '..', 'Maatje.exe');
const VERPAKT = !process.env.MAATJE_ELECTRON && path.basename(path.dirname(HIER)).toLowerCase() === 'resources' && fs.existsSync(EXE);

/* Electron is het programma waar Maatje in draait. Het komt met "npm install" in de map node_modules. */
function zoekElectron() {
  if (VERPAKT) return EXE;
  const kandidaten = [
    process.env.MAATJE_ELECTRON,
    path.join(HIER, 'node_modules', 'electron', 'dist', 'electron.exe'),
    path.join(HIER, '.electron', 'electron.exe'),
  ].filter(Boolean);
  for (const k of kandidaten) if (fs.existsSync(k)) return k;
  // nergens gevonden: pak hem uit de voorraad die Electron zelf op deze pc bewaart (als die er is)
  const voorraad = path.join(process.env.LOCALAPPDATA || '', 'electron', 'Cache');
  const zips = [];
  const zoek = (map, diep) => {
    let lijst = [];
    try { lijst = fs.readdirSync(map, { withFileTypes: true }); } catch (e) { return; }
    for (const d of lijst) {
      const p = path.join(map, d.name);
      if (d.isDirectory() && diep < 2) zoek(p, diep + 1);
      else if (/^electron-v[\d.]+-win32-x64\.zip$/.test(d.name)) zips.push(p);
    }
  };
  zoek(voorraad, 0);
  if (zips.length) {
    const doel = path.join(HIER, '.electron');
    fs.mkdirSync(doel, { recursive: true });
    cp.execFileSync(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe'), ['-xf', zips.sort().pop(), '-C', doel], { stdio: 'ignore' });
    if (fs.existsSync(path.join(doel, 'electron.exe'))) return path.join(doel, 'electron.exe');
  }
  if (fs.existsSync(path.join(HIER, 'node_modules', 'electron', 'install.js'))) throw new Error('Electron has been fetched but not unpacked yet. In this folder, type:  node node_modules/electron/install.js');
  throw new Error('Electron is not here yet. In this folder, first type:  npm install');
}

function vraag(b, pijp, maxMs) {
  return new Promise((goed, fout) => {
    const sock = net.connect(pijp);
    let buf = '', klaar = false;
    const einde = (f, v) => { if (klaar) return; klaar = true; clearTimeout(klok); sock.destroy(); f(v); };
    const klok = setTimeout(() => einde(fout, new Error('no answer from Maatje')), maxMs || 8000);
    sock.setEncoding('utf8');
    sock.on('connect', () => sock.write(JSON.stringify(b) + '\n'));
    sock.on('data', d => {
      buf += d;
      const i = buf.indexOf('\n');
      if (i >= 0) { try { einde(goed, JSON.parse(buf.slice(0, i))); } catch (e) { einde(fout, e); } }
    });
    sock.on('error', e => einde(fout, e));
    sock.on('close', () => einde(fout, new Error('the connection dropped')));
  });
}
const slaap = ms => new Promise(r => setTimeout(r, ms));
async function leeft(pijp) { try { const u = await vraag({ wat: 'ping' }, pijp, 1500); return !!(u.ok && u.klaar); } catch (e) { return false; } }

async function start(pijp) {
  if (await leeft(pijp)) return 'Maatje was already running.';
  // --geen-paneel: alleen het poppetje, niet meteen het venster van de app erbij (dat komt met: node maatje.js open)
  const exe = zoekElectron(), delen = VERPAKT ? ['--geen-paneel'] : [path.join(HIER, 'app'), '--geen-paneel'];
  const regel = '"' + exe + '" ' + delen.map(d => (d.startsWith('--') ? d : '"' + d + '"')).join(' ');
  try {                                               // via Windows zelf starten: dan blijft hij leven als dit venster dichtgaat
    cp.execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      "$r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = '" + regel.replace(/'/g, "''") + "' }; if ($r.ReturnValue -ne 0) { exit 1 }"], { stdio: 'ignore', windowsHide: true });
  } catch (e) {
    cp.spawn(exe, delen, { detached: true, stdio: 'ignore' }).unref();
  }
  for (let i = 0; i < 80; i++) { await slaap(250); if (await leeft(pijp)) return 'Maatje has started.'; }
  throw new Error('Maatje does not start (waited 20 seconds).');
}

function toonHulp(lijst) {
  const groepen = {};
  for (const o of lijst) (groepen[o.soort] = groepen[o.soort] || []).push(o);
  let uit = 'COMMANDS FOR MAATJE (one per line; several at once with ; in between)\n';
  for (const g in groepen) {
    uit += '\n' + g.toUpperCase() + '\n';
    for (const o of groepen[g]) uit += '  ' + (o.naam + (o.ook.length ? ' (' + o.ook.join(', ') + ')' : '')).padEnd(24) + ' ' + o.hulp + '\n' + ' '.repeat(27) + 'e.g.: ' + o.vb + '\n';
  }
  uit += '\nEXTRAS\n  + in front               do not wait until it is done:  +say Look!  and then  jump\n';
  uit += '  repeat 3 ... end         that part three times\n  # in front               a line of explanation, it is skipped\n';
  uit += '  {name}                   in a text becomes the name you are signed in with on this pc\n';
  uit += '\nThe words in brackets mean the same; most of them are Dutch.\n';
  return uit;
}

/* de status in het Engels (in het programma zelf heten de dingen Nederlands) */
function engelsStatus(s) {
  const h = s.hoofd, m = s.meeleven || {};
  return {
    ok: true, version: s.versie, hidden: s.verborgen, busy: s.bezig,
    world: { width: s.W, height: s.H, screens: s.schermen },
    pet: {
      x: h.x, y: h.y, on: { vloer: 'floor', rechtermuur: 'right wall', plafond: 'ceiling', linkermuur: 'left wall' }[h.waar] || h.waar,
      inTheAir: h.lucht, flying: h.vliegt, heldByMouse: h.gepakt, posture: { zit: 'sitting', slaap: 'sleeping' }[h.houding] || 'standing',
      color: h.kleur, size: h.maat, hat: h.hoedEn, doing: h.doetEn, queued: h.wachtrij, says: h.zegt, visible: h.zichtbaar,
    },
    pets: s.figuren, effects: s.effecten, particles: s.deeltjes, ball: s.bal,
    roam: s.vrij, sound: s.geluid,
    follow: { on: m.aan, sessions: m.sessies, claudeIsWorking: m.werkt, helpers: m.hulpjes, typing: m.typt },
    mouseOnPet: s.muisVast, fps: s.fps, errors: s.fouten, errorCount: s.foutTel,
    window: s.venster, windowVisible: s.vensterZichtbaar, pid: s.pid,
  };
}

async function hoofd() {
  const args = process.argv.slice(2);
  const vlag = (...namen) => { let ja = false; for (const n of namen) { const i = args.indexOf('--' + n); if (i >= 0) { args.splice(i, 1); ja = true; } } return ja; };
  const PROEF = vlag('proef', 'test'), WACHT = vlag('wait', 'wacht'), ROND = vlag('around', 'rond'), DOOR = vlag('transparent', 'doorzichtig');
  const pijp = '\\\\.\\pipe\\' + (PROEF ? 'maatje-proef' : 'maatje');
  const NL = { sluit: 'quit', hulp: 'help', speel: 'play', foto: 'photo', koppel: 'connect', ontkoppel: 'disconnect' };
  let wat = (args[0] || 'help').toLowerCase();
  wat = NL[wat] || wat;

  if (process.platform !== 'win32') { console.log('Maatje only works on Windows.'); return 1; }
  if (wat === 'connect' || wat === 'disconnect') { console.log(koppel(wat === 'connect')); return 0; }
  if (wat === 'start') { console.log(await start(pijp)); return 0; }
  if (wat === 'quit') {
    if (!(await leeft(pijp))) { console.log('Maatje was not running.'); return 0; }
    await vraag({ wat: 'afsluiten' }, pijp).catch(() => {});
    console.log('Maatje has shut down.');
    return 0;
  }
  if (wat === 'status') {
    if (!(await leeft(pijp))) { console.log('Maatje is not running. Start him with: node maatje.js start'); return 1; }
    console.log(JSON.stringify(engelsStatus(await vraag({ wat: 'status' }, pijp)), null, 1));
    return 0;
  }
  if (!PROEF && !(await leeft(pijp))) await start(pijp);

  if (wat === 'help' && args.length <= 1) { const u = await vraag({ wat: 'hulp' }, pijp); console.log(toonHulp(u.opdrachten)); return 0; }
  if (wat === 'open' && args.length <= 1) { await vraag({ wat: 'paneel' }, pijp); console.log('The Maatje window is open.'); return 0; }
  if (wat === 'anims' || wat === 'animations') {
    const u = await vraag({ wat: 'anims' }, pijp), zoek = (args[1] || '').toLowerCase();
    if (!u.ok) { console.log('Failed: ' + u.fout); return 1; }
    const lijst = u.lijst.filter(a => !zoek || a.cat === zoek || a.naam.includes(zoek));
    const per = {};
    for (const a of lijst) (per[a.cat] = per[a.cat] || []).push(a.naam);
    console.log(lijst.length + (zoek ? ' of the ' + u.lijst.length : '') + ' ANIMATIONS' + (zoek ? ' for "' + zoek + '"' : '') + '   (play one with: anim <name>, a surprise with: anim random [kind])');
    for (const c in per) console.log('\n' + c.toUpperCase() + ' (' + per[c].length + ')\n  ' + per[c].join(', '));
    if (!lijst.length) console.log('\nThe kinds are: ' + u.soorten.join(', '));
    for (const f of u.fouten.concat(u.eigenFouten || [])) console.log('\nDoes not work: ' + f);
    return 0;
  }
  if (wat === 'photo') {
    if (!args[1]) { console.log('Like this: node maatje.js photo picture.png'); return 1; }
    const u = await vraag({ wat: 'foto', pad: path.resolve(args[1]), rond: ROND, kleur: DOOR ? null : '#262a31' }, pijp, 20000);
    console.log(u.ok ? 'Photo: ' + u.pad + ' (' + u.breed + ' x ' + u.hoog + ')' : 'Failed: ' + u.fout);
    return u.ok ? 0 : 1;
  }
  let regels;
  if (wat === 'play' || wat === 'show') {
    let bestand = wat === 'show' ? path.join(HIER, 'shows', 'show.txt') : args[1];
    if (!bestand) { console.log('Like this: node maatje.js play hello'); return 1; }
    if (!fs.existsSync(bestand)) { const a = path.join(HIER, 'shows', bestand.replace(/\.txt$/i, '') + '.txt'); if (fs.existsSync(a)) bestand = a; }
    if (!fs.existsSync(bestand)) { console.log('I cannot find that file: ' + bestand); return 1; }
    regels = fs.readFileSync(bestand, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
  } else regels = args.join(' ').split(';').map(r => r.trim()).filter(Boolean);

  const u = await vraag({ wat: 'doe', regels, wacht: WACHT, maxSec: 900 }, pijp, WACHT ? 905000 : 8000);
  if (!u.ok) {
    if (u.fouten) for (const f of u.fouten) console.log('Line ' + f.regel + ': ' + f.tekst);
    else console.log('Failed: ' + u.fout);
    console.log('Nothing was done. All commands: node maatje.js help');
    return 1;
  }
  console.log('OK: ' + u.aantal + (u.aantal === 1 ? ' command' : ' commands') + (WACHT ? (u.klaar === false ? ' (not finished yet after the waiting time)' : ', and done') : '') + (u.let_op ? '\nNote: ' + u.let_op : ''));
  return 0;
}

if (require.main === module) hoofd().then(c => process.exit(c), e => { console.log('Error: ' + e.message); process.exit(1); });
else module.exports = { zoekElectron, vraag, leeft, slaap };
