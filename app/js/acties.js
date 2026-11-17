'use strict';
/* MAATJE - alle opdrachten.
   Een opdracht is één regel tekst: een woord en wat erachter hoort, bijvoorbeeld "loop midden".
   Nieuwe opdracht = één keer opdracht(naam, {...}) erbij; hulp, proef en de taal volgen vanzelf.
     lees(rest)  -> maakt van de tekst achter het woord de gegevens (of geeft een fout)
     maak(f, a)  -> geeft een actie terug: een ding met stap(dt) dat true geeft als het klaar is
     grond/lijf  -> hij moet eerst op de vloer staan / opstaan;  stil -> doet niets met zijn lijf
     groep       -> de vriendjes doen het na                                                       */
const OPDR = {}, ALIAS = {};
function opdracht(naam, def) { def.naam = naam; OPDR[naam] = def; for (const a of def.ook || []) ALIAS[a] = naam; }

/* ---- bouwstenen voor acties ---- */
function wacht(sec) { let t = 0; return { stap(dt) { t += dt; return t >= sec; } }; }
function zodra(fn) { return { stap() { return !!fn(); } }; }
function tijdActie(duur, fn, eind) {
  let t = 0;
  return { stap(dt) { t += dt; const k = Math.min(1, t / duur); fn(k, t, dt); if (k >= 1) { if (eind) eind(); return true; } return false; } };
}
function reeks(lijst) {                              // dingen na elkaar; een functie in de lijst wordt pas gemaakt als hij aan de beurt is
  let i = 0, nu = null;
  return {
    stap(dt) {
      for (let rond = 0; rond < 50; rond++) {
        if (!nu) { if (i >= lijst.length) return true; nu = lijst[i++]; if (typeof nu === 'function') nu = nu(); if (!nu) continue; }
        if (!nu.stap(dt)) return false;
        nu = null;
      }
      return false;
    },
    stop() { if (nu && nu.stop) nu.stop(); },
  };
}
function naarGrond(f) { let begonnen = false; return { stap() { if (!begonnen) { begonnen = true; f.laatLos(); } return !f.lucht; } }; }

/* ---- lezen wat er achter een opdracht staat ---- */
const geen = rest => { if (rest) throw new Error('hier hoort niets achter'); return {}; };
const tekstArg = rest => { if (!rest) throw new Error('er mist tekst, bijvoorbeeld: zeg Hallo!'); return { tekst: rest.slice(0, 400) }; };
function getal(wat, min, max, std) {
  return rest => {
    if (!rest) { if (std === undefined) throw new Error('er mist een getal (' + wat + ')'); return { n: std }; }
    const n = parseFloat(rest.replace(',', '.'));
    if (!/^\d+([.,]\d+)?$/.test(rest) || n < min || n > max) throw new Error(wat + ' moet een getal van ' + min + ' tot ' + max + ' zijn');
    return { n };
  };
}
function keuze(lijst, std) {
  return rest => {
    const k = rest.toLowerCase();
    if (!k && std) return { k: std };
    if (!lijst.includes(k)) throw new Error('kies uit: ' + lijst.join(', '));
    return { k };
  };
}
const aanUit = rest => { const k = rest.toLowerCase(); if (k !== 'aan' && k !== 'uit') throw new Error('zet er aan of uit achter'); return { aan: k === 'aan' }; };

const PLEK = /^(?:s(?:cherm)?([1-9]):?)?(links|rechts|midden|muis|ergens|[+-]\d+(?:\.\d+)?|\d+(?:\.\d+)?%?)?$/;
const PLEKY = /^(hoog|midden|laag|\d+(?:\.\d+)?%?)$/;
const PLEKHULP = 'links, midden, rechts, ergens, muis, 50%, s2:50% (tweede scherm), +200 of -200 (pixels verder) of een pixel';
const plek = rest => { const t = rest.toLowerCase(); if (!t || !PLEK.test(t)) throw new Error('waarheen? kies uit: ' + PLEKHULP); return { x: t }; };
function plekX(tok, f, vrij) {
  const m = PLEK.exec(String(tok).toLowerCase());
  if (!m) throw new Error('die plek snap ik niet: ' + tok);
  let sch = M.schermVan(f.midden().x);
  if (m[1]) sch = M.schermen[Math.min(M.schermen.length, +m[1]) - 1];
  const t = m[2] || 'midden', mar = vrij ? 0 : f.marge();
  let x;
  if (t === 'links') x = sch.x + mar;
  else if (t === 'rechts') x = sch.x + sch.w - mar;
  else if (t === 'midden') x = sch.x + sch.w / 2;
  else if (t === 'muis') x = M.muis.x > -9000 ? M.muis.x : f.x;
  else if (t === 'ergens') x = sch.x + mar + M.rnd() * (sch.w - 2 * mar);
  else if (t[0] === '+' || t[0] === '-') x = f.x + parseFloat(t);
  else if (t.endsWith('%')) x = sch.x + sch.w * parseFloat(t) / 100;
  else x = (m[1] ? sch.x : 0) + parseFloat(t);
  return klem(Math.round(x), mar, M.W - mar);
}
function plekY(tok, f, x) {
  const sch = M.schermVan(x), t = String(tok || 'hoog').toLowerCase();
  let y;
  if (t === 'hoog') y = sch.y + sch.h * 0.18;
  else if (t === 'midden') y = sch.y + sch.h * 0.48;
  else if (t === 'laag') y = sch.y + sch.h * 0.78;
  else if (t.endsWith('%')) y = sch.y + sch.h * parseFloat(t) / 100;
  else y = parseFloat(t);
  return klem(Math.round(y), sch.y + 11 * f.maat, sch.y + sch.h);
}

/* ---- bewegen ---- */
function loopNaar(f, doel, v) {
  return {
    stap(dt) {
      const d = doel - f.x, st = v * f.vs() * dt;
      if (Math.abs(d) <= st) { f.x = doel; f.y = M.vloer(f.x); return true; }
      f.kijk = d > 0 ? 1 : -1; f.x += f.kijk * st; f.y = M.vloer(f.x); f.loopPose(st, v > 250);
      return false;
    },
  };
}
function loopVlak(f, doel, v) {                      // lopen langs een muur (op en neer) of het plafond (heen en weer)
  return {
    stap(dt) {
      const st = v * f.vs() * dt;
      if (f.vlak === 2) {
        const d = doel - f.x;
        if (Math.abs(d) <= st) { f.x = doel; return true; }
        f.kijk = d < 0 ? 1 : -1; f.x += Math.sign(d) * st;
      } else {
        const d = doel - f.y;
        if (Math.abs(d) <= st) { f.y = doel; return true; }
        f.kijk = (f.vlak === 1) === (d < 0) ? 1 : -1; f.y += Math.sign(d) * st;
      }
      f.loopPose(st, v > 250);
      return false;
    },
  };
}
function hoekPunt(f, van, naar) {                    // waar stapt hij van het ene vlak op het andere?
  const a = 7 * f.maat, W = M.W, vR = M.vloer(W - 1), vL = M.vloer(0);
  const P = { '01': [W - a, vR, W, vR - a], '12': [W, a, W - a, 0], '23': [a, 0, 0, a], '30': [0, vL - a, a, vL] };
  const heen = P['' + van + naar];
  if (heen) return heen;
  const t = P['' + naar + van];
  return [t[2], t[3], t[0], t[1]];
}
function naarVlak(f, nieuw) {
  let t = 0, P = null, d0 = 0;
  return {
    stap(dt) {
      if (!P) {
        P = hoekPunt(f, f.vlak, nieuw);
        let d = VLAKHOEK[f.vlak] - VLAKHOEK[nieuw];
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        d0 = d; f.vlak = nieuw;
      }
      t += dt;
      const z = zacht(Math.min(1, t / 0.2));
      f.x = meng(P[0], P[2], z); f.y = meng(P[1], P[3], z); f.draai = d0 * (1 - z);
      if (t >= 0.2) { f.draai = 0; return true; }
      return false;
    },
    stop() { f.draai = 0; },
  };
}
function spring(f, hoogte, opt) {
  opt = opt || {};
  let fase = 0, t = 0;
  return {
    stap(dt) {
      t += dt;
      if (fase === 0) {                              // eerst even door de knieën
        const k = Math.min(1, t / 0.09);
        f.rekY = 1 - 0.2 * k; f.rekX = 1 + 0.15 * k;
        if (k >= 1) {
          fase = 1; f.lucht = true; f.stuiters = 0; f.hard = false;
          f.vy = -Math.sqrt(2 * ZW * hoogte); f.vx = opt.vx || 0;
          if (opt.salto) f.rolV = f.kijk * Math.PI * 2 / (2 * Math.sqrt(2 * hoogte / ZW));
          M.klank('spring');
        }
        return false;
      }
      if (fase === 1) { if (f.lucht) return false; fase = 2; t = 0; return false; }
      return t >= 0.14;
    },
  };
}
function vlieg(f, tx, ty) {
  let begonnen = false;
  return {
    stap(dt) {
      if (!begonnen) {
        begonnen = true;
        if (f.vlak !== 0) f.laatLos();
        f.lucht = false; f.vliegt = true; f.rol = 0; f.rolV = 0; f.vx = 0; f.vy = 0; f.houding = null;
        M.klank('raket');
      }
      const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy), st = 560 * f.vs() * dt;
      if (Math.abs(dx) > 4) f.kijk = dx > 0 ? 1 : -1;
      if (d <= st) { f.x = tx; f.y = ty; return true; }
      f.x += dx / d * st; f.y += dy / d * st; f.pose.schuin = dx / d * 0.25;
      return false;
    },
  };
}
function land(f) {
  return {
    stap(dt) {
      if (f.vlak !== 0) f.laatLos();
      if (!f.vliegt) return !f.lucht;
      const vl = M.vloer(f.x);
      f.y += 420 * dt;
      if (f.y >= vl) { f.y = vl; f.vliegt = false; f.plet = 0.14; M.stof(f.x, vl, 6); M.klank('land'); return true; }
      return false;
    },
  };
}
function teleport(f, x) {
  return reeks([
    () => { M.uiteen(f); f.zichtbaar = false; f.bel = null; M.klank('teleport'); return wacht(0.3); },
    () => { f.x = x; f.y = M.vloer(x); M.samen(f, 0.28); return wacht(0.28); },
    () => { f.zichtbaar = true; f.plet = 0.1; const m = f.midden(); M.vonken(m.x, m.y, 10, ['#ffffff', '#bfe9ff', f.kleurNu], 160); return null; },
  ]);
}
function klim(f, kant, deel) {
  const a = () => 7 * f.maat;
  if (kant === 'rechts') return reeks([() => loopNaar(f, M.W - a(), 400), () => naarVlak(f, 1), () => loopVlak(f, klem(M.vloer(M.W - 1) * (1 - deel), a(), M.vloer(M.W - 1) - a()), 260)]);
  return reeks([() => loopNaar(f, a(), 400), () => naarVlak(f, 3), () => loopVlak(f, klem(M.vloer(0) * (1 - deel), a(), M.vloer(0) - a()), 260)]);
}
function rondje(f) {                                 // één keer helemaal rond: vloer, muur, plafond, muur, vloer
  const a = () => 7 * f.maat, x0 = f.x, v = 620;
  return reeks([
    () => loopNaar(f, M.W - a(), v), () => naarVlak(f, 1), () => loopVlak(f, a(), v),
    () => naarVlak(f, 2), () => loopVlak(f, a(), v),
    () => naarVlak(f, 3), () => loopVlak(f, M.vloer(0) - a(), v),
    () => naarVlak(f, 0), () => loopNaar(f, klem(x0, f.marge(), M.W - f.marge()), v),
  ]);
}

/* ---- doen ---- */
function dans(f, duur) {
  let t = 0, noot = 0, tel = 0;
  return {
    stap(dt) {
      t += dt;
      const p = f.pose, s = f.maat, b = t / 0.42, k = Math.floor(b) & 3;
      p.lijf = Math.abs(Math.sin((b % 1) * Math.PI)) * 0.7;
      p.dx = Math.round(Math.sin(b * Math.PI / 2) * 1.5) * s;
      p.armL = (k & 1) ? 0 : -3; p.armR = (k & 1) ? -3 : 0;
      if (k === 3) p.armL = p.armR = -3;
      p.poten[0] = p.poten[2] = (k & 1) ? 1 : 2; p.poten[1] = p.poten[3] = (k & 1) ? 2 : 1;
      f.ogenNu = 'blij';
      noot -= dt;
      if (noot <= 0) {
        noot = 0.42;
        const kop = f.kop();
        M.fxTekst('♪', kop.x + (M.rnd() - 0.5) * 8 * s, kop.y - 24, M.kies(['#7fdfff', '#ffd23f', '#ff8ad8']), Math.max(2, Math.round(s / 2)), (M.rnd() - 0.5) * 40, -40, 0.9);
        if (f.hoofd) M.klank('dans', tel++);
      }
      return t >= duur;
    },
  };
}
function typ(f, duur) {
  let tt = 0;
  return tijdActie(duur, (k, t, dt) => {
    const p = f.pose, s = f.maat, a = Math.floor(t * 11) & 1;
    p.lijf = -2; p.poten[0] = p.poten[1] = p.poten[2] = p.poten[3] = 0;
    f.ding = 'laptop'; p.armL = a ? 1 : 0.4; p.armR = a ? 0.4 : 1;
    f.kijkVast = [f.kijk, 1]; f.kijkTot = M.t + 0.1;
    tt -= dt;
    if (tt <= 0) { tt = 0.3; M.fxTekst(M.kies(['{', '}', ';', '<', '>', '=', '(', ')', '/', '0', '1']), f.x + f.kijk * 10 * s, f.y - 9 * s, '#9be29b', 2, f.kijk * 10 + (M.rnd() - 0.5) * 20, -34, 0.8); }
  });
}
/* werken: zit te typen zolang Claude bezig is (meeleven), met af en toe een denkpauze.
   Een vriendje typt mee zolang zijn leider werkt. */
function werk(f) {
  let t = 0, tt = 0, pauze = 0, volgende = 7 + M.rnd() * 10;
  return {
    stap(dt) {
      t += dt;
      const door = f.leider ? !!(f.leider.nu && f.leider.nuNaam === 'werk') : M.werkActief();
      if (!door && t > 0.6) return true;
      const p = f.pose, s = f.maat;
      p.lijf = -2; p.poten[0] = p.poten[1] = p.poten[2] = p.poten[3] = 0; f.ding = 'laptop';
      if (pauze > 0) { pauze -= dt; p.armL = p.armR = 0.4; f.kijkVast = [0, -1]; f.kijkTot = M.t + 0.1; return false; }
      const a = Math.floor(t * 11) & 1;
      p.armL = a ? 1 : 0.4; p.armR = a ? 0.4 : 1;
      f.kijkVast = [f.kijk, 1]; f.kijkTot = M.t + 0.1;
      tt -= dt;
      if (tt <= 0) { tt = 0.3 + M.rnd() * 0.2; M.fxTekst(M.kies(['{', '}', ';', '<', '>', '=', '(', ')', '/', '0', '1']), f.x + f.kijk * 10 * s, f.y - 9 * s, '#9be29b', 2, f.kijk * 10 + (M.rnd() - 0.5) * 20, -34, 0.8); }
      volgende -= dt;
      if (volgende <= 0) { volgende = 9 + M.rnd() * 14; pauze = 1.6; f.emote = { naam: M.rnd() < 0.5 ? 'vraag' : 'idee', t: 0, duur: 1.4 }; }
      return false;
    },
  };
}
function schop(f, b, kant) {
  const sch = M.schermVan(f.x);
  let r = kant;
  if (b.x < sch.x + 220) r = 1; else if (b.x > sch.x + sch.w - 220) r = -1;       // bij de rand: terug naar het midden
  b.vx = r * (520 + M.rnd() * 380); b.vy = -(380 + M.rnd() * 320); b.leef = 45;
  f.plet = 0.08; M.klank('trap'); M.vonken(b.x, b.y, 5, ['#ffffff'], 120);
}
function voetbal(f, duur, eenKeer) {
  let t = 0, koel = 0;
  return {
    stap(dt) {
      t += dt; koel -= dt;
      if (t >= duur) return true;
      const b = M.bal || M.maakBal(f), s = f.maat, kant = b.x > f.x ? 1 : -1, bereik = 7 * s + b.r, d = Math.abs(b.x - f.x);
      if (d > bereik) {
        const st = Math.min(d - bereik + 2, 420 * f.vs() * dt);
        f.kijk = kant; f.x = klem(f.x + kant * st, f.marge(), M.W - f.marge()); f.y = M.vloer(f.x); f.loopPose(st, true);
      } else if (koel <= 0 && b.y > M.vloer(b.x) - b.r - 9 * s) { f.kijk = kant; schop(f, b, kant); koel = 0.5; if (eenKeer) return true; }
      return false;
    },
  };
}
M.nieuweKloon = function () {
  const L = M.hoofd, n = M.figuren.length;
  if (n >= 13) return null;
  const m = L.midden();
  const k = new Figuur({ x: m.x, kleur: KLOONKLEUR[(n - 1) % KLOONKLEUR.length], maat: Math.max(2, L.maat - 2), leider: L, slot: n });
  k.x = klem(k.x, k.marge(), M.W - k.marge()); k.y = Math.min(m.y, M.vloer(k.x));
  k.lucht = true; k.vy = -520 - M.rnd() * 260; k.vx = (M.rnd() - 0.5) * 520; k.kijk = L.kijk;
  M.figuren.push(k); M.plof(k.x, k.y - 20, k.kleur);
  return k;
};

/* ================= de opdrachten ================= */
opdracht('loop', { soort: 'bewegen', hulp: 'loopt naar een plek: ' + PLEKHULP, vb: 'loop midden', lees: plek, grond: true, lijf: true, maak: (f, a) => loopNaar(f, plekX(a.x, f), 120) });
opdracht('ren', { soort: 'bewegen', hulp: 'rent naar een plek (zelfde plekken als loop)', vb: 'ren links', lees: plek, grond: true, lijf: true, maak: (f, a) => loopNaar(f, plekX(a.x, f), 400) });
opdracht('sluip', { soort: 'bewegen', hulp: 'sluipt heel langzaam naar een plek', vb: 'sluip +120', lees: plek, grond: true, lijf: true, maak: (f, a) => loopNaar(f, plekX(a.x, f), 55) });
opdracht('spring', {
  soort: 'bewegen', hulp: 'springt; erachter mag: hoog, laag of een hoogte in pixels', vb: 'spring hoog', grond: true, lijf: true, groep: true,
  lees: rest => { const t = rest.toLowerCase(); if (!t) return { h: 150 }; if (t === 'hoog') return { h: 380 }; if (t === 'laag') return { h: 55 }; const n = parseFloat(t); if (!/^\d+$/.test(t) || n < 20 || n > 900) throw new Error('kies: hoog, laag of een getal van 20 tot 900'); return { h: n }; },
  maak: (f, a) => spring(f, a.h),
});
opdracht('salto', { soort: 'bewegen', hulp: 'sprong met een koprol in de lucht', vb: 'salto', lees: geen, grond: true, lijf: true, groep: true, maak: f => spring(f, 270, { salto: true }) });
opdracht('draai', { soort: 'bewegen', hulp: 'draait een rondje om zijn as', vb: 'draai', lees: geen, grond: true, lijf: true, groep: true, maak: f => tijdActie(0.7, k => { const c = Math.cos(k * Math.PI * 2); f.rekX = Math.abs(c) < 0.12 ? (c < 0 ? -0.12 : 0.12) : c; f.pose.lijf = Math.sin(k * Math.PI) * 1.2; }) });
opdracht('teleport', { soort: 'bewegen', hulp: 'verdwijnt in blokjes en komt ergens anders terug', vb: 'teleport 30%', lees: plek, grond: true, lijf: true, maak: (f, a) => teleport(f, plekX(a.x, f)) });
opdracht('vlieg', {
  soort: 'bewegen', hulp: 'vliegt met vlammetjes naar een plek en blijft daar zweven: vlieg <plek> <hoog|midden|laag|40%>', vb: 'vlieg 60% hoog',
  lees: rest => { const d = rest.toLowerCase().split(/\s+/).filter(Boolean); if (d.length < 1 || d.length > 2 || !PLEK.test(d[0]) || (d[1] && !PLEKY.test(d[1]))) throw new Error('zo: vlieg midden hoog  (plek: ' + PLEKHULP + '; hoogte: hoog, midden, laag of 40%)'); return { x: d[0], y: d[1] || 'hoog' }; },
  maak: (f, a) => { const x = plekX(a.x, f); return vlieg(f, x, plekY(a.y, f, x)); },
});
opdracht('land', { soort: 'bewegen', hulp: 'komt weer naar de grond (na vlieg of klim)', vb: 'land', lees: geen, ook: ['val'], maak: f => land(f) });
opdracht('klim', {
  soort: 'bewegen', hulp: 'klimt tegen de muur van het scherm omhoog en blijft daar hangen: klim links|rechts [hoe hoog in %]', vb: 'klim rechts 60%', grond: true, lijf: true,
  lees: rest => { const d = rest.toLowerCase().split(/\s+/).filter(Boolean); if (!['links', 'rechts'].includes(d[0]) || d.length > 2 || (d[1] && !/^\d+%$/.test(d[1]))) throw new Error('zo: klim rechts 60%'); return { kant: d[0], deel: klem(d[1] ? parseFloat(d[1]) / 100 : 0.55, 0, 1) }; },
  maak: (f, a) => klim(f, a.kant, a.deel),
});
opdracht('rondje', { soort: 'bewegen', hulp: 'rent één keer helemaal rond over muren en plafond', vb: 'rondje', lees: geen, grond: true, lijf: true, maak: f => rondje(f) });

const metNaam = t => t.replace(/\{naam\}/gi, M.gebruiker || 'jij');      // {naam} in een tekst wordt jouw naam op deze pc
function praat(soort) { return (f, a) => { const b = new Bel(soort, metNaam(a.tekst)); f.bel = b; return zodra(() => f.bel !== b); }; }
opdracht('zeg', { soort: 'praten', hulp: 'tekstballon; hij wacht tot je het gelezen hebt (zet + ervoor om meteen door te gaan); {naam} wordt jouw naam', vb: 'zeg Hoi! Ik ben Maatje.', lees: tekstArg, magInLucht: true, maak: praat('zeg') });
opdracht('denk', { soort: 'praten', hulp: 'denkwolkje', vb: 'denk Hmm...', lees: tekstArg, magInLucht: true, maak: praat('denk') });
opdracht('roep', { soort: 'praten', hulp: 'grote letters', vb: 'roep KLAAR!', lees: tekstArg, magInLucht: true, maak: praat('roep') });
opdracht('fluister', { soort: 'praten', hulp: 'grijs en langzaam', vb: 'fluister psst', lees: tekstArg, magInLucht: true, maak: praat('fluister') });
opdracht('stil', { soort: 'praten', hulp: 'tekstballon meteen weg', vb: 'stil', lees: geen, stil: true, maak: f => { f.bel = null; return null; } });

opdracht('emotie', { soort: 'gevoel', hulp: 'tekentje boven zijn hoofd: ' + Object.keys(EMO).join(', '), vb: 'emotie hart', lees: keuze(Object.keys(EMO)), stil: true, groep: true, maak: (f, a) => { f.emote = { naam: a.k, t: 0, duur: 1.5 }; M.klank('pop'); return wacht(0.6); } });
const OOGLIJST = Object.keys(OGEN).filter(k => k !== 'plus');
opdracht('ogen', {
  soort: 'gevoel', hulp: 'andere ogen: ' + OOGLIJST.join(', ') + '; met een getal erachter voor zoveel seconden', vb: 'ogen blij 2', stil: true, groep: true,
  lees: rest => { const d = rest.toLowerCase().split(/\s+/).filter(Boolean); if (!OOGLIJST.includes(d[0]) || d.length > 2 || (d[1] && !/^\d+([.,]\d+)?$/.test(d[1]))) throw new Error('kies uit: ' + OOGLIJST.join(', ') + ' (en eventueel een aantal seconden)'); return { k: d[0], sec: d[1] ? parseFloat(d[1].replace(',', '.')) : 0 }; },
  maak: (f, a) => { if (a.sec) { f.ogen = a.k; f.ogenTot = M.t + a.sec; } else { f.ogenVast = a.k === 'normaal' ? null : a.k; f.ogenTot = 0; } return null; },
});
opdracht('kijk', {
  soort: 'gevoel', hulp: 'kijkt even een kant op: links, rechts, omhoog, omlaag, voor of muis', vb: 'kijk omhoog', lees: keuze(['links', 'rechts', 'omhoog', 'omlaag', 'voor', 'muis']), stil: true,
  maak: (f, a) => { const R = { links: [-1, 0], rechts: [1, 0], omhoog: [0, -1], omlaag: [0, 1], voor: [0, 0] }[a.k]; if (!R) { f.kijkTot = 0; return null; } f.kijkVast = R; f.kijkTot = M.t + 2.5; if (R[0] && f.vlak === 0) f.kijk = R[0]; return null; },
});
opdracht('zwaai', { soort: 'gevoel', hulp: 'zwaait', vb: 'zwaai', lees: geen, lijf: true, groep: true, maak: f => tijdActie(1.3, (k, t) => { f.pose[f.kijk > 0 ? 'armR' : 'armL'] = Math.sin(t * 17) > 0 ? -3 : -2.2; f.ogenNu = 'blij'; }) });
opdracht('juich', { soort: 'gevoel', hulp: 'armen omhoog en op en neer', vb: 'juich', lees: geen, lijf: true, groep: true, maak: f => { if (f.hoofd) M.klank('ster'); return tijdActie(1.2, (k, t) => { f.pose.armL = f.pose.armR = -3; f.pose.lijf = Math.abs(Math.sin(t * 9)) * 0.9; f.ogenNu = 'blij'; }); } });
opdracht('knik', { soort: 'gevoel', hulp: 'knikt ja', vb: 'knik', lees: geen, ook: ['ja'], lijf: true, groep: true, maak: f => tijdActie(0.75, (k, t) => { f.pose.lijf = -Math.abs(Math.sin(t * 8.4)) * 0.6; }) });
opdracht('schud', { soort: 'gevoel', hulp: 'schudt nee', vb: 'schud', lees: geen, ook: ['nee'], lijf: true, groep: true, maak: f => tijdActie(0.8, (k, t) => { f.pose.dx = Math.round(Math.sin(t * 24) * 0.5 * f.maat); f.ogenNu = 'dicht'; }) });
opdracht('buig', { soort: 'gevoel', hulp: 'maakt een buiging', vb: 'buig', lees: geen, lijf: true, grond: true, groep: true, maak: f => tijdActie(1.1, k => { const z = k < 0.3 ? zacht(k / 0.3) : k > 0.7 ? zacht((1 - k) / 0.3) : 1; f.pose.schuin = 0.6 * f.kijk * z; f.ogenNu = 'dicht'; }) });
opdracht('schrik', { soort: 'gevoel', hulp: 'schrikt: uitroepteken en een sprongetje', vb: 'schrik', lees: geen, lijf: true, grond: true, groep: true, maak: f => { f.emote = { naam: 'uitroep', t: 0, duur: 1 }; f.ogen = 'groot'; f.ogenTot = M.t + 0.9; if (f.hoofd) M.klank('pop'); return spring(f, 45); } });
opdracht('dans', { soort: 'gevoel', hulp: 'danst (met erachter hoeveel seconden)', vb: 'dans 3', lees: getal('het aantal seconden', 0.5, 60, 3), lijf: true, grond: true, groep: true, maak: (f, a) => dans(f, a.n) });
opdracht('zit', { soort: 'gevoel', hulp: 'gaat zitten (tot hij weer iets anders moet)', vb: 'zit', lees: geen, lijf: true, groep: true, maak: f => { f.houding = 'zit'; return wacht(0.35); } });
opdracht('sta', { soort: 'gevoel', hulp: 'staat op', vb: 'sta', lees: geen, lijf: true, groep: true, maak: () => wacht(0.25) });
opdracht('slaap', { soort: 'gevoel', hulp: 'gaat slapen, tot een nieuwe opdracht of tot je hem aanklikt', vb: 'slaap', lees: geen, lijf: true, groep: true, maak: f => { f.houding = 'slaap'; f.vrijSlaap = false; return wacht(0.4); } });
opdracht('wakker', { soort: 'gevoel', hulp: 'wordt wakker', vb: 'wakker', lees: geen, lijf: true, groep: true, maak: f => { f.ogen = 'groot'; f.ogenTot = M.t + 0.6; return wacht(0.3); } });
opdracht('typ', { soort: 'gevoel', hulp: 'zit achter een laptopje te typen (met erachter hoeveel seconden)', vb: 'typ 3', lees: getal('het aantal seconden', 0.5, 600, 4), lijf: true, grond: true, maak: (f, a) => typ(f, a.n) });

opdracht('vuurwerk', { soort: 'effect', hulp: 'vuurpijlen op het scherm waar hij staat (met erachter hoeveel)', vb: 'vuurwerk 6', lees: getal('het aantal pijlen', 1, 40, 6), stil: true, maak: (f, a) => { M.fx.push(new Lanceerder(M.schermVan(f.midden().x), Math.round(a.n))); return null; } });
opdracht('laser', {
  soort: 'effect', hulp: 'laserstralen uit zijn ogen; zonder iets erachter zwaait de straal over het scherm, of: laser muis, laser <plek> <hoogte>', vb: 'laser', lijf: true,
  lees: rest => { const d = rest.toLowerCase().split(/\s+/).filter(Boolean); if (!d.length) return {}; if (d.length === 1 && d[0] === 'muis') return { x: 'muis' }; if (d.length !== 2 || !PLEK.test(d[0]) || !PLEKY.test(d[1])) throw new Error('zo: laser   of   laser muis   of   laser 80% hoog'); return { x: d[0], y: d[1] }; },
  maak: (f, a) => {
    const s = f.maat;
    let doel;
    if (a.x) {
      const tx = a.x === 'muis' ? M.muis.x : plekX(a.x, f, true), ty = a.x === 'muis' ? M.muis.y : plekY(a.y, f, tx);
      if (f.vlak === 0 && Math.abs(tx - f.x) > 2) f.kijk = tx > f.x ? 1 : -1;
      doel = () => ({ x: tx, y: ty });
    } else {
      const o = f.oogPlek(0), sch = M.schermVan(o.x), ex = f.kijk > 0 ? sch.x + sch.w : sch.x;
      doel = k => ({ x: ex, y: meng(Math.max(sch.y, o.y - 330), M.vloer(o.x) - 4, zacht(k)) });
    }
    M.fx.push(new Laser(f, doel, 0.9)); M.klank('laser');
    return tijdActie(0.95, (k, t) => { f.ogenNu = 'boos'; f.pose.dx = -f.kijk * Math.round(s * 0.4 + Math.sin(t * 70) * 1.5); });
  },
});
opdracht('bliksem', {
  soort: 'effect', hulp: 'de bliksem slaat in: hij is even zwart geblakerd', vb: 'bliksem', lees: geen, lijf: true,
  maak: f => reeks([
    () => { M.fx.push(new Bliksem(f)); return wacht(0.12); },
    () => { f.verkoold = 1.9; f.bel = null; return tijdActie(1.9, (k, t) => { f.pose.dx = k < 0.3 ? Math.round(Math.sin(t * 60) * 2) : 0; if (M.rnd() < 0.3) { const kop = f.kop(); M.deel({ x: kop.x + (M.rnd() - 0.5) * 8 * f.maat, y: kop.y, vx: (M.rnd() - 0.5) * 30, vy: -40 - M.rnd() * 40, l: 0.8, k: '#8a8782', m: Math.max(2, Math.round(f.maat * 0.8)), fade: 0.8, a: 0.7 }); } }); },
  ]),
});
opdracht('regenboog', { soort: 'effect', hulp: 'een regenboog achter hem aan: regenboog aan|uit', vb: 'regenboog aan', lees: aanUit, stil: true, maak: (f, a) => { f.spoor = a.aan; return null; } });
opdracht('sneeuw', { soort: 'effect', hulp: 'het sneeuwt over het hele bureaublad (met erachter hoeveel seconden)', vb: 'sneeuw 6', lees: getal('het aantal seconden', 1, 300, 12), stil: true, maak: (f, a) => { M.fx.push(new Sneeuw(a.n)); return null; } });
opdracht('titel', { soort: 'effect', hulp: 'grote letters vallen in beeld en spatten daarna uit elkaar', vb: 'titel KLAAR!', lees: rest => { const a = tekstArg(rest); a.tekst = a.tekst.slice(0, 60); return a; }, stil: true, maak: (f, a) => { M.fx.push(new Titel(metNaam(a.tekst), M.schermVan(f.midden().x), f.kleurNu)); return null; } });
opdracht('zwaard', {
  soort: 'effect', hulp: 'trekt een zwaard en slaat: een witte streep dwars over het scherm', vb: 'zwaard', lees: geen, lijf: true, grond: true,
  maak: f => {
    const arm = f.kijk > 0 ? 'armR' : 'armL', s = f.maat;
    return reeks([
      tijdActie(0.28, k => { f.ding = 'zwaard'; f.dingHoek = -0.9 * zacht(k); f.pose[arm] = -2 * zacht(k); f.ogenNu = 'boos'; }),
      () => { M.fx.push(new Slag(f)); M.klank('zwiep'); return tijdActie(0.1, k => { f.ding = 'zwaard'; f.dingHoek = meng(-0.9, 2.0, zacht(k)); f.pose[arm] = meng(-2, 0.5, k); f.pose.dx = Math.round(f.kijk * k * 2 * s); f.ogenNu = 'boos'; }); },
      tijdActie(0.55, k => { f.ding = 'zwaard'; f.dingHoek = 2.0; f.pose[arm] = 0.5; f.pose.dx = Math.round(f.kijk * 2 * s * (1 - zacht(k))); f.ogenNu = 'boos'; }),
    ]);
  },
});
opdracht('bal', { soort: 'effect', hulp: 'er valt een bal uit de lucht (je kunt hem met de muis wegtikken)', vb: 'bal', lees: geen, stil: true, maak: f => { M.maakBal(f); return wacht(0.2); } });
opdracht('trap', { soort: 'effect', hulp: 'rent naar de bal en trapt hem weg', vb: 'trap', lees: geen, lijf: true, grond: true, maak: f => voetbal(f, 8, true) });
opdracht('voetbal', { soort: 'effect', hulp: 'blijft achter de bal aan rennen en trappen (met erachter hoeveel seconden)', vb: 'voetbal 5', lees: getal('het aantal seconden', 1, 120, 8), lijf: true, grond: true, maak: (f, a) => voetbal(f, a.n, false) });

opdracht('kleur', {
  soort: 'uiterlijk', hulp: 'andere kleur: ' + Object.keys(KLEUREN).join(', ') + ', regenboog, of een code zoals #ff8800', vb: 'kleur blauw', stil: true,
  lees: rest => { const t = rest.toLowerCase(); if (t === 'regenboog') return { wissel: true }; const k = M.leesKleur(t); if (!k) throw new Error('kies uit: ' + Object.keys(KLEUREN).join(', ') + ', regenboog of een code zoals #ff8800'); return { kleur: k }; },
  maak: (f, a) => { f.kleurWissel = !!a.wissel; if (a.kleur) { f.kleur = a.kleur; if (f.hoofd) { M.inst.kleur = a.kleur; M.bewaar(); } } const m = f.midden(); M.vonken(m.x, m.y, 8, [a.kleur || '#ffffff', '#ffffff'], 150); M.klank('pop'); return null; },
});
opdracht('maat', {
  soort: 'uiterlijk', hulp: 'hoe groot hij is: klein, gewoon, groot, reus of een getal van 2 tot 16', vb: 'maat groot', lijf: true,
  lees: rest => { const t = rest.toLowerCase(), N = { klein: 3, gewoon: 6, groot: 10, reus: 14 }; if (N[t]) return { n: N[t] }; const n = parseInt(t, 10); if (!/^\d+$/.test(t) || n < 2 || n > 16) throw new Error('kies: klein, gewoon, groot, reus of een getal van 2 tot 16'); return { n }; },
  maak: (f, a) => {
    const van = f.maat, naar = a.n;
    if (van === naar) return null;
    M.klank('groei');
    return tijdActie(0.45, k => { const m = meng(van, naar, zacht(k)) / van; f.rekX = m; f.rekY = m; }, () => {
      f.maat = naar;
      if (f.vlak === 0) f.x = klem(f.x, f.marge(), M.W - f.marge());
      if (f.hoofd) { M.inst.maat = naar; M.bewaar(); }
    });
  },
});
opdracht('hoed', { soort: 'uiterlijk', hulp: 'iets op zijn hoofd: ' + Object.keys(HOEDEN).join(', '), vb: 'hoed kroon', lees: keuze(Object.keys(HOEDEN)), stil: true, maak: (f, a) => { f.hoed = a.k; if (f.hoofd) { M.inst.hoed = a.k; M.bewaar(); } const k = f.kop(); M.vonken(k.x, k.y, 6, ['#ffffff', '#ffe066'], 120); M.klank('pop'); return null; } });

opdracht('kloon', { soort: 'vriendjes', hulp: 'er komen vriendjes bij die achter hem aan lopen en hem nadoen (hooguit 12)', vb: 'kloon 3', lees: getal('het aantal vriendjes', 1, 12, 3), stil: true, maak: (f, a) => { for (let i = 0; i < Math.round(a.n); i++) M.nieuweKloon(); return wacht(0.3); } });
opdracht('opruimen', {
  soort: 'vriendjes', hulp: 'vriendjes, bal, sneeuw en regenboog weg', vb: 'opruimen', lees: geen, stil: true,
  maak: f => {
    M.delen.length = 0;
    for (let i = M.figuren.length - 1; i >= 1; i--) { const k = M.figuren[i], m = k.midden(); M.plof(m.x, m.y, k.kleurNu); if (M.gepakt === k) { M.gepakt = null; M.pakInfo = null; } }
    M.figuren.length = 1; M.fx.length = 0; M.bal = null; f.spoor = false;
    for (const id in M.werk.sessies) M.werk.sessies[id].hulpjes = 0;
    return null;
  },
});
opdracht('werk', { soort: 'meeleven', hulp: 'zit te typen zolang Claude aan het werk is; dat gaat vanzelf als meeleven aan staat', vb: 'werk', lees: geen, lijf: true, grond: true, maak: f => werk(f) });
opdracht('meeleven', {
  soort: 'meeleven', hulp: 'meeleven met Claude: typen als Claude werkt, juichen als hij klaar is, zwaaien als hij je nodig heeft: meeleven aan|uit', vb: 'meeleven aan', lees: aanUit, stil: true,
  maak: (f, a) => { M.inst.meeleven = a.aan; if (!a.aan) M.werk.sessies = {}; M.bewaar(); return null; },
});

opdracht('wacht', { soort: 'overig', hulp: 'doet zoveel seconden niets', vb: 'wacht 1.5', lees: getal('het aantal seconden', 0, 600), stil: true, maak: (f, a) => wacht(a.n) });
opdracht('stop', { soort: 'overig', hulp: 'gooit alles weg wat hij nog moest doen', vb: 'stop', lees: geen, stil: true, maak: () => null });
opdracht('vrij', { soort: 'overig', hulp: 'vanzelf rondlopen als hij niets te doen heeft: vrij aan|uit', vb: 'vrij aan', lees: aanUit, stil: true, maak: (f, a) => { M.inst.vrij = a.aan; M.bewaar(); return null; } });
opdracht('geluid', { soort: 'overig', hulp: 'geluid aan|uit', vb: 'geluid aan', lees: aanUit, stil: true, maak: (f, a) => { M.inst.geluid = a.aan; M.bewaar(); return null; } });
opdracht('weg', { soort: 'overig', hulp: 'verdwijnt helemaal van het scherm (kom haalt hem terug)', vb: 'weg', lees: geen, stil: true, maak: () => reeks([() => { for (const k of M.figuren) { const m = k.midden(); M.plof(m.x, m.y, k.kleurNu); k.zichtbaar = false; k.bel = null; } return wacht(0.5); }, () => { M.zetZicht(false, true); return null; }]) });
opdracht('kom', { soort: 'overig', hulp: 'komt terug op het scherm', vb: 'kom', lees: geen, stil: true, maak: () => null });

/* ================= de taal: van regels tekst naar opdrachten ================= */
function verschil(a, b) {                            // hoeveel letters anders (voor "bedoel je ...?")
  const m = [];
  for (let i = 0; i <= a.length; i++) m[i] = [i];
  for (let j = 1; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return m[a.length][b.length];
}
M.ontleed = function (regels) {
  const fouten = [], uit = [], stapel = [{ items: uit }];
  let totaal = 0;
  (regels || []).forEach((ruw, i) => {
    let r = String(ruw).trim();
    if (!r || r[0] === '#' || r.startsWith('//')) return;
    let nietWachten = false;
    if (r[0] === '+' && !/^\+\d/.test(r)) { nietWachten = true; r = r.slice(1).trim(); }
    const sp = r.search(/\s/);
    let naam = (sp < 0 ? r : r.slice(0, sp)).toLowerCase();
    const rest = sp < 0 ? '' : r.slice(sp + 1).trim();
    const top = stapel[stapel.length - 1];
    if (naam === 'herhaal') {
      const n = parseInt(rest, 10);
      if (!/^\d+$/.test(rest) || n < 1 || n > 100) fouten.push({ regel: i + 1, tekst: 'zo: herhaal 3  (van 1 tot 100), en sluit af met: einde' });
      stapel.push({ items: [], n: n || 1 });
      return;
    }
    if (naam === 'einde') {
      if (stapel.length < 2) { fouten.push({ regel: i + 1, tekst: 'einde zonder herhaal ervoor' }); return; }
      const b = stapel.pop(), doel = stapel[stapel.length - 1].items;
      for (let k = 0; k < b.n; k++) { totaal += b.items.length; if (totaal > 3000) break; for (const it of b.items) doel.push(it); }
      return;
    }
    naam = ALIAS[naam] || naam;
    const def = OPDR[naam];
    if (!def) {
      let beste = null, bd = 3;
      for (const k of Object.keys(OPDR).concat(Object.keys(ALIAS))) { const d = verschil(naam, k); if (d < bd) { bd = d; beste = k; } }
      fouten.push({ regel: i + 1, tekst: 'de opdracht "' + naam + '" ken ik niet' + (beste ? ' (bedoel je ' + beste + '?)' : '') });
      return;
    }
    try { top.items.push({ def, args: def.lees(rest), nietWachten, regel: i + 1 }); totaal++; }
    catch (e) { fouten.push({ regel: i + 1, tekst: naam + ': ' + e.message }); }
  });
  if (stapel.length > 1) fouten.push({ regel: (regels || []).length, tekst: 'er mist een einde bij herhaal' });
  if (totaal > 3000) fouten.push({ regel: 0, tekst: 'dat zijn meer dan 3000 opdrachten: te veel' });
  return { items: uit, fouten };
};
/* opdrachten in de wachtrij van het poppetje zetten */
M.doe = function (regels, opt) {
  opt = opt || {};
  const o = M.ontleed(regels);
  if (o.fouten.length) return { ok: false, fouten: o.fouten };
  const f = M.hoofd;
  let items = o.items;
  if (opt.vrij) f.vrijBezig = true;
  else {
    const namen = items.map(i => i.def.naam), stopI = namen.lastIndexOf('stop');
    if (namen.includes('kom') && M.pauze) M.zetZicht(true, true);
    if (f.vrijBezig || stopI >= 0) { f.stopAlles(); f.vrijBezig = false; }
    if (stopI >= 0) { for (let i = 1; i < M.figuren.length; i++) M.figuren[i].stopAlles(); items = items.slice(stopI + 1); }
    if (f.vrijSlaap) { f.vrijSlaap = false; f.houding = null; }
    M.laatsteOpdracht = M.t; M.pauzeNa = 12; M.blijfTot = 0;      // na een opdracht blijft hij 12 s staan voor hij weer vanzelf gaat lopen
  }
  for (const it of items) f.rij.push(it);
  const u = { ok: true, aantal: items.length };
  if (M.pauze) u.let_op = 'Maatje is verborgen: hij doet dit pas na de opdracht "kom"';
  return u;
};
M.bezig = function () {
  for (const f of M.figuren) if (f.nu || f.rij.length || f.bij.length || f.straks.length || f.lucht || f.gepakt) return true;
  for (const e of M.fx) if (e.telt) return true;
  return false;
};
M.hulp = function () {
  const ook = {};
  for (const a in ALIAS) (ook[ALIAS[a]] = ook[ALIAS[a]] || []).push(a);
  return Object.keys(OPDR).map(n => ({ naam: n, soort: OPDR[n].soort, hulp: OPDR[n].hulp, vb: OPDR[n].vb, ook: ook[n] || [] }));
};
