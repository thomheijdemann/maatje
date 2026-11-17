'use strict';
/* MAATJE - the little guy himself: what he looks like, his poses and his physics.
   He is 14 pixels wide and 10 high; f.maat = how many screen pixels one of his pixels is.
   (x, y) is where his feet are. He can also walk on the walls and the ceiling (f.vlak).
   The code below is written in Dutch. */
const ZW = 2400;                                                    // zwaartekracht, pixels per s²
const VLAKHOEK = [0, -Math.PI / 2, -Math.PI, -Math.PI * 1.5];       // vloer, rechtermuur, plafond, linkermuur
const VLAKNAAM = ['vloer', 'rechtermuur', 'plafond', 'linkermuur'];
const POOTKOL = [2, 4, 9, 11];
const REGENBOOG = ['#ff5d5d', '#ffa64d', '#ffe066', '#7ddc7d', '#5db8ff', '#b98cff'];
const KLOONKLEUR = ['#6a9bcc', '#78a65a', '#9b7ede', '#f2c94c', '#f08bb4', '#45c4b0', '#e5484d', '#9a9890'];

/* ogen: pixels van het LINKER oog (kolom, rij); het rechter is het spiegelbeeld */
const OGEN = {
  normaal: { px: [[4, 2], [4, 3]], kijk: true },
  groot: { px: [[3, 2], [4, 2], [3, 3], [4, 3]], kijk: true },
  dicht: { px: [[4, 3], [5, 3]] },
  slaap: { px: [[3, 3], [4, 3], [5, 3]] },
  blij: { px: [[3, 3], [4, 2], [5, 3]] },
  boos: { px: [[3, 2], [4, 3]] },
  sip: { px: [[3, 3], [4, 2]] },
  kruis: { px: [[3, 1], [5, 1], [4, 2], [3, 3], [5, 3]] },
  plus: { px: [[4, 1], [3, 2], [4, 2], [5, 2], [4, 3]] },
  hart: { px: [[3, 1], [5, 1], [3, 2], [4, 2], [5, 2], [4, 3]], kleur: '#e0245e' },
  ster: { px: [[4, 1], [3, 2], [4, 2], [5, 2], [4, 3]], kleur: '#fff3a0' },
  knipoog: { px: [[4, 2], [4, 3]], rechts: [[8, 3], [9, 3], [10, 3]] },
  duizelig: { px: [], wissel: true },
};
/* hoeden: r = bovenste rij (0 = bovenkant van zijn hoofd), k = eerste kolom, daarna de rijen */
const HOEDEN = {
  geen: null,
  kroon: { r: -3, k: 3, rij: ['G.G..G.G', 'GGGGGGGG', 'GYGRRGYG'], kl: { G: '#e8b923', Y: '#ffe680', R: '#e5484d' } },
  bril: { r: 2, k: 2, rij: ['KKKKKKKKKK', '.KKK..KKK.'], kl: { K: '#1a1918' }, geenOgen: true, glans: true },
  pet: { r: -2, k: 2, rij: ['.RRRRRRRR.', 'RRRRRRRRRR'], kl: { R: '#e5484d' }, klep: '#b8343a' },
  hoed: { r: -5, k: 1, rij: ['...KKKKKK...', '...KKKKKK...', '...KKKKKK...', '...RRRRRR...', 'KKKKKKKKKKKK'], kl: { K: '#232220', R: '#e5484d' } },
  koptelefoon: { r: -1, k: 1, rij: ['.KKKKKKKKKK.', 'K..........K', 'K..........K', 'A..........A', 'K..........K'], kl: { K: '#3a3936', A: '#6a9bcc' } },
  ninja: { r: 1, k: 2, rij: ['RRRRRRRRRR'], kl: { R: '#c8102e' }, staart: '#c8102e' },
  tovenaar: { r: -6, k: 1, rij: ['.....PP.....', '....PPPP....', '....PPPP....', '...PPYPPP...', '...PPPPPP...', 'PPPPPPPPPPPP'], kl: { P: '#5b4bb5', Y: '#ffe066' } },
  halo: { r: -5, k: 3, rij: ['.YYYYYY.', 'Y......Y', '.YYYYYY.'], kl: { Y: '#ffe066' } },
};
const EMO = {
  hart: ['♥', '#ff4d6d'], vraag: ['?', '#ffffff'], uitroep: ['!', '#ffd23f'], ster: ['★', '#ffd23f'], muziek: ['♪', '#7fdfff'],
  boos: ['', '#ff4d4d'], zweet: ['', '#7fc8ff'], idee: ['', '#ffe066'], zzz: ['Z', '#ffffff'],
};

/* zijn eigen uiterlijk: wat er bovenop zit (voelsprieten, oren, hoorntjes, een kuif), een tekening op zijn lijf (buik, strepen,
   stippen) en blosjes op de wangen. Alles in kolommen en rijen van zijn lichaam: kolom 2 t/m 11, rij 0 t/m 7, boven het hoofd is negatief. */
const STIJL_EFFEN = { top: 'geen', vlek: 'geen', wangen: false };
const STIJLEN = { top: ['geen', 'antenne', 'oren', 'hoorns', 'kuif'], vlek: ['geen', 'buik', 'strepen', 'stippen'] };
const STIJL_STANDAARD = STIJL_EFFEN;                                                       // standaard ziet hij er precies zo uit als je hem kent: niets extra's. Eigen uiterlijken kies je zelf.
const TOP_PX = {                                                                           // [kolom, rij, kleur]: l = lijfkleur, g = geel, c = crème
  antenne: [[4, -3, 'l'], [4, -2, 'l'], [4, -1, 'l'], [4, -4, 'g'], [9, -3, 'l'], [9, -2, 'l'], [9, -1, 'l'], [9, -4, 'g']],
  oren: [[2, -1, 'l'], [3, -1, 'l'], [2, -2, 'l'], [10, -1, 'l'], [11, -1, 'l'], [11, -2, 'l']],
  hoorns: [[3, -1, 'c'], [3, -2, 'c'], [10, -1, 'c'], [10, -2, 'c'], [2, -3, 'c'], [11, -3, 'c']],
  kuif: [[6, -1, 'l'], [7, -1, 'l'], [7, -2, 'l'], [8, -3, 'l']],
};
function tekenStijl(c, f, s, y0) {
  const st = f.stijl || STIJL_EFFEN, u = (k, r, w, h) => c.fillRect((k - 7) * s, y0 + r * s, w * s, h * s);
  if (st.vlek === 'buik') { c.fillStyle = 'rgba(255,255,255,0.38)'; u(4, 5, 6, 3); }
  else if (st.vlek === 'strepen') { c.fillStyle = 'rgba(0,0,0,0.2)'; u(2, 4, 10, 1); u(2, 6, 10, 1); }
  else if (st.vlek === 'stippen') { c.fillStyle = 'rgba(0,0,0,0.2)'; u(3, 5, 1, 1); u(5, 7, 1, 1); u(8, 6, 1, 1); u(10, 4, 1, 1); u(6, 4, 1, 1); }
  if (st.wangen) { c.fillStyle = '#ff9bb8'; u(3, 4, 1, 1); u(10, 4, 1, 1); }
  const h = HOEDEN[f.animHoed || f.hoed], top = TOP_PX[st.top];
  if (top && (!h || h.r >= 0)) {                                                           // onder een hoge hoed is geen plek voor voelsprieten
    const lijf = f.verkoold > 0 ? '#2e2c2a' : (f.animKleur || f.kleurNu);
    for (const p of top) { c.fillStyle = p[2] === 'l' ? lijf : p[2] === 'g' ? '#ffd23f' : '#f4f1ea'; u(p[0], p[1], 1, 1); }
  }
}
function tekenHoed(c, f, s, y0) {
  const h = HOEDEN[f.animHoed || f.hoed];
  if (!h) return;
  for (let j = 0; j < h.rij.length; j++) {
    const rij = h.rij[j];
    let i = 0;
    while (i < rij.length) {                       // stukjes van dezelfde kleur in één keer
      const ch = rij[i];
      let e = i + 1;
      while (e < rij.length && rij[e] === ch) e++;
      if (ch !== '.') { c.fillStyle = h.kl[ch]; c.fillRect((h.k + i - 7) * s, y0 + (h.r + j) * s, (e - i) * s, s); }
      i = e;
    }
  }
  if (h.klep) { c.fillStyle = h.klep; c.fillRect(f.kijk > 0 ? 5 * s : -8 * s, y0 - s, 3 * s, s); }
  if (h.glans) { c.fillStyle = '#ffffff'; const g = Math.max(1, Math.round(s / 2)); c.fillRect(-4 * s, y0 + 2 * s, g, g); c.fillRect(s, y0 + 2 * s, g, g); }
  if (h.staart) {                                  // de losse eindjes van de band wapperen achter hem aan
    c.fillStyle = h.staart;
    const a = f.kijk > 0 ? -1 : 1, wap = Math.sin(M.t * 9 + f.nr) > 0 ? 1 : 0;
    c.fillRect(a > 0 ? 5 * s : -7 * s, y0 + s, 2 * s, s);
    c.fillRect(a > 0 ? 6 * s : -7 * s, y0 + (2 + wap) * s, s, s);
  }
}
function tekenOgen(c, f, s, y0) {
  const h = HOEDEN[f.animHoed || f.hoed];
  if (h && h.geenOgen) return;
  let def = OGEN[f.oogSoort()] || OGEN.normaal;
  if (def.wissel) def = (Math.floor(M.t / 0.14) & 1) ? OGEN.kruis : OGEN.plus;
  const dx = def.kijk ? f.oogDx : 0, dy = def.kijk ? f.oogDy : 0;
  c.fillStyle = def.kleur || (f.verkoold > 0 ? '#ffffff' : DONKER);
  for (const p of def.px) {
    c.fillRect((p[0] + dx - 7) * s, y0 + (p[1] + dy) * s, s, s);
    if (!def.rechts) c.fillRect((13 - p[0] + dx - 7) * s, y0 + (p[1] + dy) * s, s, s);
  }
  if (def.rechts) for (const p of def.rechts) c.fillRect((p[0] - 7) * s, y0 + p[1] * s, s, s);
}
/* het poppetje zelf; (0,0) = tussen zijn voeten, omhoog is min-y */
function tekenSprite(c, f) {
  const s = f.maat, p = f.pose;
  const L = Math.round(p.lijf * s);
  const yb = -2 * s - L, y0 = yb - 8 * s;          // onderkant en bovenkant van het lijf
  c.fillStyle = f.verkoold > 0 ? '#2e2c2a' : (f.animKleur || f.kleurNu);
  for (let i = 0; i < 4; i++) {
    const len = p.poten[i];
    const onder = (!p.los && len >= 2) ? 0 : yb + Math.round(len * s);
    if (onder > yb) c.fillRect((POOTKOL[i] - 7) * s, yb, s, onder - yb);
  }
  c.fillRect(-5 * s, y0, 10 * s, 8 * s);
  const aL = Math.round(p.armL * s), aR = Math.round(p.armR * s);
  c.fillRect(-7 * s, y0 + 4 * s + aL, 2 * s, 2 * s);
  c.fillRect(5 * s, y0 + 4 * s + aR, 2 * s, 2 * s);
  tekenStijl(c, f, s, y0);
  tekenOgen(c, f, s, y0);
  tekenHoed(c, f, s, y0);
  if (f.prop) tekenProp(c, f, s, y0, aL, aR);     // uit anim.js
  if (f.ring) tekenRing(c, f, s);
  const k = f.kijk;
  if (f.ding === 'laptop') {
    c.fillStyle = '#c9ccd1'; c.fillRect(k > 0 ? 6 * s : -12 * s, -s, 6 * s, s);
    c.fillStyle = '#9aa0a8'; c.fillRect(k > 0 ? 11 * s : -12 * s, -6 * s, s, 5 * s);
    c.fillStyle = '#8fd3ff'; c.fillRect(k > 0 ? 10.5 * s : -11 * s, -5.5 * s, s / 2, 4 * s);
  } else if (f.ding === 'zwaard') {
    c.save();
    c.translate(k * 6 * s, y0 + 5 * s + (k > 0 ? aR : aL));
    c.rotate(f.dingHoek * k);
    c.fillStyle = '#eef3f6'; c.fillRect(-s / 2, -10 * s, s, 8.5 * s);
    c.fillStyle = '#b7c6cf'; c.fillRect(0, -10 * s, s / 2, 8.5 * s);
    c.fillStyle = '#e8b923'; c.fillRect(-1.5 * s, -1.5 * s, 3 * s, s);
    c.fillStyle = '#7a5230'; c.fillRect(-s / 2, -s / 2, s, 1.5 * s);
    c.restore();
  }
}

let figuurNr = 0;
class Figuur {
  constructor(o) {
    this.nr = figuurNr++;
    this.hoofd = !!o.hoofd; this.leider = o.leider || null; this.slot = o.slot || 0;
    this.hulpje = false;                            // een vriendje dat er vanzelf bij kwam omdat Claude een hulpje inzette
    this.x = o.x; this.y = M.vloer(o.x); this.vx = 0; this.vy = 0;
    this.vlak = 0; this.draai = 0; this.rol = 0; this.rolV = 0;
    this.lucht = false; this.vliegt = false; this.gepakt = false; this.stuiters = 0; this.hard = false;
    this.kleur = o.kleur; this.kleurNu = o.kleur; this.kleurWissel = false;
    this.maat = o.maat; this.hoed = HOEDEN[o.hoed] ? o.hoed : 'geen';
    this.kijk = 1; this.fase = 0; this.vorigeStap = 0; this.liep = false;
    this.pose = { lijf: 0, poten: [2, 2, 2, 2], los: false, armL: 0, armR: 0, schuin: 0, dx: 0, dy: 0 };
    // voor animaties (anim.js): een voorwerp in zijn hand, een touw of hoepel, een andere kleur, een plaatje in plaats van hemzelf
    this.prop = null; this.ring = null; this.animKleur = null; this.animAlfa = 1; this.animHoed = null; this.animRol = 0;
    this.beeld = null; this.beeldI = 0; this.skin = null; this.skinT = 0; this.skinI = 0;
    this.stijl = o.stijl || STIJL_EFFEN;                            // zijn eigen uiterlijk: voelsprieten, vlek, wangen (zie tekenStijl)
    this.gId = 0; this.gX0 = 0; this.gB = 0; this.negeer = null;     // het venster waar hij op staat (platform.js), en waar het was
    this.rekX = 1; this.rekY = 1; this.alfa = 1; this.zichtbaar = true; this.plet = 0;
    this.ogen = 'normaal'; this.ogenTot = 0; this.ogenVast = null; this.ogenNu = null;
    this.oogDx = 0; this.oogDy = 0; this.kijkVast = null; this.kijkTot = 0; this.kijkNaar = null;
    this.knipT = 1 + M.rnd() * 3; this.verkoold = 0; this.duizel = 0;
    this.houding = null; this.zitK = 0; this.zT = 0; this.vrijSlaap = false; this.vrijBezig = false;
    this.rij = []; this.nu = null; this.nuNaam = null; this.bij = []; this.straks = [];
    this.bel = null; this.emote = null; this.ding = null; this.dingHoek = 0;
    this.spoor = false; this.spoorP = [];
    this.gvx = 0; this.gvy = 0; this.pakDx = 0; this.pakDy = 0; this.aaiT = 0; this.aaiKoel = 0;
  }
  marge() { return 7 * this.maat + 2; }
  /* waar zijn voeten staan als hij loopt: op zijn venster, of op de vloer van het scherm */
  vloerY(x) { if (this.gId) { const p = M.plat.op.get(this.gId); if (p) return p.y; } return M.vloer(x); }
  /* hij staat op een venster: meebewegen als het venster verschuift, en vallen als het weg is of niet meer onder hem ligt */
  steun() {
    if (!this.gId) return;
    if (this.lucht || this.gepakt || this.vliegt || this.vlak !== 0) { this.gId = 0; return; }
    const p = M.plat.op.get(this.gId);
    if (!p) return this.valVan();
    if (p.x0 !== this.gX0) { if (p.x1 - p.x0 === this.gB) this.x += p.x0 - this.gX0; this.gX0 = p.x0; this.gB = p.x1 - p.x0; }
    this.y = p.y;
    if (!M.plat.staatOp(p, this.x)) this.valVan();
  }
  valVan() {                                                        // van zijn venster af: hij valt naar wat eronder ligt (en dwars door dat venster heen)
    this.laatDoor();
    this.gId = 0; this.lucht = true; this.vy = 0; this.vx = 0; this.stuiters = 0; this.hard = false;
  }
  laatDoor() { const p = this.gId && M.plat.op.get(this.gId); if (p) this.negeer = { id: p.id, y: p.y }; }      // dit venster telt niet als hij erdoorheen valt
  staOp(p) { this.gId = p.id; this.gX0 = p.x0; this.gB = p.x1 - p.x0; this.y = p.y; }
  vs() { return Math.sqrt(this.maat / 6); }                         // grote poppetjes lopen sneller
  lokaal(lx, ly) {                                                  // van zijn eigen assen naar het scherm
    const th = VLAKHOEK[this.vlak] + this.draai, c = Math.cos(th), si = Math.sin(th);
    return { x: this.x + lx * c - ly * si, y: this.y + lx * si + ly * c };
  }
  midden() { return this.lokaal(0, -5 * this.maat); }
  kop() { const h = HOEDEN[this.animHoed || this.hoed]; return this.lokaal(0, -(10 + (h && h.r < 0 ? -h.r : 0)) * this.maat - 2); }
  oogPlek(kant) { return this.lokaal(kant * 2.5 * this.maat, -7.5 * this.maat); }
  raakt(mx, my) {
    const th = VLAKHOEK[this.vlak] + this.draai, c = Math.cos(th), si = Math.sin(th), dx = mx - this.x, dy = my - this.y, s = this.maat;
    const lx = dx * c + dy * si, ly = -dx * si + dy * c;
    return Math.abs(lx) <= 7 * s + 4 && ly >= -10 * s - 4 && ly <= 4;
  }
  oogSoort() {
    if (M.t < this.ogenTot) return this.ogen;
    if (this.verkoold > 0 || this.gepakt) return 'groot';
    if (this.duizel > 0) return 'duizelig';
    if (this.ogenNu) return this.ogenNu;
    if (this.houding === 'slaap') return 'slaap';
    if (this.lucht && this.vy > 900) return 'groot';
    if (this.knipT < 0) return 'dicht';
    return this.ogenVast || 'normaal';
  }

  /* elk beeld eerst de rusthouding; een actie verandert daarna wat hij wil */
  rust(dt) {
    const p = this.pose, s = this.maat, po = p.poten;
    po[0] = po[1] = po[2] = po[3] = 2; p.los = false; p.armL = 0; p.armR = 0; p.schuin = 0; p.dx = 0;
    p.lijf = Math.sin(M.t * 2.1 + this.nr * 1.7) > 0.45 ? 1 / s : 0;             // ademen
    this.rekX = 1; this.rekY = 1; this.ogenNu = null; this.ding = null; this.kijkNaar = null; this.liep = false;
    p.dy = 0; this.prop = null; this.ring = null; this.animKleur = null; this.animAlfa = 1; this.animHoed = null; this.animRol = 0; this.beeld = null;
    this.knipT -= dt; if (this.knipT < -0.13) this.knipT = 1.6 + M.rnd() * 4.2;
    const zit = this.houding ? 1 : 0;
    if (this.zitK !== zit) this.zitK = zit > this.zitK ? Math.min(1, this.zitK + dt * 6) : Math.max(0, this.zitK - dt * 7);
    if (this.zitK > 0) { p.lijf = -2 * this.zitK; po[0] = po[1] = po[2] = po[3] = Math.min(1.99, 2 - 2 * this.zitK); }
    if (this.plet > 0) { const k = Math.min(1, this.plet / 0.14); this.rekY = 1 - 0.22 * k; this.rekX = 1 + 0.18 * k; this.plet -= dt; }
    if (this.lucht) {
      const op = this.vy < 0;
      p.los = true; po[0] = po[1] = po[2] = po[3] = op ? 2.5 : 1.3;
      p.armL = p.armR = op ? 0 : -2; this.rekY = op ? 1.07 : 1; this.rekX = op ? 0.95 : 1;
    }
    if (this.vliegt) { p.los = true; po[0] = po[1] = po[2] = po[3] = 1.4; p.lijf = Math.sin(M.t * 3.4 + this.nr) * 0.35; }
    if (this.gepakt) { p.los = true; for (let i = 0; i < 4; i++) po[i] = 2.2 + Math.sin(M.t * 13 + i * 1.9) * 0.6; p.armL = p.armR = -2.5; }
    if (this.duizel > 0) p.dx = Math.round(Math.sin(M.t * 9) * 0.5 * s);
  }
  loopPose(afstand, ren) {
    const p = this.pose, s = this.maat;
    this.fase += afstand / (s * (ren ? 3.2 : 2.2));
    const stap = Math.floor(this.fase), k = stap & 1, kort = ren ? 0.8 : 1.2;
    p.poten[0] = p.poten[2] = k ? kort : 2; p.poten[1] = p.poten[3] = k ? 2 : kort;
    p.lijf = Math.sin((this.fase % 1) * Math.PI) * (ren ? 0.5 : 0.25);
    p.armL = k ? 0.34 : -0.34; p.armR = -p.armL;
    this.liep = true;
    if (ren) {
      p.schuin = 0.1 * this.kijk;
      if (stap !== this.vorigeStap && this.vlak === 0 && M.rnd() < 0.6) M.stof(this.x - this.kijk * 4 * s, this.y, 1);
    }
    this.vorigeStap = stap;
  }

  update(dt) {
    const s = this.maat;
    this.rust(dt);
    this.steun();
    if (this.verkoold > 0) this.verkoold -= dt;
    if (this.duizel > 0) this.duizel -= dt;
    this.kleurNu = this.kleurWissel ? 'hsl(' + Math.round((M.t * 90 + this.nr * 47) % 360) + ',72%,62%)' : this.kleur;
    if (this.gepakt) this.sleep(dt);
    else {
      if (this.lucht) this.natuur(dt);
      for (let i = this.straks.length - 1; i >= 0; i--) if (M.t >= this.straks[i].t) { this.rij.push(this.straks[i].item); this.straks.splice(i, 1); }
      for (let i = this.bij.length - 1; i >= 0; i--) if (this.bij[i].stap(dt)) this.bij.splice(i, 1);
      // een nieuwe opdracht begint pas als hij weer op de grond staat (behalve dingen die niets met zijn lijf doen)
      if (!this.nu && this.rij.length && (!this.lucht || this.rij[0].def.stil || this.rij[0].def.magInLucht)) this.begin(this.rij.shift());
      if (this.nu && this.nu.stap(dt)) this.nu = null;
      if (!this.nu && !this.rij.length && this.leider) this.volg(dt);
    }
    if (this.skin && !this.beeld) {                 // hij ziet eruit als een eigen plaatje of GIF
      const A = this.skin;
      this.skinT += dt;
      if (this.skinI >= A.frames.length) this.skinI = 0;
      while (this.skinT >= A.duur[this.skinI]) { this.skinT -= A.duur[this.skinI]; this.skinI = (this.skinI + 1) % A.frames.length; }
      this.beeld = A; this.beeldI = this.skinI;
    }
    if (this.vliegt) {                              // vlammetjes onder zijn voeten
      for (let i = 0; i < 2; i++) M.deel({ x: this.x + (i ? 3.5 : -3.5) * s + (M.rnd() - 0.5) * s, y: this.y - s, vx: (M.rnd() - 0.5) * 40, vy: 180 + M.rnd() * 160, l: 0.2 + M.rnd() * 0.2, k: M.kies(['#ffd23f', '#ff8c2b', '#ff4d2d', '#ffffff']), m: Math.max(2, Math.round(s * (0.5 + M.rnd() * 0.5))) });
    }
    if (this.bel && this.bel.stap(dt)) this.bel = null;
    if (this.emote) { this.emote.t += dt; if (this.emote.t > this.emote.duur) this.emote = null; }
    if (this.houding === 'slaap' && this.zichtbaar) {
      this.zT -= dt;
      if (this.zT <= 0) { this.zT = 1.1; const k = this.kop(); M.fxTekst('Z', k.x + 3 * s, k.y - 16, '#ffffff', Math.max(2, Math.round(s / 3)), 14, -22, 1.6); }
    }
    this.kijkRichting();
    if (this.spoor && this.zichtbaar) {
      const m = this.midden(), l = this.spoorP[this.spoorP.length - 1];
      if (!l || Math.abs(l.x - m.x) + Math.abs(l.y - m.y) > 3) this.spoorP.push({ x: m.x, y: m.y, t: M.t });
    }
    while (this.spoorP.length && M.t - this.spoorP[0].t > 0.9) this.spoorP.shift();
  }
  kijkRichting() {
    let dx = 0, dy = 0;
    if (this.kijkVast && M.t < this.kijkTot) { dx = this.kijkVast[0]; dy = this.kijkVast[1]; }
    else if (this.liep) dx = this.kijk;
    else {
      const doel = this.kijkNaar || (M.t - M.muis.t < 5 ? M.muis : null);
      if (doel) {
        const o = this.oogPlek(0), th = VLAKHOEK[this.vlak], ex = doel.x - o.x, ey = doel.y - o.y, d = Math.hypot(ex, ey);
        if (d > 3 * this.maat && d < 900) {
          const lx = ex * Math.cos(th) + ey * Math.sin(th), ly = -ex * Math.sin(th) + ey * Math.cos(th);
          dx = Math.abs(lx) > d * 0.38 ? Math.sign(lx) : 0; dy = Math.abs(ly) > d * 0.5 ? Math.sign(ly) : 0;
        }
      }
    }
    this.oogDx = dx; this.oogDy = dy;
  }

  /* een opdracht uit de wachtrij starten */
  begin(item) {
    const def = item.def;
    const maak = () => { try { return def.maak(this, item.args) || null; } catch (e) { M.meldFout(def.naam, e); return null; } };
    if (def.lijf) this.houding = null;
    else if (!def.stil && this.houding === 'slaap') this.houding = 'zit';
    let act;
    if (((def.grond || def.lijf) && (this.vlak !== 0 || this.vliegt)) || (def.vloer && this.gId)) { const zelf = this; act = reeks([naarGrond(zelf), maak]); }     // vloer: alleen op de echte vloer van het scherm (muren, bal)
    else act = maak();
    if (item.nietWachten) { if (act) this.bij.push(act); }
    else { this.nu = act; this.nuNaam = def.naam; }
    if (this.hoofd && def.groep) {                 // de vriendjes doen het na, de een na de ander
      for (let i = 1; i < M.figuren.length; i++) M.figuren[i].straks.push({ t: M.t + 0.12 * i, item: { def, args: item.args, nietWachten: item.nietWachten } });
    }
  }
  stopAlles() {
    if (this.nu && this.nu.stop) this.nu.stop();
    for (const a of this.bij) if (a.stop) a.stop();
    this.nu = null; this.rij.length = 0; this.bij.length = 0; this.straks.length = 0;
    this.bel = null; this.zichtbaar = true; this.alfa = 1; this.draai = 0; this.ding = null;
    if (this.vlak === 1) this.x = M.W; else if (this.vlak === 3) this.x = 0; else if (this.vlak === 2) this.y = 0;
    else if (!this.lucht && !this.vliegt && !this.gepakt) this.y = this.vloerY(this.x);
  }
  /* loslaten van muur of plafond, of de raket uit: hij valt naar de vloer */
  laatLos() {
    this.laatDoor();
    this.gId = 0;
    if (this.vlak !== 0) {
      const m = this.midden(), th = VLAKHOEK[this.vlak];
      this.vx = this.vlak === 1 ? -90 : this.vlak === 3 ? 90 : 0;
      this.vlak = 0; this.draai = 0; this.x = m.x; this.y = m.y + 5 * this.maat; this.rol = th; this.rolV = 0; this.vy = 0;
    } else { this.vx = 0; this.vy = 0; }
    this.vliegt = false; this.lucht = true; this.stuiters = 0; this.hard = false;
    this.x = klem(this.x, this.marge(), M.W - this.marge());
  }
  natuur(dt) {
    const s = this.maat, m = this.marge(), y0 = this.y;
    this.vy = Math.min(2600, this.vy + ZW * dt);
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.rolV) this.rol += this.rolV * dt;
    else if (this.rol) { const r = Math.atan2(Math.sin(this.rol), Math.cos(this.rol)), st = 11 * dt; this.rol = Math.abs(r) <= st ? 0 : r - Math.sign(r) * st; }
    if (this.x < m) { this.x = m; this.vx = Math.abs(this.vx) * 0.55; }
    else if (this.x > M.W - m) { this.x = M.W - m; this.vx = -Math.abs(this.vx) * 0.55; }
    if (this.y < 10 * s && this.vy < 0) { this.y = 10 * s; this.vy = -this.vy * 0.3; }
    let vl = M.vloer(this.x), plat = null;
    if (this.negeer && this.y > this.negeer.y + 8) this.negeer = null;
    if (this.vy >= 0) { const p = M.plat.landing(this.x, y0, this.y, this.negeer && this.negeer.id); if (p && p.y < vl) { plat = p; vl = p.y; } }     // een venster waar hij op valt?
    if (this.y >= vl && this.vy >= 0) {
      const klap = this.vy;
      this.y = vl;
      if (this.stuiters > 0 && klap > 420) { this.stuiters--; this.vy = -klap * 0.38; this.vx *= 0.6; this.rolV *= 0.6; M.stof(this.x, vl, 4); M.klank('land'); }
      else {
        if (plat) this.staOp(plat); else this.gId = 0;
        this.lucht = false; this.vx = 0; this.vy = 0; this.rol = 0; this.rolV = 0; this.plet = 0.14;
        M.stof(this.x, vl, klap > 700 ? 8 : 3); M.klank('land');
        if (this.hard) { this.duizel = 1.7; this.hard = false; }
      }
    }
  }
  /* oppakken met de muis */
  pak() {
    this.stopAlles();
    if (this.vlak !== 0) this.laatLos();
    this.gId = 0;
    this.vliegt = false; this.lucht = false; this.gepakt = true; this.houding = null; this.vrijSlaap = false; this.rol = 0; this.rolV = 0;
    this.pakDx = this.x - M.muis.x; this.pakDy = klem(this.y - M.muis.y, 2 * this.maat, 10 * this.maat);
    this.gvx = 0; this.gvy = 0;
  }
  sleep(dt) {
    const tx = klem(M.muis.x + this.pakDx, this.marge(), M.W - this.marge()), ty = Math.min(M.muis.y + this.pakDy, M.vloer(tx));
    if (dt > 0) { const k = Math.min(1, dt * 14); this.gvx += ((tx - this.x) / dt - this.gvx) * k; this.gvy += ((ty - this.y) / dt - this.gvy) * k; }
    this.x = tx; this.y = ty;
    this.rol = klem(-this.gvx * 0.0005, -0.6, 0.6);
  }
  los(klik) {
    this.gepakt = false; this.rol = 0;
    const o = M.ondergrond(this.x, this.y - 1);
    this.lucht = this.y < o.y - 1;
    if (klik) { if (!this.lucht && o.plat) this.staOp(o.plat); this.vx = 0; this.vy = 0; this.reageer(); return; }
    this.lucht = true;
    this.vx = klem(this.gvx, -2200, 2200); this.vy = klem(this.gvy, -2200, 2200);
    const v = Math.hypot(this.vx, this.vy);
    this.rolV = v > 700 ? Math.sign(this.vx || 1) * Math.min(14, v / 130) : 0;
    this.stuiters = v > 500 ? 2 : 0; this.hard = v > 1100;
  }
  reageer() {                                       // aangeklikt: een hartje en een sprongetje
    this.emote = { naam: 'hart', t: 0, duur: 1.3 }; this.ogen = 'blij'; this.ogenTot = M.t + 1.4;
    M.klank('pop');
    for (const it of M.ontleed(['spring laag']).items) this.rij.push(it);
  }
  /* de vriendjes lopen in een rijtje achter de leider aan */
  volg(dt) {
    const L = this.leider;
    if (this.lucht || this.vlak !== 0 || this.vliegt) return;
    if (L.vlak !== 0 || L.vliegt || L.lucht || L.gId) { this.kijkNaar = L.midden(); return; }       // de leider is ergens waar het vriendje niet komt: kijken
    const doel = klem(L.x - L.kijk * (7 * L.maat + this.slot * 12 * this.maat), this.marge(), M.W - this.marge());
    const d = doel - this.x, a = Math.abs(d);
    if (this.houding) { if (a > 220) this.houding = null; return; }
    if (a > 8) {
      const v = a > 260 ? 400 : a > 70 ? 180 : 95, st = Math.min(a, v * this.vs() * dt);
      this.kijk = d > 0 ? 1 : -1; this.x += this.kijk * st; this.y = M.vloer(this.x); this.loopPose(st, v > 300);
    } else {
      this.kijk = L.kijk;
      if (L.nu && L.nuNaam === 'werk') this.rij.push({ def: OPDR.werk, args: {} });      // de leider werkt: meetypen
    }
  }

  /* hem tekenen op een doek naar keuze, met (x, y) tussen zijn voeten; geeft terug hoe groot het vak eromheen is */
  tekenOp(c, x, y) {
    const s = this.maat, th = VLAKHOEK[this.vlak] + this.draai, p = this.pose, rol = this.rol + this.animRol, al = this.alfa * this.animAlfa;
    c.save();
    c.translate(x, y);
    if (th) c.rotate(th);
    if (p.dy) c.translate(0, -Math.round(p.dy * s));                 // opgetild door een animatie (hop, zweven)
    if (rol) { c.translate(0, -5 * s); c.rotate(rol); c.translate(0, 5 * s); }
    if (p.schuin) c.rotate(p.schuin);
    if (this.rekX !== 1 || this.rekY !== 1) c.scale(this.rekX, this.rekY);
    if (al < 1) c.globalAlpha = al;
    let R = 17 * s;
    if (this.beeld) R = tekenBeeld(c, this); else tekenSprite(c, this);
    c.restore();
    return R;
  }
  teken() {
    if (!this.zichtbaar) return;
    const s = this.maat, p = this.pose, m = this.midden();
    let R = this.tekenOp(ctx, Math.round(this.x + p.dx), Math.round(this.y));
    R = R * Math.max(1, Math.abs(this.rekX), this.rekY) + (this.ding || this.prop || this.ring ? 9 * s : 0) + Math.abs(p.dx) + Math.abs(p.dy) * s;
    M.merk(m.x - R, m.y - R, R * 2, R * 2);
  }
  tekenSchaduw() {
    if (!this.zichtbaar || this.vlak !== 0) return;
    const s = this.maat, vl = M.ondergrond(this.x, this.y - 1).y, h = vl - this.y + this.pose.dy * s;
    if (h > 600) return;
    const k = klem(1 - h / 600, 0.3, 1), w = Math.round(11 * s * k * Math.abs(this.rekX)), hh = Math.max(2, Math.round(s * 0.5));
    ctx.globalAlpha = 0.2 * k * this.alfa; ctx.fillStyle = '#000000';
    ctx.fillRect(Math.round(this.x - w / 2), vl - hh, w, hh);
    ctx.globalAlpha = 1;
    M.merk(this.x - w / 2, vl - hh, w, hh);
  }
  tekenSpoor() {                                    // de regenboog achter hem aan
    const P = this.spoorP;
    if (P.length < 2) return;
    const bh = Math.max(2, Math.round(this.maat * 1.2));
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i], al = klem(1 - (M.t - b.t) / 0.9, 0, 1);
      if (al <= 0) continue;
      const x0 = Math.round(Math.min(a.x, b.x)) - 1, w = Math.ceil(Math.abs(b.x - a.x)) + 3, y0 = Math.round((a.y + b.y) / 2 - 3 * bh);
      ctx.globalAlpha = al * 0.9;
      for (let k = 0; k < 6; k++) { ctx.fillStyle = REGENBOOG[k]; ctx.fillRect(x0, y0 + k * bh, w, bh); }
      M.merk(x0, y0, w, 6 * bh);
    }
    ctx.globalAlpha = 1;
  }
  tekenEmote() {
    const e = this.emote;
    if (!e || !this.zichtbaar) return;
    const d = EMO[e.naam] || EMO.vraag, s = this.maat, sch = Math.max(2, Math.round(s / 2)), k = this.kop();
    const op = e.t < 0.12 ? 8 * (1 - e.t / 0.12) : -(e.t - 0.12) * 12;
    ctx.globalAlpha = klem((e.duur - e.t) / 0.3, 0, 1);
    M.tekst(d[0], Math.round(k.x + this.kijk * 5 * s - 2 * sch), Math.round(k.y - 9 * sch + op), sch, d[1], { rand: DONKER, randPx: Math.max(1, Math.round(sch / 2)) });
    ctx.globalAlpha = 1;
  }
}
