'use strict';
/* MAATJE - wat hij uit zichzelf doet als hij geen opdracht heeft, en wat de muis met hem doet. */

/* ---- de muis: het venster laat klikken door, behalve als de muis op het poppetje staat ---- */
M.muisToets = function (alleenLos) {
  let raak = M.gepakt;
  if (!raak && !M.pauze) for (const f of M.figuren) if (f.zichtbaar && f.raakt(M.muis.x, M.muis.y)) { raak = f; break; }
  M.onderMuis = raak || null;
  const vast = !!raak;
  if (vast === M.muisVast || (alleenLos && vast)) return;      // hij loopt onder een stilstaande muis door: niet pakken
  M.muisVast = vast;
  if (window.maatjeApp) window.maatjeApp.muis(vast);
};
M.muisBeweeg = function (x, y, dtProef) {
  const m = M.muis, nu = performance.now(), dt = dtProef || Math.max(1, nu - m.klok) / 1000;
  m.klok = nu;
  if (dt < 0.2) { m.vx = meng(m.vx, (x - m.x) / dt, 0.5); m.vy = meng(m.vy, (y - m.y) / dt, 0.5); } else { m.vx = 0; m.vy = 0; }
  if (M.pakInfo) M.pakInfo.ver += Math.abs(x - m.x) + Math.abs(y - m.y);
  m.x = x; m.y = y; m.t = M.t;
  M.muisToets(false);
  const b = M.bal;                                    // de bal wegtikken met de muis
  if (b && !M.pauze && M.t > b.muisKoel && Math.hypot(x - b.x, y - b.y) < b.r + 10) {
    b.vx = klem(m.vx * 0.7, -1200, 1200) || (x < b.x ? 300 : -300);
    b.vy = -360 - Math.min(500, Math.abs(m.vy) * 0.3); b.muisKoel = M.t + 0.25; b.leef = 45;
    M.klank('trap');
  }
};
M.muisNeer = function () {
  const f = M.onderMuis;
  if (!f || M.gepakt) return;
  M.gepakt = f; M.pakInfo = { t: performance.now(), ver: 0 };
  f.pak();
};
M.muisOp = function () {
  const f = M.gepakt;
  if (!f) return;
  const klik = performance.now() - M.pakInfo.t < 350 && M.pakInfo.ver < 8;
  M.gepakt = null; M.pakInfo = null;
  f.los(klik);
  M.pauzeNa = 3;
  M.muisToets(false);
};
window.addEventListener('mousemove', e => M.muisBeweeg(e.clientX, e.clientY));
window.addEventListener('mousedown', e => { if (e.button === 0) M.muisNeer(); });
window.addEventListener('mouseup', e => { if (e.button === 0) M.muisOp(); });
document.addEventListener('mouseleave', () => { if (M.gepakt) M.muisOp(); });
window.addEventListener('contextmenu', e => e.preventDefault());

/* ---- meeleven met Claude ----
   Claude Code roept bij elke gebeurtenis haak.js aan; dat stuurt hier een van deze berichten heen:
   aan (Claude werkt), hulpje / hulpjeweg (Claude zette een hulpje in), nodig (Claude wacht op jou),
   klaar (Claude is klaar met zijn beurt), einde (de sessie is gesloten). */
M.werkActief = function () {
  if (!M.inst.meeleven) return false;
  for (const id in M.werk.sessies) { const s = M.werk.sessies[id]; if (!s.nodig && M.t - s.t <= 900) return true; }
  return false;
};
function reageer(regels, sec) {                       // even iets laten zien, maar nooit dwars door een opdracht heen
  const f = M.hoofd, W = M.werk;
  const opdracht = (f.nu || f.rij.length || f.bij.length) && !f.vrijBezig;
  if (opdracht || f.gepakt || M.pauze || !f.zichtbaar) return;
  f.stopAlles();
  M.zelf(regels);
  W.reactieTot = M.t + sec;
}
M.meeleef = function (b) {
  if (!M.inst.meeleven || !M.hoofd) return { ok: true, meeleven: false };
  const W = M.werk, id = String(b.sessie || '?').slice(0, 80);
  let s = W.sessies[id];
  switch (b.gebeurtenis) {
    case 'aan': case 'hulpje':
      if (!s) s = W.sessies[id] = { t: M.t, hulpjes: 0, nodig: false };
      s.t = M.t; s.nodig = false;
      if (b.gebeurtenis === 'hulpje') s.hulpjes = Math.min(4, s.hulpjes + 1);
      break;
    case 'hulpjeweg':
      if (s) { s.t = M.t; s.hulpjes = Math.max(0, s.hulpjes - 1); }
      break;
    case 'nodig':
      if (s) { s.t = M.t; s.nodig = true; }
      if (M.t >= W.nodigKoel) { W.nodigKoel = M.t + 15; reageer(['kijk muis', '+zeg Kom je even kijken?', 'zwaai', 'emotie uitroep'], 3.5); }
      break;
    case 'klaar':
      delete W.sessies[id];
      W.vertrekNa = M.t + 2.4;
      if (M.t >= W.klaarKoel) { W.klaarKoel = M.t + 4; reageer(['+roep Klaar!', 'juich', 'emotie ster'], 3); }
      break;
    case 'einde':
      delete W.sessies[id];
      break;
    default:
      return { ok: false, fout: 'onbekende gebeurtenis: ' + b.gebeurtenis };
  }
  return { ok: true, meeleven: true, werkt: M.werkActief() };
};
/* oude sessies vergeten, en net zoveel hulpjes op het scherm als Claude er heeft ingezet */
M.werkBeheer = function () {
  const W = M.werk, f = M.hoofd;
  let wil = 0;
  for (const id in W.sessies) { const s = W.sessies[id]; if (M.t - s.t > 900) delete W.sessies[id]; else wil += s.hulpjes; }
  wil = M.inst.meeleven ? Math.min(5, wil) : 0;
  let heb = 0, laatste = -1;
  for (let i = 1; i < M.figuren.length; i++) if (M.figuren[i].hulpje) { heb++; laatste = i; }
  if (heb < wil) {
    if (M.t >= W.spawnNa && M.figuren.length < 13 && f.vlak === 0 && !f.vliegt && !f.gepakt) { const k = M.nieuweKloon(); if (k) k.hulpje = true; W.spawnNa = M.t + 0.5; }
  } else if (heb > wil && M.t >= W.vertrekNa && M.t >= W.spawnNa) {
    const k = M.figuren[laatste], m = k.midden();
    M.plof(m.x, m.y, k.kleurNu);
    if (M.gepakt === k) { M.gepakt = null; M.pakInfo = null; }
    M.figuren.splice(laatste, 1);
    for (let i = 1; i < M.figuren.length; i++) M.figuren[i].slot = i;
    W.spawnNa = M.t + 0.3;
  }
};

/* ---- uit zichzelf ---- */
M.zelf = function (regels) { M.doe(regels, { vrij: true }); };
M.brein = function (dt) {
  const f = M.hoofd;
  if (!f || !f.zichtbaar) return;
  // aaien: de muis een tijdje over hem heen bewegen
  if (M.onderMuis === f && !M.gepakt && M.t - M.muis.t < 0.3) {
    f.aaiT += dt;
    if (f.aaiT > 0.9 && M.t > f.aaiKoel) { f.aaiT = 0; f.aaiKoel = M.t + 4; f.emote = { naam: 'hart', t: 0, duur: 1.3 }; f.ogen = 'blij'; f.ogenTot = M.t + 1.3; M.klank('pop'); }
  } else if (M.onderMuis !== f) f.aaiT = 0;

  // Claude is aan het werk: gaan zitten typen. Een opdracht gaat voor; 12 s daarna pakt hij het werk weer op.
  M.werkBeheer();
  if (M.werkActief()) {
    const bezet = !!(f.nu || f.rij.length || f.bij.length), metWerk = !!f.nu && f.nuNaam === 'werk';
    if (!metWerk && !f.lucht && !f.gepakt && M.t >= M.werk.reactieTot && M.t - M.laatsteOpdracht > 12 && (!bezet || f.vrijBezig)) {
      if (bezet) f.stopAlles();
      f.vrijSlaap = false;
      M.zelf(['werk']);
    }
    M.vrijVanaf = M.t + M.pauzeNa;
    return;
  }

  if (f.nu || f.rij.length || f.bij.length || f.lucht || f.gepakt) { M.vrijVanaf = M.t + M.pauzeNa; return; }
  f.vrijBezig = false;
  if (!M.inst.vrij) return;
  const muisDicht = M.t - M.muis.t < 1.5 && Math.hypot(M.muis.x - f.x, M.muis.y - (f.y - 5 * f.maat)) < 170;
  if (f.houding === 'slaap') {                        // slapen: alleen de slaap die hij zelf begon stopt vanzelf
    if (f.vrijSlaap && muisDicht) { f.vrijSlaap = false; M.pauzeNa = 3; M.zelf(['schrik', 'kijk muis']); }
    return;
  }
  if (M.t < M.vrijVanaf) return;
  if (f.houding || f.vliegt || f.vlak !== 0) {         // door een opdracht ergens neergezet: laat hem daar een poos
    if (!M.blijfTot) { M.blijfTot = M.t + 45; return; }
    if (M.t < M.blijfTot) return;
  }
  M.blijfTot = 0;
  const stil = M.t - Math.max(M.laatsteOpdracht, M.muis.t), r = M.rnd();
  M.pauzeNa = 1.5 + M.rnd() * 5;
  if (stil > 240 && r < 0.5) { M.zelf(['zit', 'wacht 1.5', 'slaap']); f.vrijSlaap = true; return; }
  if (muisDicht && r < 0.5 && M.t > (M.zwaaiKoel || 0)) { M.zwaaiKoel = M.t + 25; M.zelf(['kijk muis', 'zwaai']); return; }
  if (r < 0.42) M.zelf(['loop ergens']);
  else if (r < 0.52) M.zelf([M.schermen.length > 1 && M.rnd() < 0.5 ? 'loop s' + (1 + Math.floor(M.rnd() * M.schermen.length)) + ':ergens' : 'ren ergens']);
  else if (r < 0.64) M.zelf(['kijk links', 'wacht 0.9', 'kijk rechts', 'wacht 0.9', 'kijk voor']);
  else if (r < 0.74) M.zelf(['zit', 'wacht ' + (3 + Math.floor(M.rnd() * 6)), 'sta']);
  else if (r < 0.80) M.zelf(['spring']);
  else if (r < 0.85) M.zelf(['draai']);
  else if (r < 0.90 && M.t - M.muis.t < 3) M.zelf(['ren muis', 'kijk muis', 'emotie vraag']);
  else if (r < 0.93) M.zelf(['emotie muziek', 'dans 2']);
  else M.zelf(['wacht 2']);
};
