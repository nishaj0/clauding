// Background process that owns the Discord connection. Exits on SessionEnd, when Discord quits,
// or after 30 min without a hook event (crashed session).
const { CLIENT_ID, loadConfig } = require('./config');
const { frame, connect } = require('./ipc');
const { buildActivity } = require('./render');
const state = require('./state');

const POLL_MS = 15000; // Discord only accepts ~1 presence update per 15 s
const STALE_MS = 30 * 60e3;

async function run() {
  state.ensureDir();
  if (state.daemonAlive()) return;
  state.writePid();

  let sock;
  // Discord may not be open yet: retry for a minute, then give up.
  for (let i = 0; !sock; i++) {
    try { sock = await connect(); } catch { if (i > 12) process.exit(); await new Promise(r => setTimeout(r, 5000)); }
  }
  sock.write(frame(0, { v: 1, client_id: CLIENT_ID }));
  sock.on('close', () => process.exit());
  sock.on('error', () => process.exit());
  sock.on('data', () => {}); // drain replies

  let last = '';
  const tick = () => {
    const s = state.readState();
    if (!s.project) return;
    if (s.ended || state.ageMs() > STALE_MS) process.exit();
    const activity = buildActivity(s, loadConfig()); // config re-read each tick: edits apply live
    const key = JSON.stringify(activity);
    if (key === last) return;
    last = key;
    sock.write(frame(1, { cmd: 'SET_ACTIVITY', nonce: String(Date.now()), args: { pid: process.pid, activity } }));
  };
  tick();
  setInterval(tick, POLL_MS);
}

module.exports = { run };
