'use strict';
/* MAATJE - the basics: the canvas, erasing what was drawn, small helpers and sound.
   Everything hangs on one object, M. The window is transparent and covers the whole desktop; every
   frame we only erase the bits where something was drawn last time (M.merk / M.wis).
   The code is written in Dutch (the names and the comments below); what the user sees is English. */
const DONKER = '#141413';
const M = window.M = {
  versie: '1.3', gebruiker: 'you',
  W: 1920, H: 1040, dpr: 1,
  schermen: [{ x: 0, y: 0, w: 1920, h: 1040 }],
  t: 0, figuren: [], hoofd: null, fx: [], delen: [], bal: null,
  muis: { x: -9999, y: -9999, vx: 0, vy: 0, t: -99, klok: 0 },
  inst: { kleur: '#d97757', maat: 6, hoed: 'geen', geluid: true, vrij: true, meeleven: true, skin: '' },
  // meeleven met Claude: welke sessies zijn aan het werk (komt binnen via haak.js), zie brein.js
  werk: { sessies: {}, reactieTot: 0, vertrekNa: 0, spawnNa: 0, klaarKoel: 0, nodigKoel: 0 },
  proef: false, pauze: false, druk: true,
  fouten: [], foutTel: 0, wachters: [],
  laatsteOpdracht: -99, vrijVanaf: 3, pauzeNa: 3, blijfTot: 0,
  gepakt: null, pakInfo: null, onderMuis: null, muisVast: false, fps: 0,
};
const cv = document.getElementById('doek');
const ctx = cv.getContext('2d');

const klem = (v, a, b) => (v < a ? a : v > b ? b : v);
const meng = (a, b, k) => a + (b - a) * k;
const zacht = k => k * k * (3 - 2 * k);
const stuit = k => {
  const n = 7.5625, d = 2.75;
  if (k < 1 / d) return n * k * k;
  if (k < 2 / d) return n * (k -= 1.5 / d) * k + 0.75;
  if (k < 2.5 / d) return n * (k -= 2.25 / d) * k + 0.9375;
  return n * (k -= 2.625 / d) * k + 0.984375;
};

M.meldFout = function (waar, e) {
  const t = waar + ': ' + (e && e.message ? e.message : e);
  M.foutTel++;
  if (M.fouten[M.fouten.length - 1] !== t) { M.fouten.push(t); if (M.fouten.length > 30) M.fouten.shift(); }
};
window.addEventListener('error', e => M.meldFout((e.filename || '').split('/').pop() + ':' + e.lineno, e.message));

/* ---- toeval (met een vast startgetal geeft een proef steeds hetzelfde) ---- */
let zaad = (Date.now() ^ 0x9e3779b9) >>> 0;
M.zaai = z => { zaad = z >>> 0; };
M.rnd = () => {
  zaad = (zaad + 0x6D2B79F5) >>> 0;
  let t = zaad;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
M.kies = lijst => lijst[Math.floor(M.rnd() * lijst.length)];

/* ---- de wereld: alle schermen naast elkaar, zonder de taakbalk ---- */
M.zetWereld = function (w) {
  M.W = w.w; M.H = w.h; M.dpr = w.dpr || 1;
  M.schermen = w.schermen.slice().sort((a, b) => a.x - b.x);
  cv.width = Math.round(M.W * M.dpr); cv.height = Math.round(M.H * M.dpr);
  cv.style.width = M.W + 'px'; cv.style.height = M.H + 'px';
  ctx.setTransform(M.dpr, 0, 0, M.dpr, 0, 0);
  M.vuil.length = 0;
};
M.schermVan = function (x) {
  let beste = M.schermen[0], bd = 1e9;
  for (const s of M.schermen) {
    const d = x < s.x ? s.x - x : x > s.x + s.w ? x - s.x - s.w : 0;
    if (d < bd) { bd = d; beste = s; }
  }
  return beste;
};
M.vloer = x => { const s = M.schermVan(x); return s.y + s.h; };     // de bovenkant van de taakbalk

/* ---- wissen: onthoud waar getekend is, en wis de volgende keer alleen dat ---- */
M.vuil = [];
M.merk = function (x, y, w, h) { M.vuil.push(Math.floor(x) - 2, Math.floor(y) - 2, Math.ceil(w) + 5, Math.ceil(h) + 5); };
M.wis = function () {
  const v = M.vuil;
  if (v.length > 4 * 80) {            // heel veel stukjes: één groot vak is sneller
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = 0; i < v.length; i += 4) {
      if (v[i] < x0) x0 = v[i];
      if (v[i + 1] < y0) y0 = v[i + 1];
      if (v[i] + v[i + 2] > x1) x1 = v[i] + v[i + 2];
      if (v[i + 1] + v[i + 3] > y1) y1 = v[i + 1] + v[i + 3];
    }
    ctx.clearRect(x0, y0, x1 - x0, y1 - y0);
  } else for (let i = 0; i < v.length; i += 4) ctx.clearRect(v[i], v[i + 1], v[i + 2], v[i + 3]);
  v.length = 0;
};

/* ---- kleuren ---- */
const KLEUREN = {
  oranje: '#d97757', rood: '#e5484d', blauw: '#6a9bcc', groen: '#78a65a', geel: '#f2c94c', paars: '#9b7ede',
  roze: '#f08bb4', wit: '#f4f1ea', zwart: '#3a3936', grijs: '#9a9890', turkoois: '#45c4b0', goud: '#e0b030', bruin: '#9c6b4a',
};
M.leesKleur = function (t) {
  t = String(t).trim().toLowerCase();
  if (KLEUREN[t]) return KLEUREN[t];
  if (/^#[0-9a-f]{6}$/.test(t)) return t;
  if (/^#[0-9a-f]{3}$/.test(t)) return '#' + t[1] + t[1] + t[2] + t[2] + t[3] + t[3];
  return null;
};

/* ---- geluid: piepjes en ruis, zelf gemaakt met Web Audio ---- */
const G = M.geluid = {
  ac: null, uit: null, tel: {},
  aan() {
    if (M.proef || !M.inst.geluid || M.pauze) return false;
    if (!this.ac) {
      try {
        this.ac = new AudioContext();
        this.uit = this.ac.createGain(); this.uit.gain.value = 0.7; this.uit.connect(this.ac.destination);
      } catch (e) { return false; }
    }
    if (this.ac.state === 'suspended') this.ac.resume();
    return true;
  },
  toon(f, duur, soort, vol, naar, wacht) {
    const ac = this.ac, t = ac.currentTime + (wacht || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = soort || 'square';
    o.frequency.setValueAtTime(f, t);
    if (naar) o.frequency.exponentialRampToValueAtTime(naar, t + duur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duur);
    o.connect(g); g.connect(this.uit); o.start(t); o.stop(t + duur + 0.03);
  },
  ruis(duur, vol, freq, wacht) {
    const ac = this.ac, t = ac.currentTime + (wacht || 0), n = Math.max(1, Math.floor(ac.sampleRate * duur));
    const buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const bron = ac.createBufferSource(); bron.buffer = buf;
    const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = freq;
    const g = ac.createGain(); g.gain.value = vol;
    bron.connect(fl); fl.connect(g); g.connect(this.uit); bron.start(t);
  },
};
const KLANK = {
  spring: g => g.toon(300, 0.14, 'square', 0.035, 720),
  land: g => g.ruis(0.07, 0.05, 500),
  pop: g => g.toon(520, 0.07, 'square', 0.03, 900),
  praat: (g, n) => g.toon(430 + (n % 7) * 35, 0.035, 'square', 0.02),
  laser: g => { g.toon(1400, 0.6, 'sawtooth', 0.03, 180); g.toon(700, 0.6, 'square', 0.018, 90); },
  fluit: g => g.toon(500, 0.5, 'sine', 0.03, 1700),
  knal: g => { g.ruis(0.5, 0.09, 1800); g.toon(120, 0.3, 'sine', 0.06, 40); },
  donder: g => { g.ruis(0.9, 0.12, 700); g.toon(90, 0.6, 'sawtooth', 0.05, 30); },
  zwiep: g => g.ruis(0.16, 0.07, 3000),
  trap: g => g.toon(180, 0.09, 'square', 0.05, 90),
  bots: g => g.toon(240, 0.05, 'sine', 0.04, 150),
  teleport: g => { g.toon(900, 0.3, 'sine', 0.035, 2400); g.toon(1200, 0.3, 'sine', 0.02, 300, 0.05); },
  ster: g => { g.toon(1320, 0.08, 'square', 0.02); g.toon(1760, 0.12, 'square', 0.02, 0, 0.07); },
  dans: (g, n) => g.toon([196, 247, 294, 247][n & 3], 0.13, 'square', 0.025),
  raket: g => g.ruis(0.5, 0.05, 900),
  groei: g => g.toon(200, 0.4, 'triangle', 0.05, 600),
  titel: g => g.toon(660, 0.06, 'square', 0.025, 880),
};
M.klank = function (naam, n) {
  G.tel[naam] = (G.tel[naam] || 0) + 1;
  if (!G.aan()) return;
  try { KLANK[naam](G, n || 0); } catch (e) { /* geen geluid is geen ramp */ }
};

/* ---- onthouden hoe hij eruitziet ---- */
M.bewaar = function () {
  if (M.proef || !window.maatjeApp) return;
  const i = M.inst;
  window.maatjeApp.bewaar({ kleur: i.kleur, maat: i.maat, hoed: i.hoed, geluid: i.geluid, vrij: i.vrij, meeleven: i.meeleven, skin: i.skin || '' });
};
