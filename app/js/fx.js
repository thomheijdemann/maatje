'use strict';
/* MAATJE - effects: particles, fireworks, laser, lightning, the big title, the sword strike, snow and
   the ball. An effect is a thing in M.fx with stap(dt) (returns true when it is done) and teken().
   The code below is written in Dutch. */
const PALETTEN = [['#ff5d5d', '#ffd166'], ['#5dd6ff', '#ffffff'], ['#b98cff', '#ff8ad8'], ['#7cfc9a', '#ffe066'], ['#d97757', '#ffd9c7'], ['#ffe066', '#ff8c2b']];

/* ---- deeltjes: losse vierkantjes die vliegen, vallen en vervagen ---- */
M.deel = function (o) {
  if (M.delen.length >= 1800) return;
  o.L = o.l; o.vx = o.vx || 0; o.vy = o.vy || 0;
  M.delen.push(o);
};
M.stapDelen = function (dt) {
  const d = M.delen;
  for (let i = d.length - 1; i >= 0; i--) {
    const p = d[i];
    p.l -= dt;
    if (p.l <= 0) { d[i] = d[d.length - 1]; d.pop(); continue; }
    if (p.g) p.vy += p.g * dt;
    if (p.w) { const k = Math.exp(-p.w * dt); p.vx *= k; p.vy *= k; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.zw) p.x += Math.sin(M.t * 2 + p.zw) * 18 * dt;
  }
};
M.tekenDelen = function () {
  for (const p of M.delen) {
    const al = Math.min(1, p.l / (p.L * (p.fade || 0.4))) * (p.a || 1), m = p.m;
    const x = Math.round(p.x - m / 2), y = Math.round(p.y - m / 2);
    if (p.rand) { ctx.globalAlpha = al * 0.25; ctx.fillStyle = '#000000'; ctx.fillRect(x - 1, y - 1, m + 2, m + 2); }
    ctx.globalAlpha = al; ctx.fillStyle = p.k;
    ctx.fillRect(x, y, m, m);
    M.merk(x - 1, y - 1, m + 2, m + 2);
  }
  ctx.globalAlpha = 1;
};
M.stof = function (x, y, n) {
  for (let i = 0; i < n; i++) M.deel({ x: x + (M.rnd() - 0.5) * 20, y: y - 2, vx: (M.rnd() - 0.5) * 120, vy: -20 - M.rnd() * 60, g: 120, l: 0.25 + M.rnd() * 0.25, k: '#d8d3c8', m: 2 + Math.floor(M.rnd() * 2), a: 0.75 });
};
M.vonken = function (x, y, n, kleuren, kracht) {
  for (let i = 0; i < n; i++) {
    const h = M.rnd() * Math.PI * 2, v = kracht * (0.4 + M.rnd() * 0.6);
    M.deel({ x, y, vx: Math.cos(h) * v, vy: Math.sin(h) * v, g: 300, l: 0.25 + M.rnd() * 0.3, k: M.kies(kleuren), m: 2 + Math.floor(M.rnd() * 3) });
  }
};
M.plof = function (x, y, kleur) { M.vonken(x, y, 14, [kleur, '#ffffff', '#ffffff'], 220); M.klank('pop'); };
/* een los letterteken dat wegzweeft (muzieknoot, Z, stukje code) */
M.fxTekst = function (ch, x, y, kleur, sch, vx, vy, leven) {
  let t = 0;
  M.fx.push({
    stap(dt) { t += dt; x += vx * dt; y += vy * dt; return t >= leven; },
    teken() { ctx.globalAlpha = klem((leven - t) / 0.3, 0, 1); M.tekst(ch, Math.round(x), Math.round(y), sch, kleur, { rand: DONKER, randPx: Math.max(1, Math.round(sch / 2)) }); ctx.globalAlpha = 1; },
  });
};

/* ---- verdwijnen en verschijnen: het poppetje valt in blokjes uit elkaar ---- */
function spriteBlokken(f) {
  const s = f.maat, uit = [];
  for (let r = 0; r < 10; r++) for (let c = 0; c < 14; c++) {
    const lijf = c >= 2 && c <= 11 && r <= 7, arm = (c < 2 || c > 11) && (r === 4 || r === 5), poot = r >= 8 && POOTKOL.includes(c);
    if (lijf || arm || poot) uit.push(f.lokaal((c - 6.5) * s, (r - 9.5) * s));
  }
  return uit;
}
M.uiteen = function (f) {
  for (const b of spriteBlokken(f)) M.deel({ x: b.x, y: b.y, vx: (M.rnd() - 0.5) * 260, vy: -60 - M.rnd() * 240, g: -200, l: 0.25 + M.rnd() * 0.2, k: M.rnd() < 0.25 ? '#ffffff' : f.kleurNu, m: f.maat });
};
M.samen = function (f, duur) {
  const B = spriteBlokken(f).map(b => ({ x1: b.x, y1: b.y, x0: b.x + (M.rnd() - 0.5) * 300, y0: b.y - 80 - M.rnd() * 260 }));
  const s = f.maat, kl = f.kleurNu;
  let t = 0;
  M.fx.push({
    stap(dt) { t += dt; return t >= duur; },
    teken() {
      const k = zacht(Math.min(1, t / duur));
      ctx.fillStyle = kl; ctx.globalAlpha = 0.4 + 0.6 * k;
      for (const b of B) { const x = Math.round(meng(b.x0, b.x1, k) - s / 2), y = Math.round(meng(b.y0, b.y1, k) - s / 2); ctx.fillRect(x, y, s, s); M.merk(x, y, s, s); }
      ctx.globalAlpha = 1;
    },
  });
};

/* ---- vuurwerk ---- */
class Vuurpijl {
  constructor(x, doelY) {
    this.x = x; this.y = M.vloer(x); this.vy = -(820 + M.rnd() * 260); this.vx = (M.rnd() - 0.5) * 60;
    this.doelY = doelY; this.telt = true; this.pal = M.kies(PALETTEN);
    M.klank('fluit');
  }
  stap(dt) {
    this.x += this.vx * dt; this.y += this.vy * dt; this.vy += 420 * dt;
    M.deel({ x: this.x, y: this.y + 6, vx: (M.rnd() - 0.5) * 30, vy: 40 + M.rnd() * 60, l: 0.35, k: '#ffd9a0', m: 3 });
    if (this.y <= this.doelY || this.vy > -120) { this.knal(); return true; }
    return false;
  }
  knal() {
    const n = 54, a = this.pal[0], b = this.pal[1], ster = M.rnd() < 0.35;
    for (let i = 0; i < n; i++) {
      const h = Math.PI * 2 * i / n + M.rnd() * 0.1, v = (ster && (i & 1) ? 150 : 300) * (0.75 + M.rnd() * 0.3);
      M.deel({ x: this.x, y: this.y, vx: Math.cos(h) * v, vy: Math.sin(h) * v, g: 240, w: 1.6, l: 0.9 + M.rnd() * 0.6, k: i % 3 ? a : b, m: 4, fade: 0.6 });
    }
    for (let i = 0; i < 26; i++) {                    // een tweede, kleinere ring erbinnen
      const h = Math.PI * 2 * i / 26 + M.rnd() * 0.2, v = 150 * (0.7 + M.rnd() * 0.4);
      M.deel({ x: this.x, y: this.y, vx: Math.cos(h) * v, vy: Math.sin(h) * v, g: 240, w: 1.6, l: 0.7 + M.rnd() * 0.5, k: b, m: 3, fade: 0.6 });
    }
    M.vonken(this.x, this.y, 14, ['#ffffff'], 140);
    M.klank('knal');
  }
  teken() {
    const x = Math.round(this.x) - 2, y = Math.round(this.y) - 4;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 4, 8);
    M.merk(x, y, 4, 8);
  }
}
class Lanceerder {
  constructor(sch, n) { this.sch = sch; this.n = n; this.t = 0; this.telt = true; }
  stap(dt) {
    this.t -= dt;
    if (this.t <= 0 && this.n > 0) {
      this.n--; this.t = 0.18 + M.rnd() * 0.3;
      const s = this.sch;
      M.fx.push(new Vuurpijl(s.x + s.w * (0.12 + M.rnd() * 0.76), s.y + s.h * (0.12 + M.rnd() * 0.3)));
    }
    return this.n <= 0;
  }
  teken() {}
}

/* ---- laser uit zijn ogen ---- */
function straal(x0, y0, x1, y1, dik, buiten, binnen) {
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy);
  ctx.save();
  ctx.translate(x0, y0); ctx.rotate(Math.atan2(dy, dx));
  ctx.globalAlpha = 0.35; ctx.fillStyle = buiten; ctx.fillRect(0, -dik * 1.6, l, dik * 3.2);
  ctx.globalAlpha = 0.9; ctx.fillStyle = binnen; ctx.fillRect(0, -dik * 0.8, l, dik * 1.6);
  ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, -dik * 0.3, l, dik * 0.6);
  ctx.restore();
  M.merk(Math.min(x0, x1) - dik * 2, Math.min(y0, y1) - dik * 2, Math.abs(dx) + dik * 4, Math.abs(dy) + dik * 4);
}
class Laser {
  constructor(f, doel, duur) {
    this.f = f; this.doel = doel; this.duur = duur; this.t = 0; this.telt = true;
    const d = doel(0); this.tx = d.x; this.ty = d.y;
  }
  stap(dt) {
    this.t += dt;
    const d = this.doel(Math.min(1, this.t / this.duur));
    this.tx = d.x; this.ty = d.y;
    for (let i = 0; i < 3; i++) M.deel({ x: this.tx, y: this.ty, vx: (M.rnd() - 0.5) * 420, vy: (M.rnd() - 0.7) * 420, g: 700, l: 0.2 + M.rnd() * 0.3, k: M.kies(['#ffffff', '#ffd23f', '#ff6b5b']), m: 2 + Math.floor(M.rnd() * 3) });
    return this.t >= this.duur;
  }
  teken() {
    const dik = this.f.maat * (0.8 + 0.25 * Math.sin(this.t * 70));
    for (const kant of [-1, 1]) { const o = this.f.oogPlek(kant); straal(o.x, o.y, this.tx, this.ty, dik, '#ff3b3b', '#ff8a7a'); }
  }
}

/* ---- bliksem ---- */
class Bliksem {
  constructor(f) { this.f = f; this.t = 0; this.telt = true; this.maak(); M.klank('donder'); }
  maak() {
    const k = this.f.kop(), top = M.schermVan(k.x).y, x0 = k.x + (M.rnd() - 0.5) * 260, n = 13;
    this.pts = [];
    for (let i = 0; i <= n; i++) this.pts.push([meng(x0, k.x, i / n) + (i > 0 && i < n ? (M.rnd() - 0.5) * 70 : 0), meng(top, k.y, i / n)]);
  }
  stap(dt) {
    const v = Math.floor(this.t / 0.06);
    this.t += dt;
    if (this.t < 0.2 && Math.floor(this.t / 0.06) !== v) this.maak();
    return this.t > 0.28;
  }
  teken() {
    const al = this.t < 0.2 ? 1 : klem(1 - (this.t - 0.2) / 0.08, 0, 1);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let ronde = 0; ronde < 2; ronde++) {
      const g = ronde ? 4 : 10;
      ctx.globalAlpha = al * (ronde ? 1 : 0.45); ctx.fillStyle = ronde ? '#ffffff' : '#a8d8ff';
      for (let i = 1; i < this.pts.length; i++) {
        const a = this.pts[i - 1], b = this.pts[i], st = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 5));
        for (let j = 0; j <= st; j++) {
          const x = Math.round(meng(a[0], b[0], j / st) - g / 2), y = Math.round(meng(a[1], b[1], j / st) - g / 2);
          ctx.fillRect(x, y, g, g);
          if (x < x0) x0 = x; if (y < y0) y0 = y; if (x + g > x1) x1 = x + g; if (y + g > y1) y1 = y + g;
        }
      }
    }
    ctx.globalAlpha = 1;
    M.merk(x0, y0, x1 - x0, y1 - y0);
  }
}

/* ---- grote titel: letters vallen één voor één in beeld en spatten later uit elkaar ---- */
class Titel {
  constructor(tekst, sch, kleur) {
    tekst = String(tekst).normalize('NFC');
    let S = 14, regels = null;
    for (; S >= 3; S--) {
      regels = M.breek(tekst, Math.floor(sch.w * 0.86 / S));
      if (regels.length <= (S > 6 ? 1 : S > 4 ? 2 : 3)) break;
    }
    if (S < 3) { S = 3; regels = M.breek(tekst, Math.floor(sch.w * 0.86 / S)).slice(0, 4); }
    this.S = S; this.kleur = kleur; this.letters = []; this.t = 0; this.telt = true;
    const y0 = Math.round(sch.y + sch.h * 0.3 - regels.length * 6 * S);
    let i = 0;
    regels.forEach((r, ri) => {
      let x = Math.round(sch.x + (sch.w - M.tekstBreed(r) * S) / 2);
      for (const ch of r) {
        const g = M.glyfPixels(ch);
        if (g.px.length) { this.letters.push({ ch, x, y: y0 + ri * 12 * S, d: i * 0.05, nr: i }); i++; }
        x += (g.w + 1) * S;
      }
    });
    this.duur = i * 0.05 + 0.5 + 2.3;
  }
  stap(dt) {
    const v = this.t;
    this.t += dt;
    for (const l of this.letters) if (!(l.nr & 1) && v < l.d + 0.16 && this.t >= l.d + 0.16) { M.klank('titel'); break; }
    if (this.t >= this.duur) { this.knal(); return true; }
    return false;
  }
  knal() {
    const S = this.S;
    let tot = 0;
    for (const l of this.letters) tot += M.glyfPixels(l.ch).px.length;
    const kans = Math.min(1, 700 / Math.max(1, tot));
    for (const l of this.letters) for (const p of M.glyfPixels(l.ch).px) {
      if (M.rnd() > kans) continue;
      M.deel({ x: l.x + p[0] * S + S / 2, y: l.y + p[1] * S + S / 2, vx: (M.rnd() - 0.5) * 500, vy: -100 - M.rnd() * 420, g: 900, l: 0.7 + M.rnd() * 0.7, k: M.rnd() < 0.5 ? '#ffffff' : this.kleur, m: Math.max(3, Math.round(S * 0.8)), fade: 0.5 });
    }
    M.klank('knal');
  }
  teken() {
    const S = this.S, rp = Math.max(2, Math.round(S * 0.35)), sd = Math.round(S * 0.6);
    for (const l of this.letters) {
      const k = klem((this.t - l.d) / 0.45, 0, 1);
      if (k <= 0) continue;
      const y = Math.round(l.y - (1 - stuit(k)) * 300);
      M.tekst(l.ch, l.x + sd, y + sd, S, this.kleur, { rand: DONKER, randPx: rp });
      M.tekst(l.ch, l.x, y, S, '#ffffff', { rand: DONKER, randPx: rp });
    }
  }
}

/* ---- de streep van een zwaardslag dwars over het scherm ---- */
class Slag {
  constructor(f) {
    const m = f.midden();
    this.x = m.x + f.kijk * 6 * f.maat; this.y = m.y; this.h = (-0.42 + M.rnd() * 0.25) * f.kijk;
    this.s = f.maat; this.t = 0; this.len = 1700;
    M.vonken(this.x, this.y, 12, ['#ffffff', '#bfe9ff'], 420);
  }
  stap(dt) { this.t += dt; return this.t > 0.4; }
  teken() {
    const k = this.t / 0.4, l = this.len * Math.min(1, this.t / 0.05), dik = Math.max(1, this.s * 1.6 * (1 - k));
    ctx.save();
    ctx.translate(this.x, this.y); ctx.rotate(this.h);
    ctx.globalAlpha = (1 - k) * 0.5; ctx.fillStyle = '#bfe9ff'; ctx.fillRect(-l / 2, -dik, l, dik * 2);
    ctx.globalAlpha = 1 - k * 0.6; ctx.fillStyle = '#ffffff'; ctx.fillRect(-l / 2, -dik / 2, l, dik);
    ctx.restore();
    const ex = Math.abs(Math.cos(this.h)) * l / 2 + dik * 2 + 4, ey = Math.abs(Math.sin(this.h)) * l / 2 + dik * 2 + 4;
    M.merk(this.x - ex, this.y - ey, ex * 2, ey * 2);
  }
}

/* ---- sneeuw ---- */
class Sneeuw {
  constructor(sec) { this.t = sec; this.acc = 0; }
  stap(dt) {
    this.t -= dt;
    this.acc += dt * 42 * M.W / 1920;
    while (this.acc >= 1) {
      this.acc--;
      const vy = 55 + M.rnd() * 70;
      M.deel({ x: M.rnd() * M.W, y: -4, vx: (M.rnd() - 0.5) * 16, vy, l: (M.H + 10) / vy, k: '#ffffff', m: 2 + Math.floor(M.rnd() * 3), zw: 0.1 + M.rnd() * 6, fade: 0.04, a: 0.95, rand: true });
    }
    return this.t <= 0;
  }
  teken() {}
}

/* ---- de bal: stuitert, rolt, en je kunt hem met de muis wegtikken ---- */
class Bal {
  constructor(x, y, s) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.r = Math.round(2.4 * s); this.u = Math.max(2, Math.round(s / 2)); this.rot = 0; this.leef = 45; this.muisKoel = 0;
  }
  stap(dt) {
    this.leef -= dt;
    this.vy += ZW * 0.8 * dt; this.x += this.vx * dt; this.y += this.vy * dt; this.rot += this.vx * dt / this.r;
    const vl = M.vloer(this.x) - this.r;
    if (this.y >= vl) {
      this.y = vl;
      if (this.vy > 90) { this.vy = -this.vy * 0.62; M.klank('bots'); } else this.vy = 0;
      this.vx *= Math.max(0, 1 - 1.4 * dt);
    }
    if (this.x < this.r) { this.x = this.r; this.vx = Math.abs(this.vx) * 0.75; }
    else if (this.x > M.W - this.r) { this.x = M.W - this.r; this.vx = -Math.abs(this.vx) * 0.75; }
    if (this.y < this.r) { this.y = this.r; this.vy = Math.abs(this.vy) * 0.6; }
    if (this.leef <= 0) { M.plof(this.x, this.y, '#ffffff'); if (M.bal === this) M.bal = null; return true; }
    return false;
  }
  teken() {
    const r = this.r, u = this.u, cx = Math.round(this.x), cy = Math.round(this.y);
    for (let ronde = 0; ronde < 2; ronde++) {
      const rr = ronde ? r - u : r;
      ctx.fillStyle = ronde ? '#f4f1ea' : DONKER;
      for (let dy = -rr; dy < rr; dy += u) {
        const mid = dy + u / 2, hw = Math.round(Math.sqrt(Math.max(0, rr * rr - mid * mid)) / u) * u;
        if (hw > 0) ctx.fillRect(cx - hw, cy + dy, hw * 2, u);
      }
    }
    const a = (r - 2 * u) * 0.6, ox = Math.round(Math.cos(this.rot) * a / u) * u, oy = Math.round(Math.sin(this.rot) * a / u) * u;
    ctx.fillStyle = '#d97757'; ctx.fillRect(cx + ox - u, cy + oy - u, 2 * u, 2 * u);
    M.merk(cx - r - u, cy - r - u, 2 * r + 2 * u, 2 * r + 2 * u);
  }
}
M.maakBal = function (f) {
  if (M.bal) return M.bal;
  const b = new Bal(klem(f.x + f.kijk * 160, 40, M.W - 40), Math.max(40, f.y - 420), f.maat);
  M.bal = b; M.fx.push(b); M.klank('pop');
  return b;
};
