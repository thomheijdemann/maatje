'use strict';
/* MAATJE - pixel letters and speech bubbles.
   Every letter is 5 wide; rows 0-6 are the letter itself, rows 7-8 the tails (g j p q y), accents go
   above it. '#' = a pixel, '/' = next row. The code below is written in Dutch. */
const LETTERBRON = {
  ' ': '',
  'A': '.###./#...#/#...#/#####/#...#/#...#/#...#', 'B': '####./#...#/#...#/####./#...#/#...#/####.',
  'C': '.###./#...#/#..../#..../#..../#...#/.###.', 'D': '####./#...#/#...#/#...#/#...#/#...#/####.',
  'E': '#####/#..../#..../####./#..../#..../#####', 'F': '#####/#..../#..../####./#..../#..../#....',
  'G': '.###./#...#/#..../#.###/#...#/#...#/.####', 'H': '#...#/#...#/#...#/#####/#...#/#...#/#...#',
  'I': '.###./..#../..#../..#../..#../..#../.###.', 'J': '..###/...#./...#./...#./...#./#..#./.##..',
  'K': '#...#/#..#./#.#../##.../#.#../#..#./#...#', 'L': '#..../#..../#..../#..../#..../#..../#####',
  'M': '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#', 'N': '#...#/##..#/#.#.#/#..##/#...#/#...#/#...#',
  'O': '.###./#...#/#...#/#...#/#...#/#...#/.###.', 'P': '####./#...#/#...#/####./#..../#..../#....',
  'Q': '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#', 'R': '####./#...#/#...#/####./#.#../#..#./#...#',
  'S': '.####/#..../#..../.###./....#/....#/####.', 'T': '#####/..#../..#../..#../..#../..#../..#..',
  'U': '#...#/#...#/#...#/#...#/#...#/#...#/.###.', 'V': '#...#/#...#/#...#/#...#/#...#/.#.#./..#..',
  'W': '#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#', 'X': '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
  'Y': '#...#/#...#/.#.#./..#../..#../..#../..#..', 'Z': '#####/....#/...#./..#../.#.../#..../#####',
  'a': '//.###./....#/.####/#...#/.####', 'b': '#..../#..../#.##./##..#/#...#/#...#/####.',
  'c': '//.###./#..../#..../#...#/.###.', 'd': '....#/....#/.##.#/#..##/#...#/#...#/.####',
  'e': '//.###./#...#/#####/#..../.###.', 'f': '..##./.#..#/.#.../###../.#.../.#.../.#...',
  'g': '//.####/#...#/#...#/.####/....#/.###.', 'h': '#..../#..../#.##./##..#/#...#/#...#/#...#',
  'i': '..#..//.##../..#../..#../..#../.###.', 'j': '...#.//..##./...#./...#./...#./#..#./.##..',
  'k': '#..../#..../#..#./#.#../##.../#.#../#..#.', 'l': '.##../..#../..#../..#../..#../..#../.###.',
  'm': '//##.#./#.#.#/#.#.#/#...#/#...#', 'n': '//#.##./##..#/#...#/#...#/#...#',
  'o': '//.###./#...#/#...#/#...#/.###.', 'p': '//####./#...#/#...#/####./#..../#....',
  'q': '//.####/#...#/#...#/.####/....#/....#', 'r': '//#.##./##..#/#..../#..../#....',
  's': '//.####/#..../.###./....#/####.', 't': '.#.../.#.../###../.#.../.#.../.#..#/..##.',
  'u': '//#...#/#...#/#...#/#..##/.##.#', 'v': '//#...#/#...#/#...#/.#.#./..#..',
  'w': '//#...#/#...#/#.#.#/#.#.#/.#.#.', 'x': '//#...#/.#.#./..#../.#.#./#...#',
  'y': '//#...#/#...#/#...#/.####/....#/.###.', 'z': '//#####/...#./..#../.#.../#####',
  '0': '.###./#...#/#..##/#.#.#/##..#/#...#/.###.', '1': '..#../.##../..#../..#../..#../..#../.###.',
  '2': '.###./#...#/....#/...#./..#../.#.../#####', '3': '#####/...#./..#../...#./....#/#...#/.###.',
  '4': '...#./..##./.#.#./#..#./#####/...#./...#.', '5': '#####/#..../####./....#/....#/#...#/.###.',
  '6': '..##./.#.../#..../####./#...#/#...#/.###.', '7': '#####/....#/...#./..#../.#.../.#.../.#...',
  '8': '.###./#...#/#...#/.###./#...#/#...#/.###.', '9': '.###./#...#/#...#/.####/....#/...#./.##..',
  '!': '..#../..#../..#../..#../..#..//..#..', '"': '.#.#./.#.#./.#.#.',
  '#': '.#.#./.#.#./#####/.#.#./#####/.#.#./.#.#.', '$': '..#../.####/#.#../.###./..#.#/####./..#..',
  '%': '##.../##..#/...#./..#../.#.../#..##/...##', '&': '.##../#..#./#.#../.#.../#.#.#/#..#./.##.#',
  "'": '..#../..#../..#..', '(': '...#./..#../.#.../.#.../.#.../..#../...#.',
  ')': '.#.../..#../...#./...#./...#./..#../.#...', '*': '/..#../#.#.#/.###./#.#.#/..#..',
  '+': '/..#../..#../#####/..#../..#..', ',': '/////.##../..#../.#...',
  '-': '///#####', '.': '/////.##../.##..',
  '/': '/....#/...#./..#../.#.../#....', ':': '/.##../.##..//.##../.##..',
  ';': '/.##../.##..//.##../..#../.#...', '<': '...#./..#../.#.../#..../.#.../..#../...#.',
  '=': '//#####//#####', '>': '.#.../..#../...#./....#/...#./..#../.#...',
  '?': '.###./#...#/....#/...#./..#..//..#..', '@': '.###./#...#/....#/.##.#/#.#.#/#.#.#/.###.',
  '[': '.###./.#.../.#.../.#.../.#.../.#.../.###.', '\\': '/#..../.#.../..#../...#./....#',
  ']': '.###./...#./...#./...#./...#./...#./.###.', '^': '..#../.#.#./#...#',
  '_': '//////#####', '`': '.#.../..#../...#.',
  '{': '...#./..#../..#../.#.../..#../..#../...#.', '|': '..#../..#../..#../..#../..#../..#../..#..',
  '}': '.#.../..#../..#../...#./..#../..#../.#...', '~': '//.#.../#.#.#/...#.',
  '♥': '/.#.#./#####/#####/.###./..#..', '★': '..#../..#../#####/.###./.#.#./#...#',
  '…': '//////#.#.#', '€': '..##./.#..#/###../.#.../###../.#..#/..##.',
  '°': '.##../#..#./#..#./.##..', '←': '/..#../.#.../#####/.#.../..#..',
  '→': '/..#../...#./#####/...#./..#..', '♪': '..##./..#.#/..#../..#../.##../###../.#...',
  '': '/.#.#./##.##//##.##/.#.#.',                         // boos
  '': '..#../..#../.###./.###./#####/#####/.###.',         // druppel
  '': '.###./#...#/#...#/#...#/.###./.###./..#..',         // lamp
};
const ANDERS = { '‘': "'", '’': "'", '“': '"', '”': '"', '–': '-', '—': '-', ' ': ' ', '\t': ' ' };
const ACCENT = {
  0x301: ['...#.', '..#..'], 0x300: ['.#...', '..#..'], 0x308: ['.#.#.'], 0x302: ['..#..', '.#.#.'], 0x303: ['.#.##', '#.##.'],
  0x327: { onder: ['..#..', '.#...'] },
};
const GLYF = {};
for (const ch in LETTERBRON) {
  const rijen = LETTERBRON[ch].split('/'), bits = [];
  let min = 5, max = -1;
  for (const rij of rijen) {
    let b = 0;
    for (let c = 0; c < 5; c++) if (rij[c] === '#') { b |= 1 << c; if (c < min) min = c; if (c > max) max = c; }
    bits.push(b);
  }
  if (max < 0) { min = 0; max = 1; }
  GLYF[ch] = { bits, min, w: max - min + 1 };
}
const glyfCache = new Map();
function zoekGlyf(ch) {
  let r = glyfCache.get(ch);
  if (r) return r;
  let g = GLYF[ch], acc = null, geenPunt = false;
  if (!g && ANDERS[ch]) g = GLYF[ANDERS[ch]];
  if (!g) {
    const n = ch.normalize('NFD');
    if (n.length > 1 && GLYF[n[0]] && ACCENT[n.charCodeAt(1)]) { g = GLYF[n[0]]; acc = ACCENT[n.charCodeAt(1)]; geenPunt = n[0] === 'i' || n[0] === 'j'; }
  }
  if (!g) g = ch.codePointAt(0) > 0xffff ? { bits: [], min: 0, w: 0, leeg: true } : GLYF['?'];
  r = { g, acc, geenPunt, laag: geenPunt || (!g.bits[0] && !g.bits[1]) };
  glyfCache.set(ch, r);
  return r;
}
function tekenGlyf(z, px, py, sch) {
  const g = z.g, b = g.bits;
  for (let r = z.geenPunt ? 1 : 0; r < b.length; r++) {
    const bits = b[r];
    if (!bits) continue;
    for (let c = g.min; c < g.min + g.w; c++) if (bits >> c & 1) ctx.fillRect(px + (c - g.min) * sch, py + r * sch, sch, sch);
  }
  if (z.acc) {
    const rijen = z.acc.onder || z.acc;
    const r0 = z.acc.onder ? 7 : (z.laag ? 1 : 0) - rijen.length;
    for (let r = 0; r < rijen.length; r++) for (let c = 0; c < 5; c++) if (rijen[r][c] === '#') ctx.fillRect(px + (c - g.min) * sch, py + (r0 + r) * sch, sch, sch);
  }
}

/* breedte van een tekst in letter-pixels */
M.tekstBreed = function (str) {
  let w = 0;
  for (const ch of str) { const g = zoekGlyf(ch).g; if (!g.leeg) w += g.w + 1; }
  return Math.max(0, w - 1);
};
const ACHT = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
/* tekst tekenen; y = bovenkant van de hoofdletters. opt.rand = kleur van een randje eromheen,
   opt.n = hoeveel letters (voor het uittypen). Geeft de breedte in pixels terug. */
M.tekst = function (str, x, y, sch, kleur, opt) {
  opt = opt || {};
  const n = opt.n === undefined ? 1e9 : opt.n, rp = opt.rand ? (opt.randPx || sch) : 0;
  const ronde = (ox, oy, kl) => {
    ctx.fillStyle = kl;
    let px = x, j = 0;
    for (const ch of str) {
      if (j++ >= n) break;
      const z = zoekGlyf(ch);
      if (z.g.leeg) continue;
      tekenGlyf(z, px + ox, y + oy, sch);
      px += (z.g.w + 1) * sch;
    }
    return px;
  };
  if (opt.rand) for (const a of ACHT) ronde(a[0] * rp, a[1] * rp, opt.rand);
  const eind = ronde(0, 0, kleur);
  if (opt.merk !== false) M.merk(x - rp, y - 2 * sch - rp, eind - x + 2 * rp, 11 * sch + 2 * rp);
  return eind - x;
};
/* de pixels van één letter (voor de titel die uit elkaar spat) */
M.glyfPixels = function (ch) {
  const z = zoekGlyf(ch), g = z.g, uit = [];
  for (let r = 0; r < g.bits.length; r++) for (let c = g.min; c < g.min + g.w; c++) if (g.bits[r] >> c & 1) uit.push([c - g.min, r]);
  return { w: g.w, px: uit };
};
/* lange tekst in regels knippen die passen */
M.breek = function (str, max) {
  const uit = [];
  for (const stuk of String(str).normalize('NFC').split(/\\n|\n/)) {
    let regel = '';
    for (const woord of stuk.split(/\s+/)) {
      if (!woord) continue;
      const proef = regel ? regel + ' ' + woord : woord;
      if (M.tekstBreed(proef) <= max) { regel = proef; continue; }
      if (regel) uit.push(regel);
      regel = woord;
      while (M.tekstBreed(regel) > max) {          // een woord dat zelf te lang is
        const tekens = [...regel];
        let k = tekens.length - 1;
        while (k > 1 && M.tekstBreed(tekens.slice(0, k).join('')) > max) k--;
        uit.push(tekens.slice(0, k).join(''));
        regel = tekens.slice(k).join('');
      }
    }
    if (regel) uit.push(regel);
  }
  return uit.length ? uit : [''];
};

/* ---- tekstballon: zeg (gewoon), denk (wolkje), roep (groot), fluister (grijs en langzaam) ---- */
class Bel {
  constructor(soort, tekst) {
    this.soort = soort;
    this.sch = soort === 'roep' ? 3 : 2;
    this.regels = M.breek(tekst, soort === 'roep' ? 130 : 160);
    this.lengtes = this.regels.map(r => [...r].length);
    this.totaal = this.lengtes.reduce((a, b) => a + b, 0);
    this.breed = Math.max(8, ...this.regels.map(M.tekstBreed));
    this.tempo = soort === 'roep' ? 48 : soort === 'fluister' ? 15 : 30;      // letters per seconde
    this.blijf = klem(1.1 + this.totaal * 0.055, 1.6, 9);
    this.n = 0; this.t = 0; this.eindT = 0; this.rect = null;
  }
  stap(dt) {                                         // geeft true als de ballon weg mag
    this.t += dt;
    if (this.n < this.totaal) {
      const n2 = Math.min(this.totaal, this.t * this.tempo);
      if (this.soort !== 'denk' && Math.floor(n2 / 2) > Math.floor(this.n / 2)) M.klank('praat', Math.floor(n2 * 3));
      this.n = n2;
      if (this.n >= this.totaal) this.eindT = this.t;
      return false;
    }
    return this.t - this.eindT > this.blijf;
  }
  teken(f) {
    const sch = this.sch, pad = 3, n = this.regels.length, s = f.maat;
    const w = (this.breed + 2 * (pad + 1)) * sch, h = (n * 10 + 2 * pad - 1) * sch;
    const k = f.kop(), m = f.midden(), scherm = M.schermVan(m.x);
    let bx = klem(Math.round(k.x - w / 2), scherm.x + 6, Math.max(scherm.x + 6, scherm.x + scherm.w - w - 6));
    let by = Math.round(k.y - h - 6 * sch), onder = false;
    if (by < scherm.y + 6) { by = Math.round(m.y + 7 * s + 6 * sch); onder = true; }      // geen plek erboven
    const R = (x, y, ww, hh, kl) => { ctx.fillStyle = kl; ctx.fillRect(x, y, ww, hh); };
    const vul = '#ffffff';
    R(bx + sch, by, w - 2 * sch, h, DONKER); R(bx, by + sch, w, h - 2 * sch, DONKER);
    R(bx + sch, by + sch, w - 2 * sch, h - 2 * sch, vul);
    const ax = klem(Math.round(k.x) - 2 * sch, bx + 3 * sch, bx + w - 8 * sch), links = k.x < bx + w / 2;
    if (this.soort === 'denk') {                    // twee losse bolletjes
      for (let i = 0; i < 2; i++) {
        const g = (3 - i) * sch, x = ax + (links ? -i : i + 1) * 2 * sch, y = onder ? by - (i ? 5.5 : 3.5) * sch : by + h + (i ? 3.5 : 0.5) * sch;
        R(x, y, g, g, DONKER);
        if (g > 2 * sch) R(x + sch, y + sch, g - 2 * sch, g - 2 * sch, vul);
      }
    } else {                                         // een puntje naar het poppetje toe
      for (let i = 0; i < 4; i++) {
        const br = 5 - i, y = onder ? by - i * sch : by + h - sch + i * sch, x = links ? ax : ax + i * sch;
        R(x, y, br * sch, sch, DONKER);
        if (br > 2) R(x + sch, y, (br - 2) * sch, sch, vul);
      }
    }
    const kleur = this.soort === 'fluister' ? '#8a8880' : DONKER;
    let over = Math.floor(this.n);
    for (let i = 0; i < n && over > 0; i++) {
      M.tekst(this.regels[i], bx + (pad + 1) * sch, by + (pad + 1) * sch + i * 10 * sch, sch, kleur, { n: over, merk: false });
      over -= this.lengtes[i];
    }
    this.rect = { x: bx, y: by, w, h };
    M.merk(bx - 3 * sch, by - 7 * sch, w + 6 * sch, h + 14 * sch);
  }
}
