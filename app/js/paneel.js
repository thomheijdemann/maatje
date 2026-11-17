'use strict';
/* MAATJE - the app window (the panel): every animation with a little picture, a stage on the left where
   he shows the one you picked, your own animations (drop a GIF, a picture or a text file, or type the
   moves yourself) and the settings. The stage runs the very same code as the guy on the desktop; what
   you click here is sent to him through the main program (window.maatjePaneel, see preload-paneel.js).
   The code below is written in Dutch. */
(function () {
  const api = window.maatjePaneel;
  const $ = id => document.getElementById(id);
  function el(tag, klas, tekst) { const e = document.createElement(tag); if (klas) e.className = klas; if (tekst !== undefined) e.textContent = tekst; return e; }
  function toon(doel, tekst, fout) { doel.textContent = tekst || ''; doel.classList.toggle('fout', !!fout); }
  const fouttekst = u => (u && u.fouten ? u.fouten.map(x => x.tekst).join('\n') : (u && u.fout) || 'That did not work.');
  const sec = d => (d < 10 ? d.toFixed(1) : String(Math.round(d))) + ' s';
  const duurVan = a => (a.soort === 'beeld' ? a.totaal : a.duur);
  const beeldTekst = a => (a.frames.length > 1 ? (a.ext || 'gif').toUpperCase() + ', ' + a.frames.length + ' frames' : 'picture');

  /* ---- het podium: een klein wereldje met één poppetje ---- */
  const SW = 440, SH = 230, VLOER = 214;
  M.inst.vrij = false; M.inst.meeleven = false; M.inst.geluid = false;      // op het podium is het stil; het geluid hoor je op het bureaublad
  M.zetWereld({ w: SW, h: SH, dpr: window.devicePixelRatio || 1, schermen: [{ x: 0, y: 0, w: SW, h: VLOER }] });
  const f = new Figuur({ x: SW / 2, kleur: M.inst.kleur, maat: 6, hoed: 'geen', hoofd: true });
  M.figuren.push(f); M.hoofd = f;
  const tf = new Figuur({ x: SW / 2, kleur: M.inst.kleur, maat: 4, hoed: 'geen' });      // voor de plaatjes op de kaartjes
  const lf = new Figuur({ x: SW / 2, kleur: M.inst.kleur, maat: 4, hoed: 'geen' });      // het logo bovenin
  let stand = { inst: {}, koppel: {}, zichtbaar: true };
  let keuze = null, proef = null, rustT = 0;         // wat er op het podium speelt: een animatie uit de lijst, of een probeersel uit het typvak

  function opnieuw() {
    f.stopAlles(); f.houding = null; f.lucht = false; f.vx = 0; f.vy = 0; f.rol = 0; f.emote = null;
    f.x = SW / 2; f.y = M.vloer(f.x); f.kijk = 1; rustT = 0;
    if (proef) { f.nu = speelAnim(f, proef, 1); f.nuNaam = 'animatie'; }
    else if (keuze && M.anim.op[keuze]) M.doe(['anim ' + keuze]);
  }
  function tik(dt) {
    M.stap(dt); M.teken();
    if ((keuze || proef) && !f.nu && !f.rij.length) { rustT += dt; if (rustT > 0.8) opnieuw(); }      // steeds opnieuw, met een adempauze
  }
  let vorige = performance.now();
  function lus(nu) {
    requestAnimationFrame(lus);
    const dt = Math.min(0.1, (nu - vorige) / 1000);
    vorige = nu;
    if (dt > 0) { try { tik(dt); } catch (e) { M.meldFout('podium', e); } }
  }
  function tekenLogo() {
    const c = $('logo').getContext('2d');
    c.clearRect(0, 0, 56, 40);
    lf.kleur = lf.kleurNu = f.kleur;
    lf.tekenOp(c, 28, 40);
  }

  /* ---- de plaatjes op de kaartjes: de animatie in het klein afspelen en het mooiste moment tekenen ---- */
  const TW = 112, TH = 80;
  function duim(a, doek, breed, hoog) {
    const c = doek.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, doek.width, doek.height);
    c.scale(doek.width / breed, doek.height / hoog);
    if (a.soort === 'beeld') {
      const k = Math.min((breed - 8) / a.w, (hoog - 8) / a.h), w = a.w * k, h = a.h * k;
      c.imageSmoothingEnabled = k < 1;
      c.drawImage(a.frames[0], Math.round((breed - w) / 2), Math.round((hoog - h) / 2), Math.round(w), Math.round(h));
      return;
    }
    const n0 = M.delen.length, n1 = M.fx.length, dt = 1 / 20;
    tf.x = SW / 2; tf.y = M.vloer(tf.x); tf.kijk = 1; tf.emote = null; tf.kleur = tf.kleurNu = f.kleur;
    const act = speelAnim(tf, a.prog, 1);
    let beste = -1e9;
    for (let i = 0; i < 260; i++) {
      tf.knipT = 9; tf.rust(dt);
      if (act.stap(dt)) break;
      tf.kijkRichting();
      const p = tf.pose;
      let punten = Math.min(p.dy, 6) * 0.8 + Math.abs(p.armL) + Math.abs(p.armR) + Math.abs(p.schuin) * 5 + Math.abs(Math.sin(tf.animRol)) * 2 + Math.abs(p.lijf) +
        (tf.prop || tf.ding ? 4 : 0) + (tf.ring ? 3 : 0) + (tf.ogenNu ? 1.5 : 0) + (tf.animHoed ? 2 : 0) + (tf.animKleur ? 1 : 0) + Math.abs(p.dx) / tf.maat * 0.5;
      if (Math.abs(tf.rekX) < 0.7) punten -= 5;                 // midden in een draai is hij een streepje
      if (tf.animAlfa < 0.5) punten -= 3;
      if (i * dt < a.duur * 0.08) punten -= 2;
      if (punten > beste) { beste = punten; c.clearRect(0, 0, breed, hoog); tf.tekenOp(c, Math.round(breed / 2 + p.dx), hoog - 8); }
    }
    M.delen.length = n0; M.fx.length = n1;            // de sterretjes en hartjes van het oefenen niet op het podium laten vallen
  }
  let wachtrij = [], pompt = false;
  function pomp() {
    const t0 = performance.now();
    while (wachtrij.length && performance.now() - t0 < 14) {
      const [a, doek] = wachtrij.shift();
      try { duim(a, doek, TW, TH); } catch (e) { M.meldFout('picture of ' + a.naam, e); }
    }
    if (wachtrij.length) setTimeout(pomp, 0); else pompt = false;
  }
  function startPomp() { if (!pompt && wachtrij.length) { pompt = true; setTimeout(pomp, 0); } }

  /* ---- de lijst met alle animaties ---- */
  const kaartVan = new Map();                         // animatie -> zijn kaartje
  let soort = 'all', zoekT = '';
  const metaVan = a => (a.eigen ? 'mine' : a.cat) + ' · ' + sec(duurVan(a));
  function maakKaart(a) {
    const k = el('button', 'kaart');
    k.type = 'button'; k.dataset.naam = a.naam;
    const doek = document.createElement('canvas');
    doek.width = TW; doek.height = TH;
    k.append(doek, el('div', 'n', a.naam), el('div', 'm', metaVan(a)));
    k.addEventListener('click', () => kies(a.naam));
    k.addEventListener('dblclick', () => speelOpBureau());
    wachtrij.push([a, doek]);
    return k;
  }
  function bouwChips() {
    const tel = { all: 0 };
    for (const a of kaartVan.keys()) { tel.all++; tel[a.cat] = (tel[a.cat] || 0) + 1; }
    const namen = ['all'].concat(M.anim.cats.filter(c => c === 'mine'), M.anim.cats.filter(c => c !== 'mine'));
    if (!namen.includes(soort)) soort = 'all';
    const doel = $('chips');
    doel.textContent = '';
    for (const n of namen) {
      const b = el('button', 'chip' + (n === soort ? ' aan' : ''), n);
      b.type = 'button'; b.dataset.soort = n;
      b.append(el('span', '', String(tel[n] || 0)));
      b.addEventListener('click', () => { soort = n; bouwChips(); filter(); $('rooster').scrollTop = 0; });
      doel.append(b);
    }
  }
  function filter() {
    let n = 0;
    for (const [a, k] of kaartVan) {
      const past = (soort === 'all' || a.cat === soort) && (!zoekT || a.naam.includes(zoekT) || a.cat.includes(zoekT) || (!!a.tekst && (a.tekst.includes('prop:' + zoekT) || a.tekst.includes('!' + zoekT))));
      k.hidden = !past;
      if (past) n++;
    }
    $('n-zicht').textContent = n === kaartVan.size ? '' : n + ' of ' + kaartVan.size;
    $('leeg').style.display = n ? 'none' : 'block';
    return n;
  }
  function bouwRooster() {
    const lijst = M.anim.lijst, volgorde = lijst.filter(a => a.eigen).concat(lijst.filter(a => !a.eigen));      // je eigen animaties vooraan
    for (const [a, k] of kaartVan) if (!lijst.includes(a)) { k.remove(); kaartVan.delete(a); }
    const rooster = $('rooster');
    for (const a of volgorde) {
      let k = kaartVan.get(a);
      if (!k) { k = maakKaart(a); kaartVan.set(a, k); }
      rooster.appendChild(k);
    }
    $('n-anims').textContent = String(lijst.length);
    $('n-eigen').textContent = String(lijst.filter(a => a.eigen).length || '');
    if (keuze && !M.anim.op[keuze]) { keuze = null; leegKeuze(); }
    bouwChips(); filter(); startPomp();
  }
  function leegKeuze() {
    $('k-naam').textContent = 'Pick an animation';
    $('k-meta').textContent = 'Click one on the right to see it here.';
    $('k-tekst').textContent = ''; $('k-opdracht').textContent = ''; $('k-speel').disabled = true;
  }
  function kies(naam) {
    const a = M.anim.op[naam];
    if (!a) return false;
    keuze = naam; proef = null;
    for (const [b, k] of kaartVan) k.classList.toggle('aan', b === a);
    for (const r of document.querySelectorAll('.eigen')) r.classList.toggle('aan', r.dataset.naam === naam);
    $('k-naam').textContent = naam;
    $('k-meta').textContent = (a.eigen ? 'your own' : a.cat) + ' · ' + (a.soort === 'beeld' ? beeldTekst(a) + ' · ' : '') + sec(duurVan(a));
    $('k-tekst').textContent = a.soort === 'beeld' ? '' : a.tekst.trim();
    $('k-opdracht').textContent = 'As a command: anim ' + naam;
    $('k-speel').disabled = false;
    toon($('k-uit'), '');
    opnieuw();
    return true;
  }
  async function doe(regels, uit) {                   // een opdracht voor het poppetje op het bureaublad
    if (!stand.zichtbaar) await api.zicht(true);
    const u = await api.vraag({ wat: 'doe', regels });
    if (uit) toon(uit, u.ok ? 'OK' : fouttekst(u), !u.ok);
    return u;
  }
  async function speelOpBureau() {
    if (!keuze) return;
    const n = +$('k-keer').value || 1;
    const u = await doe(['anim ' + keuze + (n > 1 ? ' ' + n : '')]);
    toon($('k-uit'), u.ok ? 'He is doing it on your desktop.' : fouttekst(u), !u.ok);
  }

  /* ---- je eigen animaties ---- */
  const eigenApi = { lijst: () => api.eigenLijst(), lees: n => api.eigenLees(n) };
  let laadt = Promise.resolve();
  function herlaad() {                                // na elkaar, nooit twee keer tegelijk
    laadt = laadt.then(async () => {
      try { await M.laadEigen(eigenApi); } catch (e) { M.meldFout('own animations', e); }
      bouwRooster();
      await bouwEigen();
    });
    return laadt;
  }
  async function bouwEigen() {
    const bestanden = await api.eigenLijst(), doel = $('e-lijst');
    doel.textContent = '';
    if (!bestanden.length) { doel.append(el('div', 'tip', 'Nothing of your own yet.')); return; }
    for (const x of bestanden) {
      const a = M.anim.lijst.find(b => b.eigen && b.bestand === x.naam);
      const r = el('div', 'eigen' + (a && a.naam === keuze ? ' aan' : '')), wie = el('div', 'wie');
      const doek = document.createElement('canvas');
      doek.width = TW; doek.height = TH;
      r.append(doek, wie);
      if (a) {
        r.dataset.naam = a.naam;
        try { duim(a, doek, TW, TH); } catch (e) { M.meldFout('picture of ' + a.naam, e); }
        wie.append(el('b', '', a.naam), el('span', '', (a.soort === 'beeld' ? beeldTekst(a) : 'moves') + ' · ' + sec(duurVan(a))));
        const kijk = el('button', 'knop klein', 'Show');
        kijk.addEventListener('click', () => kies(a.naam));
        const speel = el('button', 'knop klein', 'Play');
        speel.addEventListener('click', () => { kies(a.naam); speelOpBureau(); });
        r.append(kijk, speel);
        if (a.soort === 'beeld') {
          const is = stand.inst.skin === a.naam, look = el('button', 'knop klein' + (is ? ' aan' : ''), is ? 'Back to himself' : 'Look like this');
          look.title = 'He looks like this picture all the time, also when he walks';
          look.addEventListener('click', () => doe(['skin ' + (is ? 'off' : a.naam)], $('e-uit')));
          r.append(look);
        }
      } else {
        const fout = M.anim.eigenFouten.find(t => t.startsWith(x.naam + '.' + x.ext + ': '));
        wie.append(el('b', '', x.naam + '.' + x.ext), el('span', 'fout', fout ? fout.slice(x.naam.length + x.ext.length + 3) : 'I could not read this file'));
      }
      const weg = el('button', 'knop klein gevaar', 'Delete');
      weg.addEventListener('click', async () => { const u = await api.eigenWeg(x.naam); toon($('e-uit'), u.ok ? 'Deleted: ' + x.naam : fouttekst(u), !u.ok); });
      r.append(weg);
      doel.append(r);
    }
  }
  async function voegToe(bestanden) {
    const goed = [], fout = [];
    for (const b of bestanden) {
      try {
        const u = await api.eigenErbij(b.name, new Uint8Array(await b.arrayBuffer()));
        if (u.ok) goed.push(u.naam); else fout.push(b.name + ': ' + u.fout);
      } catch (e) { fout.push(b.name + ': ' + e.message); }
    }
    await herlaad();
    for (const t of M.anim.eigenFouten) fout.push(t);
    toon($('e-uit'), (goed.length ? 'Added: ' + goed.join(', ') + (fout.length ? '\n' : '') : '') + fout.join('\n'), fout.length > 0);
    const eerste = goed.map(n => M.anim.lijst.find(a => a.eigen && a.bestand === n)).find(Boolean);
    if (eerste) kies(eerste.naam);
    return { goed, fout };
  }

  /* zelf een animatie typen */
  function leesTypvak() {
    const tekst = $('m-tekst').value.split(/\r?\n/).map(r => r.trim()).filter(r => r && r[0] !== '#').join(' ');
    if (!tekst) { toon($('m-uit'), ''); return null; }
    try {
      const prog = ontleedAnim(tekst);
      toon($('m-uit'), 'That works: ' + sec(prog.duur));
      return { tekst, prog };
    } catch (e) { toon($('m-uit'), e.message, true); return null; }
  }
  function probeer() {
    const p = leesTypvak();
    if (!p) return false;
    proef = p.prog; keuze = null;
    for (const k of kaartVan.values()) k.classList.remove('aan');
    $('k-naam').textContent = $('m-naam').value.trim() || 'your own moves';
    $('k-meta').textContent = 'trying it out · ' + sec(p.prog.duur);
    $('k-tekst').textContent = p.tekst; $('k-opdracht').textContent = ''; $('k-speel').disabled = true;
    toon($('k-uit'), '');
    opnieuw();
    return true;
  }
  async function bewaarTypvak() {
    const p = leesTypvak();
    if (!p) { if (!$('m-tekst').value.trim()) toon($('m-uit'), 'Type some moves first, for example: hop*2 spin wave', true); return false; }
    const naam = $('m-naam').value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!naam) { toon($('m-uit'), 'Give it a name first.', true); $('m-naam').focus(); return false; }
    const u = await api.eigenErbij(naam + '.txt', new TextEncoder().encode(p.tekst + '\n'));
    if (!u.ok) { toon($('m-uit'), fouttekst(u), true); return false; }
    await herlaad();
    const a = M.anim.lijst.find(b => b.eigen && b.bestand === u.naam);
    toon($('m-uit'), 'Saved as "' + (a ? a.naam : u.naam) + '". Play it with: anim ' + (a ? a.naam : u.naam));
    if (a) kies(a.naam);
    return true;
  }
  function bouwWoorden() {
    const doel = $('woorden'), vb = { al: 'al:-3', ar: 'ar:-3', eyes: null, look: 'look:u', face: 'face:flip', prop: null, hat: null, color: null, ghost: 'ghost:0.4', scale: 'scale:1.5', legs: 'legs:tuck' };
    const groep = (titel, woorden) => {
      doel.append(el('h3', '', titel));
      for (const w of woorden) {
        const b = el('span', 'w', w);
        b.addEventListener('click', () => { const t = $('m-tekst'); t.value = (t.value.trim() ? t.value.replace(/\s+$/, '') + ' ' : '') + w; t.focus(); leesTypvak(); });
        doel.append(b);
      }
    };
    groep('Moves', Object.keys(BEW).map(n => (SNELHEID[n] ? n + ':150' : n)));
    groep('Things that stay until you change them', Object.keys(STAAT).filter(n => vb[n] !== null).map(n => vb[n] || n));
    groep('Little effects', Object.keys(EFFECT).filter(n => n !== 'snd').map(n => '!' + (n === 'text' ? 'text:WOW' : n)));
    groep('Things in his hand', Object.keys(PROPS).concat('sword', 'laptop').map(n => 'prop:' + n).concat('noprop'));
    groep('Eyes', Object.keys(EN.ogen).map(n => 'eyes:' + n).concat('eyes:none'));
    groep('Hats', Object.keys(HOEDEN).filter(n => n !== 'geen').map(n => 'hat:' + enWoord('hoed', n)).concat('nohat'));
    groep('Colors', Object.keys(EN.kleur).filter(n => n !== 'grey').map(n => 'color:' + n).concat('nocolor'));
    groep('Sounds', Object.keys(GELUID).map(n => '!snd:' + n));
  }

  /* ---- instellingen ---- */
  function bouwInst() {
    const kl = $('kleuren');
    for (const naam of Object.keys(KLEUREN)) {
      const b = el('button', 'kleur');
      b.type = 'button'; b.title = enWoord('kleur', naam); b.dataset.kleur = KLEUREN[naam]; b.style.background = KLEUREN[naam];
      b.addEventListener('click', () => doe(['kleur ' + KLEUREN[naam]]));
      kl.append(b);
    }
    const rb = el('button', 'knop klein', 'Rainbow');
    rb.addEventListener('click', () => doe(['kleur regenboog']));
    kl.append(rb);
    const hoed = $('hoed');
    for (const n of Object.keys(HOEDEN)) { const o = el('option', '', enWoord('hoed', n)); o.value = n; hoed.append(o); }
    hoed.addEventListener('change', () => doe(['hoed ' + hoed.value]));
    for (const b of document.querySelectorAll('.maat')) b.addEventListener('click', () => doe(['maat ' + b.dataset.maat]));
    for (const [id, woord] of [['t-vrij', 'vrij'], ['t-vensters', 'vensters'], ['t-geluid', 'geluid'], ['t-meeleven', 'meeleven']]) $(id).addEventListener('change', e => doe([woord + ' ' + (e.target.checked ? 'aan' : 'uit')]));
    $('k-koppel').addEventListener('click', async () => {
      const u = await api.koppel(!stand.koppel.gekoppeld);
      toon($('c-uit'), u.ok ? u.tekst : fouttekst(u), !u.ok);
      await ververs();
    });
    $('k-skinuit').addEventListener('click', () => doe(['skin off']));
    const naamDoen = async () => { const n = $('n-naam').value.trim(); if (!n) { toon($('n-uit'), 'Type a name first.', true); return; } const u = await doe(['name ' + n], $('n-uit')); if (u.ok) toon($('n-uit'), ''); };
    $('n-bewaar').addEventListener('click', naamDoen);
    $('n-naam').addEventListener('keydown', e => { if (e.key === 'Enter') naamDoen(); });
    const uniek = async regel => { const u = await doe([regel], $('u-uit')); if (u.ok) toon($('u-uit'), ''); };
    $('u-doe').addEventListener('click', () => { const n = $('u-naam').value.trim(); if (!n) { toon($('u-uit'), 'Type your name first, or roll the dice.', true); $('u-naam').focus(); return; } uniek('unique ' + n); });
    $('u-naam').addEventListener('keydown', e => { if (e.key === 'Enter') $('u-doe').click(); });
    $('u-gok').addEventListener('click', () => uniek('unique'));
    $('u-top').addEventListener('change', e => uniek('unique top ' + e.target.value));
    $('u-vlek').addEventListener('change', e => uniek('unique pattern ' + e.target.value));
    $('u-wangen').addEventListener('change', e => uniek('unique cheeks ' + (e.target.checked ? 'on' : 'off')));
    $('u-klassiek').addEventListener('click', () => uniek('unique classic'));
    const stuur = async () => { const t = $('o-tekst').value.split(';').map(r => r.trim()).filter(Boolean); if (t.length) await doe(t, $('o-uit')); };
    $('o-doe').addEventListener('click', stuur);
    $('o-tekst').addEventListener('keydown', e => { if (e.key === 'Enter') stuur(); });
    $('k-show').addEventListener('click', async () => { if (!stand.zichtbaar) await api.zicht(true); const u = await api.show(); toon($('o-uit'), u.ok ? 'The show has started. Look at your desktop!' : fouttekst(u), !u.ok); });
    $('k-ruim').addEventListener('click', () => doe(['stop', 'opruimen'], $('o-uit')));
    $('k-hulp').addEventListener('click', () => {
      const doel = $('hulp');
      if (doel.childElementCount) { doel.textContent = ''; return; }
      const groepen = {};
      for (const o of M.hulp()) (groepen[o.soort] = groepen[o.soort] || []).push(o);
      for (const g of Object.keys(groepen)) {
        doel.append(el('h3', '', g));
        for (const o of groepen[g]) {
          const r = el('div', 'o'), uitleg = el('span', '', o.hulp + ' ');
          uitleg.append(el('code', '', o.vb));
          r.append(el('b', '', o.naam), uitleg);
          r.addEventListener('click', () => { $('o-tekst').value = o.vb; $('o-tekst').focus(); });
          doel.append(r);
        }
      }
    });
    $('k-zicht').addEventListener('click', () => api.zicht(!stand.zichtbaar));
    $('k-stop').addEventListener('click', () => api.stop());
  }
  async function ververs() {
    let s;
    try { s = await api.stand(); } catch (e) { return; }
    if (!s || !s.ok) return;
    const kleurAnders = s.inst.kleur !== f.kleur || JSON.stringify(s.inst.stijl || STIJL_EFFEN) !== JSON.stringify(f.stijl), skinAnders = s.inst.skin !== stand.inst.skin;      // een andere kleur of een ander uiterlijk: de plaatjes opnieuw
    stand = s;
    $('versie').textContent = 'v' + s.versie;
    const naam = s.inst.naam || 'Maatje';
    $('naam').textContent = naam.toUpperCase(); document.title = naam; $('k-stop').textContent = 'Quit ' + naam;
    if (document.activeElement !== $('n-naam')) $('n-naam').value = naam;
    $('waar').textContent = s.zichtbaar ? 'on your desktop' : 'hidden';
    $('waar').classList.toggle('uit', !s.zichtbaar);
    $('k-zicht').textContent = s.zichtbaar ? 'Hide' : 'Show';
    $('t-vrij').checked = !!s.inst.vrij; $('t-geluid').checked = !!s.inst.geluid; $('t-meeleven').checked = !!s.inst.meeleven; $('t-vensters').checked = s.inst.vensters !== false;
    const vs = s.vensters || {};
    $('v-stand').textContent = s.inst.vensters === false ? '' : vs.loopt ? 'He sees ' + vs.vensters + (vs.vensters === 1 ? ' window' : ' windows') + ' right now.' : vs.fout ? 'The window finder does not work: ' + vs.fout : 'Starting the window finder...';
    const st = s.inst.stijl || STIJL_EFFEN, EN_TOP = { geen: 'none', antenne: 'antennae', oren: 'ears', hoorns: 'horns', kuif: 'tuft' }, EN_VLEK = { geen: 'none', buik: 'belly', strepen: 'stripes', stippen: 'spots' };
    $('u-top').value = EN_TOP[st.top] || 'none'; $('u-vlek').value = EN_VLEK[st.vlek] || 'none'; $('u-wangen').checked = !!st.wangen;
    f.stijl = tf.stijl = lf.stijl = Object.assign({}, st);
    $('c-stand').textContent = s.koppel.gekoppeld ? 'connected to Claude Code' : 'not connected to Claude Code';
    $('c-stand').classList.toggle('uit', !s.koppel.gekoppeld);
    $('k-koppel').textContent = s.koppel.gekoppeld ? 'Disconnect' : 'Connect';
    $('hoed').value = HOEDEN[s.inst.hoed] ? s.inst.hoed : 'geen';
    for (const b of document.querySelectorAll('.kleur')) b.classList.toggle('aan', b.dataset.kleur === s.inst.kleur);
    $('skinregel').hidden = !s.inst.skin; $('skinnaam').textContent = s.inst.skin || '';
    $('map').textContent = 'Your own animations are kept in: ' + s.map;
    f.kleur = f.kleurNu = s.inst.kleur; f.hoed = HOEDEN[s.inst.hoed] ? s.inst.hoed : 'geen';
    tekenLogo();
    if (kleurAnders) {                                // de plaatjes op de kaartjes in zijn nieuwe kleur
      wachtrij = [];
      for (const [a, k] of kaartVan) wachtrij.push([a, k.querySelector('canvas')]);
      startPomp();
    }
    if (kleurAnders || skinAnders) await bouwEigen();
  }

  /* ---- alles aan elkaar knopen ---- */
  for (const t of document.querySelectorAll('.tab')) t.addEventListener('click', () => tab(t.dataset.tab));
  function tab(naam) {
    for (const t of document.querySelectorAll('.tab')) t.classList.toggle('aan', t.dataset.tab === naam);
    for (const b of document.querySelectorAll('.blad')) b.classList.toggle('aan', b.id === 'blad-' + naam);
  }
  $('zoek').addEventListener('input', e => { zoekT = e.target.value.trim().toLowerCase(); filter(); $('rooster').scrollTop = 0; });
  $('zoek').addEventListener('keydown', e => { if (e.key === 'Enter') { const k = [...kaartVan.values()].find(x => !x.hidden); if (k) kies(k.dataset.naam); } });
  $('k-speel').addEventListener('click', speelOpBureau);
  $('k-gok').addEventListener('click', () => {
    const zicht = [...kaartVan.values()].filter(k => !k.hidden && k.dataset.naam !== keuze);
    if (!zicht.length) return;
    const k = zicht[Math.floor(Math.random() * zicht.length)];
    tab('anims'); kies(k.dataset.naam); k.scrollIntoView({ block: 'nearest' });
  });
  $('k-kies').addEventListener('click', () => $('bestand').click());
  $('bestand').addEventListener('change', async e => { const b = [...e.target.files]; e.target.value = ''; if (b.length) await voegToe(b); });
  window.addEventListener('dragover', e => { e.preventDefault(); $('drop').classList.add('over'); });
  window.addEventListener('dragleave', e => { if (!e.relatedTarget) $('drop').classList.remove('over'); });
  window.addEventListener('drop', async e => {         // je mag het bestand overal in het venster loslaten
    e.preventDefault(); $('drop').classList.remove('over');
    const b = [...(e.dataTransfer ? e.dataTransfer.files : [])];
    if (b.length) { tab('eigen'); await voegToe(b); }
  });
  $('m-tekst').addEventListener('input', leesTypvak);
  $('m-probeer').addEventListener('click', probeer);
  $('m-bewaar').addEventListener('click', bewaarTypvak);

  let begin = Promise.resolve();
  bouwWoorden(); bouwInst(); bouwRooster(); tekenLogo(); M.teken();
  requestAnimationFrame(lus);
  if (api) {
    api.opEigen(() => { herlaad(); });
    api.opStand(() => { ververs(); });
    setInterval(() => { if ($('blad-inst').classList.contains('aan')) ververs(); }, 2500);      // in de instellingen: bijhouden hoeveel vensters hij ziet
    begin = ververs().then(herlaad);
  }
  /* voor de proef (test/proef.js): het venster bedienen zonder muis */
  window.P = {
    kies, tab, probeer, bewaarTypvak, voegToe, herlaad, ververs, speelOpBureau,
    zoek(t) { $('zoek').value = t; zoekT = String(t).trim().toLowerCase(); return filter(); },
    soort(n) { soort = n; bouwChips(); return filter(); },
    stap(s) { for (let i = 0, n = Math.round(s * 30); i < n; i++) tik(1 / 30); return true; },
    wacht: () => begin.then(() => laadt),
    staat() {
      return {
        animaties: M.anim.lijst.length, eigen: M.anim.lijst.filter(a => a.eigen).map(a => ({ naam: a.naam, soort: a.soort, beelden: a.frames ? a.frames.length : 0 })),
        kaarten: kaartVan.size, zichtbaar: [...kaartVan.values()].filter(k => !k.hidden).length, plaatjesTeGaan: wachtrij.length,
        keuze, proef: !!proef, podium: { doet: f.nu ? f.nuNaam : null, x: Math.round(f.x), dy: +f.pose.dy.toFixed(2), beeld: f.beeld ? f.beeld.naam : null, prop: f.prop ? f.prop.naam : null },
        naam: $('k-naam').textContent, meta: $('k-meta').textContent, uit: $('k-uit').textContent, eigenUit: $('e-uit').textContent, typUit: $('m-uit').textContent, opdrachtUit: $('o-uit').textContent,
        chips: [...document.querySelectorAll('.chip')].map(c => c.dataset.soort), fouten: M.fouten.slice(), eigenFouten: M.anim.eigenFouten.slice(),
        rijen: [...document.querySelectorAll('.eigen')].map(r => r.querySelector('.wie').textContent), gekoppeld: !!stand.koppel.gekoppeld, skin: stand.inst.skin || '',
      };
    },
    /* is er op dit kaartje echt iets getekend? */
    plaatje(naam) {
      const a = M.anim.op[naam], k = a && kaartVan.get(a);
      if (!k) return -1;
      const d = k.querySelector('canvas').getContext('2d').getImageData(0, 0, TW, TH).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i]) n++;
      return n;
    },
  };
})();
