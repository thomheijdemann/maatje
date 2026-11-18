'use strict';
/* MAATJE - all commands.
   A command is one line of text: a word and whatever belongs after it, for example "walk middle".
   The code is written in Dutch, so inside the code every command has a Dutch name; "en" is the English
   word people type. Both work, and so do Dutch and English words after it (left / links, on / aan).
   A new command = one more opdracht(dutchName, {...}); the help, the language and the test follow.
     en          -> the English word              ook  -> extra words that mean the same
     lees(rest)  -> turns the text after the word into data (or throws an error)
     maak(f, a)  -> returns an action: a thing with stap(dt) that returns true when it is done
     grond/lijf  -> he first has to stand on the floor / get up;   stil -> does nothing with his body
     groep       -> his friends copy it                                                             */
const OPDR = {}, ALIAS = {};
function opdracht(naam, def) {
  def.naam = naam; def.en = def.en || naam; OPDR[naam] = def;
  if (def.en !== naam) ALIAS[def.en] = naam;
  for (const a of def.ook || []) ALIAS[a] = naam;
}

/* Engelse woorden achter een opdracht -> het Nederlandse woord dat de code gebruikt */
const EN = {
  plek: { left: 'links', right: 'rechts', middle: 'midden', center: 'midden', anywhere: 'ergens', mouse: 'muis' },
  hoogte: { high: 'hoog', middle: 'midden', low: 'laag' },
  kant: { left: 'links', right: 'rechts' },
  aanuit: { on: 'aan', off: 'uit' },
  emo: { heart: 'hart', question: 'vraag', exclaim: 'uitroep', star: 'ster', music: 'muziek', angry: 'boos', sweat: 'zweet', idea: 'idee' },
  ogen: { normal: 'normaal', big: 'groot', closed: 'dicht', sleepy: 'slaap', happy: 'blij', angry: 'boos', sad: 'sip', cross: 'kruis', heart: 'hart', star: 'ster', wink: 'knipoog', dizzy: 'duizelig' },
  kijk: { left: 'links', right: 'rechts', up: 'omhoog', down: 'omlaag', ahead: 'voor', mouse: 'muis' },
  kleur: { orange: 'oranje', red: 'rood', blue: 'blauw', green: 'groen', yellow: 'geel', purple: 'paars', pink: 'roze', white: 'wit', black: 'zwart', gray: 'grijs', grey: 'grijs', teal: 'turkoois', gold: 'goud', brown: 'bruin', rainbow: 'regenboog' },
  maat: { small: 'klein', normal: 'gewoon', big: 'groot', giant: 'reus' },
  hoed: { none: 'geen', crown: 'kroon', glasses: 'bril', cap: 'pet', tophat: 'hoed', headphones: 'koptelefoon', wizard: 'tovenaar' },
};
const nl = (soort, t) => EN[soort][t] || t;                          // Engels woord -> Nederlands woord (of zichzelf)
function enWoord(soort, n) { for (const e in EN[soort]) if (EN[soort][e] === n) return e; return n; }
const en = (soort, lijst) => lijst.map(n => enWoord(soort, n));      // voor de hulp: de Engelse woorden

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
const geen = rest => { if (rest) throw new Error('nothing should follow this command'); return {}; };
const tekstArg = rest => { if (!rest) throw new Error('some text is missing, for example: say Hello!'); return { tekst: rest.slice(0, 400) }; };
function getal(wat, min, max, std) {
  return rest => {
    if (!rest) { if (std === undefined) throw new Error('a number is missing (' + wat + ')'); return { n: std }; }
    const n = parseFloat(rest.replace(',', '.'));
    if (!/^\d+([.,]\d+)?$/.test(rest) || n < min || n > max) throw new Error(wat + ' must be a number from ' + min + ' to ' + max);
    return { n };
  };
}
function keuze(soort, lijst, std) {
  return rest => {
    const k = nl(soort, rest.toLowerCase());
    if (!k && std) return { k: std };
    if (!lijst.includes(k)) throw new Error('choose one of: ' + en(soort, lijst).join(', '));
    return { k };
  };
}
const aanUit = rest => { const k = nl('aanuit', rest.toLowerCase()); if (k !== 'aan' && k !== 'uit') throw new Error('add on or off'); return { aan: k === 'aan' }; };

const PLEK = /^(?:s(?:cherm|creen)?([1-9]):?)?(links|rechts|midden|muis|ergens|[+-]\d+(?:\.\d+)?|\d+(?:\.\d+)?%?)?$/;
const PLEKY = /^(hoog|midden|laag|\d+(?:\.\d+)?%?)$/;
const PLEKHULP = 'left, middle, right, anywhere, mouse, 50%, s2:50% (second screen), +200 or -200 (pixels further) or a pixel';
const plekNL = t => String(t).toLowerCase().replace(/(left|right|middle|center|anywhere|mouse)$/, w => EN.plek[w]);
const plek = rest => { const t = plekNL(rest); if (!t || !PLEK.test(t)) throw new Error('where to? choose one of: ' + PLEKHULP); return { x: t }; };
function plekX(tok, f, vrij) {
  const m = PLEK.exec(String(tok).toLowerCase());
  if (!m) throw new Error('I do not understand that place: ' + tok);
  let sch = M.schermVan(f.midden().x);
  if (m[1]) sch = M.schermen[Math.min(M.schermen.length, +m[1]) - 1];
  const t = m[2] || 'midden', mar = vrij ? 0 : f.marge();
  let x;
  if (t === 'links') x = sch.x + mar;
  else if (t === 'rechts') x = sch.x + sch.w - mar;
  else if (t === 'midden') x = sch.x + sch.w / 2;
  else if (t === 'muis') x = M.muis.x > -9000 ? M.muis.x : f.x;
  else if (t === 'ergens') { const p = f.gId && M.plat.op.get(f.gId); if (p) { const d = p.delen[Math.floor(M.rnd() * p.delen.length)]; x = d[0] + mar + M.rnd() * Math.max(0, d[1] - d[0] - 2 * mar); } else x = sch.x + mar + M.rnd() * (sch.w - 2 * mar); }
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
      if (f.lucht) return false;                         // van een venster afgestapt of gevallen: eerst weer landen, dan verder
      const d = doel - f.x, st = v * f.vs() * dt;
      if (Math.abs(d) <= st) { f.x = doel; f.y = f.vloerY(f.x); return true; }
      f.kijk = d > 0 ? 1 : -1; f.x += f.kijk * st; f.y = f.vloerY(f.x); f.loopPose(st, v > 250);
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
        f.gId = 0;
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
        f.gId = 0;
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
function land(f) {                                  // naar beneden: vanuit de lucht, van een muur of van een venster
  return {
    stap(dt) {
      if (f.vlak !== 0) f.laatLos();
      if (f.gId) f.valVan();
      if (!f.vliegt) return !f.lucht;
      const o = M.ondergrond(f.x, f.y);                 // een venster onder hem, of de vloer
      f.y += 420 * dt;
      if (f.y >= o.y) { f.y = o.y; f.vliegt = false; f.plet = 0.14; if (o.plat) f.staOp(o.plat); M.stof(f.x, o.y, 6); M.klank('land'); return true; }
      return false;
    },
  };
}
/* op een venster springen: kies er een (zie M.plat.kies), spring er precies naartoe */
function bovenop(f, wat) {
  return reeks([
    () => {
      const d = M.plat.kies(f, wat);
      if (!d) { f.emote = { naam: 'vraag', t: 0, duur: 1.4 }; f.ogen = 'sip'; f.ogenTot = M.t + 1.4; return wacht(1.2); }     // geen venster dat hij haalt
      f.kijk = d.x > f.x ? 1 : -1;
      return spring(f, d.plan.A, { vx: d.plan.vx });
    },
  ]);
}
function teleport(f, x) {
  return reeks([
    () => { M.uiteen(f); f.zichtbaar = false; f.bel = null; M.klank('teleport'); return wacht(0.3); },
    () => { f.gId = 0; f.x = x; f.y = M.vloer(x); M.samen(f, 0.28); return wacht(0.28); },
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
        f.kijk = kant; f.x = klem(f.x + kant * st, f.marge(), M.W - f.marge()); f.y = f.vloerY(f.x); f.loopPose(st, true);
      } else if (koel <= 0 && b.y > M.vloer(b.x) - b.r - 9 * s) { f.kijk = kant; schop(f, b, kant); koel = 0.5; if (eenKeer) return true; }
      return false;
    },
  };
}
M.nieuweKloon = function () {
  const L = M.hoofd, n = M.figuren.length;
  if (n >= 13) return null;
  const m = L.midden();
  const k = new Figuur({ x: m.x, kleur: KLOONKLEUR[(n - 1) % KLOONKLEUR.length], maat: Math.max(2, L.maat - 2), leider: L, slot: n, stijl: L.stijl });
  k.x = klem(k.x, k.marge(), M.W - k.marge()); k.y = Math.min(m.y, M.vloer(k.x));
  k.lucht = true; k.vy = -520 - M.rnd() * 260; k.vx = (M.rnd() - 0.5) * 520; k.kijk = L.kijk;
  M.figuren.push(k); M.plof(k.x, k.y - 20, k.kleur);
  return k;
};

/* ================= de opdrachten ================= */
const SEC = 'the number of seconds';
opdracht('loop', { en: 'walk', soort: 'movement', hulp: 'walks to a place: ' + PLEKHULP, vb: 'walk middle', lees: plek, grond: true, lijf: true, maak: (f, a) => loopNaar(f, plekX(a.x, f), 120) });
opdracht('ren', { en: 'run', soort: 'movement', hulp: 'runs to a place (same places as walk)', vb: 'run left', lees: plek, grond: true, lijf: true, maak: (f, a) => loopNaar(f, plekX(a.x, f), 400) });
opdracht('sluip', { en: 'sneak', soort: 'movement', hulp: 'sneaks to a place very slowly', vb: 'sneak +120', lees: plek, grond: true, lijf: true, maak: (f, a) => loopNaar(f, plekX(a.x, f), 55) });
opdracht('spring', {
  en: 'jump', soort: 'movement', hulp: 'jumps; you may add: high, low or a height in pixels', vb: 'jump high', grond: true, lijf: true, groep: true,
  lees: rest => { const t = nl('hoogte', rest.toLowerCase()); if (!t) return { h: 150 }; if (t === 'hoog') return { h: 380 }; if (t === 'laag') return { h: 55 }; const n = parseFloat(t); if (!/^\d+$/.test(t) || n < 20 || n > 900) throw new Error('choose: high, low or a number from 20 to 900'); return { h: n }; },
  maak: (f, a) => spring(f, a.h),
});
opdracht('salto', { en: 'flip', soort: 'movement', hulp: 'a jump with a somersault in the air', vb: 'flip', lees: geen, grond: true, lijf: true, groep: true, maak: f => spring(f, 270, { salto: true }) });
opdracht('draai', { en: 'spin', soort: 'movement', hulp: 'spins around once', vb: 'spin', lees: geen, grond: true, lijf: true, groep: true, maak: f => tijdActie(0.7, k => { const c = Math.cos(k * Math.PI * 2); f.rekX = Math.abs(c) < 0.12 ? (c < 0 ? -0.12 : 0.12) : c; f.pose.lijf = Math.sin(k * Math.PI) * 1.2; }) });
opdracht('teleport', { soort: 'movement', hulp: 'falls apart into little blocks and comes back somewhere else', vb: 'teleport 30%', lees: plek, grond: true, lijf: true, maak: (f, a) => teleport(f, plekX(a.x, f)) });
opdracht('vlieg', {
  en: 'fly', soort: 'movement', hulp: 'flies to a place on little flames and hovers there: fly <place> <high|middle|low|40%>', vb: 'fly 60% high',
  lees: rest => {
    const d = rest.toLowerCase().split(/\s+/).filter(Boolean);
    if (d[0]) d[0] = plekNL(d[0]);
    if (d[1]) d[1] = nl('hoogte', d[1]);
    if (d.length < 1 || d.length > 2 || !PLEK.test(d[0]) || (d[1] && !PLEKY.test(d[1]))) throw new Error('like this: fly middle high  (place: ' + PLEKHULP + '; height: high, middle, low or 40%)');
    return { x: d[0], y: d[1] || 'hoog' };
  },
  maak: (f, a) => { const x = plekX(a.x, f); return vlieg(f, x, plekY(a.y, f, x)); },
});
opdracht('land', { soort: 'movement', hulp: 'comes back down to the floor (after fly or climb, or from a window)', vb: 'land', lees: geen, ook: ['val', 'drop'], maak: f => land(f) });
const PERCHWOORD = { near: 'dichtbij', nearest: 'dichtbij', random: 'toevallig', any: 'toevallig', left: 'links', right: 'rechts', higher: 'hoger', up: 'hoger', dichtbij: 'dichtbij', toevallig: 'toevallig', links: 'links', rechts: 'rechts', hoger: 'hoger' };
opdracht('bovenop', {
  en: 'perch', soort: 'movement', hulp: 'jumps onto one of your windows and stands on its top edge: perch [near | random | left | right | higher | the name of a program, like chrome]', vb: 'perch random',
  ook: ['hop-on', 'neerstrijken'], grond: true, lijf: true,
  lees: rest => {
    const t = rest.toLowerCase().trim();
    if (!t) return { wat: 'dichtbij' };
    if (PERCHWOORD[t]) return { wat: PERCHWOORD[t] };
    if (!/^[a-z0-9._-]{1,40}$/.test(t) && !/^#\d+(:-?\d+)?$/.test(t)) throw new Error('like this: perch random   (or near, left, right, higher, or a program such as chrome)');
    return { wat: t };
  },
  maak: (f, a) => bovenop(f, a.wat),
});
opdracht('vensters', {
  en: 'windows', soort: 'movement', hulp: 'he can stand on your windows (he only looks at where they are, never at what is in them): windows on|off', vb: 'windows on',
  lees: aanUit, stil: true,
  maak: (f, a) => { M.inst.vensters = a.aan; M.plat.aan = a.aan; M.plat.zet(M.plat.ruw); M.bewaar(); return null; },
});
opdracht('klim', {
  en: 'climb', soort: 'movement', hulp: 'climbs up the side of the screen and hangs there: climb left|right [how high in %]', vb: 'climb right 60%', grond: true, lijf: true, vloer: true,
  lees: rest => {
    const d = rest.toLowerCase().split(/\s+/).filter(Boolean);
    if (d[0]) d[0] = nl('kant', d[0]);
    if (!['links', 'rechts'].includes(d[0]) || d.length > 2 || (d[1] && !/^\d+%$/.test(d[1]))) throw new Error('like this: climb right 60%');
    return { kant: d[0], deel: klem(d[1] ? parseFloat(d[1]) / 100 : 0.55, 0, 1) };
  },
  maak: (f, a) => klim(f, a.kant, a.deel),
});
opdracht('rondje', { en: 'lap', soort: 'movement', hulp: 'runs one full lap over the walls and the ceiling', vb: 'lap', lees: geen, grond: true, lijf: true, vloer: true, maak: f => rondje(f) });

const metNaam = t => t.replace(/\{(naam|name)\}/gi, M.gebruiker || 'you').replace(/\{(pet|hij)\}/gi, M.inst.naam || 'Maatje');      // {name} = jouw naam op deze pc, {pet} = zijn eigen naam
function praat(soort) { return (f, a) => { const b = new Bel(soort, metNaam(a.tekst)); f.bel = b; return zodra(() => f.bel !== b); }; }
opdracht('zeg', { en: 'say', soort: 'talking', hulp: 'speech bubble; he waits until you have read it (put + in front to carry on right away); {name} becomes your name and {pet} his own name', vb: "say Hi! I'm {pet}.", lees: tekstArg, magInLucht: true, maak: praat('zeg') });
opdracht('denk', { en: 'think', soort: 'talking', hulp: 'thought bubble', vb: 'think Hmm...', lees: tekstArg, magInLucht: true, maak: praat('denk') });
opdracht('roep', { en: 'shout', soort: 'talking', hulp: 'big letters', vb: 'shout DONE!', lees: tekstArg, magInLucht: true, maak: praat('roep') });
opdracht('fluister', { en: 'whisper', soort: 'talking', hulp: 'grey and slow', vb: 'whisper psst', lees: tekstArg, magInLucht: true, maak: praat('fluister') });
opdracht('stil', { en: 'quiet', soort: 'talking', hulp: 'removes the speech bubble right away', vb: 'quiet', lees: geen, stil: true, maak: f => { f.bel = null; return null; } });

opdracht('emotie', { en: 'emote', soort: 'feelings', hulp: 'a little sign above his head: ' + en('emo', Object.keys(EMO)).join(', '), vb: 'emote heart', lees: keuze('emo', Object.keys(EMO)), stil: true, groep: true, maak: (f, a) => { f.emote = { naam: a.k, t: 0, duur: 1.5 }; M.klank('pop'); return wacht(0.6); } });
const OOGLIJST = Object.keys(OGEN).filter(k => k !== 'plus');
opdracht('ogen', {
  en: 'eyes', soort: 'feelings', hulp: 'other eyes: ' + en('ogen', OOGLIJST).join(', ') + '; add a number for that many seconds', vb: 'eyes happy 2', stil: true, groep: true,
  lees: rest => {
    const d = rest.toLowerCase().split(/\s+/).filter(Boolean);
    if (d[0]) d[0] = nl('ogen', d[0]);
    if (!OOGLIJST.includes(d[0]) || d.length > 2 || (d[1] && !/^\d+([.,]\d+)?$/.test(d[1]))) throw new Error('choose one of: ' + en('ogen', OOGLIJST).join(', ') + ' (and maybe a number of seconds)');
    return { k: d[0], sec: d[1] ? parseFloat(d[1].replace(',', '.')) : 0 };
  },
  maak: (f, a) => { if (a.sec) { f.ogen = a.k; f.ogenTot = M.t + a.sec; } else { f.ogenVast = a.k === 'normaal' ? null : a.k; f.ogenTot = 0; } return null; },
});
opdracht('kijk', {
  en: 'look', soort: 'feelings', hulp: 'looks one way for a moment: left, right, up, down, ahead or mouse', vb: 'look up', lees: keuze('kijk', ['links', 'rechts', 'omhoog', 'omlaag', 'voor', 'muis']), stil: true,
  maak: (f, a) => { const R = { links: [-1, 0], rechts: [1, 0], omhoog: [0, -1], omlaag: [0, 1], voor: [0, 0] }[a.k]; if (!R) { f.kijkTot = 0; return null; } f.kijkVast = R; f.kijkTot = M.t + 2.5; if (R[0] && f.vlak === 0) f.kijk = R[0]; return null; },
});
opdracht('zwaai', { en: 'wave', soort: 'feelings', hulp: 'waves', vb: 'wave', lees: geen, lijf: true, groep: true, maak: f => tijdActie(1.3, (k, t) => { f.pose[f.kijk > 0 ? 'armR' : 'armL'] = Math.sin(t * 17) > 0 ? -3 : -2.2; f.ogenNu = 'blij'; }) });
opdracht('juich', { en: 'cheer', soort: 'feelings', hulp: 'arms up, bouncing up and down', vb: 'cheer', lees: geen, lijf: true, groep: true, maak: f => { if (f.hoofd) M.klank('ster'); return tijdActie(1.2, (k, t) => { f.pose.armL = f.pose.armR = -3; f.pose.lijf = Math.abs(Math.sin(t * 9)) * 0.9; f.ogenNu = 'blij'; }); } });
opdracht('knik', { en: 'nod', soort: 'feelings', hulp: 'nods yes', vb: 'nod', lees: geen, ook: ['ja', 'yes'], lijf: true, groep: true, maak: f => tijdActie(0.75, (k, t) => { f.pose.lijf = -Math.abs(Math.sin(t * 8.4)) * 0.6; }) });
opdracht('schud', { en: 'shake', soort: 'feelings', hulp: 'shakes no', vb: 'shake', lees: geen, ook: ['nee', 'no'], lijf: true, groep: true, maak: f => tijdActie(0.8, (k, t) => { f.pose.dx = Math.round(Math.sin(t * 24) * 0.5 * f.maat); f.ogenNu = 'dicht'; }) });
opdracht('buig', { en: 'bow', soort: 'feelings', hulp: 'takes a bow', vb: 'bow', lees: geen, lijf: true, grond: true, groep: true, maak: f => tijdActie(1.1, k => { const z = k < 0.3 ? zacht(k / 0.3) : k > 0.7 ? zacht((1 - k) / 0.3) : 1; f.pose.schuin = 0.6 * f.kijk * z; f.ogenNu = 'dicht'; }) });
opdracht('schrik', { en: 'startle', soort: 'feelings', hulp: 'gets a fright: an exclamation mark and a little hop', vb: 'startle', lees: geen, lijf: true, grond: true, groep: true, maak: f => { f.emote = { naam: 'uitroep', t: 0, duur: 1 }; f.ogen = 'groot'; f.ogenTot = M.t + 0.9; if (f.hoofd) M.klank('pop'); return spring(f, 45); } });
opdracht('dans', { en: 'dance', soort: 'feelings', hulp: 'dances (add how many seconds)', vb: 'dance 3', lees: getal(SEC, 0.5, 60, 3), lijf: true, grond: true, groep: true, maak: (f, a) => dans(f, a.n) });
opdracht('zit', { en: 'sit', soort: 'feelings', hulp: 'sits down (until he has to do something else)', vb: 'sit', lees: geen, lijf: true, groep: true, maak: f => { f.houding = 'zit'; return wacht(0.35); } });
opdracht('sta', { en: 'stand', soort: 'feelings', hulp: 'stands up', vb: 'stand', lees: geen, lijf: true, groep: true, maak: () => wacht(0.25) });
opdracht('slaap', { en: 'sleep', soort: 'feelings', hulp: 'goes to sleep, until a new command or until you click him', vb: 'sleep', lees: geen, lijf: true, groep: true, maak: f => { f.houding = 'slaap'; f.vrijSlaap = !!f.slaapVraag; f.slaapVraag = false; return wacht(0.4); } });      // slaapVraag: zijn eigen brein vroeg erom (dan mag hij vanzelf wakker worden)
opdracht('wakker', { en: 'wake', soort: 'feelings', hulp: 'wakes up', vb: 'wake', lees: geen, lijf: true, groep: true, maak: f => { f.ogen = 'groot'; f.ogenTot = M.t + 0.6; return wacht(0.3); } });
opdracht('typ', { en: 'type', soort: 'feelings', hulp: 'sits typing on a little laptop (add how many seconds)', vb: 'type 3', lees: getal(SEC, 0.5, 600, 4), lijf: true, grond: true, maak: (f, a) => typ(f, a.n) });

opdracht('vuurwerk', { en: 'fireworks', soort: 'effects', hulp: 'rockets on the screen he is on (add how many)', vb: 'fireworks 6', lees: getal('the number of rockets', 1, 40, 6), stil: true, maak: (f, a) => { M.fx.push(new Lanceerder(M.schermVan(f.midden().x), Math.round(a.n))); return null; } });
opdracht('laser', {
  soort: 'effects', hulp: 'laser beams from his eyes; with nothing after it the beam sweeps across the screen, or: laser mouse, laser <place> <height>', vb: 'laser', lijf: true,
  lees: rest => {
    const d = rest.toLowerCase().split(/\s+/).filter(Boolean);
    if (!d.length) return {};
    if (d.length === 1 && nl('plek', d[0]) === 'muis') return { x: 'muis' };
    if (d.length === 2) { d[0] = plekNL(d[0]); d[1] = nl('hoogte', d[1]); }
    if (d.length !== 2 || !PLEK.test(d[0]) || !PLEKY.test(d[1])) throw new Error('like this: laser   or   laser mouse   or   laser 80% high');
    return { x: d[0], y: d[1] };
  },
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
  en: 'lightning', soort: 'effects', hulp: 'lightning strikes: he is scorched black for a moment', vb: 'lightning', lees: geen, lijf: true,
  maak: f => reeks([
    () => { M.fx.push(new Bliksem(f)); return wacht(0.12); },
    () => { f.verkoold = 1.9; f.bel = null; return tijdActie(1.9, (k, t) => { f.pose.dx = k < 0.3 ? Math.round(Math.sin(t * 60) * 2) : 0; if (M.rnd() < 0.3) { const kop = f.kop(); M.deel({ x: kop.x + (M.rnd() - 0.5) * 8 * f.maat, y: kop.y, vx: (M.rnd() - 0.5) * 30, vy: -40 - M.rnd() * 40, l: 0.8, k: '#8a8782', m: Math.max(2, Math.round(f.maat * 0.8)), fade: 0.8, a: 0.7 }); } }); },
  ]),
});
opdracht('regenboog', { en: 'rainbow', soort: 'effects', hulp: 'a rainbow trails behind him: rainbow on|off', vb: 'rainbow on', lees: aanUit, stil: true, maak: (f, a) => { f.spoor = a.aan; return null; } });
opdracht('sneeuw', { en: 'snow', soort: 'effects', hulp: 'it snows all over the desktop (add how many seconds)', vb: 'snow 6', lees: getal(SEC, 1, 300, 12), stil: true, maak: (f, a) => { M.fx.push(new Sneeuw(a.n)); return null; } });
opdracht('titel', { en: 'title', soort: 'effects', hulp: 'big letters drop into view and burst apart afterwards', vb: 'title DONE!', lees: rest => { const a = tekstArg(rest); a.tekst = a.tekst.slice(0, 60); return a; }, stil: true, maak: (f, a) => { M.fx.push(new Titel(metNaam(a.tekst), M.schermVan(f.midden().x), f.kleurNu)); return null; } });
opdracht('zwaard', {
  en: 'sword', soort: 'effects', hulp: 'draws a sword and strikes: a white streak right across the screen', vb: 'sword', lees: geen, lijf: true, grond: true,
  maak: f => {
    const arm = f.kijk > 0 ? 'armR' : 'armL', s = f.maat;
    return reeks([
      tijdActie(0.28, k => { f.ding = 'zwaard'; f.dingHoek = -0.9 * zacht(k); f.pose[arm] = -2 * zacht(k); f.ogenNu = 'boos'; }),
      () => { M.fx.push(new Slag(f)); M.klank('zwiep'); return tijdActie(0.1, k => { f.ding = 'zwaard'; f.dingHoek = meng(-0.9, 2.0, zacht(k)); f.pose[arm] = meng(-2, 0.5, k); f.pose.dx = Math.round(f.kijk * k * 2 * s); f.ogenNu = 'boos'; }); },
      tijdActie(0.55, k => { f.ding = 'zwaard'; f.dingHoek = 2.0; f.pose[arm] = 0.5; f.pose.dx = Math.round(f.kijk * 2 * s * (1 - zacht(k))); f.ogenNu = 'boos'; }),
    ]);
  },
});
opdracht('bal', { en: 'ball', soort: 'effects', hulp: 'a ball drops from the sky (you can flick it away with the mouse)', vb: 'ball', lees: geen, stil: true, maak: f => { M.maakBal(f); return wacht(0.2); } });
opdracht('trap', { en: 'kick', soort: 'effects', hulp: 'runs to the ball and kicks it away', vb: 'kick', lees: geen, lijf: true, grond: true, vloer: true, maak: f => voetbal(f, 8, true) });
opdracht('voetbal', { en: 'soccer', soort: 'effects', hulp: 'keeps chasing and kicking the ball (add how many seconds)', vb: 'soccer 5', lees: getal(SEC, 1, 120, 8), ook: ['football'], lijf: true, grond: true, vloer: true, maak: (f, a) => voetbal(f, a.n, false) });

const KLEURLIJST = en('kleur', Object.keys(KLEUREN)).join(', ');
opdracht('kleur', {
  en: 'color', soort: 'looks', hulp: 'another color: ' + KLEURLIJST + ', rainbow, or a code like #ff8800', vb: 'color blue', ook: ['colour'], stil: true,
  lees: rest => { const t = nl('kleur', rest.toLowerCase()); if (t === 'regenboog') return { wissel: true }; const k = M.leesKleur(t); if (!k) throw new Error('choose one of: ' + KLEURLIJST + ', rainbow or a code like #ff8800'); return { kleur: k }; },
  maak: (f, a) => { f.kleurWissel = !!a.wissel; if (a.kleur) { f.kleur = a.kleur; if (f.hoofd) { M.inst.kleur = a.kleur; M.bewaar(); } } const m = f.midden(); M.vonken(m.x, m.y, 8, [a.kleur || '#ffffff', '#ffffff'], 150); M.klank('pop'); return null; },
});
opdracht('maat', {
  en: 'size', soort: 'looks', hulp: 'how big he is: small, normal, big, giant or a number from 2 to 16', vb: 'size big', lijf: true,
  lees: rest => { const t = nl('maat', rest.toLowerCase()), N = { klein: 3, gewoon: 6, groot: 10, reus: 14 }; if (N[t]) return { n: N[t] }; const n = parseInt(t, 10); if (!/^\d+$/.test(t) || n < 2 || n > 16) throw new Error('choose: small, normal, big, giant or a number from 2 to 16'); return { n }; },
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
opdracht('hoed', { en: 'hat', soort: 'looks', hulp: 'something on his head: ' + en('hoed', Object.keys(HOEDEN)).join(', '), vb: 'hat crown', lees: keuze('hoed', Object.keys(HOEDEN)), stil: true, maak: (f, a) => { f.hoed = a.k; if (f.hoofd) { M.inst.hoed = a.k; M.bewaar(); } const k = f.kop(); M.vonken(k.x, k.y, 6, ['#ffffff', '#ffe066'], 120); M.klank('pop'); return null; } });

/* ---- zijn eigen uiterlijk: een kleur, wat er bovenop zit, een tekening op zijn lijf en blosjes ----
   "unique <name>" maakt er altijd dezelfde van voor dezelfde naam: jouw naam geeft jouw eigen Maatje. */
const UNIEKE_KLEUREN = ['#d97757', '#e5484d', '#6a9bcc', '#78a65a', '#f2c94c', '#9b7ede', '#f08bb4', '#45c4b0', '#e0b030', '#9c6b4a', '#f4f1ea', '#ff8c2b', '#5fa8d3', '#b5838d', '#7bc96f', '#c96ad0'];
function hasj(tekst) { let h = 2166136261; for (const c of tekst) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function zaadRnd(zaad) {
  let z = zaad >>> 0;
  const r = () => { z = (z + 0x6D2B79F5) >>> 0; let t = z; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r(); r(); r();                                       // eerst even doorschudden: korte namen lijken anders op elkaar
  return r;
}
M.uniekUitZaad = function (zaad) {
  const r = zaadRnd(hasj(String(zaad).toLowerCase().trim())), kies = l => l[Math.floor(r() * l.length)];
  const stijl = { top: kies(['antenne', 'oren', 'hoorns', 'kuif', 'antenne', 'oren', 'geen']), vlek: kies(['buik', 'strepen', 'stippen', 'buik', 'geen']), wangen: r() < 0.6 };
  if (stijl.top === 'geen' && stijl.vlek === 'geen') stijl.wangen = true;      // altijd íets eigens
  return { kleur: kies(UNIEKE_KLEUREN), stijl };
};
const UNIEK = {
  top: { antennae: 'antenne', antenne: 'antenne', ears: 'oren', oren: 'oren', horns: 'hoorns', hoorns: 'hoorns', tuft: 'kuif', kuif: 'kuif', none: 'geen', geen: 'geen' },
  pattern: { belly: 'buik', buik: 'buik', stripes: 'strepen', strepen: 'strepen', spots: 'stippen', stippen: 'stippen', none: 'geen', geen: 'geen' },
};
opdracht('uniek', {
  en: 'unique', soort: 'looks', ook: ['dice'], stil: true,
  hulp: 'gives him his very own look: unique (a surprise) | unique <your name> (always the same one for the same name) | unique top antennae|ears|horns|tuft|none | unique pattern belly|stripes|spots|none | unique cheeks on|off | unique classic (back to the normal look, with nothing extra)',
  vb: 'unique thom',
  lees: rest => {
    const d = rest.trim().split(/\s+/).filter(Boolean), w = (d[0] || '').toLowerCase();
    if (!d.length || ['roll', 'random', 'surprise'].includes(w)) return { roll: true };
    if (['classic', 'plain', 'effen', 'gewoon', 'default', 'normal', 'normaal', 'off', 'uit'].includes(w) && d.length === 1) return { stijl: Object.assign({}, STIJL_STANDAARD) };      // zoals je hem kent
    if (w === 'top' || w === 'pattern') {
      const k = UNIEK[w][(d[1] || '').toLowerCase()];
      if (!k || d.length !== 2) throw new Error('like this: unique ' + w + ' ' + (w === 'top' ? 'antennae|ears|horns|tuft|none' : 'belly|stripes|spots|none'));
      return { deel: w === 'top' ? 'top' : 'vlek', waarde: k };
    }
    if (w === 'cheeks') { const k = nl('aanuit', (d[1] || '').toLowerCase()); if (k !== 'aan' && k !== 'uit') throw new Error('like this: unique cheeks on'); return { deel: 'wangen', waarde: k === 'aan' }; }
    const naam = rest.trim();
    if (naam.length > 40) throw new Error('that name is too long (at most 40 letters)');
    return { zaad: naam };
  },
  maak: (f, a) => {
    if (a.zaad !== undefined || a.roll) {
      const u = M.uniekUitZaad(a.roll ? 'roll-' + Math.floor(M.rnd() * 1e9) : a.zaad);
      f.stijl = u.stijl; f.kleur = u.kleur; f.kleurWissel = false;
    } else if (a.stijl) f.stijl = a.stijl;
    else f.stijl = Object.assign({}, f.stijl, { [a.deel]: a.waarde });
    if (f.hoofd) { M.inst.stijl = Object.assign({}, f.stijl); M.inst.kleur = f.kleur; M.bewaar(); }
    const m = f.midden();
    M.vonken(m.x, m.y, 12, ['#ffffff', '#ffe066', f.kleur], 190); M.klank('pop');
    return null;
  },
});

opdracht('naam', {
  en: 'name', soort: 'looks', hulp: 'what he is called (in the window, next to the clock and when he says {pet}): name Claude', vb: 'name Claude', stil: true,
  lees: rest => {
    const n = rest.trim();
    if (!n) throw new Error('what should he be called? for example: name Claude');
    if (n.length > 20 || !/^[A-Za-z0-9 .'-]+$/.test(n)) throw new Error('a name of at most 20 letters, numbers, spaces, dots, dashes or apostrophes');
    return { naam: n };
  },
  maak: (f, a) => { M.inst.naam = a.naam; M.bewaar(); const m = f.midden(); M.vonken(m.x, m.y, 10, ['#ffffff', '#ffe066', f.kleurNu], 170); M.klank('pop'); return null; },
});
opdracht('geest', {
  en: 'mind', soort: 'looks', ook: ['brain'], magInLucht: true,
  hulp: 'his little brain: mind (he says how he feels and what he likes) | mind off (he does things at random, like before) | mind on | mind forget (he forgets what he learned)', vb: 'mind',
  lees: rest => {
    const t = rest.trim().toLowerCase();
    if (!t) return { wat: 'vertel' };
    if (['on', 'aan'].includes(t)) return { wat: 'aan' };
    if (['off', 'uit'].includes(t)) return { wat: 'uit' };
    if (['forget', 'vergeet', 'reset'].includes(t)) return { wat: 'vergeet' };
    throw new Error('like this: mind   (or mind on, mind off, mind forget)');
  },
  maak: (f, a) => {
    const g = M.geest;
    if (a.wat === 'aan') { g.aan = true; M.bewaar(); return null; }
    if (a.wat === 'uit') { g.aan = false; M.bewaar(); return null; }
    if (a.wat === 'vergeet') { g.vergeet(); g.verveling = 0.25; g.gezelligheid = 0.4; M.bewaar(); const k = f.kop(); M.vonken(k.x, k.y, 6, ['#ffffff', '#bfe9ff'], 120); return null; }
    const b = new Bel('denk', g.vertel() + (g.reden ? ' (I just wanted to ' + g.doel + ': ' + g.reden + '.)' : '')); f.bel = b;
    return zodra(() => f.bel !== b);
  },
});
opdracht('kloon', { en: 'clone', soort: 'friends', hulp: 'friends appear who follow him and copy what he does (at most 12)', vb: 'clone 3', lees: getal('the number of friends', 1, 12, 3), stil: true, maak: (f, a) => { for (let i = 0; i < Math.round(a.n); i++) M.nieuweKloon(); return wacht(0.3); } });
opdracht('opruimen', {
  en: 'cleanup', soort: 'friends', hulp: 'friends, ball, snow and rainbow away', vb: 'cleanup', lees: geen, ook: ['clear'], stil: true,
  maak: f => {
    M.delen.length = 0;
    for (let i = M.figuren.length - 1; i >= 1; i--) { const k = M.figuren[i], m = k.midden(); M.plof(m.x, m.y, k.kleurNu); if (M.gepakt === k) { M.gepakt = null; M.pakInfo = null; } }
    M.figuren.length = 1; M.fx.length = 0; M.bal = null; f.spoor = false;
    for (const id in M.werk.sessies) M.werk.sessies[id].hulpjes = 0;
    return null;
  },
});

opdracht('werk', { en: 'work', soort: 'claude', hulp: 'sits typing for as long as Claude is working; this happens by itself when follow is on', vb: 'work', lees: geen, lijf: true, grond: true, maak: f => werk(f) });
opdracht('meeleven', {
  en: 'follow', soort: 'claude', hulp: 'follow along with Claude: type while Claude works, cheer when he is done, wave when he needs you: follow on|off', vb: 'follow on', lees: aanUit, stil: true,
  maak: (f, a) => { M.inst.meeleven = a.aan; if (!a.aan) M.werk.sessies = {}; M.bewaar(); return null; },
});

opdracht('wacht', { en: 'wait', soort: 'other', hulp: 'does nothing for that many seconds', vb: 'wait 1.5', lees: getal(SEC, 0, 600), stil: true, maak: (f, a) => wacht(a.n) });
opdracht('stop', { soort: 'other', hulp: 'throws away everything he still had to do', vb: 'stop', lees: geen, stil: true, maak: () => null });
opdracht('vrij', { en: 'roam', soort: 'other', hulp: 'wander around by himself when he has nothing to do: roam on|off', vb: 'roam on', lees: aanUit, stil: true, maak: (f, a) => { M.inst.vrij = a.aan; M.bewaar(); return null; } });
opdracht('geluid', { en: 'sound', soort: 'other', hulp: 'sound on|off', vb: 'sound on', lees: aanUit, stil: true, maak: (f, a) => { M.inst.geluid = a.aan; M.bewaar(); return null; } });
opdracht('weg', { en: 'hide', soort: 'other', hulp: 'disappears from the screen completely (come brings him back)', vb: 'hide', lees: geen, stil: true, maak: () => reeks([() => { for (const k of M.figuren) { const m = k.midden(); M.plof(m.x, m.y, k.kleurNu); k.zichtbaar = false; k.bel = null; } return wacht(0.5); }, () => { M.zetZicht(false, true); return null; }]) });
opdracht('kom', { en: 'come', soort: 'other', hulp: 'comes back onto the screen', vb: 'come', lees: geen, stil: true, maak: () => null });

/* ================= de taal: van regels tekst naar opdrachten ================= */
function verschil(a, b) {                            // hoeveel letters anders (voor "did you mean ...?")
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
    if (naam === 'repeat' || naam === 'herhaal') {
      const n = parseInt(rest, 10);
      if (!/^\d+$/.test(rest) || n < 1 || n > 100) fouten.push({ regel: i + 1, tekst: 'like this: repeat 3  (from 1 to 100), and close it with: end' });
      stapel.push({ items: [], n: n || 1 });
      return;
    }
    if (naam === 'end' || naam === 'einde') {
      if (stapel.length < 2) { fouten.push({ regel: i + 1, tekst: 'end without a repeat before it' }); return; }
      const b = stapel.pop(), doel = stapel[stapel.length - 1].items;
      for (let k = 0; k < b.n; k++) { totaal += b.items.length; if (totaal > 3000) break; for (const it of b.items) doel.push(it); }
      return;
    }
    const getypt = naam;
    naam = ALIAS[naam] || naam;
    const def = OPDR[naam];
    if (!def) {
      let beste = null, bd = 3;
      for (const k of Object.keys(ALIAS).concat(Object.keys(OPDR))) { const d = verschil(getypt, k); if (d < bd) { bd = d; beste = k; } }
      fouten.push({ regel: i + 1, tekst: 'I do not know the command "' + getypt + '"' + (beste ? ' (did you mean ' + beste + '?)' : '') });
      return;
    }
    try { top.items.push({ def, args: def.lees(rest), nietWachten, regel: i + 1 }); totaal++; }
    catch (e) { fouten.push({ regel: i + 1, tekst: getypt + ': ' + e.message }); }
  });
  if (stapel.length > 1) fouten.push({ regel: (regels || []).length, tekst: 'an end is missing after repeat' });
  if (totaal > 3000) fouten.push({ regel: 0, tekst: 'that is more than 3000 commands: too many' });
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
    f.slaapVraag = false;
    if (f.vrijSlaap) { f.vrijSlaap = false; f.houding = null; }
    M.laatsteOpdracht = M.t; M.pauzeNa = 12; M.blijfTot = 0;      // na een opdracht blijft hij 12 s staan voor hij weer vanzelf gaat lopen
  }
  for (const it of items) f.rij.push(it);
  const u = { ok: true, aantal: items.length };
  if (M.pauze) u.let_op = 'Maatje is hidden: he will only do this after the command "come"';
  return u;
};
M.bezig = function () {
  for (const f of M.figuren) if (f.nu || f.rij.length || f.bij.length || f.straks.length || f.lucht || f.gepakt) return true;
  for (const e of M.fx) if (e.telt) return true;
  return false;
};
/* de lijst voor "help": het Engelse woord voorop, de andere woorden die ook werken erachter */
M.hulp = function () {
  const ook = {};
  for (const a in ALIAS) (ook[ALIAS[a]] = ook[ALIAS[a]] || []).push(a);
  return Object.keys(OPDR).map(n => {
    const d = OPDR[n], rest = (ook[n] || []).filter(a => a !== d.en);
    return { naam: d.en, soort: d.soort, hulp: d.hulp, vb: d.vb, ook: (d.en !== n ? [n] : []).concat(rest) };
  });
};
/* Engelse woorden voor de status (wat hij doet, wat hij op heeft) */
M.engels = { opdracht: n => (OPDR[n] ? OPDR[n].en : n), hoed: n => enWoord('hoed', n) };
