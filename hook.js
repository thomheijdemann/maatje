'use strict';
/* MAATJE - the hook for Claude Code ("follow along").
   Claude Code starts this little script at every event (see the hooks in ~/.claude/settings.json, put
   there by "node maatje.js connect") and passes the details as JSON on the input. We only tell Maatje
   WHAT happens (working, done, needs you) and for which session; never what you typed or what Claude
   is doing. If Maatje is not running, nothing happens. This script never says anything back and always
   ends well (code 0), so Claude never notices it.
   Try it:  echo {"hook_event_name":"Stop"} | node hook.js
   The words sent to Maatje are Dutch, like the rest of the code: aan = working, hulpje = a helper
   (subagent) started, hulpjeweg = a helper finished, nodig = Claude needs you, klaar = done, einde = session closed,
   overname = Claude is using your mouse and keyboard (computer use; only the NAME of the tool goes along, like left_click). */
const net = require('net');

const klaar = () => process.exit(0);

function gebeurtenis(h) {
  const ev = h.hook_event_name, tool = String(h.tool_name || '');
  if (ev === 'UserPromptSubmit' || ev === 'PostToolUse') return 'aan';
  if (ev === 'PreToolUse') {
    if (/^(Agent|Task)$/.test(tool)) return 'hulpje';                    // Claude zet een hulpje in
    if (/^(AskUserQuestion|ExitPlanMode)$/.test(tool)) return 'nodig';   // Claude vraagt jou iets
    if (/^mcp__(computer-use|computer_use)__/.test(tool) || /^mcp__remote-devices__computer_/.test(tool)) return 'overname';   // Claude gebruikt jouw muis en toetsenbord (computer use)
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

function stuur(invoer) {
  let h;
  try { h = JSON.parse(invoer); } catch (e) { return klaar(); }
  const g = gebeurtenis(h || {});
  if (!g) return klaar();
  const sock = net.connect('\\\\.\\pipe\\' + (process.env.MAATJE_PIJP || 'maatje'));
  sock.on('error', klaar);                            // Maatje loopt niet
  sock.on('connect', () => sock.write(JSON.stringify({ wat: 'meeleven', gebeurtenis: g, sessie: String(h.session_id || '?'), tool: String(h.tool_name || '') }) + '\n'));
  sock.on('data', klaar);
  sock.on('close', klaar);
}
/* tekst = de invoer als die al gelezen is (zo doet Maatje.exe --hook het); anders lezen we hem hier zelf */
function begin(tekst) {
  setTimeout(klaar, 1500);                            // nooit blijven hangen
  if (typeof tekst === 'string') return stuur(tekst);
  let invoer = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', d => { invoer += d; });
  process.stdin.on('error', klaar);
  process.stdin.on('end', () => stuur(invoer));
}
if (require.main === module) begin(); else module.exports = begin;
