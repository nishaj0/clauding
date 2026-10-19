#!/usr/bin/env node
// Discord Rich Presence for Claude Code. No dependencies.
//   hook mode   : node presence.js          (Claude Code hook; JSON on stdin) -> writes state, starts daemon
//   daemon mode : node presence.js daemon   (holds the Discord IPC connection)
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net');
const { spawn } = require('child_process');

const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1561708884283105392';
const DIR = path.join(os.tmpdir(), 'claude-discord-presence');
const STATE = path.join(DIR, 'state.json'), PID = path.join(DIR, 'daemon.pid');

if (process.argv[2] === 'daemon') daemon(); else hook();

function hook() {
  let raw = '';
  process.stdin.on('data', d => (raw += d)).on('end', () => {
    let e = {}; try { e = JSON.parse(raw); } catch {}
    const ev = e.hook_event_name;
    fs.mkdirSync(DIR, { recursive: true });
    let prev = {}; try { prev = JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch {}
    if (ev === 'SessionStart') prev = {}; // new session: fresh timer, no stale model/tokens
    const s = {
      project: path.basename(e.cwd || process.cwd()),
      since: prev.since || Date.now(),
      ...usage(e.transcript_path, prev),
      status: ev === 'SessionEnd' ? 'end'
        : ev === 'PreToolUse' ? `Running ${e.tool_name}`
        : ev === 'UserPromptSubmit' ? 'Thinking...'
        : 'Idle',
    };
    fs.writeFileSync(STATE, JSON.stringify(s));
    if (ev !== 'SessionEnd' && !alive()) {
      spawn(process.execPath, [__filename, 'daemon'], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    }
  });
}

// model + context size (latest turn) + total output tokens, read from the session transcript
function usage(file, prev) {
  const out = { model: prev.model, ctx: prev.ctx, out: prev.out };
  try {
    let outTok = 0;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      if (!line.includes('"usage"')) continue;
      const m = JSON.parse(line).message;
      if (!m || !m.usage || m.model === '<synthetic>') continue;
      const u = m.usage;
      out.model = m.model;
      out.ctx = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
      outTok += u.output_tokens || 0;
    }
    if (outTok) out.out = outTok;
  } catch {}
  return out;
}

const k = n => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(n));
function prettyModel(id = '') {
  const m = id.match(/claude-(?:(\d+)-(\d+)-)?([a-z]+)(?:-(\d+))?(?:-(\d+))?/);
  if (!m) return id || 'Claude';
  const ver = m[1] ? `${m[1]}.${m[2]}` : m[4] ? (m[5] && m[5].length < 3 ? `${m[4]}.${m[5]}` : m[4]) : '';
  return `${m[3][0].toUpperCase()}${m[3].slice(1)} ${ver}`.trim();
}

function alive() {
  try { process.kill(+fs.readFileSync(PID, 'utf8'), 0); return true; } catch { return false; }
}

function frame(op, obj) {
  const body = Buffer.from(JSON.stringify(obj)), h = Buffer.alloc(8);
  h.writeInt32LE(op, 0); h.writeInt32LE(body.length, 4);
  return Buffer.concat([h, body]);
}

function connect(i = 0) {
  return new Promise((res, rej) => {
    if (i > 9) return rej(new Error('Discord not running'));
    const p = process.platform === 'win32' ? `\\\\?\\pipe\\discord-ipc-${i}` : path.join(process.env.XDG_RUNTIME_DIR || os.tmpdir(), `discord-ipc-${i}`);
    const s = net.connect(p);
    s.once('connect', () => res(s));
    s.once('error', () => connect(i + 1).then(res, rej));
  });
}

async function daemon() {
  fs.mkdirSync(DIR, { recursive: true });
  if (alive()) return;
  fs.writeFileSync(PID, String(process.pid));
  let sock;
  // Discord may not be open yet: retry for a minute, then give up.
  for (let i = 0; !sock; i++) {
    try { sock = await connect(); } catch { if (i > 12) process.exit(); await new Promise(r => setTimeout(r, 5000)); }
  }
  sock.write(frame(0, { v: 1, client_id: CLIENT_ID }));
  sock.on('close', () => process.exit()); // Discord quit
  sock.on('error', () => process.exit());
  sock.on('data', () => {}); // drain replies

  let last = '';
  setInterval(() => {
    let s; try { s = JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch { return; }
    if (s.status === 'end') process.exit();
    // crashed session never sent SessionEnd: stop after 30 min of silence
    if (Date.now() - fs.statSync(STATE).mtimeMs > 30 * 60e3) process.exit();
    const key = JSON.stringify(s);
    if (key === last) return;
    last = key;
    sock.write(frame(1, {
      cmd: 'SET_ACTIVITY', nonce: String(Date.now()),
      args: { pid: process.pid, activity: {
        status_display_type: 2, // show `details` ("Claude Code · ...") instead of the app name in the status line
        details: 'Claude Code',
        state: s.model ? `${prettyModel(s.model)} · ${k(s.ctx)} ctx · ${k(s.out)} out` : `Project: ${s.project}`,
        assets: { large_image: 'claude_code', large_text: `Project: ${s.project}` },
        timestamps: { start: Math.floor(s.since / 1000) },
      } },
    }));
  }, 15000); // Discord only accepts ~1 presence update per 15s
}
