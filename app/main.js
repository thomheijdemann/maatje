'use strict';
/* MAATJE - het hoofdprogramma (Electron).
   - een doorzichtig venster over het hele bureaublad; klikken gaan er dwars doorheen
   - een icoontje bij de klok (rechtsklik = menu)
   - een pijp (named pipe) waarover Claude opdrachten stuurt: zie ../maatje.js
   Starten voor een proef zonder venster: electron.exe app --proef  */
const { app, BrowserWindow, screen, ipcMain, Tray, Menu, nativeImage } = require('electron');
const net = require('net');
const fs = require('fs');
const path = require('path');

const ARGS = process.argv.slice(2);
const PROEF = ARGS.includes('--proef');
const optie = naam => { const a = ARGS.find(x => x.startsWith('--' + naam + '=')); return a ? a.slice(naam.length + 3) : null; };
const PIJP = '\\\\.\\pipe\\' + (PROEF ? 'maatje-proef' : 'maatje');

app.setName('Maatje');
app.setPath('userData', path.join(app.getPath('appData'), PROEF ? 'Maatje-proef' : 'Maatje'));
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

const INSTPAD = path.join(app.getPath('userData'), 'instellingen.json');
const inst = { kleur: '#d97757', maat: 6, hoed: 'geen', geluid: true, vrij: true, meeleven: true, schermen: 'alle' };
let win = null, tray = null, wereld = null, klaar = false, zichtbaar = true;

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
    if (i.schermen === 'primair') inst.schermen = 'primair';
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
  win = new BrowserWindow({
    x: wereld.x, y: wereld.y, width: wereld.w, height: wereld.h,
    show: false, frame: false, transparent: true, backgroundColor: '#00000000',
    resizable: false, movable: false, minimizable: false, maximizable: false, fullscreenable: false,
    skipTaskbar: true, focusable: false, hasShadow: false, thickFrame: false, alwaysOnTop: !PROEF, title: 'Maatje',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false },
  });
  win.setMenu(null);
  win.setIgnoreMouseEvents(true, { forward: true });          // klikken gaan erdoorheen
  if (!PROEF) win.setAlwaysOnTop(true, 'screen-saver');
  win.loadFile(path.join(__dirname, 'index.html'));
  win.webContents.on('did-finish-load', () => {
    klaar = false;
    win.setBounds({ x: wereld.x, y: wereld.y, width: wereld.w, height: wereld.h });
    let gebruiker = 'jij';                           // voor {naam} in een tekst: de naam waarmee je op deze pc bent aangemeld
    if (!PROEF) { try { gebruiker = String(require('os').userInfo().username || 'jij').slice(0, 24); } catch (e) { /* dan maar "jij" */ } }
    win.webContents.send('begin', { wereld, inst, proef: PROEF, zaad: PROEF ? 12345 : 0, gebruiker });
  });
  win.webContents.on('render-process-gone', () => { klaar = false; setTimeout(() => { if (win) win.reload(); }, 500); });
  win.on('closed', () => { win = null; });
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
}

/* ---- wat het venster terugstuurt ---- */
const open = new Map();
let volgnr = 1;
ipcMain.on('klaar', () => { klaar = true; if (!PROEF && zichtbaar && win) { win.showInactive(); win.setAlwaysOnTop(true, 'screen-saver'); } });
ipcMain.on('antwoord', (e, nr, u) => { const f = open.get(nr); if (f) { open.delete(nr); f(u); } });
ipcMain.on('muis', (e, pakken) => { if (win) win.setIgnoreMouseEvents(!pakken, { forward: true }); });
ipcMain.on('zicht', (e, aan) => zetZicht(!!aan, true));
ipcMain.on('bewaar', (e, i) => {
  for (const k of ['kleur', 'maat', 'hoed', 'geluid', 'vrij', 'meeleven']) if (i && k in i) inst[k] = i[k];
  schrijfInst();
  if (tray) { tray.setImage(icoon(32)); werkMenuBij(); }
});

/* ---- de pijp: een regel JSON erin, een regel JSON eruit ---- */
function stuur(sock, u) { try { sock.write(JSON.stringify(u) + '\n'); } catch (e) { /* de vrager is al weg */ } }
function behandel(regel, sock) {
  let b;
  try { b = JSON.parse(regel); } catch (e) { return stuur(sock, { ok: false, fout: 'dat is geen geldige JSON' }); }
  const terug = u => stuur(sock, Object.assign({ id: b.id }, u));
  if (b.wat === 'ping') return terug({ ok: true, klaar, proef: PROEF, pid: process.pid });
  if (b.wat === 'afsluiten') { terug({ ok: true }); setTimeout(() => app.quit(), 60); return; }
  if (!win || !klaar) return terug({ ok: false, fout: 'Maatje is nog aan het opstarten' });
  const nr = volgnr++;
  open.set(nr, u => {
    u = u || { ok: false, fout: 'geen antwoord' };
    if (b.wat === 'foto' && u.ok && u.png) {
      try {
        const pad = path.resolve(String(b.pad || ''));
        if (!/\.png$/i.test(pad)) throw new Error('het pad moet op .png eindigen');
        fs.mkdirSync(path.dirname(pad), { recursive: true });
        fs.writeFileSync(pad, Buffer.from(u.png.split(',')[1], 'base64'));
        u = { ok: true, pad, breed: u.breed, hoog: u.hoog };
      } catch (e) { u = { ok: false, fout: e.message }; }
    }
    if (b.wat === 'status' && u.ok) { u.venster = win.getBounds(); u.vensterZichtbaar = win.isVisible(); u.pid = process.pid; }
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
    { label: 'Maatje', enabled: false },
    { type: 'separator' },
    { label: zichtbaar ? 'Verbergen' : 'Laten zien', click: () => zetZicht(!zichtbaar) },
    { label: 'Vanzelf rondlopen', type: 'checkbox', checked: inst.vrij, click: m => doe(['vrij ' + (m.checked ? 'aan' : 'uit')]) },
    { label: 'Meeleven met Claude', type: 'checkbox', checked: inst.meeleven, click: m => doe(['meeleven ' + (m.checked ? 'aan' : 'uit')]) },
    { label: 'Geluid', type: 'checkbox', checked: inst.geluid, click: m => doe(['geluid ' + (m.checked ? 'aan' : 'uit')]) },
    { type: 'separator' },
    { label: 'Geef een show', click: () => { try { doe(fs.readFileSync(path.join(__dirname, '..', 'shows', 'show.txt'), 'utf8').split(/\r?\n/)); } catch (e) { /* geen show */ } } },
    { label: 'Opruimen (vriendjes en bal weg)', click: () => doe(['stop', 'opruimen']) },
    { type: 'separator' },
    { label: 'Afsluiten', click: () => app.quit() },
  ]));
}
function maakTray() {
  tray = new Tray(icoon(32));
  tray.setToolTip('Maatje');
  tray.on('click', () => { if (!zichtbaar) zetZicht(true); else doe(['zwaai']); });
  werkMenuBij();
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.whenReady().then(() => {
    leesInst();
    maakVenster();
    if (!PROEF) maakTray();
    startPijp();
    for (const ev of ['display-added', 'display-removed', 'display-metrics-changed']) screen.on(ev, () => setTimeout(herindeel, 300));
  });
  app.on('window-all-closed', () => app.quit());
}
