// Hook -> daemon hand-off in the OS temp dir: one small file per Claude Code session
// (so sessions never overwrite each other) plus a pid file the daemon touches as a heartbeat.
const fs = require('fs'), os = require('os'), path = require('path');

const DIR = path.join(os.tmpdir(), 'claude-discord-presence');
const SESSIONS = path.join(DIR, 'sessions'), PID = path.join(DIR, 'daemon.pid');
const STALE_MS = 30 * 60e3;   // a session silent this long drops off (crashed / abandoned)
const HEARTBEAT_MS = 10e3;    // a daemon not touching its pid file this long is considered dead

const file = id => path.join(SESSIONS, String(id).replace(/[^\w-]/g, '_') + '.json');

const ensureDirs = () => fs.mkdirSync(SESSIONS, { recursive: true });
const writeSession = (id, s) => fs.writeFileSync(file(id), JSON.stringify(s));
const removeSession = id => fs.rmSync(file(id), { force: true });
const readSession = id => { try { return JSON.parse(fs.readFileSync(file(id), 'utf8')); } catch { return {}; } };

function listSessions() {
  let names = [];
  try { names = fs.readdirSync(SESSIONS); } catch {}
  const out = [];
  for (const name of names) {
    const f = path.join(SESSIONS, name);
    try {
      const at = fs.statSync(f).mtimeMs;
      if (Date.now() - at > STALE_MS) { fs.rmSync(f, { force: true }); continue; }
      out.push({ id: name.slice(0, -5), at, ...JSON.parse(fs.readFileSync(f, 'utf8')) });
    } catch {}
  }
  return out;
}

const readPid = () => { try { return +fs.readFileSync(PID, 'utf8'); } catch { return 0; } };
const claimDaemon = () => fs.writeFileSync(PID, String(process.pid));
const releaseDaemon = () => { if (readPid() === process.pid) fs.rmSync(PID, { force: true }); };
const heartbeat = () => { const now = new Date(); fs.utimesSync(PID, now, now); };

// Heartbeat as well as pid: after a reboot the pid file can name an unrelated process that reused the pid.
function daemonAlive() {
  const pid = readPid();
  if (!pid) return false;
  try { process.kill(pid, 0); return Date.now() - fs.statSync(PID).mtimeMs < HEARTBEAT_MS; } catch { return false; }
}

module.exports = { ensureDirs, writeSession, removeSession, readSession, listSessions, readPid, claimDaemon, releaseDaemon, heartbeat, daemonAlive };
