'use strict';
/* MAATJE - de haak voor Claude Code ("meeleven").
   Claude Code start dit scriptje bij elke gebeurtenis (zie de hooks in ~/.claude/settings.json) en
   geeft de gegevens als JSON op de invoer. Wij vertellen Maatje alleen WAT er gebeurt (werkt, klaar,
   heeft je nodig) en van welke sessie; nooit wat je getypt hebt of wat Claude doet.
   Loopt Maatje niet, dan gebeurt er niets. Dit script zegt nooit iets terug en stopt altijd goed (code 0),
   zodat Claude er geen last van heeft.  Proberen:  echo {"hook_event_name":"Stop"} | node haak.js  */
const net = require('net');

const klaar = () => process.exit(0);
setTimeout(klaar, 1500);                              // nooit blijven hangen

function gebeurtenis(h) {
  const ev = h.hook_event_name, tool = String(h.tool_name || '');
  if (ev === 'UserPromptSubmit' || ev === 'PostToolUse') return 'aan';
  if (ev === 'PreToolUse') {
    if (/^(Agent|Task)$/.test(tool)) return 'hulpje';                    // Claude zet een hulpje in
    if (/^(AskUserQuestion|ExitPlanMode)$/.test(tool)) return 'nodig';   // Claude vraagt jou iets
    return 'aan';
  }
  if (ev === 'PermissionRequest') return 'nodig';
  if (ev === 'Notification') {
    const soort = String(h.notification_type || ''), tekst = String(h.message || '');
    if (soort === 'idle_prompt' || /waiting for your input/i.test(tekst)) return null;   // dat is gewoon "klaar", niet nog eens zwaaien
    if (soort === 'permission_prompt' || soort === 'elicitation_dialog' || /permission|approval|needs your/i.test(tekst)) return 'nodig';
    return null;
  }
  if (ev === 'SubagentStop') return 'hulpjeweg';
  if (ev === 'Stop') return 'klaar';
  if (ev === 'SessionEnd') return 'einde';
  return null;
}

let invoer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => { invoer += d; });
process.stdin.on('error', klaar);
process.stdin.on('end', () => {
  let h;
  try { h = JSON.parse(invoer); } catch (e) { return klaar(); }
  const g = gebeurtenis(h || {});
  if (!g) return klaar();
  const sock = net.connect('\\\\.\\pipe\\' + (process.env.MAATJE_PIJP || 'maatje'));
  sock.on('error', klaar);                            // Maatje loopt niet
  sock.on('connect', () => sock.write(JSON.stringify({ wat: 'meeleven', gebeurtenis: g, sessie: String(h.session_id || '?'), tool: String(h.tool_name || '') }) + '\n'));
  sock.on('data', klaar);
  sock.on('close', klaar);
});
