'use strict';
/* MAATJE - makes the example clip docs/maatje.gif for the README.
   node tools/make-gif.js      (ffmpeg has to be installed)
   Starts Maatje without a window in a small world, plays a short story, moves time forward by hand and
   saves every frame. So it is really what the program draws, not a mock-up.
   The code below is written in Dutch. */
const cp = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { zoekElectron, vraag, leeft, slaap } = require('../maatje.js');

const PIJP = '\\\\.\\pipe\\maatje-proef';
const v = (b, ms) => vraag(b, PIJP, ms || 60000);
const BREED = 760, HOOG = 330, FPS = 12.5;
const VERHAAL = [
  'run 30%', 'wave', "say Hi! I'm Maatje.", 'jump', 'fireworks 4', 'cheer', 'wait 1.2',
  'clone 2', 'wait 0.6', 'dance 2.5', 'cleanup',
  'hat glasses', 'sword', 'wait 0.3', 'hat none',
  'type 2.5', 'say See you!',
];

async function hoofd() {
  const map = fs.mkdtempSync(path.join(os.tmpdir(), 'maatje-gif-'));
  const uit = path.join(__dirname, '..', 'docs', 'maatje.gif');
  fs.mkdirSync(path.dirname(uit), { recursive: true });
  if (await leeft(PIJP)) { await v({ wat: 'afsluiten' }).catch(() => {}); await slaap(800); }
  const kind = cp.spawn(zoekElectron(), [path.join(__dirname, '..', 'app'), '--proef', '--wereld=' + BREED + 'x' + HOOG + 'x1'], { stdio: 'ignore' });
  let op = false;
  for (let i = 0; i < 80 && !op; i++) { await slaap(250); op = await leeft(PIJP); }
  if (!op) throw new Error('the test version does not start');
  await v({ wat: 'doe', regels: ['roam off'] });
  await v({ wat: 'stap', sec: 0.6 });
  const u = await v({ wat: 'doe', regels: VERHAAL });
  if (!u.ok) throw new Error('the story has a mistake: ' + JSON.stringify(u.fouten));
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
  console.log(n + ' frames, ' + Math.round(fs.statSync(uit).size / 1024) + ' kB, errors in the program: ' + fouten + ' -> ' + uit);
}
hoofd().catch(e => { console.log('Failed: ' + e.message); process.exit(1); });
