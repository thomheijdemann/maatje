'use strict';
/* MAATJE - maakt het voorbeeldfilmpje docs/maatje.gif voor de README.
   node tools/maak-film.js      (ffmpeg moet op je pc staan)
   Start Maatje zonder venster in een kleine wereld, speelt een kort verhaaltje af, zet de tijd met de
   hand vooruit en bewaart elk beeld. Het is dus echt wat het programma tekent, geen nagemaakt plaatje. */
const cp = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { zoekElectron, vraag, leeft, slaap } = require('../maatje.js');

const PIJP = '\\\\.\\pipe\\maatje-proef';
const v = (b, ms) => vraag(b, PIJP, ms || 60000);
const BREED = 760, HOOG = 330, FPS = 12.5;
const VERHAAL = [
  'ren 30%', 'zwaai', 'zeg Hoi! Ik ben Maatje.', 'spring', 'vuurwerk 4', 'juich', 'wacht 1.2',
  'kloon 2', 'wacht 0.6', 'dans 2.5', 'opruimen',
  'hoed bril', 'zwaard', 'wacht 0.3', 'hoed geen',
  'typ 2.5', 'zeg Tot zo!',
];

async function hoofd() {
  const map = fs.mkdtempSync(path.join(os.tmpdir(), 'maatje-film-'));
  const uit = path.join(__dirname, '..', 'docs', 'maatje.gif');
  fs.mkdirSync(path.dirname(uit), { recursive: true });
  if (await leeft(PIJP)) { await v({ wat: 'afsluiten' }).catch(() => {}); await slaap(800); }
  const kind = cp.spawn(zoekElectron(), [path.join(__dirname, '..', 'app'), '--proef', '--wereld=' + BREED + 'x' + HOOG + 'x1'], { stdio: 'ignore' });
  let op = false;
  for (let i = 0; i < 80 && !op; i++) { await slaap(250); op = await leeft(PIJP); }
  if (!op) throw new Error('de proefversie start niet');
  await v({ wat: 'doe', regels: ['vrij uit'] });
  await v({ wat: 'stap', sec: 0.6 });
  await v({ wat: 'doe', regels: VERHAAL });
  let n = 0, rust = 0;
  for (; n < 420 && rust < 10; n++) {
    await v({ wat: 'stap', sec: 1 / FPS, dt: 1 / 50 });
    await v({ wat: 'foto', pad: path.join(map, 'f' + String(n).padStart(4, '0') + '.png'), kleur: '#262a31' });
    const s = await v({ wat: 'status' });
    rust = !s.bezig && !s.hoofd.zegt && !s.deeltjes ? rust + 1 : 0;
  }
  const fouten = (await v({ wat: 'status' })).foutTel;
  await v({ wat: 'afsluiten' }).catch(() => {});
  await slaap(300);
  try { kind.kill(); } catch (e) { /* al weg */ }
  // een donkere strook eronder als "taakbalk", en zo weinig kleuren als kan: dan blijft het bestand klein
  cp.execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(map, 'f%04d.png'),
    '-vf', 'pad=iw:ih+28:0:0:color=0x171a1f,split[a][b];[a]palettegen=max_colors=48:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle', uit], { stdio: 'inherit' });
  fs.rmSync(map, { recursive: true, force: true });
  console.log(n + ' beelden, ' + Math.round(fs.statSync(uit).size / 1024) + ' kB, fouten in het programma: ' + fouten + ' -> ' + uit);
}
hoofd().catch(e => { console.log('Mislukt: ' + e.message); process.exit(1); });
