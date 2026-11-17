'use strict';
/* MAATJE - animations.
   An animation is one line of text made of small moves, for example:   hop*2 spin !star wave
     hop, spin, wave ...        a move that takes time          hop:1.5 = bigger      hop/0.2 = in 0.2 seconds
     a&b                        two moves at the same time      hop*3   = three times
     [ a b ]*2                  a group, repeated
     eyes:happy prop:book au    something that stays until you change it (eyes, a thing in his hand, arms up ...)
     !heart !sparks !text:WOW   a little effect, right now
   The 500 built-in animations are in anim-data.js. Your own come in through the app window: a GIF or a
   picture (he turns into it while it plays), or a text file with a line like the one above.
   The code below is written in Dutch. */
const SIN = k => Math.sin(k * Math.PI);                                  // 0 -> 1 -> 0
const plateau = (k, a, b) => (k < a ? zacht(k / a) : k > 1 - b ? zacht((1 - k) / b) : 1);   // omhoog, blijven, omlaag
const golf = (k, n) => Math.sin(k * Math.PI * 2 * n);                    // n hele golven

/* het rekenblad voor één beeld: alles wat de bewegingen samen opleveren */
function leegBlad() { return { y: 0, x: 0, lijf: 0, tilt: 0, rol: 0, sx: 1, sy: 1, aL: 0, aR: 0, aF: 0, poten: null, los: false, ogen: null, kijk: null, pDy: 0, pHoek: 0, alfa: 1, ring: null }; }

/* echt van plek veranderen (go, dash, moon, slide): a = aantal pixels, min is naar links */
function verplaats(o, k, a, f, c, ren) {
  const x = klem(c.x0 + a * zacht(k), f.marge(), M.W - f.marge());
  f.x = x; if (!f.lucht) f.y = f.vloerY(x); f.liep = true;
  const fase = Math.abs(a) * zacht(k) / (f.maat * (ren ? 3.2 : 2.2)), p = Math.floor(fase) & 1, kort = ren ? 0.8 : 1.2;
  o.poten = p ? [kort, 2, kort, 2] : [2, kort, 2, kort];
  o.lijf += Math.sin((fase % 1) * Math.PI) * (ren ? 0.5 : 0.25);
}

/* ---- de bewegingen: [hoe lang ze gewoonlijk duren, wat ze doen op moment k (0..1) met sterkte a] ---- */
const BEW = {
  w: [0.5, () => {}],
  hop: [0.36, (o, k, a) => { const h = SIN(k); o.y += 1.6 * a * h; o.poten = 1.5; if (k < 0.12 || k > 0.88) { o.sy *= 0.9; o.sx *= 1.08; } }],
  jump: [0.6, (o, k, a) => { const h = SIN(k); o.y += 5 * a * h; o.sy *= 1 + 0.1 * h; o.sx *= 1 - 0.06 * h; o.poten = k < 0.5 ? 2.4 : 1.4; o.aL -= 2.5 * h; o.aR -= 2.5 * h; if (k < 0.1 || k > 0.92) { o.sy *= 0.85; o.sx *= 1.12; } }],
  leap: [0.85, (o, k, a) => { const h = SIN(k); o.y += 9 * a * h; o.sy *= 1 + 0.14 * h; o.sx *= 1 - 0.08 * h; o.poten = k < 0.5 ? 2.5 : 1.3; o.aL -= 3 * h; o.aR -= 3 * h; if (k < 0.08 || k > 0.94) { o.sy *= 0.8; o.sx *= 1.15; } }],
  dip: [0.3, (o, k, a) => { o.lijf -= 0.8 * a * SIN(k); }],
  duck: [0.5, (o, k) => { o.lijf -= 1.7 * plateau(k, 0.25, 0.25); }],
  rise: [0.4, (o, k, a) => { o.lijf += 0.9 * a * SIN(k); }],
  swl: [0.3, (o, k, a) => { const h = SIN(k); o.x -= 1.5 * a * h; o.tilt -= 0.12 * h; }],
  swr: [0.3, (o, k, a) => { const h = SIN(k); o.x += 1.5 * a * h; o.tilt += 0.12 * h; }],
  tl: [0.35, (o, k, a) => { o.tilt -= 0.3 * a * SIN(k); }],
  tr: [0.35, (o, k, a) => { o.tilt += 0.3 * a * SIN(k); }],
  lean: [0.5, (o, k, a, f) => { o.tilt += 0.4 * a * f.kijk * plateau(k, 0.3, 0.3); }],
  back: [0.5, (o, k, a, f) => { o.tilt -= 0.35 * a * f.kijk * plateau(k, 0.3, 0.3); }],
  spin: [0.5, (o, k) => { const c = Math.cos(k * Math.PI * 2); o.sx *= Math.abs(c) < 0.12 ? (c < 0 ? -0.12 : 0.12) : c; o.y += 0.8 * SIN(k); }],
  flip: [0.7, (o, k, a, f) => { o.y += 5 * SIN(k); o.rol += Math.PI * 2 * k * f.kijk; o.poten = 1.4; }],
  bflip: [0.7, (o, k, a, f) => { o.y += 5 * SIN(k); o.rol -= Math.PI * 2 * k * f.kijk; o.poten = 1.4; }],
  roll: [0.7, (o, k, a, f) => { o.rol += Math.PI * 2 * zacht(k) * f.kijk; o.y += 1.2 * SIN(k); o.poten = 1.2; }],
  cart: [0.9, (o, k, a, f) => { o.rol += Math.PI * 2 * k * f.kijk; o.y += 2.2 * SIN(k); o.aL -= 3; o.aR -= 3; }],
  hstand: [1.4, (o, k) => { const h = plateau(k, 0.2, 0.2); o.rol += Math.PI * h; o.aL -= 3 * h; o.aR -= 3 * h; o.poten = 2 + 0.5 * h; }],
  squash: [0.3, (o, k, a) => { const h = SIN(k); o.sy *= 1 - 0.35 * a * h; o.sx *= 1 + 0.3 * a * h; }],
  stretch: [0.3, (o, k, a) => { const h = SIN(k); o.sy *= 1 + 0.3 * a * h; o.sx *= 1 - 0.18 * a * h; }],
  puff: [0.5, (o, k, a) => { const h = SIN(k); o.sx *= 1 + 0.35 * a * h; o.sy *= 1 + 0.35 * a * h; }],
  shrink: [0.5, (o, k, a) => { const h = 0.5 * Math.min(1.6, a) * SIN(k); o.sx *= 1 - h; o.sy *= 1 - h; }],
  shake: [0.4, (o, k, a) => { o.x += golf(k, 4) * 0.6 * a; }],
  shiver: [0.6, (o, k, a) => { o.x += golf(k, 9) * 0.25 * a; }],
  wobble: [0.7, (o, k, a) => { o.tilt += golf(k, 2) * 0.22 * a; }],
  nod: [0.32, (o, k) => { o.lijf -= 0.6 * SIN(k); }],
  bob: [0.4, (o, k, a) => { o.lijf += 0.5 * a * SIN(k); }],
  march: [0.5, (o, k) => { const p = k < 0.5; o.poten = p ? [1, 2, 1, 2] : [2, 1, 2, 1]; o.aL += p ? -1.2 : 0.4; o.aR += p ? 0.4 : -1.2; o.lijf += 0.25 * Math.abs(golf(k, 1)); }],
  jog: [0.4, (o, k) => { const p = Math.floor(k * 4) & 1; o.poten = p ? [0.8, 2, 0.8, 2] : [2, 0.8, 2, 0.8]; o.lijf += 0.4 * Math.abs(golf(k, 2)); o.aL += p ? -0.6 : 0.4; o.aR += p ? 0.4 : -0.6; }],
  tap: [0.4, (o, k, a, f) => { const op = Math.floor(k * 4) & 1 ? 2 : 1.3; o.poten = f.kijk > 0 ? [2, 2, 2, op] : [op, 2, 2, 2]; }],
  kick: [0.4, (o, k, a, f) => { const h = SIN(k); o.tilt -= 0.3 * h * f.kijk; o.y += 0.6 * h; o.poten = f.kijk > 0 ? [2, 2, 2, 2 + 1.4 * h] : [2 + 1.4 * h, 2, 2, 2]; o.los = true; }],
  stomp: [0.3, (o, k) => { if (k < 0.6) o.y += 1.2 * SIN(k / 0.6); else { o.sy *= 0.88; o.sx *= 1.1; } }],
  wave: [0.8, (o, k) => { o.aF += golf(k, 3) > 0 ? -3 : -2.2; }],
  wavel: [0.8, (o, k) => { o.aL += golf(k, 3) > 0 ? -3 : -2.2; }],
  waver: [0.8, (o, k) => { o.aR += golf(k, 3) > 0 ? -3 : -2.2; }],
  reach: [0.5, (o, k) => { const h = plateau(k, 0.3, 0.3); o.aL -= 3 * h; o.aR -= 3 * h; o.lijf += 0.5 * h; }],
  flap: [0.4, (o, k) => { const h = Math.abs(golf(k, 1)); o.aL -= 3 * h; o.aR -= 3 * h; }],
  alt: [0.5, (o, k) => { if (k < 0.5) o.aL -= 3 * SIN(k * 2); else o.aR -= 3 * SIN(k * 2 - 1); }],
  pump: [0.4, (o, k) => { o.aF -= 3 * Math.abs(golf(k, 1)); }],
  clap: [0.35, (o, k) => { const h = Math.abs(golf(k, 1)); o.aL -= 1.2 + 0.8 * h; o.aR -= 1.2 + 0.8 * h; }],
  lunge: [0.35, (o, k, a, f) => { const h = SIN(k); o.x += 2 * a * h * f.kijk; o.tilt += 0.2 * h * f.kijk; }],
  recoil: [0.35, (o, k, a, f) => { const h = SIN(k); o.x -= 2 * a * h * f.kijk; o.tilt -= 0.2 * h * f.kijk; }],
  float: [1.6, (o, k, a) => { o.y += 3 * a * plateau(k, 0.2, 0.2) + 0.3 * golf(k, 2) * plateau(k, 0.2, 0.2); o.poten = 1.5; }],
  lie: [1.6, (o, k, a, f) => { o.rol += Math.PI / 2 * plateau(k, 0.2, 0.2) * f.kijk; }],
  faint: [1.8, (o, k, a, f) => { const h = k < 0.25 ? stuit(k / 0.25) : k > 0.8 ? zacht((1 - k) / 0.2) : 1; o.rol += Math.PI / 2 * h * f.kijk; if (k > 0.2 && k < 0.82) o.ogen = 'kruis'; }],
  blink: [0.2, o => { o.ogen = 'dicht'; }],
  peek: [0.7, (o, k, a, f) => { const h = plateau(k, 0.3, 0.3); o.x += 2.5 * h * f.kijk; o.tilt += 0.25 * h * f.kijk; }],
  swing: [0.4, (o, k) => { o.pHoek += golf(k, 1) * 0.9; }],
  raise: [0.5, (o, k) => { const h = plateau(k, 0.3, 0.3); o.pDy += 2.5 * h; o.aF -= 2.5 * h; }],
  twirl: [0.6, (o, k) => { o.pHoek += Math.PI * 2 * k; }],
  rope: [0.5, (o, k) => { o.ring = ['rope', k]; o.y += 1.4 * SIN(klem((k - 0.25) / 0.5, 0, 1)); o.poten = 1.5; o.aL += 0.6; o.aR += 0.6; }],
  hoop: [0.6, (o, k) => { o.ring = ['hoop', k]; o.x += golf(k, 1) * 0.5; }],
  go: [0, (o, k, a, f, c) => { f.kijk = a > 0 ? 1 : -1; verplaats(o, k, a, f, c, false); }],
  dash: [0, (o, k, a, f, c) => { f.kijk = a > 0 ? 1 : -1; verplaats(o, k, a, f, c, true); o.tilt += 0.1 * f.kijk; }],
  moon: [0, (o, k, a, f, c) => { f.kijk = a > 0 ? -1 : 1; verplaats(o, k, a, f, c, false); o.tilt += 0.08 * f.kijk; }],
  slide: [0, (o, k, a, f, c) => { f.x = klem(c.x0 + a * (1 - (1 - k) * (1 - k)), f.marge(), M.W - f.marge()); if (!f.lucht) f.y = f.vloerY(f.x); o.tilt -= 0.25 * Math.sign(a) * (1 - k); o.lijf -= 0.5 * (1 - k); }],
};
const SNELHEID = { go: 120, dash: 420, moon: 150, slide: 520 };          // pixels per seconde

/* ---- dingen die blijven tot je ze verandert ---- */
const KIJKNAAR = { l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1], c: null };
const uitLijst = (wat, lijst) => a => { if (!lijst.includes(a)) throw new Error(wat + ' "' + a + '" does not exist; choose one of: ' + lijst.join(', ')); return a; };
const eenGetal = (min, max) => a => { const n = parseFloat(a); if (!isFinite(n)) throw new Error('a number is missing'); return klem(n, min, max); };
const STAAT = {
  au: { zet: H => { H.aL = H.aR = -3; } },
  ad: { zet: H => { H.aL = H.aR = 0; } },
  al: { lees: eenGetal(-3, 1.5), zet: (H, a) => { H.aL = a; } },
  ar: { lees: eenGetal(-3, 1.5), zet: (H, a) => { H.aR = a; } },
  sit: { zet: H => { H.zit = true; } },
  stand: { zet: H => { H.zit = false; } },
  eyes: { lees: a => { if (a === 'none') return null; const n = nl('ogen', String(a)); if (!OGEN[n] || n === 'plus') throw new Error('eyes "' + a + '" do not exist'); return n; }, zet: (H, a) => { H.ogen = a; } },
  look: { lees: a => { if (!(a in KIJKNAAR)) throw new Error('look: choose l, r, u, d or c'); return KIJKNAAR[a]; }, zet: (H, a) => { H.kijk = a; } },
  face: { lees: uitLijst('the direction', ['l', 'r', 'flip']), zet: (H, a, f) => { f.kijk = a === 'l' ? -1 : a === 'r' ? 1 : -f.kijk; } },
  prop: { lees: a => { if (!PROPS[a] && a !== 'sword' && a !== 'laptop') throw new Error('the prop "' + a + '" does not exist; choose one of: ' + Object.keys(PROPS).join(', ') + ', sword, laptop'); return a; }, zet: (H, a) => { H.prop = a; } },
  noprop: { zet: H => { H.prop = null; } },
  hat: { lees: a => { const n = nl('hoed', String(a)); if (!(n in HOEDEN)) throw new Error('the hat "' + a + '" does not exist'); return n; }, zet: (H, a) => { H.hoed = a; } },
  nohat: { zet: H => { H.hoed = null; } },
  color: { lees: a => { const n = nl('kleur', String(a)); if (n === 'regenboog') return n; const k = M.leesKleur(n); if (!k) throw new Error('the color "' + a + '" does not exist'); return k; }, zet: (H, a) => { H.kleur = a; } },
  nocolor: { zet: H => { H.kleur = null; } },
  ghost: { lees: eenGetal(0.1, 1), zet: (H, a) => { H.alfa = a; } },
  solid: { zet: H => { H.alfa = 1; } },
  scale: { lees: eenGetal(0.4, 2.2), zet: (H, a) => { H.schaal = a; } },
  legs: { lees: uitLijst('legs', ['tuck', 'long', 'norm']), zet: (H, a) => { H.poten = { tuck: 1.2, long: 2.6, norm: null }[a]; } },
};

/* ---- effectjes: één keer, op het moment dat ze aan de beurt zijn ---- */
const GELUID = { pop: 'pop', jump: 'spring', land: 'land', boom: 'knal', zap: 'laser', swish: 'zwiep', ding: 'ster', kick: 'trap', bonk: 'bots', warp: 'teleport', grow: 'groei' };
function regen(f, ch, kleuren, n) {
  const k = f.kop(), s = f.maat, sch = Math.max(2, Math.round(s / 2));
  for (let i = 0; i < n; i++) M.fxTekst(ch, k.x + (M.rnd() - 0.5) * 12 * s - 2 * sch, k.y - 10 - M.rnd() * 3 * s, M.kies(kleuren), sch, (M.rnd() - 0.5) * 50, -30 - M.rnd() * 40, 0.8 + M.rnd() * 0.5);
}
const blokje = f => Math.max(2, Math.round(f.maat * (0.4 + M.rnd() * 0.5)));
const EFFECT = {
  hearts: { doe: f => regen(f, '♥', ['#ff4d6d', '#ff8ab0'], 4) },
  stars: { doe: f => regen(f, '★', ['#ffd23f', '#fff3a0'], 4) },
  notes: { doe: f => regen(f, '♪', ['#7fdfff', '#ffd23f', '#ff8ad8'], 3) },
  sparks: { doe: f => { const m = f.midden(); M.vonken(m.x, m.y, 12, ['#ffffff', '#ffe066'], 220); } },
  zap: { doe: f => { const m = f.midden(); M.vonken(m.x, m.y, 12, ['#ffffff', '#7fdfff', '#ffe066'], 320); } },
  dust: { doe: f => M.stof(f.x, f.y, 7) },
  smoke: { doe: f => { const k = f.kop(), s = f.maat; for (let i = 0; i < 6; i++) M.deel({ x: k.x + (M.rnd() - 0.5) * 8 * s, y: k.y + 2 * s, vx: (M.rnd() - 0.5) * 30, vy: -40 - M.rnd() * 50, l: 0.9, k: '#8a8782', m: blokje(f), fade: 0.8, a: 0.7 }); } },
  cloud: { doe: f => { const m = f.midden(); for (let i = 0; i < 12; i++) { const h = M.rnd() * Math.PI * 2; M.deel({ x: m.x, y: m.y, vx: Math.cos(h) * 90, vy: Math.sin(h) * 60 - 20, w: 2.5, l: 0.6 + M.rnd() * 0.3, k: '#f4f1ea', m: blokje(f) + 2, fade: 0.7, a: 0.85 }); } } },
  tears: { doe: f => { for (const kant of [-1, 1]) { const o = f.oogPlek(kant); for (let i = 0; i < 3; i++) M.deel({ x: o.x, y: o.y + f.maat, vx: kant * (20 + M.rnd() * 50), vy: -60 - M.rnd() * 70, g: 700, l: 0.7, k: '#7fc8ff', m: Math.max(2, Math.round(f.maat / 2)) }); } } },
  drops: { doe: f => { const k = f.kop(); for (let i = 0; i < 5; i++) M.deel({ x: k.x + (M.rnd() - 0.5) * 8 * f.maat, y: k.y + f.maat, vx: (M.rnd() - 0.5) * 160, vy: -90 - M.rnd() * 60, g: 600, l: 0.6, k: '#9fd8ff', m: Math.max(2, Math.round(f.maat / 2)) }); } },
  bubbles: { doe: f => { const o = f.oogPlek(f.kijk); for (let i = 0; i < 7; i++) M.deel({ x: o.x + f.kijk * 3 * f.maat, y: o.y + 2 * f.maat, vx: f.kijk * (10 + M.rnd() * 40), vy: -15 - M.rnd() * 35, g: -30, l: 1.2 + M.rnd() * 0.7, k: '#bfe9ff', m: 2 + Math.floor(M.rnd() * 5), fade: 0.3, a: 0.8 }); } },
  fire: { doe: f => { const o = f.oogPlek(f.kijk); for (let i = 0; i < 16; i++) M.deel({ x: o.x + f.kijk * 3 * f.maat, y: o.y + 2 * f.maat, vx: f.kijk * (160 + M.rnd() * 240), vy: (M.rnd() - 0.5) * 90, g: -80, w: 2, l: 0.35 + M.rnd() * 0.3, k: M.kies(['#ffd23f', '#ff8c2b', '#ff4d2d', '#ffffff']), m: blokje(f) }); } },
  confetti: { doe: f => { const k = f.kop(); for (let i = 0; i < 18; i++) M.deel({ x: k.x, y: k.y, vx: (M.rnd() - 0.5) * 380, vy: -220 - M.rnd() * 260, g: 620, w: 0.8, l: 1 + M.rnd() * 0.5, k: M.kies(['#ff5d5d', '#ffd166', '#5dd6ff', '#7cfc9a', '#b98cff', '#ff8ad8']), m: 3 + Math.floor(M.rnd() * 3), fade: 0.4 }); } },
  text: {
    lees: a => { if (!a) throw new Error('!text needs a word, for example !text:WOW'); return String(a).replace(/_/g, ' ').slice(0, 16); },
    doe: (f, a) => { const k = f.kop(), sch = Math.max(2, Math.round(f.maat / 2)); M.fxTekst(a, Math.round(k.x - M.tekstBreed(a) * sch / 2), k.y - 12 * sch, '#ffffff', sch, 0, -26, 1.2); },
  },
  snd: { lees: a => { if (!GELUID[a]) throw new Error('the sound "' + a + '" does not exist; choose one of: ' + Object.keys(GELUID).join(', ')); return GELUID[a]; }, doe: (f, a) => { if (f.hoofd) M.klank(a); } },
};
const EMOTEN = { heart: 'hart', star: 'ster', note: 'muziek', q: 'vraag', ex: 'uitroep', angry: 'boos', sweat: 'zweet', idea: 'idee', zzz: 'zzz' };
for (const e of Object.keys(EMOTEN)) EFFECT[e] = { doe: f => { f.emote = { naam: EMOTEN[e], t: 0, duur: 1.3 }; } };

/* ---- voorwerpen: kleine plaatjes van blokjes. plek: hand (voor hem), top (boven zijn hoofd), grond (voor hem op de vloer) ---- */
const PKLEUR = { K: '#1f1e1d', E: '#3a3936', D: '#8a8782', S: '#c9ccd1', W: '#ffffff', R: '#e5484d', O: '#ff8c2b', Y: '#f2c94c', L: '#ffe680', G: '#78a65a', B: '#6a9bcc', C: '#7fdfff', V: '#9b7ede', P: '#f08bb4', N: '#9c6b4a' };
const PROPS = {
  book: { plek: 'hand', rij: ['RRRR', 'RWWR', 'RRRR'] },
  phone: { plek: 'hand', rij: ['EE', 'CC', 'CC', 'EE'] },
  cup: { plek: 'hand', rij: ['WWW.', 'WWWW', 'WWW.'] },
  flower: { plek: 'hand', rij: ['RYR', '.G.', '.G.'] },
  flag: { plek: 'hand', rij: ['NRRR', 'NRRR', 'N...', 'N...'] },
  wand: { plek: 'hand', rij: ['L', 'N', 'N', 'N'] },
  torch: { plek: 'hand', rij: ['Y', 'O', 'N', 'N'] },
  balloon: { plek: 'hand', rij: ['.RR.', 'RRRR', 'RRRR', '.RR.', '..K.', '..K.', '..K.'] },
  umbrella: { plek: 'top', rij: ['..BBB..', '.BBBBB.', 'BBBBBBB', '...N...'] },
  barbell: { plek: 'top', rij: ['EE......EE', 'EESSSSSSEE', 'EE......EE'] },
  dumbbell: { plek: 'hand', rij: ['E.E', 'ESE', 'E.E'] },
  guitar: { plek: 'hand', rij: ['..S', '.S.', 'NN.', 'NN.'] },
  mic: { plek: 'hand', rij: ['S', 'E', 'E'] },
  brush: { plek: 'hand', rij: ['R', 'S', 'N', 'N'] },
  hammer: { plek: 'hand', rij: ['SSS', '.N.', '.N.'] },
  rod: { plek: 'hand', rij: ['...S', '..S.', '.S..', 'N...'] },
  ball: { plek: 'top', rij: ['WW', 'WW'] },
  gift: { plek: 'grond', rij: ['Y.Y', 'RYR', 'RYR'] },
  cake: { plek: 'grond', rij: ['.L.', '.R.', 'WWW', 'PPP', 'WWW'] },
  icecream: { plek: 'hand', rij: ['PP', 'PP', 'NN', 'N.'] },
  camera: { plek: 'hand', rij: ['EEE', 'ECE', 'EEE'] },
  magnifier: { plek: 'hand', rij: ['SSS', 'SCS', 'SSS', '.N.'] },
  shield: { plek: 'hand', rij: ['BBB', 'BYB', 'BBB', '.B.'] },
  trophy: { plek: 'top', rij: ['YYYYY', '.YYY.', '..Y..', '.YYY.'] },
  pencil: { plek: 'hand', rij: ['P', 'Y', 'Y', 'K'] },
  lantern: { plek: 'hand', rij: ['E', 'L', 'L', 'E'] },
  heart: { plek: 'top', rij: ['.R.R.', 'RRRRR', '.RRR.', '..R..'] },
  star: { plek: 'top', rij: ['..Y..', 'YYYYY', '.YYY.', '.Y.Y.'] },
  apple: { plek: 'hand', rij: ['.N.', 'RRR', 'RRR'] },
};
function tekenProp(c, f, s, y0, aL, aR) {
  const pr = f.prop, P = PROPS[pr.naam];
  if (!P) return;
  const k = f.kijk, w = P.rij[0].length, h = P.rij.length, op = Math.round(pr.dy * s);
  let x, y;                                           // de linkerbovenhoek
  if (P.plek === 'top') { x = -w * s / 2; y = y0 - (h + 1) * s - op; }
  else if (P.plek === 'grond') { x = k > 0 ? 7.5 * s : -7.5 * s - w * s; y = -h * s + Math.round(f.pose.dy * s); }
  else { x = k > 0 ? 7 * s : -7 * s - w * s; y = y0 + 6 * s + (k > 0 ? aR : aL) - h * s - op; }
  c.save();
  if (pr.hoek) { const px = P.plek === 'top' ? 0 : (k > 0 ? x : x + w * s), py = y + h * s; c.translate(px, py); c.rotate(pr.hoek * k); c.translate(-px, -py); }
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const ch = P.rij[j][k > 0 ? i : w - 1 - i];
    if (ch !== '.') { c.fillStyle = PKLEUR[ch]; c.fillRect(x + i * s, y + j * s, s, s); }
  }
  c.restore();
}
/* het springtouw en de hoepel */
function tekenRing(c, f, s) {
  const soort = f.ring[0], k = f.ring[1], dik = Math.max(2, Math.round(s / 2));
  c.save();
  if (soort === 'rope') {
    if (k > 0.5) c.globalAlpha *= 0.35;               // het touw gaat achter hem langs omhoog
    c.fillStyle = '#efe6cf';
    c.fillRect(-7.5 * s, Math.round(-5 * s - 6.5 * s * Math.cos(k * Math.PI * 2)), 15 * s, dik);
  } else {
    c.fillStyle = '#f08bb4';
    c.fillRect(Math.round(-6.5 * s + golf(k, 1) * s), Math.round(-5.5 * s + Math.cos(k * Math.PI * 2) * 0.5 * s), 13 * s, dik);
  }
  c.restore();
}
/* een eigen plaatje of GIF in plaats van het poppetje; geeft terug hoe groot het vak is dat gewist moet worden */
function tekenBeeld(c, f) {
  const A = f.beeld, bm = A.frames[Math.min(f.beeldI, A.frames.length - 1)], doel = 16 * f.maat;
  const sch = A.h <= doel ? Math.max(1, Math.floor(doel / A.h)) : doel / A.h, w = A.w * sch, h = A.h * sch;
  c.imageSmoothingEnabled = A.h > doel;
  if (f.kijk < 0) c.scale(-1, 1);
  c.drawImage(bm, Math.round(-w / 2), Math.round(-h), Math.round(w), Math.round(h));
  return h + w / 2;
}

/* ---- wat de bewegingen samen opleveren op het poppetje zetten ---- */
function pasToe(f, o, H) {
  const p = f.pose, s = f.maat, po = o.poten !== null ? o.poten : H.poten;
  p.dy = Math.max(-1, o.y); p.dx = Math.round(o.x * s);
  p.lijf = (H.zit ? -2 : 0) + o.lijf;
  if (H.zit) { p.poten[0] = p.poten[1] = p.poten[2] = p.poten[3] = 0; p.los = false; }
  else if (typeof po === 'number') { p.poten[0] = p.poten[1] = p.poten[2] = p.poten[3] = po; p.los = true; }
  else if (po) { for (let i = 0; i < 4; i++) p.poten[i] = po[i]; p.los = o.los; }
  p.armL = klem(H.aL + o.aL + (f.kijk < 0 ? o.aF : 0), -3.2, 1.6);
  p.armR = klem(H.aR + o.aR + (f.kijk > 0 ? o.aF : 0), -3.2, 1.6);
  p.schuin = o.tilt; f.animRol = o.rol;
  f.rekX *= o.sx * H.schaal; f.rekY *= o.sy * H.schaal;
  const og = o.ogen || H.ogen, kk = o.kijk || H.kijk;
  if (og) f.ogenNu = og;
  if (kk) { f.kijkVast = kk; f.kijkTot = M.t + 0.1; }
  if (H.prop === 'sword') { f.ding = 'zwaard'; f.dingHoek = -0.5 + o.pHoek * 1.6; }
  else if (H.prop === 'laptop') f.ding = 'laptop';
  else if (H.prop) f.prop = { naam: H.prop, dy: o.pDy, hoek: o.pHoek };
  f.ring = o.ring;
  if (H.kleur) f.animKleur = H.kleur === 'regenboog' ? 'hsl(' + Math.round(M.t * 240 % 360) + ',80%,62%)' : H.kleur;
  f.animAlfa = H.alfa * o.alfa;
  if (H.hoed) f.animHoed = H.hoed;
}

/* ---- van een regel tekst naar een programma: een rij stukjes die na elkaar komen ---- */
function ontleedAnim(tekst) {
  const tok = String(tekst).trim().split(/\s+/).filter(Boolean);
  let i = 0, tempo = 1;
  function stap(t) {
    let n = 1;
    const ster = /^(.+)\*(\d+)$/.exec(t);
    if (ster) { t = ster[1]; n = Math.min(60, +ster[2]); }
    const sg = { d: 0, moves: [], zet: [], fx: [] };
    for (const at of t.split('&')) {
      const m = /^(!?[a-z]+)(?::([^\/]+))?(?:\/(\d+(?:\.\d+)?))?$/i.exec(at);
      if (!m) throw new Error('I do not understand "' + at + '"');
      const naam = m[1].toLowerCase(), arg = m[2], eigenDuur = m[3] ? Math.max(0.03, parseFloat(m[3])) : 0;
      if (naam[0] === '!') {
        const e = EFFECT[naam.slice(1)];
        if (!e) throw new Error('I do not know the effect "' + naam + '"');
        const a = e.lees ? e.lees(arg) : arg;
        sg.fx.push(f => e.doe(f, a));
      } else if (naam === 'tempo') tempo = klem(parseFloat(arg) || 1, 0.25, 4);
      else if (STAAT[naam]) {
        const z = STAAT[naam], a = z.lees ? z.lees(arg) : arg;
        sg.zet.push((H, f) => z.zet(H, a, f));
      } else {
        const b = BEW[naam];
        if (!b) throw new Error('I do not know the move "' + naam + '"');
        const a = arg === undefined ? 1 : parseFloat(arg);
        if (!isFinite(a)) throw new Error('"' + naam + ':' + arg + '" needs a number');
        const d = eigenDuur || (SNELHEID[naam] ? Math.max(0.2, Math.abs(a) / SNELHEID[naam]) : b[0]) / tempo;
        sg.moves.push({ f: b[1], a, d });
        if (d > sg.d) sg.d = d;
      }
    }
    const uit = [];
    for (let r = 0; r < n; r++) uit.push(sg);
    return uit;
  }
  function blok(binnen) {
    const uit = [];
    while (i < tok.length) {
      const t = tok[i++];
      if (t === '[') { for (const x of blok(true)) uit.push(x); continue; }
      const sluit = /^\](?:\*(\d+))?$/.exec(t);
      if (sluit) {
        if (!binnen) throw new Error('there is a ] without a [ before it');
        const n = Math.min(60, +(sluit[1] || 1)), her = [];
        for (let r = 0; r < n; r++) for (const x of uit) her.push(x);
        return her;
      }
      for (const x of stap(t)) uit.push(x);
    }
    if (binnen) throw new Error('a [ is never closed with ]');
    return uit;
  }
  const seg = blok(false);
  let duur = 0;
  for (const sg of seg) duur += sg.d;
  if (!seg.length || duur <= 0) throw new Error('there is no move in it that takes time');
  if (duur > 120) throw new Error('that takes longer than two minutes');
  if (seg.length > 2000) throw new Error('that is too long');
  return { seg, duur };
}
/* een animatie afspelen: geeft een actie terug (zie acties.js) */
function speelAnim(f, prog, keer) {
  const H = { aL: 0, aR: 0, zit: false, ogen: null, kijk: null, prop: null, hoed: null, kleur: null, alfa: 1, schaal: 1, poten: null };
  const c = { x0: f.x };
  let i = 0, t = 0, rond = 0, gestart = -1;
  return {
    stap(dt) {
      t += dt;
      for (let rondje = 0; rondje < 4000; rondje++) {
        if (i >= prog.seg.length) { if (++rond >= keer) return true; i = 0; gestart = -1; }
        const sg = prog.seg[i];
        if (gestart !== i) { gestart = i; c.x0 = f.x; for (const z of sg.zet) z(H, f); for (const e of sg.fx) e(f); }
        if (t < sg.d) break;
        t -= sg.d; i++; gestart = -1;
      }
      const sg = prog.seg[i];
      if (!sg) return true;
      const o = leegBlad();
      for (const m of sg.moves) m.f(o, Math.min(1, t / m.d), m.a, f, c);
      pasToe(f, o, H);
      return false;
    },
  };
}
function speelBeeld(f, A, keer) {                    // een eigen GIF of plaatje: hij verandert erin zolang het speelt
  let t = 0, i = 0, rond = 0;
  return {
    stap(dt) {
      t += dt;
      while (t >= A.duur[i]) { t -= A.duur[i]; if (++i >= A.frames.length) { i = 0; if (++rond >= keer) return true; } }
      f.beeld = A; f.beeldI = i;
      return false;
    },
  };
}

/* ---- de lijst met alle animaties ---- */
M.anim = { op: {}, lijst: [], fouten: [], eigenFouten: [], cats: [] };
function zetAnim(a) {
  const oud = M.anim.op[a.naam];
  if (oud) M.anim.lijst[M.anim.lijst.indexOf(oud)] = a; else M.anim.lijst.push(a);
  M.anim.op[a.naam] = a;
}
function animWeg(a) {
  M.anim.lijst.splice(M.anim.lijst.indexOf(a), 1);
  delete M.anim.op[a.naam];
  for (const f of M.figuren) if (f.skin === a) f.skin = null;
  if (a.frames) for (const bm of a.frames) { try { bm.close(); } catch (e) { /* al weg */ } }
}
function telCats() { M.anim.cats = []; for (const a of M.anim.lijst) if (!M.anim.cats.includes(a.cat)) M.anim.cats.push(a.cat); }
M.animUitTekst = function (naam, cat, tekst, eigen) {
  const prog = ontleedAnim(tekst);
  const a = { naam, cat, soort: 'moves', tekst, prog, duur: prog.duur, eigen: !!eigen };
  zetAnim(a);
  return a;
};
(function laadIngebouwd() {
  if (typeof ANIMDATA !== 'string') return;
  let cat = 'other';
  for (const regel of ANIMDATA.split('\n')) {
    const r = regel.trim();
    if (!r) continue;
    if (r[0] === '#') { cat = r.slice(1).trim(); continue; }
    const i = r.indexOf(':'), naam = r.slice(0, i).trim();
    try {
      if (i < 1 || !/^[a-z0-9-]+$/.test(naam)) throw new Error('the name is not right');
      if (M.anim.op[naam]) throw new Error('this name is used twice');
      M.animUitTekst(naam, cat, r.slice(i + 1), false);
    } catch (e) { M.anim.fouten.push(naam + ': ' + e.message); }
  }
  telCats();
})();
M.animLijst = () => M.anim.lijst.map(a => ({ naam: a.naam, cat: a.cat, soort: a.soort, duur: +(a.soort === 'beeld' ? a.totaal : a.duur).toFixed(2), eigen: a.eigen, tekst: a.tekst || null, beelden: a.frames ? a.frames.length : 0 }));

/* ---- eigen animaties: een plaatje of GIF (alle beelden eruit halen), of een tekstbestand met een regel bewegingen ---- */
const MIME = { gif: 'image/gif', png: 'image/png', apng: 'image/apng', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg' };
async function beeldUitBytes(bytes, ext) {
  const type = MIME[ext], frames = [], duur = [];
  let w = 0, h = 0;
  const klein = (bw, bh) => { const k = Math.min(1, 256 / Math.max(bw, bh)); return k < 1 ? { resizeWidth: Math.max(1, Math.round(bw * k)), resizeHeight: Math.max(1, Math.round(bh * k)), resizeQuality: 'medium' } : undefined; };
  const kapot = () => new Error('I cannot read this as a picture');
  if (typeof ImageDecoder === 'function' && await ImageDecoder.isTypeSupported(type)) {
    const dec = new ImageDecoder({ data: bytes, type });
    try { await dec.tracks.ready; } catch (e) { throw kapot(); }
    const n = Math.min(240, dec.tracks.selectedTrack.frameCount || 1);
    for (let i = 0; i < n; i++) {
      let vf;
      try { vf = (await dec.decode({ frameIndex: i })).image; } catch (e) { if (frames.length) break; throw kapot(); }
      const bm = await createImageBitmap(vf, klein(vf.displayWidth, vf.displayHeight));
      frames.push(bm); duur.push(klem((vf.duration || 100000) / 1e6, 0.03, 5)); w = bm.width; h = bm.height;
      vf.close();
    }
    dec.close();
  } else {
    let eerst;
    try { eerst = await createImageBitmap(new Blob([bytes], { type })); } catch (e) { throw kapot(); }
    const opt = klein(eerst.width, eerst.height);
    const bm = opt ? await createImageBitmap(eerst, opt) : eerst;
    frames.push(bm); duur.push(2); w = bm.width; h = bm.height;
  }
  if (!frames.length || !w || !h) throw new Error('there is no picture in this file');
  if (frames.length === 1) duur[0] = 2;               // een stilstaand plaatje blijft 2 seconden staan
  return { frames, duur, w, h, totaal: duur.reduce((a, b) => a + b, 0) };
}
/* api = { lijst(), lees(naam) }: het hoofdprogramma bewaart de bestanden. Nooit twee keer tegelijk: de volgende wacht op de vorige. */
let laadRij = Promise.resolve();
M.laadEigen = function (api) { const p = laadRij.then(() => laadEigenNu(api)); laadRij = p.catch(() => {}); return p; };
async function laadEigenNu(api) {
  const fouten = [];
  let lijst = [];
  try { lijst = await api.lijst(); } catch (e) { fouten.push('the list: ' + e.message); }
  const sleutel = x => (M.anim.op[x.naam] && !M.anim.op[x.naam].eigen ? x.naam + '-mine' : x.naam);
  const namen = new Set(lijst.map(sleutel));
  for (const a of M.anim.lijst.filter(x => x.eigen)) if (!namen.has(a.naam)) animWeg(a);
  for (const x of lijst) {
    const naam = sleutel(x), oud = M.anim.op[naam];
    if (oud && oud.stempel === x.stempel) continue;
    try {
      const bytes = await api.lees(x.naam);
      if (!bytes) throw new Error('the file is gone');
      let a;
      if (x.ext === 'txt') {
        const tekst = new TextDecoder().decode(bytes).split(/\r?\n/).map(r => r.trim()).filter(r => r && r[0] !== '#').join(' ');
        const prog = ontleedAnim(tekst);
        a = { naam, cat: 'mine', soort: 'moves', tekst, prog, duur: prog.duur, eigen: true };
      } else {
        const b = await beeldUitBytes(bytes, x.ext);
        a = { naam, cat: 'mine', soort: 'beeld', frames: b.frames, duur: b.duur, totaal: b.totaal, w: b.w, h: b.h, eigen: true };   // duur = per beeld
      }
      a.stempel = x.stempel; a.ext = x.ext; a.bestand = x.naam;
      if (oud) animWeg(oud);
      zetAnim(a);
    } catch (e) { fouten.push(x.naam + '.' + x.ext + ': ' + (e && e.message ? e.message : e)); }
  }
  M.anim.eigenFouten = fouten;
  telCats();
  const skin = M.inst.skin && M.anim.op[M.inst.skin];
  if (M.hoofd) M.hoofd.skin = skin && skin.soort === 'beeld' ? skin : null;
  if (M.inst.skin && !skin && !fouten.length) { M.inst.skin = ''; M.bewaar(); }      // het plaatje waar hij op leek is weggehaald
  return { ok: true, eigen: M.anim.lijst.filter(a => a.eigen).length, fouten };
};

/* ---- de opdrachten ---- */
function dichtsteAnim(naam) {
  let beste = null, bd = 4;
  for (const a of M.anim.lijst) { if (a.naam.includes(naam)) return a.naam; const d = verschil(naam, a.naam); if (d < bd) { bd = d; beste = a.naam; } }
  return beste;
}
opdracht('animatie', {
  en: 'anim', soort: 'animations', ook: ['animate', 'animation'], lijf: true, grond: true, groep: true,
  hulp: 'plays one of the 500 animations or one of your own: anim <name> [how many times]; anim random [kind]. The whole list: node maatje.js anims', vb: 'anim victory-dance',
  lees: rest => {
    const d = rest.toLowerCase().split(/\s+/).filter(Boolean);
    if (!d.length) throw new Error('which one? for example: anim victory-dance   (the list: node maatje.js anims)');
    if (d[0] === 'random' || d[0] === 'willekeurig') {
      if (d[1] && !M.anim.cats.includes(d[1])) throw new Error('choose a kind: ' + M.anim.cats.join(', '));
      return { rnd: true, cat: d[1] || null, keer: 1 };
    }
    if (!M.anim.op[d[0]]) { const b = dichtsteAnim(d[0]); throw new Error('there is no animation called "' + d[0] + '"' + (b ? ' (did you mean ' + b + '?)' : '')); }
    const keer = d[1] ? parseInt(d[1], 10) : 1;
    if (d.length > 2 || (d[1] && (!/^\d+$/.test(d[1]) || keer < 1 || keer > 50))) throw new Error('like this: anim victory-dance 3   (at most 50 times)');
    return { naam: d[0], keer };
  },
  maak: (f, a) => {
    const A = a.rnd ? M.kies(M.anim.lijst.filter(x => x.soort === 'moves' && (!a.cat || x.cat === a.cat))) : M.anim.op[a.naam];
    if (!A) return null;
    return A.soort === 'beeld' ? speelBeeld(f, A, a.keer) : speelAnim(f, A.prog, a.keer);
  },
});
opdracht('skin', {
  soort: 'looks', hulp: 'look like one of your own pictures or GIFs all the time: skin <name>, and back to himself with: skin off', vb: 'skin off', stil: true,
  lees: rest => {
    const t = rest.toLowerCase();
    if (t === 'off' || t === 'uit') return { naam: null };
    const a = M.anim.op[t];
    if (!a || a.soort !== 'beeld') throw new Error('choose one of your own pictures or GIFs' + (M.anim.lijst.some(x => x.soort === 'beeld') ? ': ' + M.anim.lijst.filter(x => x.soort === 'beeld').map(x => x.naam).join(', ') : ' (add one in the Maatje window first)') + ', or: skin off');
    return { naam: t };
  },
  maak: (f, a) => {
    f.skin = a.naam ? M.anim.op[a.naam] || null : null; f.skinT = 0; f.skinI = 0;
    if (f.hoofd) { M.inst.skin = a.naam || ''; M.bewaar(); }
    const m = f.midden(); M.vonken(m.x, m.y, 10, ['#ffffff', '#ffe066'], 170); M.klank('pop');
    return null;
  },
});
