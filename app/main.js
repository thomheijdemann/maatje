'use strict';
/* MAATJE - the main program (Electron).
   - one transparent window over the whole desktop; clicks go straight through it
   - the app window (the panel): all animations, your own animations, the switches
   - a little icon next to the clock (click = open the window, right-click = menu)
   - a named pipe over which Claude sends commands: see ../maatje.js
   Start it for a test without a window: electron.exe app --proef
   Other ways to start:  --do="walk middle; say Hi"  runs commands;  --hook  is what Claude Code calls
   (it only passes the event on to the running Maatje and stops again).
   The code below is written in Dutch; everything the user sees is English. */
const { app, BrowserWindow, screen, ipcMain, Tray, Menu, nativeImage } = require('electron');
const net = require('net');
const fs = require('fs');
const path = require('path');

const ARGS = process.argv.slice(app.isPackaged ? 1 : 2);
const HOOK = ARGS.includes('--hook');
const PROEF = ARGS.includes('--proef');
const ECHTVENSTERS = ARGS.includes('--echte-vensters');          // alleen voor de test: ook in een proef de echte vensters van het scherm gebruiken
const optie = naam => { const a = ARGS.find(x => x.startsWith('--' + naam + '=')); return a ? a.slice(naam.length + 3) : null; };
const PIJP = '\\\\.\\pipe\\' + (PROEF ? 'maatje-proef' : 'maatje');

app.setName('Maatje');
app.setPath('userData', path.join(app.getPath('appData'), PROEF ? 'Maatje-proef' : 'Maatje'));
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

const INSTPAD = path.join(app.getPath('userData'), 'instellingen.json');
const EIGENMAP = path.join(app.getPath('userData'), 'animations');
const STIJLEN = { top: ['geen', 'antenne', 'oren', 'hoorns', 'kuif'], vlek: ['geen', 'buik', 'strepen', 'stippen'] };
const inst = { naam: 'Maatje', kleur: '#d97757', maat: 6, hoed: 'geen', geluid: true, vrij: true, meeleven: true, skin: '', vensters: true, stijl: { top: 'geen', vlek: 'geen', wangen: false }, schermen: 'alle' };
const goedeNaam = n => typeof n === 'string' && n.length >= 1 && n.length <= 20 && /^[A-Za-z0-9 .'-]+$/.test(n);
const goedeStijl = s => !!s && typeof s === 'object' && STIJLEN.top.includes(s.top) && STIJLEN.vlek.includes(s.vlek) && typeof s.wangen === 'boolean';
let vinder = null, laatsteVensters = [], vinderFout = null;
let win = null, paneel = null, tray = null, wereld = null, klaar = false, zichtbaar = true;

function leesInst() {
  if (PROEF) return;
  try {
    const i = JSON.parse(fs.readFileSync(INSTPAD, 'utf8'));
    if (typeof i.kleur === 'string' && /^#[0-9a-f]{6}$/i.test(i.kleur)) inst.kleur = i.kleur;
    if (Number.isInteger(i.maat) && i.maat >= 2 && i.maat <= 16) inst.maat = i.maat;
    if (typeof i.hoed === 'string') inst.hoed = i.hoed;
    if (typeof i.geluid === 'boolean') inst.geluid = i.geluid;
    if (typeof i.vrij === 'boolean') inst.vrij = i.vrij;
    if (typeof i.meeleven === 'boolean') inst.meeleven = i.meeleven;
    if (typeof i.skin === 'string' && /^[a-z0-9-]{0,48}$/.test(i.skin)) inst.skin = i.skin;
    if (i.schermen === 'primair') inst.schermen = 'primair';
    if (goedeNaam(i.naam)) inst.naam = i.naam;
    if (typeof i.vensters === 'boolean') inst.vensters = i.vensters;
    if (goedeStijl(i.stijl)) inst.stijl = { top: i.stijl.top, vlek: i.stijl.vlek, wangen: i.stijl.wangen };
  } catch (e) { /* nog geen instellingen: de standaard is goed */ }
}
function schrijfInst() {
  if (PROEF) return;
  try {
    fs.mkdirSync(path.dirname(INSTPAD), { recursive: true });
    fs.writeFileSync(INSTPAD + '.nieuw', JSON.stringify(inst, null, 1));
    fs.renameSync(INSTPAD + '.nieuw', INSTPAD);
  } catch (e) { /* niet erg: volgende keer weer de oude instellingen */ }
}

/* Hoe groot is de wereld? Alle schermen naast elkaar (zonder de taakbalk), zodat hij van het
   ene scherm naar het andere kan lopen. Schermen met een andere vergroting doen niet mee. */
function meetWereld() {
  if (PROEF) {
    const [W, H, n] = (optie('wereld') || '3840x1040x2').split('x').map(Number);
    const sch = [];
    for (let i = 0; i < n; i++) sch.push({ x: Math.round(W / n * i), y: 0, w: Math.round(W / n), h: H });
    return { x: 0, y: 0, w: W, h: H, dpr: 1, eerste: 0, schermen: sch };
  }
  const prim = screen.getPrimaryDisplay();
  let ds = screen.getAllDisplays().filter(d => d.scaleFactor === prim.scaleFactor);
  if (inst.schermen === 'primair' || !ds.length) ds = [prim];
  ds.sort((a, b) => a.workArea.x - b.workArea.x);
  const x0 = Math.min(...ds.map(d => d.workArea.x)), y0 = Math.min(...ds.map(d => d.workArea.y));
  const x1 = Math.max(...ds.map(d => d.workArea.x + d.workArea.width)), y1 = Math.max(...ds.map(d => d.workArea.y + d.workArea.height));
  return {
    x: x0, y: y0, w: x1 - x0, h: y1 - y0, dpr: prim.scaleFactor,
    eerste: Math.max(0, ds.findIndex(d => d.id === prim.id)),
    schermen: ds.map(d => ({ x: d.workArea.x - x0, y: d.workArea.y - y0, w: d.workArea.width, h: d.workArea.height })),
  };
}

function maakVenster() {
  wereld = meetWereld();
  win = new BrowserWindow(require('./overlay.js')(wereld, path.join(__dirname, 'preload.js'), PROEF));      // zie overlay.js: waarom het een "tool window" is
  win.setMenu(null);
  win.setIgnoreMouseEvents(true, { forward: true });          // klikken gaan erdoorheen
  if (!PROEF) win.setAlwaysOnTop(true, 'screen-saver');
  win.loadFile(path.join(__dirname, 'index.html'));
  win.webContents.on('did-finish-load', () => {
    klaar = false;
    win.setBounds({ x: wereld.x, y: wereld.y, width: wereld.w, height: wereld.h });
    let gebruiker = 'you';                           // voor {name} in een tekst: de naam waarmee je op deze pc bent aangemeld
    if (!PROEF) { try { gebruiker = String(require('os').userInfo().username || 'you').slice(0, 24); } catch (e) { /* dan maar "you" */ } }
    win.webContents.send('begin', { wereld, inst, proef: PROEF, zaad: PROEF ? 12345 : 0, gebruiker });
  });
  win.webContents.on('render-process-gone', () => { klaar = false; setTimeout(() => { if (win) win.reload(); }, 500); });
  win.on('closed', () => { win = null; if (paneel && !paneel.isDestroyed()) paneel.destroy(); });
}

/* ---- de vensters op het scherm: Maatje kan erop staan (zie vensters.js en app/js/platform.js) ---- */
function zendVensters() { if (win && klaar && !win.isDestroyed()) win.webContents.send('vensters', laatsteVensters); }
function zetVensters() {
  const aan = inst.vensters && (!PROEF || ECHTVENSTERS);
  if (!aan) { if (vinder) { vinder.stop(); vinder = null; } if (laatsteVensters.length) { laatsteVensters = []; zendVensters(); } return; }
  if (vinder) return;
  vinder = require('./vensters.js').start({
    cacheMap: app.getPath('userData'),
    bijFout: t => { vinderFout = t; },
    bijLijst: ruw => {
      const uit = [];
      for (const w of ruw.slice(0, 60)) {
        let r = { x: w.x, y: w.y, width: w.w, height: w.h };
        try { r = screen.screenToDipRect(null, r); } catch (e) { /* dan blijven het echte beeldpunten */ }
        const x = r.x - wereld.x, y = r.y - wereld.y;
        if (x + r.width <= 0 || x >= wereld.w || y >= wereld.h) continue;
        uit.push({ i: w.i, x, y, w: r.width, h: r.height, p: w.p });
      }
      laatsteVensters = uit;
      zendVensters();
    },
  });
}
function herindeel() {
  if (!win || PROEF) return;
  wereld = meetWereld();
  win.setBounds({ x: wereld.x, y: wereld.y, width: wereld.w, height: wereld.h });
  if (klaar) win.webContents.send('wereld', wereld);
}

function zetZicht(aan, vanBinnen) {
  zichtbaar = aan;
  if (win) {
    if (!aan) win.hide();
    else if (!PROEF) { win.showInactive(); win.setAlwaysOnTop(true, 'screen-saver'); }
    if (!vanBinnen && klaar) win.webContents.send('vraag', 0, { wat: 'zicht', aan });
  }
  werkMenuBij();
  naarPaneel('stand');
}

/* ---- het app-venster ---- */
function openPaneel() {
  if (paneel && !paneel.isDestroyed()) { if (!PROEF) { if (paneel.isMinimized()) paneel.restore(); paneel.show(); paneel.focus(); } return paneel; }
  paneel = new BrowserWindow({
    width: 1060, height: 720, minWidth: 780, minHeight: 520, show: false, title: inst.naam, backgroundColor: '#1b1a18', icon: icoon(64), autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload-paneel.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false },
  });
  paneel.setMenu(null);
  paneel.loadFile(path.join(__dirname, 'paneel.html'));
  paneel.once('ready-to-show', () => { if (!PROEF && paneel) paneel.show(); });
  paneel.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  paneel.on('closed', () => { paneel = null; });
  return paneel;
}
function naarPaneel(kanaal) { if (paneel && !paneel.isDestroyed()) paneel.webContents.send(kanaal); }

/* ---- eigen animaties: bestanden in de map "animations" bij de instellingen ---- */
const SOORTEN = ['gif', 'png', 'apng', 'webp', 'jpg', 'jpeg', 'txt'];
function eigenLijst() {
  let namen = [];
  try { namen = fs.readdirSync(EIGENMAP); } catch (e) { return []; }
  const uit = [];
  for (const b of namen) {
    const m = /^([a-z0-9-]{1,40})\.([a-z]+)$/.exec(b);
    if (!m || !SOORTEN.includes(m[2])) continue;
    try { const st = fs.statSync(path.join(EIGENMAP, b)); uit.push({ naam: m[1], ext: m[2], grootte: st.size, stempel: st.size + '-' + Math.round(st.mtimeMs) }); } catch (e) { /* net weggehaald */ }
  }
  return uit;
}
function eigenPad(naam) { const x = eigenLijst().find(e => e.naam === String(naam)); return x ? path.join(EIGENMAP, x.naam + '.' + x.ext) : null; }
function meldEigen() { for (const w of [win, paneel]) if (w && !w.isDestroyed()) w.webContents.send('eigen-nieuw'); }
function eigenErbij(bestandsnaam, bytes) {
  const m = /^(.*)\.([A-Za-z0-9]+)$/.exec(path.basename(String(bestandsnaam)));
  if (!m) throw new Error('the file needs an ending such as .gif or .txt');
  const ext = m[2].toLowerCase();
  if (!SOORTEN.includes(ext)) throw new Error('I can only take these files: ' + SOORTEN.join(', '));
  const naam = m[1].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'my-animation';
  const buf = Buffer.from(bytes);
  if (!buf.length) throw new Error('the file is empty');
  if (buf.length > 8 * 1024 * 1024) throw new Error('the file is larger than 8 MB');
  if (eigenLijst().length >= 200 && !eigenPad(naam)) throw new Error('that is the limit: 200 animations of your own');
  fs.mkdirSync(EIGENMAP, { recursive: true });
  const oud = eigenPad(naam);                         // dezelfde naam = vervangen
  if (oud) fs.unlinkSync(oud);
  fs.writeFileSync(path.join(EIGENMAP, naam + '.' + ext), buf);
  meldEigen();
  return { ok: true, naam, ext };
}
function eigenWeg(naam) { const p = eigenPad(naam); if (p) fs.unlinkSync(p); meldEigen(); return { ok: true, weg: !!p }; }
const veilig = fn => { try { return fn(); } catch (e) { return { ok: false, fout: e.message }; } };
ipcMain.handle('eigen-lijst', () => eigenLijst());
ipcMain.handle('eigen-lees', (e, naam) => { const p = eigenPad(naam); try { return p ? fs.readFileSync(p) : null; } catch (err) { return null; } });
ipcMain.handle('eigen-erbij', (e, naam, bytes) => veilig(() => eigenErbij(naam, bytes)));
ipcMain.handle('eigen-weg', (e, naam) => veilig(() => eigenWeg(naam)));

/* ---- wat de vensters terugsturen en vragen ---- */
const open = new Map();
let volgnr = 1;
ipcMain.on('klaar', () => {
  klaar = true;
  zetVensters(); zendVensters();
  if (!PROEF && zichtbaar && win) { win.showInactive(); win.setAlwaysOnTop(true, 'screen-saver'); }
  const doen = optie('do');
  if (doen) doe(doen.split(';').map(s => s.trim()).filter(Boolean));
});
ipcMain.on('antwoord', (e, nr, u) => { const f = open.get(nr); if (f) { open.delete(nr); f(u); } });
ipcMain.on('muis', (e, pakken) => { if (win) win.setIgnoreMouseEvents(!pakken, { forward: true }); });
ipcMain.on('zicht', (e, aan) => zetZicht(!!aan, true));
ipcMain.on('bewaar', (e, i) => {
  for (const k of ['kleur', 'maat', 'hoed', 'geluid', 'vrij', 'meeleven', 'skin']) if (i && k in i) inst[k] = i[k];
  if (i && goedeNaam(i.naam)) inst.naam = i.naam;
  if (i && typeof i.vensters === 'boolean') inst.vensters = i.vensters;
  if (i && goedeStijl(i.stijl)) inst.stijl = { top: i.stijl.top, vlek: i.stijl.vlek, wangen: i.stijl.wangen };
  schrijfInst();
  zetVensters();
  if (tray) { tray.setImage(icoon(32)); tray.setToolTip(inst.naam); werkMenuBij(); }
  if (paneel && !paneel.isDestroyed()) paneel.setTitle(inst.naam);
  naarPaneel('stand');
});
function vraagVenster(b) {                           // een vraag aan het poppetje-venster, met het antwoord als belofte
  return new Promise(res => {
    if (!win || !klaar) return res({ ok: false, fout: 'Maatje is still starting up' });
    const nr = volgnr++;
    open.set(nr, res);
    win.webContents.send('vraag', nr, b);
    setTimeout(() => { if (open.delete(nr)) res({ ok: false, fout: 'no answer' }); }, 20000);
  });
}
function haakVanDezeApp() {                          // de verpakte app is zelf de haak; uit de broncode is het "node hook.js"
  const map = path.join(__dirname, '..');
  return app.isPackaged ? { map, haak: { command: process.execPath.replace(/\\/g, '/'), args: ['--hook'] } } : { map };
}
ipcMain.handle('paneel-vraag', (e, b) => (b && ['doe', 'status', 'anims', 'hulp'].includes(b.wat) ? vraagVenster({ wat: b.wat, regels: b.regels }) : { ok: false, fout: 'not allowed' }));
ipcMain.handle('paneel-stand', () => ({ ok: true, inst, versie: app.getVersion(), verpakt: app.isPackaged, zichtbaar, map: EIGENMAP, vensters: vinder ? vinder.stand() : { loopt: false, vensters: 0, fout: vinderFout }, koppel: require('../koppel.js').koppelStand(haakVanDezeApp()) }));
ipcMain.handle('paneel-zicht', (e, aan) => { zetZicht(!!aan); return { ok: true }; });
ipcMain.handle('paneel-stop', () => { setTimeout(() => app.quit(), 60); return { ok: true }; });
ipcMain.handle('paneel-show', () => veilig(() => vraagVenster({ wat: 'doe', regels: fs.readFileSync(path.join(__dirname, '..', 'shows', 'show.txt'), 'utf8').split(/\r?\n/) })));
ipcMain.handle('paneel-koppel', (e, aan) => veilig(() => {
  if (PROEF && !process.env.MAATJE_SETTINGS) throw new Error('a test never touches your real Claude Code settings');
  return { ok: true, tekst: require('../koppel.js').koppel(!!aan, haakVanDezeApp()) };
}));

/* ---- de pijp: een regel JSON erin, een regel JSON eruit ---- */
function stuur(sock, u) { try { sock.write(JSON.stringify(u) + '\n'); } catch (e) { /* de vrager is al weg */ } }
async function proefVraag(b) {                       // alleen in een proef: bestanden toevoegen en in het app-venster kijken
  if (b.wat === 'eigen-erbij') return veilig(() => eigenErbij(b.naam || b.bestand, fs.readFileSync(b.bestand)));
  if (b.wat === 'eigen-weg') return veilig(() => eigenWeg(b.naam));
  if (b.wat === 'eigen-leeg') { for (const x of eigenLijst()) eigenWeg(x.naam); return { ok: true }; }
  if (b.wat === 'paneel-js' || b.wat === 'paneel-foto' || b.wat === 'paneel-maat') {
    const p = openPaneel();
    if (b.wat === 'paneel-maat') { p.setContentSize(Math.round(b.w), Math.round(b.h)); return { ok: true }; }
    if (p.webContents.isLoading()) await new Promise(r => p.webContents.once('did-finish-load', r));
    if (b.wat === 'paneel-js') return { ok: true, uit: await p.webContents.executeJavaScript(String(b.js), true) };
    await p.webContents.capturePage();                 // een onzichtbaar venster geeft eerst nog het vorige beeld
    await new Promise(r => setTimeout(r, 120));
    const beeld = await p.webContents.capturePage();
    fs.mkdirSync(path.dirname(path.resolve(b.pad)), { recursive: true });
    fs.writeFileSync(path.resolve(b.pad), beeld.toPNG());
    return { ok: true, pad: path.resolve(b.pad), maat: beeld.getSize() };
  }
  return null;
}
function behandel(regel, sock) {
  let b;
  try { b = JSON.parse(regel); } catch (e) { return stuur(sock, { ok: false, fout: 'that is not valid JSON' }); }
  const terug = u => stuur(sock, Object.assign({ id: b.id }, u));
  if (b.wat === 'ping') return terug({ ok: true, klaar, proef: PROEF, pid: process.pid });
  if (b.wat === 'afsluiten') { terug({ ok: true }); setTimeout(() => app.quit(), 60); return; }
  if (b.wat === 'paneel') { openPaneel(); return terug({ ok: true }); }
  if (!win || !klaar) return terug({ ok: false, fout: 'Maatje is still starting up' });
  if (PROEF && /^(eigen-|paneel-)/.test(String(b.wat))) { proefVraag(b).then(u => terug(u || { ok: false, fout: 'unknown request' }), e => terug({ ok: false, fout: String(e && e.message ? e.message : e) })); return; }
  const nr = volgnr++;
  open.set(nr, u => {
    u = u || { ok: false, fout: 'no answer' };
    if (b.wat === 'foto' && u.ok && u.png) {
      try {
        const pad = path.resolve(String(b.pad || ''));
        if (!/\.png$/i.test(pad)) throw new Error('the file name must end in .png');
        fs.mkdirSync(path.dirname(pad), { recursive: true });
        fs.writeFileSync(pad, Buffer.from(u.png.split(',')[1], 'base64'));
        u = { ok: true, pad, breed: u.breed, hoog: u.hoog };
      } catch (e) { u = { ok: false, fout: e.message }; }
    }
    if (b.wat === 'status' && u.ok) { u.venster = win.getBounds(); u.vensterZichtbaar = win.isVisible(); u.pid = process.pid; u.verpakt = app.isPackaged; }
    terug(u);
  });
  win.webContents.send('vraag', nr, b);
}
function startPijp() {
  const server = net.createServer(sock => {
    let buf = '';
    sock.setEncoding('utf8');
    sock.on('data', d => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) { const regel = buf.slice(0, i); buf = buf.slice(i + 1); if (regel.trim()) behandel(regel, sock); }
    });
    sock.on('error', () => {});
  });
  server.on('error', () => app.quit());      // er draait er al een
  server.listen(PIJP);
}

/* ---- het icoontje bij de klok ---- */
function icoon(n) {
  const buf = Buffer.alloc(n * n * 4);
  const s = Math.max(1, Math.floor(n / 16)), ox = Math.floor((n - 14 * s) / 2), oy = Math.floor((n - 10 * s) / 2);
  const kl = [1, 3, 5].map(i => parseInt(inst.kleur.slice(i, i + 2), 16));
  const zet = (gx, gy, r, g, b) => {
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const i = ((oy + gy * s + y) * n + ox + gx * s + x) * 4;
      buf[i] = b; buf[i + 1] = g; buf[i + 2] = r; buf[i + 3] = 255;
    }
  };
  for (let y = 0; y < 10; y++) for (let x = 0; x < 14; x++) {
    const lijf = x >= 2 && x <= 11 && y <= 7, arm = (x < 2 || x > 11) && (y === 4 || y === 5);
    const poot = y >= 8 && (x === 2 || x === 4 || x === 9 || x === 11), oog = (x === 4 || x === 9) && (y === 2 || y === 3);
    if (oog) zet(x, y, 20, 20, 19); else if (lijf || arm || poot) zet(x, y, kl[0], kl[1], kl[2]);
  }
  return nativeImage.createFromBitmap(buf, { width: n, height: n });
}
function doe(regels) { if (win && klaar) win.webContents.send('vraag', 0, { wat: 'doe', regels }); }
function werkMenuBij() {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open ' + inst.naam, click: () => openPaneel() },
    { type: 'separator' },
    { label: zichtbaar ? 'Hide' : 'Show', click: () => zetZicht(!zichtbaar) },
    { label: 'Wander around by himself', type: 'checkbox', checked: inst.vrij, click: m => doe(['vrij ' + (m.checked ? 'aan' : 'uit')]) },
    { label: 'Follow along with Claude', type: 'checkbox', checked: inst.meeleven, click: m => doe(['meeleven ' + (m.checked ? 'aan' : 'uit')]) },
    { label: 'Sound', type: 'checkbox', checked: inst.geluid, click: m => doe(['geluid ' + (m.checked ? 'aan' : 'uit')]) },
    { type: 'separator' },
    { label: 'Play the show', click: () => { try { doe(fs.readFileSync(path.join(__dirname, '..', 'shows', 'show.txt'), 'utf8').split(/\r?\n/)); } catch (e) { /* geen show */ } } },
    { label: 'A random animation', click: () => doe(['anim random']) },
    { label: 'Clean up (friends and ball away)', click: () => doe(['stop', 'opruimen']) },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]));
}
function maakTray() {
  tray = new Tray(icoon(32));
  tray.setToolTip(inst.naam);
  tray.on('click', () => { if (!zichtbaar) zetZicht(true); openPaneel(); });
  werkMenuBij();
}

if (HOOK) {                                           // alleen de gebeurtenis doorgeven aan de Maatje die al loopt
  let invoer = '';
  try { invoer = fs.readFileSync(0, 'utf8'); } catch (e) { /* geen invoer: dan gebeurt er niets */ }      // process.stdin werkt hier niet, dit wel
  require(path.join(__dirname, '..', 'hook.js'))(invoer);
}
else if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', (e, argv) => {            // nog een keer gestart: opdrachten uitvoeren, of het venster laten zien
    const d = argv.find(a => a.startsWith('--do='));
    if (d) doe(d.slice(5).split(';').map(s => s.trim()).filter(Boolean)); else openPaneel();
  });
  app.whenReady().then(() => {
    leesInst();
    maakVenster();
    if (!PROEF) maakTray();
    startPijp();
    if (!PROEF && !ARGS.includes('--geen-paneel') && !optie('do')) openPaneel();
    for (const ev of ['display-added', 'display-removed', 'display-metrics-changed']) screen.on(ev, () => setTimeout(herindeel, 300));
  });
  app.on('window-all-closed', () => app.quit());
  app.on('will-quit', () => { if (vinder) vinder.stop(); });
}
