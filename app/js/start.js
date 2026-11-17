'use strict';
/* MAATJE - the main loop and the connection with the main program (requests in, answers out).
   The code below is in Dutch. */
(function () {
  const app = window.maatjeApp;
  const eigenApi = app && app.eigenLijst ? { lijst: app.eigenLijst, lees: app.eigenLees } : null;      // eigen animaties: het hoofdprogramma bewaart ze
  let vorige = 0, teller = 0, fpsT = 0, fpsN = 0;

  function isDruk() {                                 // gebeurt er iets? anders tekenen we maar af en toe
    if (M.delen.length || M.fx.length || M.gepakt) return true;
    for (const f of M.figuren) {
      if (f.nu || f.rij.length || f.bij.length || f.straks.length || f.lucht || f.vliegt || f.bel || f.emote || f.liep) return true;
      if (f.plet > 0 || (f.zitK > 0 && f.zitK < 1) || f.spoorP.length || f.duizel > 0 || f.verkoold > 0 || f.kleurWissel) return true;
    }
    return false;
  }
  function wachtersKlaar(uitkomst) { for (const w of M.wachters.splice(0)) { w.klaar = true; w.res(uitkomst); } }

  M.stap = function (dt) {
    M.t += dt;
    M.brein(dt);
    for (const f of M.figuren) f.update(dt);
    for (let i = M.fx.length - 1; i >= 0; i--) if (M.fx[i].stap(dt)) M.fx.splice(i, 1);
    M.stapDelen(dt);
    M.muisToets(true);
    M.druk = isDruk();
    if (M.wachters.length && !M.bezig()) wachtersKlaar(true);
  };
  M.teken = function () {
    M.wis();
    for (const f of M.figuren) f.tekenSpoor();
    for (const f of M.figuren) f.tekenSchaduw();
    for (let i = M.figuren.length - 1; i >= 0; i--) M.figuren[i].teken();      // de vriendjes eerst, hijzelf bovenop
    for (const e of M.fx) e.teken();
    M.tekenDelen();
    for (const f of M.figuren) { f.tekenEmote(); if (f.bel && f.zichtbaar) f.bel.teken(f); }
  };
  function beeld(nu) {
    requestAnimationFrame(beeld);
    if (M.pauze) { vorige = nu; return; }
    if (!M.druk && (++teller & 3)) return;            // niets aan de hand: één op de vier beelden
    let dt = (nu - vorige) / 1000;
    vorige = nu;
    if (dt <= 0) return;
    if (dt > 0.1) dt = 0.1;
    try { M.stap(dt); M.teken(); } catch (e) { M.meldFout('lus', e); }
    fpsN++;
    if (nu - fpsT >= 1000) { M.fps = Math.round(fpsN * 1000 / (nu - fpsT)); fpsN = 0; fpsT = nu; }
  }

  M.zetZicht = function (aan, meld) {
    M.pauze = !aan;
    if (!aan) { if (M.gepakt) M.muisOp(); M.wis(); M.muisToets(false); wachtersKlaar(true); }
    else { for (const f of M.figuren) { f.zichtbaar = true; const m = f.midden(); M.plof(m.x, m.y, f.kleurNu); } vorige = performance.now(); }
    if (meld && app) app.zicht(aan);
  };
  M.wachtKlaar = function (maxSec) {
    return new Promise(res => {
      const w = { res, klaar: false };
      M.wachters.push(w);
      setTimeout(() => { if (!w.klaar) { w.klaar = true; const i = M.wachters.indexOf(w); if (i >= 0) M.wachters.splice(i, 1); res(false); } }, maxSec * 1000);
    });
  };
  M.status = function () {
    const f = M.hoofd;
    return {
      ok: true, versie: M.versie, t: +M.t.toFixed(2), W: M.W, H: M.H, schermen: M.schermen, verborgen: M.pauze, bezig: M.bezig(),
      hoofd: {
        x: Math.round(f.x), y: Math.round(f.y), waar: VLAKNAAM[f.vlak], lucht: f.lucht, vliegt: f.vliegt, gepakt: f.gepakt, houding: f.houding,
        kleur: f.kleur, maat: f.maat, hoed: f.hoed, doet: f.nu ? f.nuNaam : null, wachtrij: f.rij.length,
        hoedEn: M.engels.hoed(f.hoed), doetEn: f.nu ? M.engels.opdracht(f.nuNaam) : null,
        zegt: f.bel ? f.bel.regels.join(' ') : null, bel: f.bel ? f.bel.rect : null, rol: +f.rol.toFixed(2), zichtbaar: f.zichtbaar,
        emotie: f.emote ? f.emote.naam : null, ogen: f.oogSoort(), kijk: f.kijk,
      },
      figuren: M.figuren.length, effecten: M.fx.length, deeltjes: M.delen.length,
      bal: M.bal ? { x: Math.round(M.bal.x), y: Math.round(M.bal.y), vx: Math.round(M.bal.vx) } : null,
      vrij: M.inst.vrij, geluid: M.inst.geluid, muisVast: M.muisVast, fps: M.fps,
      vensters: Object.assign(M.plat.status(), { staOp: f.gId ? (M.plat.op.get(f.gId) || {}).prog || '?' : null, gId: f.gId, vinder: M.vindStand || null }),
      uiterlijk: { stijl: f.stijl, kleur: f.kleur },
      animaties: { aantal: M.anim.lijst.length, eigen: M.anim.lijst.filter(a => a.eigen).length, fouten: M.anim.fouten.length, skin: f.skin ? f.skin.naam : null, beeld: f.beeld ? f.beeld.naam : null, prop: f.prop ? f.prop.naam : null, dy: +f.pose.dy.toFixed(2), rol: +f.animRol.toFixed(2) },
      meeleven: { aan: M.inst.meeleven, sessies: Object.keys(M.werk.sessies).length, werkt: M.werkActief(), hulpjes: M.figuren.filter(k => k.hulpje).length, typt: !!f.nu && f.nuNaam === 'werk' },
      fouten: M.fouten.slice(-6), foutTel: M.foutTel, klanken: M.proef ? G.tel : undefined,
    };
  };
  M.foto = function (b) {
    let g = b.gebied;
    if (b.rond) { const m = M.hoofd.midden(); g = { x: m.x - 480, y: m.y - 400, w: 960, h: 560 }; }
    g = g || { x: 0, y: 0, w: M.W, h: M.H };
    const w = Math.round(klem(g.w, 8, M.W)), h = Math.round(klem(g.h, 8, M.H)), x = Math.round(klem(g.x, 0, M.W - w)), y = Math.round(klem(g.y, 0, M.H - h));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const k = c.getContext('2d');
    if (b.kleur) { k.fillStyle = b.kleur; k.fillRect(0, 0, w, h); }
    k.drawImage(cv, x * M.dpr, y * M.dpr, w * M.dpr, h * M.dpr, 0, 0, w, h);
    return { ok: true, png: c.toDataURL('image/png'), breed: w, hoog: h };
  };

  M.vraag = function (b) {
    switch (b.wat) {
      case 'doe': {
        const u = M.doe(b.regels || []);
        if (u.ok && b.wacht && !M.pauze) return M.wachtKlaar(b.maxSec || 600).then(k => Object.assign(u, { klaar: k }));
        return u;
      }
      case 'status': return M.status();
      case 'hulp': return { ok: true, opdrachten: M.hulp() };
      case 'foto': return M.foto(b);
      case 'zicht': M.zetZicht(!!b.aan, false); return { ok: true };
      case 'meeleven': return M.meeleef(b);
      case 'anims': return { ok: true, lijst: M.animLijst(), soorten: M.anim.cats, fouten: M.anim.fouten, eigenFouten: M.anim.eigenFouten };
      case 'eigen': return eigenApi ? M.laadEigen(eigenApi) : { ok: false, fout: 'not available here' };
    }
    if (!M.proef) return { ok: false, fout: 'unknown request: ' + b.wat };
    switch (b.wat) {                                  // alleen in een proef: de tijd met de hand vooruitzetten, de muis nadoen
      case 'stap': {
        const dt = b.dt || 1 / 60, n = Math.round((b.sec || dt) / dt);
        for (let i = 0; i < n; i++) { M.stap(dt); if (b.teken !== false) M.teken(); }
        return { ok: true, t: +M.t.toFixed(3) };
      }
      case 'muis':
        if (b.soort === 'neer') M.muisNeer(); else if (b.soort === 'op') M.muisOp(); else M.muisBeweeg(b.x, b.y, b.dt || 0.016);
        return { ok: true, onder: !!M.onderMuis, vast: M.muisVast };
      case 'schoon': {                                // staat er na het wissen echt niets meer op het doek?
        M.wis();
        const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
        let n = 0, eerste = null;
        for (let i = 3; i < d.length; i += 4) if (d[i]) { n++; if (!eerste) { const p = (i - 3) / 4; eerste = { x: p % cv.width, y: Math.floor(p / cv.width) }; } }
        M.teken();
        return { ok: true, vuil: n, eerste };
      }
      case 'zaai': M.zaai(b.zaad || 1); return { ok: true };
      case 'vensters': M.plat.zet(b.lijst || []); return { ok: true, platforms: M.plat.lijst.length };      // nagemaakte vensters (de proef heeft geen echte)
      case 'zet': {                                   // een eigenschap zetten, bijvoorbeeld hoofd.hoed
        const d = String(b.pad).split('.');
        let o = M;
        for (let i = 0; i < d.length - 1; i++) o = o[d[i]];
        o[d[d.length - 1]] = b.waarde;
        return { ok: true };
      }
    }
    return { ok: false, fout: 'unknown request: ' + b.wat };
  };

  if (!app) return;
  app.opVraag(async (nr, b) => {
    let u;
    try { u = await M.vraag(b); } catch (e) { M.meldFout('vraag ' + (b && b.wat), e); u = { ok: false, fout: String(e && e.message ? e.message : e) }; }
    if (nr) app.antwoord(nr, u);
  });
  app.opWereld(w => {
    M.zetWereld(w);
    for (const f of M.figuren) { f.gId = 0; if (f.vlak !== 0 || f.vliegt) f.laatLos(); f.x = klem(f.x, f.marge(), M.W - f.marge()); if (!f.lucht && !f.gepakt) f.y = M.vloer(f.x); }
  });
  app.opVensters(l => { M.vindStand = { n: l.length, t: Math.round(M.t) }; M.plat.zet(l); });      // de vensters op het scherm, van het zoekprogramma
  app.opBegin(d => {
    M.proef = !!d.proef;
    M.gebruiker = d.gebruiker || 'you';
    Object.assign(M.inst, d.inst);
    M.zetWereld(d.wereld);
    if (d.zaad) M.zaai(d.zaad);
    const s0 = M.schermen[d.wereld.eerste || 0] || M.schermen[0];
    if (!M.inst.stijl) M.inst.stijl = Object.assign({}, STIJL_STANDAARD);
    M.plat.aan = M.inst.vensters !== false;
    const f = new Figuur({ x: Math.round(s0.x + s0.w * 0.72), kleur: M.inst.kleur, maat: M.inst.maat, hoed: M.inst.hoed, hoofd: true, stijl: Object.assign({}, M.inst.stijl) });
    M.figuren.push(f); M.hoofd = f;
    if (!M.proef) {                                   // hij komt uit de lucht vallen en zwaait
      f.y = s0.y - 30; f.lucht = true;
      M.zelf(['wacht 0.4', 'zwaai']);
      vorige = performance.now();
      requestAnimationFrame(beeld);
    } else M.teken();
    if (eigenApi) { M.laadEigen(eigenApi).catch(e => M.meldFout('eigen animaties', e)); app.opEigen(() => { M.laadEigen(eigenApi).catch(e => M.meldFout('eigen animaties', e)); }); }
    app.klaar();
  });
})();
