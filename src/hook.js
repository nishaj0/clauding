// Runs on every Claude Code hook event (JSON on stdin): record state, make sure the daemon is up.
const path = require('path'), { spawn } = require('child_process');
const { ensureConfig } = require('./config');
const state = require('./state');
const { readUsage } = require('./transcript');

function run() {
  let raw = '';
  process.stdin.on('data', d => (raw += d)).on('end', () => {
    let e = {}; try { e = JSON.parse(raw); } catch {}
    const ev = e.hook_event_name;
    state.ensureDir();
    // A new session starts clean: fresh timer, no stale model/tokens.
    const prev = ev === 'SessionStart' ? {} : state.readState();
    if (ev === 'SessionStart') ensureConfig();
    state.writeState({
      project: path.basename(e.cwd || process.cwd()),
      since: prev.since || Date.now(),
      ...readUsage(e.transcript_path, prev),
      busy: ev === 'UserPromptSubmit' ? true : ev === 'Stop' || ev === 'SessionStart' ? false : !!prev.busy,
      ended: ev === 'SessionEnd',
    });
    if (ev !== 'SessionEnd' && !state.daemonAlive()) {
      spawn(process.execPath, [path.join(__dirname, 'presence.js'), 'daemon'], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    }
  });
}

module.exports = { run };
