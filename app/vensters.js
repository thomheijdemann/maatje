'use strict';
/* MAATJE - the connection with the window finder (vensters.cs), for the main program.
   Maatje can stand on your windows; this file starts the little program that tells him where they are and
   passes the list on. The program is made with the C# compiler that comes with Windows (csc.exe, in
   C:\Windows\Microsoft.NET): once, the first time, and kept in the folder with Maatje's settings.
   The built program (npm run build) has vensters.exe ready next to this file, so nothing has to be compiled.
   The code below is written in Dutch. */
const cp = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const BRON = path.join(__dirname, 'vensters.cs');

function zoekCsc() {
  const w = process.env.SystemRoot || process.env.windir || 'C:\\Windows';
  for (const m of ['Framework64', 'Framework']) {
    const p = path.join(w, 'Microsoft.NET', m, 'v4.0.30319', 'csc.exe');
    if (fs.existsSync(p)) return p;
  }
  return null;
}
/* het hulpprogramma: een kant-en-klare exe naast dit bestand (de gebouwde versie), anders een die we zelf maken */
function zoekHulp(cacheMap) {
  const klaar = path.join(__dirname, 'vensters.exe');
  if (fs.existsSync(klaar)) return klaar;
  const hash = crypto.createHash('sha1').update(fs.readFileSync(BRON)).digest('hex').slice(0, 10);
  const doel = path.join(cacheMap, 'vensters-' + hash + '.exe');
  if (fs.existsSync(doel)) return doel;
  const csc = zoekCsc();
  if (!csc) throw new Error('the C# compiler of Windows was not found, so I cannot make the window finder');
  fs.mkdirSync(cacheMap, { recursive: true });
  const tmp = doel + '.tmp.exe';
  try {
    cp.execFileSync(csc, ['/nologo', '/target:exe', '/platform:x64', '/optimize+', '/out:' + tmp, BRON], { windowsHide: true, timeout: 60000, stdio: 'pipe' });
  } catch (e) {
    throw new Error('making the window finder failed: ' + String((e.stdout || '') + (e.stderr || '') || e.message).split('\n').slice(0, 3).join(' '));
  }
  fs.renameSync(tmp, doel);
  return doel;
}

/* start het hulpprogramma. opt: { cacheMap, bijLijst(lijst), bijFout(tekst), ms }
   bijLijst krijgt [{i, x, y, w, h, p}] in echte beeldpunten, bovenste venster eerst. Geeft { stop(), stand() } terug. */
function start(opt) {
  let kind = null, gestopt = false, pogingen = 0, laatste = 0, fout = null, herstart = null, aantal = 0;
  function begin() {
    let exe;
    try { exe = zoekHulp(opt.cacheMap); } catch (e) { fout = e.message; if (opt.bijFout) opt.bijFout(fout); return; }
    kind = cp.spawn(exe, [String(process.pid), String(opt.ms || 80)], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    let buf = '';
    kind.stdout.setEncoding('utf8');
    kind.stdout.on('data', d => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const regel = buf.slice(0, i); buf = buf.slice(i + 1);
        let l;
        try { l = JSON.parse(regel); } catch (e) { continue; }
        if (!Array.isArray(l)) continue;
        laatste = Date.now(); aantal = l.length; pogingen = 0; fout = null;
        opt.bijLijst(l);
      }
    });
    kind.on('error', e => { fout = 'the window finder does not start: ' + e.message; if (opt.bijFout) opt.bijFout(fout); });
    kind.on('exit', () => {
      kind = null;
      if (gestopt) return;
      if (++pogingen > 5) { fout = fout || 'the window finder keeps stopping'; if (opt.bijFout) opt.bijFout(fout); return; }
      herstart = setTimeout(begin, 2000);
    });
  }
  begin();
  return {
    stop() { gestopt = true; clearTimeout(herstart); if (kind) { try { kind.kill(); } catch (e) { /* al weg */ } kind = null; } },
    stand() { return { loopt: !!kind, vensters: aantal, laatste: laatste ? Date.now() - laatste : null, fout }; },
  };
}

module.exports = { start, zoekHulp, zoekCsc };
