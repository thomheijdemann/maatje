'use strict';
/* MAATJE - his little mind.
   A small "brain" that decides what he does when nobody tells him anything. It is not a talking AI (it does not
   know words); it is a tiny brain that feels, remembers and learns:
   - He has three feelings that change all the time: energy (he gets tired from moving and rests by sitting or
     sleeping), boredom (grows while nothing happens, goes away when he goes somewhere new or plays) and
     wanting company (grows until you pet him or click him).
   - He notices things: a NEW window (he wants to go and look at it), the window you are working in (he keeps you
     company), the mouse (is somebody there?), you being away for a long time (he gets sleepy and naps) and you coming
     back (he is happy and waves).
   - He learns: every time you pet or click him while he is on a window of some program he likes that program a
     little more; when you pick him up and throw him off a window he likes it a little less. What he learned is
     kept (in the settings) and fades away slowly.
   - Every choice is a small calculation: every possible action gets a score from his feelings and what he sees,
     and he picks one (the higher the score, the more likely). He always has a reason, and you can ask for it:
     "mind" makes him say what he feels, and the window shows it.
   The code below is written in Dutch. */
(function () {
  const ge = M.geest = {
    aan: true, energie: 0.85, verveling: 0.25, gezelligheid: 0.4,
    voorkeur: {}, gezien: {}, bezoek: {}, nieuw: [],
    doel: '', reden: '', stemming: 'calm', blij: 0, weg: false, terug: false, vuil: false, laatsteSave: 0, restT: 0, verval: 0,
  };
  const STEMMING_EN = { calm: 'calm', sleepy: 'sleepy', bored: 'bored', curious: 'curious', lonely: 'in need of company', happy: 'happy' };
  const onder = f => { const p = f.gId && M.plat.op.get(f.gId); return p ? p.prog : null; };

  ge.muisIdle = () => (M.muis.t < 0 ? Math.min(M.t, 30) : M.t - M.muis.t);        // hoe lang de muis stilstaat (jij bent weg of aan het typen)
  const nacht = () => { if (M.proef) return false; const u = new Date().getHours(); return u >= 23 || u < 6; };

  /* ---- elk beeld: gevoelens veranderen ---- */
  ge.stap = function (dt) {
    const f = M.hoofd;
    if (!f) return;
    const rust = f.houding === 'zit' || f.houding === 'slaap', bezig = !!(f.nu || f.lucht || f.liep) && !rust, idle = ge.muisIdle();
    if (rust) ge.energie = Math.min(1, ge.energie + dt * (f.houding === 'slaap' ? 0.02 : 0.008));
    else if (bezig) ge.energie = Math.max(0, ge.energie - dt * (nacht() ? 0.0055 : 0.0035));
    else ge.energie = Math.min(1, ge.energie + dt * 0.0008);
    ge.verveling = Math.min(1, ge.verveling + dt * 0.006 * (bezig ? 0.5 : 1));
    ge.gezelligheid = Math.min(1, ge.gezelligheid + dt * 0.003);
    if (idle > 120) ge.weg = true;                                  // jij bent weg
    else if (ge.weg && idle < 3) { ge.weg = false; ge.terug = true; }      // en je bent terug
    if (rust) {                                                     // een fijne plek om uit te rusten: hij vindt het programma leuker
      ge.restT += dt;
      if (ge.restT > 20) { ge.restT = 0; ge.beloon(onder(f), 0.03); }
    }
    ge.verval += dt;
    if (ge.verval > 60) {                                           // wat hij leerde vervaagt langzaam
      ge.verval = 0;
      for (const k of Object.keys(ge.voorkeur)) { ge.voorkeur[k] *= 0.985; if (Math.abs(ge.voorkeur[k]) < 0.02) delete ge.voorkeur[k]; }
    }
    ge.stemming = M.t < ge.blij ? 'happy' : ge.energie < 0.25 ? 'sleepy' : ge.nieuw.length ? 'curious' : ge.verveling > 0.7 ? 'bored' : ge.gezelligheid > 0.7 && idle < 30 ? 'lonely' : 'calm';
  };

  /* ---- dingen die hij merkt ---- */
  ge.nieuwVenster = function (p) {                                  // een venster dat hij nog nooit zag
    ge.nieuw.push({ id: p.id, t: M.t, prog: p.prog });
    if (ge.nieuw.length > 6) ge.nieuw.shift();
    ge.verveling = Math.max(ge.verveling, 0.45);
  };
  ge.vensters = function (lijst) {                                  // vensters die weg zijn hoeft hij niet meer te bekijken
    if (!ge.nieuw.length) return;
    const ids = new Set(lijst.map(p => p.id));
    ge.nieuw = ge.nieuw.filter(n => ids.has(n.id) && M.t - n.t < 600);
  };
  ge.bezocht = function (p) {                                       // hij staat nu op dit venster
    ge.bezoek[p.id] = M.t;
    ge.nieuw = ge.nieuw.filter(n => n.id !== p.id);
    ge.verveling = Math.max(0, ge.verveling - 0.35);
    ge.gezien[p.prog] = Math.min(9999, (ge.gezien[p.prog] || 0) + 1); ge.vuil = true;
  };

  /* ---- leren ---- */
  ge.beloon = function (prog, d) {
    if (!prog) return;
    ge.voorkeur[prog] = Math.max(-1, Math.min(1, (ge.voorkeur[prog] || 0) + d));
    ge.vuil = true;
  };
  ge.aai = function (f) { ge.beloon(onder(f), 0.2); ge.gezelligheid = 0; ge.blij = M.t + 25; };
  ge.klik = function (f) { ge.beloon(onder(f), 0.12); ge.gezelligheid = Math.max(0, ge.gezelligheid - 0.5); ge.blij = M.t + 15; };
  ge.gegooid = function (prog) { ge.beloon(prog, -0.2); ge.blij = 0; ge.energie = Math.max(0, ge.energie - 0.05); };
  ge.vergeet = function () { ge.voorkeur = {}; ge.gezien = {}; ge.vuil = true; };

  /* ---- kiezen: elke mogelijke actie krijgt een score; hoe hoger, hoe groter de kans ---- */
  ge.kies = function (f) {
    const idle = ge.muisIdle(), actief = idle < 20, metV = M.plat.aan && M.plat.lijst.length > 0 && f.vlak === 0 && !f.vliegt;
    const op = f.gId && M.plat.op.get(f.gId), mx = M.muis.x, A = [];
    const kies = l => l[Math.floor(M.rnd() * l.length)];
    const wacht = (a, b) => 'wacht ' + (a + Math.floor(M.rnd() * (b - a + 1)));

    // 1. naar een venster springen: welk venster is het leukst?
    if (metV) {
      const kans = M.plat.alle(f, 'toevallig'), bereik = new Set(kans.map(c => c.p.id));
      for (const n of ge.nieuw) {                                   // een nieuw venster dat te ver weg is voor één sprong: eerst erheen lopen
        const p = M.plat.op.get(n.id);
        if (!p || bereik.has(p.id) || p.id === f.gId) continue;
        const x = Math.round(M.plat.dichtbij(p, f.x, 7 * f.maat));
        A.push({ naam: 'approach', score: 0.9 * (0.35 + 0.65 * ge.energie), regels: ['+emotie idee'].concat(op ? ['land'] : [], [(ge.energie > 0.5 ? 'ren ' : 'loop ') + x]), doel: 'go closer to the new ' + p.prog + ' window', reden: 'there is a new window I cannot reach from here' });
        break;
      }
      if (kans.length) {
        for (const c of kans) {
          const p = c.p, laatst = ge.bezoek[p.id] === undefined ? -1000 : ge.bezoek[p.id];
          c.nieuwheid = Math.max(0, Math.min(1, (M.t - laatst) / 150));
          c.isNieuw = ge.nieuw.some(n => n.id === p.id);
          c.gezelschap = p.vgr && actief;
          let w = 0.12 + 0.5 * c.nieuwheid + 0.45 * (ge.voorkeur[p.prog] || 0) + (c.isNieuw ? 1 : 0);
          if (c.gezelschap) w += 0.7 * ge.gezelligheid + 0.2;
          if (actief && Math.abs(mx - c.x) < 500) w += 0.15 * ge.gezelligheid;
          c.w = Math.pow(Math.max(0.01, w - c.kost / 4000), 2);
        }
        let tot = 0, r = 0;
        for (const c of kans) tot += c.w;
        r = M.rnd() * tot;
        let c = kans[kans.length - 1];
        for (const x of kans) { r -= x.w; if (r <= 0) { c = x; break; } }
        const score = (0.3 + 0.55 * ge.verveling + (c.isNieuw ? 0.9 : 0) + (c.gezelschap ? 0.5 * ge.gezelligheid : 0) + (op ? 0 : 0.55)) * (0.35 + 0.65 * ge.energie);
        const voork = ge.voorkeur[c.p.prog] || 0;
        const reden = c.isNieuw ? 'there is a new window I have not seen' : c.gezelschap ? 'you are working in that window and I want to keep you company' : voork > 0.3 ? 'I like that ' + c.p.prog + ' window' : c.nieuwheid > 0.8 ? 'I have not been up there for a while' : 'I was a bit bored';
        A.push({ naam: 'hop', score, regels: ['perch #' + c.p.id + ':' + Math.round(c.x)], doel: 'jump to ' + c.p.prog, reden, emo: c.isNieuw ? 'emotie idee' : null });
      }
    }
    // 2. uitrusten of slapen
    const moe = 1 - ge.energie;
    if (moe > 0.15 || idle > 180) {
      const slaap = ge.energie < 0.12 || idle > 420;
      A.push({
        naam: slaap ? 'sleep' : 'rest', score: moe * 1.5 + (idle > 180 ? 0.5 : 0),
        regels: slaap ? ['zit', 'wacht 1.2', 'slaap'] : (M.anim.op.yawn && M.rnd() < 0.5 ? ['anim yawn', 'zit', wacht(4, 11), 'sta'] : ['zit', wacht(4, 11), 'sta']),
        slaap, slaapTot: idle > 420 ? 0 : M.t + 30 + M.rnd() * 30, pauze: 0.3,
        doel: slaap ? 'sleep' : 'rest', reden: slaap ? (idle > 420 ? 'you have been away for a long time' : 'I am worn out') : 'I am tired',
      });
    }
    // 3. spelen: een animatie
    A.push({ naam: 'play', score: ge.verveling * ge.energie * 1.1 + (M.t < ge.blij ? 0.2 : 0), regels: ['anim random ' + kies(['play', 'trick', 'dance', 'sport', 'idle'])], doel: 'play', reden: M.t < ge.blij ? 'I am happy' : 'I was bored and have the energy', speelt: true });
    // 4. rondlopen
    A.push({ naam: 'walk', score: 0.32 * (0.5 + ge.energie), regels: [ge.energie > 0.6 && M.rnd() < 0.35 ? 'ren ergens' : 'loop ergens'], doel: 'walk around', reden: 'a little stroll' });
    if (!op && M.schermen.length > 1) A.push({ naam: 'walk-screen', score: 0.05, regels: ['loop s' + (1 + Math.floor(M.rnd() * M.schermen.length)) + ':ergens'], doel: 'go to another screen', reden: 'I wanted to see the other screen' });
    // 5. rondkijken (en naar jou, als je er bent)
    A.push({ naam: 'look', score: 0.18 + (actief ? 0.2 * ge.gezelligheid : 0), regels: actief ? ['kijk muis', 'wacht 1.2', 'kijk links', 'wacht 0.8', 'kijk rechts', 'wacht 0.8', 'kijk voor'] : ['kijk links', 'wacht 0.9', 'kijk rechts', 'wacht 0.9', 'kijk voor'], doel: 'look around', reden: actief ? 'I wonder what you are doing' : 'nothing special' });
    // 6. springen en een draai
    A.push({ naam: 'jump', score: 0.08 * (0.3 + ge.energie), regels: [kies(['spring', 'spring', 'draai'])], doel: 'jump for fun', reden: 'I felt like it' });
    // 7. een stukje naar beneden
    if (op) A.push({ naam: 'down', score: 0.03, regels: ['land'], doel: 'go down to the floor', reden: 'a change of view' });

    let tot = 0;
    for (const a of A) { a.w = Math.pow(Math.max(0.001, a.score), 2); tot += a.w; }
    let r = M.rnd() * tot, k = A[A.length - 1];
    for (const a of A) { r -= a.w; if (r <= 0) { k = a; break; } }
    if (k.emo) k.regels = ['+' + k.emo].concat(k.regels);
    if (k.speelt) ge.verveling = Math.max(0, ge.verveling - 0.35);
    return k;
  };

  /* ---- vertellen en onthouden ---- */
  ge.vertel = function () {
    const top = Object.keys(ge.voorkeur).filter(k => ge.voorkeur[k] > 0.15).sort((a, b) => ge.voorkeur[b] - ge.voorkeur[a])[0];
    let t = 'I feel ' + STEMMING_EN[ge.stemming] + '.';
    if (ge.energie < 0.3) t += ' I am tired.'; else if (ge.energie > 0.8) t += ' I have lots of energy.';
    t += top ? ' I like the ' + top + ' windows best.' : ' I am still finding out what I like.';
    return t;
  };
  ge.status = function () {
    const top = Object.keys(ge.voorkeur).sort((a, b) => Math.abs(ge.voorkeur[b]) - Math.abs(ge.voorkeur[a])).slice(0, 6).map(k => ({ prog: k, waarde: +ge.voorkeur[k].toFixed(2) }));
    return { aan: ge.aan, stemming: ge.stemming, energie: +ge.energie.toFixed(2), verveling: +ge.verveling.toFixed(2), gezelligheid: +ge.gezelligheid.toFixed(2), doel: ge.doel, reden: ge.reden, nieuw: ge.nieuw.length, weg: ge.weg, voorkeur: top };
  };
  ge.exporteer = function () {
    const rond = o => { const u = {}; for (const k of Object.keys(o).sort((a, b) => Math.abs(o[b]) - Math.abs(o[a])).slice(0, 30)) u[k] = Math.round(o[k] * 100) / 100; return u; };
    return { aan: ge.aan, voorkeur: rond(ge.voorkeur), gezien: rond(ge.gezien) };
  };
  ge.importeer = function (o) {
    if (!o || typeof o !== 'object') return;
    if (typeof o.aan === 'boolean') ge.aan = o.aan;
    for (const [naam, doel, grens] of [['voorkeur', ge.voorkeur, 1], ['gezien', ge.gezien, 9999]]) {
      for (const k of Object.keys(o[naam] || {}).slice(0, 40)) if (/^[a-z0-9._-]{1,40}$/.test(k) && typeof o[naam][k] === 'number' && isFinite(o[naam][k])) doel[k] = Math.max(-grens, Math.min(grens, o[naam][k]));
    }
  };
})();
