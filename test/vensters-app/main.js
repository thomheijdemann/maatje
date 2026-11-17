'use strict';
/* MAATJE - the little app behind test/vensters.js. It makes real windows on your screen, for a few seconds,
   on orders that come in as lines of JSON over the named pipe "maatje-vensters-test" (one answer line per order):
     {"maak": {"naam":"A", "x":200, "y":300, "w":400, "h":250, "titel":"Maatje test A", "toon":true}}
     {"zet": {"naam":"A", "x":..., "y":..., "w":..., "h":...}}     move or resize
     {"boven": "A"} {"min": "A"} {"verberg": "A"} {"toon": "A"} {"sluit": "A"}
     {"overlay": {"x":..., "y":..., "w":..., "h":...}}            Maatje's own see-through window, made with the same settings as in the app
   The windows have no frame, so what we ask for is exactly what Windows reports.
   The code below is written in Dutch. */
const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const net = require('net');
const overlayOpties = require('../../app/overlay.js');

app.setPath('userData', path.join(app.getPath('temp'), 'maatje-vensters-test'));
const alle = {};
let sock = null;
const uit = o => { if (sock) sock.write(JSON.stringify(o) + '\n'); };
const PIJP = '\\\\.\\pipe\\maatje-vensters-test';       // process.stdin does not work in the main process of Electron on Windows: the orders come in over a named pipe
const fysiek = b => { try { return screen.dipToScreenRect(null, b); } catch (e) { return b; } };
const bericht = naam => ({ ok: true, naam, bounds: alle[naam].getBounds(), fysiek: fysiek(alle[naam].getBounds()) });
const pagina = kleur => 'data:text/html,<body style="margin:0;background:' + encodeURIComponent(kleur) + '"></body>';

async function doe(c) {
  if (c.maak) {
    const m = c.maak;
    const w = new BrowserWindow({ x: m.x, y: m.y, width: m.w, height: m.h, show: false, frame: false, thickFrame: false, resizable: false, title: m.titel || 'Maatje test ' + m.naam, backgroundColor: m.kleur || '#3a5a8a' });
    w.setMenu(null);
    await w.loadURL(pagina(m.kleur || '#3a5a8a'));
    alle[m.naam] = w;
    if (m.toon !== false) w.showInactive();                     // zonder de focus van jou af te pakken
    return uit(bericht(m.naam));
  }
  if (c.zet) { const m = c.zet, w = alle[m.naam]; w.setBounds({ x: m.x, y: m.y, width: m.w, height: m.h }); return uit(bericht(m.naam)); }
  if (c.boven) { alle[c.boven].moveTop(); return uit(bericht(c.boven)); }
  if (c.min) { alle[c.min].minimize(); return uit(bericht(c.min)); }
  if (c.verberg) { alle[c.verberg].hide(); return uit(bericht(c.verberg)); }
  if (c.toon) { alle[c.toon].showInactive(); return uit(bericht(c.toon)); }
  if (c.sluit) { alle[c.sluit].destroy(); delete alle[c.sluit]; return uit({ ok: true, naam: c.sluit }); }
  if (c.overlay) {
    const o = c.overlay, w = new BrowserWindow(overlayOpties({ x: o.x, y: o.y, w: o.w, h: o.h }, undefined, false));
    w.setMenu(null);
    await w.loadURL(pagina('transparent'));
    w.setIgnoreMouseEvents(true, { forward: true });
    w.showInactive();
    w.setAlwaysOnTop(true, 'screen-saver');
    alle.overlay = w;
    return uit(bericht('overlay'));
  }
  uit({ fout: 'unknown order' });
}

app.whenReady().then(() => {
  const d = screen.getPrimaryDisplay();
  const server = net.createServer(s => {
    sock = s;
    let buf = '';
    s.setEncoding('utf8');
    s.on('data', async dd => {
      buf += dd;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const regel = buf.slice(0, i); buf = buf.slice(i + 1);
        let c;
        try { c = JSON.parse(regel); } catch (e) { continue; }
        try { await doe(c); } catch (e) { uit({ fout: String(e && e.message ? e.message : e), order: c }); }
      }
    });
    s.on('close', () => app.quit());
    s.on('error', () => {});
    uit({ klaar: true, schaal: d.scaleFactor, werk: d.workArea });
  });
  server.listen(PIJP);
});
