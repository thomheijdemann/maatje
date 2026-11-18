'use strict';
/* MAATJE - full screen: which screens belong to a video or a game right now?
   Plain arithmetic without Electron, so it can be tested on its own (test/volscherm.js).
   Screens and windows are { x, y, w, h } in the same coordinates (DIP). The first window of a list is the topmost.
   The window finder puts f = 1 on a window that fills a whole screen without a title bar (a video in full screen, a game).
   - volSchermen(schermen, ruw): per screen: is the topmost BIG window on it one in full screen?
   - past(vrij, vol): can his world be the screens that stay (vrij) without lying over a screen that is full (vol)?
   The code below is written in Dutch. */

/* Per scherm: is het bovenste GROTE venster daarop een venster op volledig scherm? Een klein venster erbovenop (een melding) telt niet mee,
   een gewoon groot venster erbovenop wel (dan kijk je daar naar, niet meer naar de video). */
/* Electron geeft een vak als { x, y, width, height }, het zoekprogramma en de rest van Maatje werken met { x, y, w, h }: beide mogen. */
function vak(r) { return { x: r.x, y: r.y, w: r.w !== undefined ? r.w : r.width, h: r.h !== undefined ? r.h : r.height, f: r.f }; }

function volSchermen(schermen, ruw) {
  ruw = ruw.map(vak);
  return schermen.map(vak).map(s => {
    for (const r of ruw) {                                           // het bovenste venster eerst
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      if (cx < s.x || cx >= s.x + s.w || cy < s.y || cy >= s.y + s.h) continue;
      if (r.w * r.h < 0.5 * s.w * s.h) continue;
      return r.f === 1;
    }
    return false;
  });
}

function raakt(a, b) { return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; }

/* Zijn de schermen die overblijven (vrij) samen een vak dat NIET over een scherm op volledig scherm (vol) heen ligt?
   Zijn wereld is altijd een vak (alle overgebleven schermen naast elkaar): ligt een vol scherm tussen twee andere, dan kan dat niet. */
function past(vrij, vol) {
  vrij = vrij.map(vak); vol = vol.map(vak);
  if (!vrij.length) return false;
  const x0 = Math.min(...vrij.map(r => r.x)), y0 = Math.min(...vrij.map(r => r.y));
  const x1 = Math.max(...vrij.map(r => r.x + r.w)), y1 = Math.max(...vrij.map(r => r.y + r.h));
  const omhul = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  return !vol.some(v => raakt(omhul, v));
}

module.exports = { volSchermen, past, raakt };
