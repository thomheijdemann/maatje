'use strict';
/* MAATJE - the hatch between the app window (the panel) and the main program. */
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('maatjePaneel', {
  vraag: b => ipcRenderer.invoke('paneel-vraag', b),               // doe, status, anims, hulp
  stand: () => ipcRenderer.invoke('paneel-stand'),
  zicht: aan => ipcRenderer.invoke('paneel-zicht', !!aan),
  stop: () => ipcRenderer.invoke('paneel-stop'),
  show: () => ipcRenderer.invoke('paneel-show'),
  koppel: aan => ipcRenderer.invoke('paneel-koppel', !!aan),
  eigenLijst: () => ipcRenderer.invoke('eigen-lijst'),
  eigenLees: naam => ipcRenderer.invoke('eigen-lees', naam),
  eigenErbij: (naam, bytes) => ipcRenderer.invoke('eigen-erbij', naam, bytes),
  eigenWeg: naam => ipcRenderer.invoke('eigen-weg', naam),
  opEigen: f => ipcRenderer.on('eigen-nieuw', () => f()),
  opStand: f => ipcRenderer.on('stand', () => f()),
});
