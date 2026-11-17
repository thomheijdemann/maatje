'use strict';
/* MAATJE - the hatch between the desktop window (the little guy) and the main program. */
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('maatjeApp', {
  opBegin: f => ipcRenderer.on('begin', (e, d) => f(d)),
  opWereld: f => ipcRenderer.on('wereld', (e, w) => f(w)),
  opVraag: f => ipcRenderer.on('vraag', (e, nr, b) => f(nr, b)),
  opEigen: f => ipcRenderer.on('eigen-nieuw', () => f()),
  opVensters: f => ipcRenderer.on('vensters', (e, l) => f(l)),
  antwoord: (nr, u) => ipcRenderer.send('antwoord', nr, u),
  muis: pakken => ipcRenderer.send('muis', !!pakken),
  zicht: aan => ipcRenderer.send('zicht', !!aan),
  bewaar: inst => ipcRenderer.send('bewaar', inst),
  klaar: () => ipcRenderer.send('klaar'),
  eigenLijst: () => ipcRenderer.invoke('eigen-lijst'),
  eigenLees: naam => ipcRenderer.invoke('eigen-lees', naam),
});
