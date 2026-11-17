'use strict';
/* MAATJE - standing on windows.
   The main program tells us where the windows on the screen are (position and size, the topmost first).
   Here we turn that into "platforms": the top edge of a window is a floor he can stand on, as far as that
   edge is really visible (a window in front of it covers part of it).
   - M.plat.lijst / M.plat.op   the platforms now (a list, and by window number)
   - M.plat.zet(ruw)            new list from the main program
   - M.ondergrond(x, y)         what is under that spot: the first platform below, or the floor of the screen
   - M.plat.landing(x, y0, y1)  does he land on a platform while falling from y0 to y1?
   - M.plat.kies(f, wat)        which window can he jump to, and how
   Platforms are one-way: he jumps through them from below and lands on them from above.
   The code below is written in Dutch. */
M.plat = { lijst: [], op: new Map(), aan: true, ruw: [], teller: 0 };

/* een stuk van een lijn (a, b) weghalen waar het venster erboven (q0, q1) overheen valt */
function snijAf(delen, q0, q1) {
  const uit = [];
  for (const d of delen) {
    if (q1 <= d[0] || q0 >= d[1]) uit.push(d);
    else { if (q0 > d[0]) uit.push([d[0], q0]); if (q1 < d[1]) uit.push([q1, d[1]]); }
  }
  return uit;
}
M.plat.zet = function (ruw) {
  const P = M.plat, s = M.hoofd ? M.hoofd.maat : 6;
  P.ruw = Array.isArray(ruw) ? ruw : [];
  P.teller++;
  const lijst = [], op = new Map();
  if (P.aan) {
    const hoogMin = 10 * s + 24, breedMin = 10 * s;                 // hij moet er boven passen en erop kunnen staan
    for (let i = 0; i < P.ruw.length; i++) {
      const r = P.ruw[i], top = Math.round(r.y), cx = r.x + r.w / 2, sch = M.schermVan(cx);
      if (top < hoogMin || top > sch.y + sch.h - 30) continue;       // te hoog (past er niet boven) of onderaan het scherm
      if (Math.abs(top - sch.y) <= 14) continue;                     // een venster dat het hele scherm vult
      let delen = [[Math.max(0, Math.round(r.x)), Math.min(M.W, Math.round(r.x + r.w))]];
      for (let j = 0; j < i && delen.length; j++) {                  // vensters die erboven liggen en de bovenrand bedekken
        const q = P.ruw[j];
        if (q.y <= top && q.y + q.h > top) delen = snijAf(delen, q.x, q.x + q.w);
      }
      delen = delen.filter(d => d[1] - d[0] >= breedMin);
      if (!delen.length) continue;
      const p = { id: r.i, y: top, x0: Math.round(r.x), x1: Math.round(r.x + r.w), delen, prog: r.p || '?', hoog: r.h };
      lijst.push(p); op.set(p.id, p);
    }
  }
  P.lijst = lijst; P.op = op;
};
M.plat.staatOp = function (p, x) { for (const d of p.delen) if (x >= d[0] && x <= d[1]) return true; return false; };
/* het dichtstbijzijnde stuk dat hij kan staan, gezien vanaf x */
M.plat.dichtbij = function (p, x, rand) {
  let beste = x, bd = 1e9;
  for (const d of p.delen) {
    const a = d[0] + Math.min(rand, (d[1] - d[0]) / 2), b = d[1] - Math.min(rand, (d[1] - d[0]) / 2), t = klem(x, a, b), dd = Math.abs(t - x);
    if (dd < bd) { bd = dd; beste = t; }
  }
  return beste;
};
M.ondergrond = function (x, y) {
  const vl = M.vloer(x);
  let beste = null;
  for (const p of M.plat.lijst) if (p.y >= y - 1 && p.y < vl && (!beste || p.y < beste.y) && M.plat.staatOp(p, x)) beste = p;
  return beste ? { y: beste.y, plat: beste } : { y: vl, plat: null };
};
M.plat.landing = function (x, y0, y1, negeer) {
  let beste = null;
  for (const p of M.plat.lijst) if (p.id !== negeer && y0 <= p.y + 1 && y1 >= p.y && (!beste || p.y < beste.y) && M.plat.staatOp(p, x)) beste = p;
  return beste;
};

/* ---- springen naar een venster: hoe hard en hoe ver, zodat hij er precies op landt ---- */
M.plat.plan = function (f, p, tx) {
  const s = f.maat, H = f.y - p.y;                                  // H > 0: het venster is hoger
  const maxA = Math.min(1150, f.y - (10 * s + 4));                  // hoger dan het plafond van het scherm kan hij niet komen
  for (let A = Math.max(H + 70, 150); A <= maxA; A += 40) {
    const vy = Math.sqrt(2 * ZW * A), t1 = vy / ZW, D = A - H;
    if (D < 20) continue;
    const T = t1 + Math.sqrt(2 * D / ZW), vx = (tx - f.x) / T;
    if (Math.abs(vx) <= 850) return { A, vx, T };
  }
  return null;
};
/* welk venster? wat: 'dichtbij' (standaard), 'toevallig', 'links', 'rechts', 'hoger', of de naam van een programma (chrome) */
M.plat.kies = function (f, wat) {
  const rand = 7 * f.maat, kans = [];
  for (const p of M.plat.lijst) {
    if (p.id === f.gId) continue;
    if (wat && !['dichtbij', 'toevallig', 'links', 'rechts', 'hoger'].includes(wat) && !p.prog.includes(wat)) continue;
    const tx = wat === 'toevallig' ? (() => { const d = p.delen[Math.floor(M.rnd() * p.delen.length)], a = d[0] + Math.min(rand, (d[1] - d[0]) / 2), b = d[1] - Math.min(rand, (d[1] - d[0]) / 2); return a + M.rnd() * (b - a); })() : M.plat.dichtbij(p, f.x, rand);
    if (wat === 'links' && tx >= f.x - 10) continue;
    if (wat === 'rechts' && tx <= f.x + 10) continue;
    if (wat === 'hoger' && p.y >= f.y - 10) continue;
    const plan = M.plat.plan(f, p, tx);
    if (plan) kans.push({ p, x: tx, plan, kost: Math.abs(tx - f.x) + Math.abs(p.y - f.y) * 0.6 });
  }
  if (!kans.length) return null;
  if (wat === 'toevallig') return M.kies(kans);
  kans.sort((a, b) => a.kost - b.kost);
  return kans[0];
};
M.plat.status = function () {
  return { aan: M.plat.aan, vensters: M.plat.ruw.length, platforms: M.plat.lijst.length, lijst: M.plat.lijst.slice(0, 12).map(p => ({ x0: p.x0, x1: p.x1, y: p.y, delen: p.delen.length, prog: p.prog })) };
};
