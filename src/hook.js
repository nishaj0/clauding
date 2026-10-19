// Runs on every Claude Code hook event (JSON on stdin): record this session's state, make sure the daemon is up.
const path = require('path'), { spawn } = require('child_process');
const { ensureConfig } = require('./config');
const state = require('./state');
const { readUsage } = require('./transcript');

function run() {
  let raw = '';
  process.stdin.on('data', d => (raw += d)).on('end', () => {
    let e = {}; try { e = JSON.parse(raw); } catch {}
    const ev = e.hook_event_name, id = e.session_id || 'default';
    state.ensureDirs();
    if (ev === 'SessionEnd') return state.removeSession(id); // only this session; others keep the presence alive
    // A new session starts clean: fresh timer, no stale model/tokens.
    const prev = ev === 'SessionStart' ? {} : state.readSession(id);
    if (ev === 'SessionStart') ensureConfig();
    state.writeSession(id, {
      project: path.basename(e.cwd || process.cwd()),
      since: prev.since || Date.now(),
      ...readUsage(e.transcript_path, prev),
      busy: ev === 'UserPromptSubmit' ? true : ev === 'Stop' || ev === 'SessionStart' ? false : !!prev.busy,
    });
    if (!state.daemonAlive()) {
      spawn(process.execPath, [path.join(__dirname, 'presence.js'), 'daemon'], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    }
  });
}

module.exports = { run };
