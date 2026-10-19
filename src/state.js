// Hook -> daemon hand-off: a tiny JSON file plus a pid file, in the OS temp dir.
const fs = require('fs'), os = require('os'), path = require('path');

const DIR = path.join(os.tmpdir(), 'claude-discord-presence');
const STATE = path.join(DIR, 'state.json'), PID = path.join(DIR, 'daemon.pid');

const ensureDir = () => fs.mkdirSync(DIR, { recursive: true });
const readState = () => { try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch { return {}; } };
const writeState = s => fs.writeFileSync(STATE, JSON.stringify(s));
const ageMs = () => Date.now() - fs.statSync(STATE).mtimeMs;
const writePid = () => fs.writeFileSync(PID, String(process.pid));
function daemonAlive() {
  try { process.kill(+fs.readFileSync(PID, 'utf8'), 0); return true; } catch { return false; }
}

module.exports = { ensureDir, readState, writeState, ageMs, writePid, daemonAlive };
