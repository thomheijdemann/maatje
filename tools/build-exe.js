#!/usr/bin/env node
'use strict';
/* MAATJE - builds the real program you can double-click.   node tools/build-exe.js   (or: npm run build)
   Result:  dist/Maatje-win32-x64/Maatje.exe  (the whole folder belongs to it)  and  dist/Maatje-<version>-win64.zip
   How: it takes the Electron that is already here, copies it, renames electron.exe to Maatje.exe, puts the app in
   resources/app and gives the exe its own icon and name. The icon is drawn right here in code. Putting it into the
   exe needs the package "resedit" (it comes with npm install); without it the build still works and the exe just
   keeps the Electron icon.
   --no-zip = do not make the zip.     The code below is written in Dutch. */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const cp = require('child_process');

const HIER = path.join(__dirname, '..');
const { zoekElectron } = require('../maatje.js');
const { zoekCsc } = require('../app/vensters.js');
const PAKKET = JSON.parse(fs.readFileSync(path.join(HIER, 'package.json'), 'utf8'));
const UIT = path.join(HIER, 'dist'), MAP = path.join(UIT, 'Maatje-win32-x64'), EXE = path.join(MAP, 'Maatje.exe');
const KLEUR = [0xd9, 0x77, 0x57], OOG = [0x14, 0x14, 0x13];

/* ---- het icoon: het poppetje, in blokjes, op een doorzichtige achtergrond ---- */
function poppetje(n) {                               // n x n pixels, RGBA: precies zoals hij er standaard uitziet
  const px = Buffer.alloc(n * n * 4);
  const s = Math.max(1, Math.floor(n / 14)), ox = Math.floor((n - 14 * s) / 2), oy = Math.floor((n - 10 * s) / 2);
  for (let gy = 0; gy < 10; gy++) for (let gx = 0; gx < 14; gx++) {
    const lijf = gx >= 2 && gx <= 11 && gy <= 7, arm = (gx < 2 || gx > 11) && (gy === 4 || gy === 5);
    const poot = gy >= 8 && (gx === 2 || gx === 4 || gx === 9 || gx === 11), oog = (gx === 4 || gx === 9) && (gy === 2 || gy === 3);
    const k = oog ? OOG : (lijf || arm || poot) ? KLEUR : null;
    if (!k) continue;
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const i = ((oy + gy * s + y) * n + ox + gx * s + x) * 4;
      px[i] = k[0]; px[i + 1] = k[1]; px[i + 2] = k[2]; px[i + 3] = 255;
    }
  }
  return px;
}
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function png(px, n) {
  const rij = n * 4 + 1, ruw = Buffer.alloc(rij * n);
  for (let y = 0; y < n; y++) px.copy(ruw, y * rij + 1, y * n * 4, (y + 1) * n * 4);
  const stuk = (soort, data) => {
    const lengte = Buffer.alloc(4), som = Buffer.alloc(4), td = Buffer.concat([Buffer.from(soort, 'latin1'), data]);
    lengte.writeUInt32BE(data.length); som.writeUInt32BE(crc32(td));
    return Buffer.concat([lengte, td, som]);
  };
  const kop = Buffer.alloc(13);
  kop.writeUInt32BE(n, 0); kop.writeUInt32BE(n, 4); kop[8] = 8; kop[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), stuk('IHDR', kop), stuk('IDAT', zlib.deflateSync(ruw, { level: 9 })), stuk('IEND', Buffer.alloc(0))]);
}
function bmp(px, n) {                                // zoals het in een .ico hoort: van onder naar boven, BGRA, met een masker erachter
  const kop = Buffer.alloc(40), beeld = Buffer.alloc(n * n * 4), mrij = Math.ceil(n / 32) * 4, masker = Buffer.alloc(mrij * n);
  kop.writeUInt32LE(40, 0); kop.writeInt32LE(n, 4); kop.writeInt32LE(n * 2, 8); kop.writeUInt16LE(1, 12); kop.writeUInt16LE(32, 14); kop.writeUInt32LE(beeld.length + masker.length, 20);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const van = (y * n + x) * 4, naar = ((n - 1 - y) * n + x) * 4;
    beeld[naar] = px[van + 2]; beeld[naar + 1] = px[van + 1]; beeld[naar + 2] = px[van]; beeld[naar + 3] = px[van + 3];
    if (!px[van + 3]) masker[(n - 1 - y) * mrij + (x >> 3)] |= 0x80 >> (x & 7);
  }
  return Buffer.concat([kop, beeld, masker]);
}
function ico() {
  const maten = [16, 24, 32, 48, 64, 128, 256], delen = maten.map(n => (n === 256 ? png(poppetje(n), n) : bmp(poppetje(n), n)));
  const kop = Buffer.alloc(6 + 16 * maten.length);
  kop.writeUInt16LE(1, 2); kop.writeUInt16LE(maten.length, 4);
  let plek = kop.length;
  maten.forEach((n, i) => {
    const o = 6 + 16 * i;
    kop[o] = n & 255; kop[o + 1] = n & 255; kop.writeUInt16LE(1, o + 4); kop.writeUInt16LE(32, o + 6); kop.writeUInt32LE(delen[i].length, o + 8); kop.writeUInt32LE(plek, o + 12);
    plek += delen[i].length;
  });
  return Buffer.concat([kop, ...delen]);
}

/* ---- het icoon en de naam in de exe zetten ---- */
function kleedAan(icoPad) {
  const waar = [HIER, process.env.MAATJE_NODE_MODULES && path.join(process.env.MAATJE_NODE_MODULES, '..')].filter(Boolean);
  let RE, PE;
  try {
    const p = require.resolve('resedit', { paths: waar });
    RE = require(p); PE = require(require.resolve('pe-library', { paths: [path.dirname(p)].concat(waar) }));
  } catch (e) { return 'The exe keeps the Electron icon: the package "resedit" is not here (npm install fetches it).'; }
  const exe = PE.NtExecutable.from(fs.readFileSync(EXE), { ignoreCert: true });
  const res = PE.NtExecutableResource.from(exe);
  const groepen = RE.Resource.IconGroupEntry.fromEntries(res.entries);
  const iconen = RE.Data.IconFile.from(fs.readFileSync(icoPad)).icons.map(i => i.data);
  RE.Resource.IconGroupEntry.replaceIconsForResource(res.entries, groepen.length ? groepen[0].id : 1, groepen.length ? groepen[0].lang : 1033, iconen);
  const vi = RE.Resource.VersionInfo.fromEntries(res.entries)[0];
  if (vi) {
    const [a, b, c] = PAKKET.version.split('.').map(n => parseInt(n, 10) || 0), taal = vi.getAvailableLanguages()[0] || { lang: 1033, codepage: 1200 };
    vi.setFileVersion(a, b, c, 0, taal.lang); vi.setProductVersion(a, b, c, 0, taal.lang);
    vi.setStringValues(taal, { FileDescription: 'Maatje', ProductName: 'Maatje', InternalName: 'Maatje', OriginalFilename: 'Maatje.exe', CompanyName: 'Maatje (unofficial fan project)', LegalCopyright: 'MIT License', FileVersion: PAKKET.version, ProductVersion: PAKKET.version });
    vi.outputToResourceEntries(res.entries);
  }
  res.outputResource(exe);
  fs.writeFileSync(EXE, Buffer.from(exe.generate()));
  return null;
}

const LEESMIJ = `MAATJE ${PAKKET.version}
A little pixel pet that walks across your Windows desktop. Unofficial fan project, not made by Anthropic.

START   Double-click Maatje.exe. Keep this whole folder together: the exe needs the files next to it.
        Windows may say "Windows protected your PC", because this program is not signed.
        Click "More info" and then "Run anyway".
WINDOW  The window shows every animation. Click one to see it, "Play on the desktop" to let him do it.
        The tab "My own" is for your own animations: drop a GIF or a picture, or type the moves yourself.
        Closed the window? Click the little icon next to the clock.
STOP    The little icon next to the clock -> Quit, or the button "Quit Maatje" in the window.

WINDOWS He lives on your windows: he jumps onto the top edge of your programs, walks along it and jumps on to the next one,
        all by himself. To do that, a small program (vensters.exe) checks where the windows are. It only looks at WHERE they are,
        never at what is in them. You can turn it off in the window (Settings: Stand on your windows).
LOOK    He looks like you know him. If you want, you can give him a look of his own in Settings.

FROM OUTSIDE (for scripts, or for Claude)
        Maatje.exe --do="walk middle; say Hi!; anim victory-dance"
        With Node.js there is more:  node resources/app/maatje.js help

Source code and the full manual: https://github.com/thomheijdemann/maatje
`;

function bouw() {
  if (process.platform !== 'win32') throw new Error('This builds the Windows program, so it has to run on Windows.');
  const bron = path.dirname(zoekElectron());
  if (!fs.existsSync(path.join(bron, 'electron.exe'))) throw new Error('I cannot find electron.exe in ' + bron);
  try { fs.rmSync(MAP, { recursive: true, force: true }); } catch (e) { throw new Error('I cannot empty ' + MAP + '. Is the Maatje from that folder still running? Quit it first.'); }
  fs.mkdirSync(MAP, { recursive: true });
  console.log('Copying Electron from ' + bron + ' ...');
  fs.cpSync(bron, MAP, {
    recursive: true,
    filter: van => {
      const rel = path.relative(bron, van).replace(/\\/g, '/');
      if (rel === 'resources/default_app.asar') return false;                  // de proef-app van Electron zelf
      if (/^locales\/.+\.pak$/.test(rel) && rel !== 'locales/en-US.pak') return false;   // Maatje praat alleen Engels
      return true;
    },
  });
  fs.renameSync(path.join(MAP, 'electron.exe'), EXE);

  const app = path.join(MAP, 'resources', 'app');
  fs.mkdirSync(app, { recursive: true });
  for (const naam of ['app', 'shows']) fs.cpSync(path.join(HIER, naam), path.join(app, naam), { recursive: true });
  const csc = zoekCsc();                                // het vensterzoek-programma kant en klaar meegeven, dan hoeft er op de pc van een ander niets gemaakt te worden
  if (!csc) throw new Error('The C# compiler of Windows was not found, so I cannot make vensters.exe.');
  cp.execFileSync(csc, ['/nologo', '/target:exe', '/platform:x64', '/optimize+', '/out:' + path.join(app, 'app', 'vensters.exe'), path.join(HIER, 'app', 'vensters.cs')], { stdio: 'pipe', windowsHide: true });
  for (const naam of ['koppel.js', 'hook.js', 'haak.js', 'maatje.js', 'README.md', 'LICENSE', 'NOTICE.md']) fs.copyFileSync(path.join(HIER, naam), path.join(app, naam));
  fs.writeFileSync(path.join(app, 'package.json'), JSON.stringify({ name: 'maatje', productName: 'Maatje', version: PAKKET.version, description: PAKKET.description, license: PAKKET.license, main: 'app/main.js' }, null, 2) + '\n');
  fs.writeFileSync(path.join(MAP, 'README.txt'), LEESMIJ.replace(/\n/g, '\r\n'));
  fs.copyFileSync(path.join(HIER, 'NOTICE.md'), path.join(MAP, 'NOTICE-Maatje.md'));
  fs.copyFileSync(path.join(HIER, 'LICENSE'), path.join(MAP, 'LICENSE-Maatje.txt'));

  const icoPad = path.join(UIT, 'maatje.ico');
  fs.writeFileSync(icoPad, ico());
  fs.writeFileSync(path.join(UIT, 'maatje-256.png'), png(poppetje(256), 256));
  const let_op = kleedAan(icoPad);
  if (let_op) console.log('Note: ' + let_op);

  let groot = 0;
  const tel = m => { for (const d of fs.readdirSync(m, { withFileTypes: true })) { const p = path.join(m, d.name); if (d.isDirectory()) tel(p); else groot += fs.statSync(p).size; } };
  tel(MAP);
  console.log('Built:  ' + EXE + '   (the folder is ' + Math.round(groot / 1048576) + ' MB)');

  if (!process.argv.includes('--no-zip')) {
    const zip = path.join(UIT, 'Maatje-' + PAKKET.version + '-win64.zip');
    fs.rmSync(zip, { force: true });
    cp.execFileSync(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe'), ['-a', '-c', '-f', zip, '-C', UIT, path.basename(MAP)], { stdio: 'ignore' });
    console.log('Zip:    ' + zip + '   (' + Math.round(fs.statSync(zip).size / 1048576) + ' MB)');
  }
  console.log('Test it:  set MAATJE_EXE=' + EXE + '  and then  npm test');
}

if (require.main === module) { try { bouw(); } catch (e) { console.log('Error: ' + e.message); process.exit(1); } }
else module.exports = { png, poppetje };            // de test gebruikt deze twee om een proefplaatje te maken
