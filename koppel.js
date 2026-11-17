'use strict';
/* MAATJE - connecting to Claude Code ("follow along").
   Claude Code can start a little script at every event ("hooks", in ~/.claude/settings.json). This file
   adds our hook there, or takes it out again. Whatever was already in the settings stays, and a backup is
   made first. Used by maatje.js (node maatje.js connect) and by the app window (the Connect button).
   The code below is written in Dutch. */
const fs = require('fs');
const os = require('os');
const path = require('path');

const HAAK_BIJ = { UserPromptSubmit: '', PreToolUse: '', PostToolUse: 'AskUserQuestion|ExitPlanMode', PermissionRequest: '', Notification: '', SubagentStop: '', Stop: '', SessionEnd: '' };
const instPad = () => process.env.MAATJE_SETTINGS || path.join(os.homedir(), '.claude', 'settings.json');
const glad = p => path.resolve(String(p)).replace(/\\/g, '/').toLowerCase();

/* is deze regel van ons? (hook.js of de oude naam haak.js in onze map, of de app zelf met --hook) */
function herken(map) {
  const eigen = [glad(path.join(map, 'hook.js')), glad(path.join(map, 'haak.js'))];
  return h => !!h && h.type === 'command' && (
    (Array.isArray(h.args) && (h.args.some(a => eigen.includes(glad(a))) || (h.args.includes('--hook') && /maatje\.exe$/i.test(String(h.command))))) ||
    (typeof h.command === 'string' && eigen.some(e => h.command.replace(/\\/g, '/').toLowerCase().includes(e))));
}
function lees() {
  const pad = instPad();
  let tekst = null, j = {};
  try { tekst = fs.readFileSync(pad, 'utf8').replace(/^﻿/, ''); } catch (e) { if (e.code !== 'ENOENT') throw new Error('I cannot open ' + pad + ': ' + e.message); }
  if (tekst !== null && tekst.trim()) {
    try { j = JSON.parse(tekst); } catch (e) { j = null; }
    if (!j || typeof j !== 'object' || Array.isArray(j)) throw new Error('I cannot read ' + pad + ' (there is a mistake in it). I have not changed anything.');
  }
  return { pad, tekst, j };
}
/* opt.map = de map met hook.js; opt.haak = { command, args } als het iets anders moet zijn dan "node hook.js" */
function koppel(aan, opt) {
  opt = opt || {};
  const map = opt.map || __dirname, onze = herken(map);
  const haak = opt.haak || { command: 'node', args: [path.join(map, 'hook.js').replace(/\\/g, '/')] };
  const { pad, tekst, j } = lees();
  const hooks = j.hooks && typeof j.hooks === 'object' && !Array.isArray(j.hooks) ? j.hooks : {};
  let weg = 0;
  for (const ev of Object.keys(hooks)) {             // eerst onze oude regels eruit, zodat ze er nooit dubbel in komen
    if (!Array.isArray(hooks[ev])) continue;
    hooks[ev] = hooks[ev].map(g => {
      if (!g || !Array.isArray(g.hooks)) return g;
      const over = g.hooks.filter(h => { if (onze(h)) { weg++; return false; } return true; });
      return over.length || !g.hooks.length ? Object.assign({}, g, { hooks: over }) : null;
    }).filter(g => g !== null);
    if (!hooks[ev].length) delete hooks[ev];
  }
  if (!aan && !weg) return 'Maatje was not connected to Claude Code. Nothing changed.';
  if (aan) for (const ev in HAAK_BIJ) {
    const g = { hooks: [{ type: 'command', command: haak.command, args: haak.args, async: true, timeout: 5 }] };
    if (HAAK_BIJ[ev]) g.matcher = HAAK_BIJ[ev];
    (hooks[ev] = hooks[ev] || []).push(g);
  }
  if (Object.keys(hooks).length) j.hooks = hooks; else delete j.hooks;
  fs.mkdirSync(path.dirname(pad), { recursive: true });
  if (tekst !== null) fs.writeFileSync(pad + '.maatje-backup', tekst);
  fs.writeFileSync(pad + '.new', JSON.stringify(j, null, 2) + '\n');
  fs.renameSync(pad + '.new', pad);
  return (aan ? 'Connected: Maatje now follows along with Claude Code.' : 'Disconnected: Maatje no longer follows along with Claude Code.') +
    '\nChanged: ' + pad + (tekst !== null ? '\nBackup:  ' + pad + '.maatje-backup' : '') +
    (aan ? '\nIf you ever move Maatje to another folder, disconnect first and connect again from the new place.' : '');
}
/* staat onze haak er nu in? */
function koppelStand(opt) {
  try {
    const onze = herken((opt && opt.map) || __dirname), { pad, j } = lees();
    let n = 0;
    for (const ev of Object.keys(j.hooks || {})) for (const g of Array.isArray(j.hooks[ev]) ? j.hooks[ev] : []) for (const h of (g && Array.isArray(g.hooks)) ? g.hooks : []) if (onze(h)) n++;
    return { ok: true, gekoppeld: n > 0, aantal: n, pad };
  } catch (e) { return { ok: false, gekoppeld: false, fout: e.message }; }
}
module.exports = { koppel, koppelStand };
