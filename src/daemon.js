// Background process that owns the Discord connection. Every couple of seconds it looks at the open Claude
// Code sessions and at whether the desktop app is running, and keeps Discord in sync. It exits when there is
// nothing to show (unless `autostart` keeps it resident), and reconnects if Discord restarts.
const { CLIENT_ID, loadConfig } = require('./config');
const ipc = require('./ipc');
const app = require('./app');
const autostart = require('./autostart');
const state = require('./state');
const { buildActivity, pickView } = require('./render');

const POLL_MS = 2000;    // only a few tiny file reads per tick
const MIN_GAP_MS = 5000; // stay under Discord's presence rate limit

// connect / pollMs / minGapMs / onStop are injectable so tests can run the real loop against a fake Discord.
function start({ connect = ipc.connect, pollMs = POLL_MS, minGapMs = MIN_GAP_MS, onStop = process.exit } = {}) {
  state.ensureDirs();
  if (state.daemonAlive()) return;
  state.claimDaemon();

  let sock = null, ready = false, connecting = false, last = '', sentAt = 0, lastApp = 0, lastAutostart;

  const disconnect = () => { // closing the pipe clears the presence in Discord
    const s = sock;
    sock = null; ready = false; last = '';
    if (s) s.destroy();
  };
  const stop = () => { clearInterval(timer); disconnect(); state.releaseDaemon(); onStop(); };

  async function open() {
    connecting = true;
    try {
      const s = await connect();
      const lost = () => { if (sock === s) { sock = null; ready = false; last = ''; } }; // Discord quit: reconnect next tick
      s.on('data', d => { if (sock === s && String(d).includes('"evt":"READY"')) { ready = true; tick(); } });
      s.on('close', lost);
      s.on('error', lost);
      sock = s;
      s.write(ipc.frame(0, { v: 1, client_id: CLIENT_ID }));
    } catch {} // Discord not running yet
    connecting = false;
  }

  function tick() {
    if (state.readPid() !== process.pid) return stop(); // a newer daemon took over
    state.heartbeat();
    const cfg = loadConfig();
    if (cfg.autostart !== lastAutostart) { autostart.sync(cfg.autostart); lastAutostart = cfg.autostart; }

    const appSince = app.startedAt();
    if (lastApp && !appSince) { // app quit: its sessions died with it even if no SessionEnd hook ran
      for (const s of state.listSessions()) if (s.since >= lastApp) state.removeSession(s.id);
    }
    lastApp = appSince;

    const view = pickView(state.listSessions(), appSince, cfg.show.app);
    if (!view) { disconnect(); return cfg.autostart ? undefined : stop(); }
    if (!sock) return connecting ? undefined : open();
    if (!ready) return;

    const activity = buildActivity(view, cfg);
    const key = JSON.stringify(activity);
    if (key === last || Date.now() - sentAt < minGapMs) return; // a held-back change goes out on a later tick
    last = key; sentAt = Date.now();
    sock.write(ipc.frame(1, { cmd: 'SET_ACTIVITY', nonce: String(sentAt), args: { pid: process.pid, activity } }));
  }

  const timer = setInterval(tick, pollMs);
  tick();
  return stop;
}

module.exports = { start, run: () => { start(); } };
