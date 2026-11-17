#!/usr/bin/env node
'use strict';
/* MAATJE - de bediening. Hiermee stuurt Claude (of jij) het poppetje aan.

   node maatje.js start                 start Maatje (doet niets als hij al loopt)
   node maatje.js sluit                 sluit Maatje af
   node maatje.js status                waar is hij, wat doet hij
   node maatje.js hulp                  alle opdrachten met uitleg
   node maatje.js <opdrachten>          bijvoorbeeld:  node maatje.js "loop midden; zeg Hoi!; spring"
   node maatje.js speel <bestand>       een heel verhaal uit een tekstbestand (één opdracht per regel)
   node maatje.js show                  de show uit shows/show.txt
   node maatje.js foto <bestand.png>    plaatje van wat hij op dit moment tekent (--rond = alleen om hem heen)
   node maatje.js koppel                laat Maatje meeleven met Claude Code (zet hooks in ~/.claude/settings.json)
   node maatje.js ontkoppel             haalt die hooks weer weg

   --wacht  = pas terugkomen als hij klaar is       --proef = praat met de proefversie zonder venster */
const net = require('net');
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const HIER = __dirname;

/* Electron is het programma waar Maatje in draait. Het komt met "npm install" in de map node_modules. */
function zoekElectron() {
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
  throw new Error('Electron is er nog niet. Typ in deze map eerst:  npm install');
}

/* ---- meeleven: de koppeling met Claude Code aan- of uitzetten ----
   Claude Code kan bij elke gebeurtenis een scriptje starten ("hooks"). Wij zetten haak.js erin.
   Wat er al in de instellingen stond blijft staan, en er wordt eerst een reservekopie gemaakt. */
const HAAK_BIJ = { UserPromptSubmit: '', PreToolUse: '', PostToolUse: 'AskUserQuestion|ExitPlanMode', PermissionRequest: '', Notification: '', SubagentStop: '', Stop: '', SessionEnd: '' };
function koppel(aan) {
  const pad = process.env.MAATJE_SETTINGS || path.join(os.homedir(), '.claude', 'settings.json');
  const haak = path.join(HIER, 'haak.js'), glad = p => path.resolve(String(p)).replace(/\\/g, '/').toLowerCase();
  let tekst = null, j = {};
  try { tekst = fs.readFileSync(pad, 'utf8').replace(/^﻿/, ''); } catch (e) { if (e.code !== 'ENOENT') throw new Error('Ik kan ' + pad + ' niet openen: ' + e.message); }
  if (tekst !== null && tekst.trim()) {
    try { j = JSON.parse(tekst); } catch (e) { j = null; }
    if (!j || typeof j !== 'object' || Array.isArray(j)) throw new Error('Ik kan ' + pad + ' niet lezen (er staat een fout in). Ik heb niets veranderd.');
  }
  const onze = h => !!h && h.type === 'command' && ((Array.isArray(h.args) && h.args.some(a => glad(a) === glad(haak))) || (typeof h.command === 'string' && h.command.replace(/\\/g, '/').toLowerCase().includes(glad(haak))));
  const hooks = j.hooks && typeof j.hooks === 'object' && !Array.isArray(j.hooks) ? j.hooks : {};
  let weg = 0;
  for (const ev of Object.keys(hooks)) {             // eerst onze oude regels eruit, zodat ze er nooit dubbel in komen
    if (!Array.isArray(hooks[ev])) continue;
    hooks[ev] = hooks[ev].map(g => {
      if (!g || !Array.isArray(g.hooks)) return g;
      const over = g.hooks.filter(h => { if (onze(h)) { weg++; return false; } return true; });
      return over.length || !g.hooks.length ? Object.assign({}, g, { hooks: over }) : null;
    }).filter(g => g !== null);
    if (!hooks[ev].length) delete hooks[ev];
  }
  if (!aan && !weg) return 'Maatje was niet gekoppeld aan Claude Code. Er is niets veranderd.';
  if (aan) for (const ev in HAAK_BIJ) {
    const g = { hooks: [{ type: 'command', command: 'node', args: [haak.replace(/\\/g, '/')], async: true, timeout: 5 }] };
    if (HAAK_BIJ[ev]) g.matcher = HAAK_BIJ[ev];
    (hooks[ev] = hooks[ev] || []).push(g);
  }
  if (Object.keys(hooks).length) j.hooks = hooks; else delete j.hooks;
  fs.mkdirSync(path.dirname(pad), { recursive: true });
  if (tekst !== null) fs.writeFileSync(pad + '.maatje-reservekopie', tekst);
  fs.writeFileSync(pad + '.nieuw', JSON.stringify(j, null, 2) + '\n');
  fs.renameSync(pad + '.nieuw', pad);
  return (aan ? 'Gekoppeld: Maatje leeft nu mee met Claude Code.' : 'Ontkoppeld: Maatje leeft niet meer mee met Claude Code.') +
    '\nAangepast: ' + pad + (tekst !== null ? '\nReservekopie: ' + pad + '.maatje-reservekopie' : '') +
    (aan ? '\nVerplaats je deze map, typ dan eerst "node maatje.js ontkoppel" en daarna in de nieuwe map "node maatje.js koppel".' : '');
}

function vraag(b, pijp, maxMs) {
  return new Promise((goed, fout) => {
    const sock = net.connect(pijp);
    let buf = '', klaar = false;
    const einde = (f, v) => { if (klaar) return; klaar = true; clearTimeout(klok); sock.destroy(); f(v); };
    const klok = setTimeout(() => einde(fout, new Error('geen antwoord van Maatje')), maxMs || 8000);
    sock.setEncoding('utf8');
    sock.on('connect', () => sock.write(JSON.stringify(b) + '\n'));
    sock.on('data', d => {
      buf += d;
      const i = buf.indexOf('\n');
      if (i >= 0) { try { einde(goed, JSON.parse(buf.slice(0, i))); } catch (e) { einde(fout, e); } }
    });
    sock.on('error', e => einde(fout, e));
    sock.on('close', () => einde(fout, new Error('de verbinding viel weg')));
  });
}
const slaap = ms => new Promise(r => setTimeout(r, ms));
async function leeft(pijp) { try { const u = await vraag({ wat: 'ping' }, pijp, 1500); return !!(u.ok && u.klaar); } catch (e) { return false; } }

async function start(pijp) {
  if (await leeft(pijp)) return 'Maatje liep al.';
  const exe = zoekElectron(), appMap = path.join(HIER, 'app');
  const regel = '"' + exe + '" "' + appMap + '"';
  try {                                               // via Windows zelf starten: dan blijft hij leven als dit venster dichtgaat
    cp.execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      "$r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = '" + regel.replace(/'/g, "''") + "' }; if ($r.ReturnValue -ne 0) { exit 1 }"], { stdio: 'ignore', windowsHide: true });
  } catch (e) {
    cp.spawn(exe, [appMap], { detached: true, stdio: 'ignore' }).unref();
  }
  for (let i = 0; i < 80; i++) { await slaap(250); if (await leeft(pijp)) return 'Maatje is gestart.'; }
  throw new Error('Maatje start niet op (20 seconden gewacht).');
}

function toonHulp(lijst) {
  const groepen = {};
  for (const o of lijst) (groepen[o.soort] = groepen[o.soort] || []).push(o);
  let uit = 'OPDRACHTEN VOOR MAATJE (één per regel; in één keer met ; ertussen)\n';
  for (const g in groepen) {
    uit += '\n' + g.toUpperCase() + '\n';
    for (const o of groepen[g]) uit += '  ' + (o.naam + (o.ook.length ? ' (' + o.ook.join(', ') + ')' : '')).padEnd(14) + o.hulp + '\n' + ' '.repeat(16) + 'bijv.: ' + o.vb + '\n';
  }
  uit += '\nEXTRA\n  + ervoor       niet wachten tot het klaar is:  +zeg Kijk!  en dan  spring\n';
  uit += '  herhaal 3      ... einde   = dat stuk drie keer\n  # ervoor       = een regel met uitleg, wordt overgeslagen\n';
  return uit;
}

async function hoofd() {
  const args = process.argv.slice(2);
  const vlag = n => { const i = args.indexOf('--' + n); if (i < 0) return false; args.splice(i, 1); return true; };
  const PROEF = vlag('proef'), WACHT = vlag('wacht'), ROND = vlag('rond'), DOOR = vlag('doorzichtig');
  const pijp = '\\\\.\\pipe\\' + (PROEF ? 'maatje-proef' : 'maatje');
  const wat = (args[0] || 'hulp').toLowerCase();

  if (process.platform !== 'win32') { console.log('Maatje werkt alleen op Windows.'); return 1; }
  if (wat === 'koppel' || wat === 'ontkoppel') { console.log(koppel(wat === 'koppel')); return 0; }
  if (wat === 'start') { console.log(await start(pijp)); return 0; }
  if (wat === 'sluit') {
    if (!(await leeft(pijp))) { console.log('Maatje liep niet.'); return 0; }
    await vraag({ wat: 'afsluiten' }, pijp).catch(() => {});
    console.log('Maatje is afgesloten.');
    return 0;
  }
  if (wat === 'status') {
    if (!(await leeft(pijp))) { console.log('Maatje loopt niet. Starten: node maatje.js start'); return 1; }
    console.log(JSON.stringify(await vraag({ wat: 'status' }, pijp), null, 1));
    return 0;
  }
  if (!PROEF && !(await leeft(pijp))) await start(pijp);

  if (wat === 'hulp' && args.length <= 1) { const u = await vraag({ wat: 'hulp' }, pijp); console.log(toonHulp(u.opdrachten)); return 0; }
  if (wat === 'foto') {
    if (!args[1]) { console.log('Zo: node maatje.js foto plaatje.png'); return 1; }
    const u = await vraag({ wat: 'foto', pad: path.resolve(args[1]), rond: ROND, kleur: DOOR ? null : '#262a31' }, pijp, 20000);
    console.log(u.ok ? 'Foto: ' + u.pad + ' (' + u.breed + ' x ' + u.hoog + ')' : 'Mislukt: ' + u.fout);
    return u.ok ? 0 : 1;
  }
  let regels;
  if (wat === 'speel' || wat === 'show') {
    let bestand = wat === 'show' ? path.join(HIER, 'shows', 'show.txt') : args[1];
    if (!bestand) { console.log('Zo: node maatje.js speel shows/hallo.txt'); return 1; }
    if (!fs.existsSync(bestand)) { const a = path.join(HIER, 'shows', bestand.replace(/\.txt$/i, '') + '.txt'); if (fs.existsSync(a)) bestand = a; }
    if (!fs.existsSync(bestand)) { console.log('Dat bestand vind ik niet: ' + bestand); return 1; }
    regels = fs.readFileSync(bestand, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
  } else regels = args.join(' ').split(';').map(r => r.trim()).filter(Boolean);

  const u = await vraag({ wat: 'doe', regels, wacht: WACHT, maxSec: 900 }, pijp, WACHT ? 905000 : 8000);
  if (!u.ok) {
    if (u.fouten) for (const f of u.fouten) console.log('Regel ' + f.regel + ': ' + f.tekst);
    else console.log('Mislukt: ' + u.fout);
    console.log('Er is niets gedaan. Alle opdrachten: node maatje.js hulp');
    return 1;
  }
  console.log('Goed: ' + u.aantal + (u.aantal === 1 ? ' opdracht' : ' opdrachten') + (WACHT ? (u.klaar === false ? ' (nog niet klaar na de wachttijd)' : ', en klaar') : '') + (u.let_op ? '\nLet op: ' + u.let_op : ''));
  return 0;
}

if (require.main === module) hoofd().then(c => process.exit(c), e => { console.log('Fout: ' + e.message); process.exit(1); });
else module.exports = { zoekElectron, vraag, leeft, slaap };
