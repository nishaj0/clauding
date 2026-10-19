// Runs the real daemon loop against a fake Discord, in a throwaway home/temp dir.
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), os = require('os'), path = require('path'), { EventEmitter } = require('events');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'clauding-daemon-'));
process.env.USERPROFILE = process.env.HOME = process.env.APPDATA = root;
process.env.TEMP = process.env.TMP = root;
const lock = path.join(root, 'Claude', 'lockfile');

const state = require('../src/state'), { start } = require('../src/daemon');
const wait = ms => new Promise(r => setTimeout(r, ms));
const until = async (cond, ms = 2000) => { for (let t = 0; t < ms && !cond(); t += 20) await wait(20); return cond(); };

function fakeDiscord() {
  const d = { sent: [], opens: 0, destroys: 0 };
  d.connect = async () => {
    d.opens++;
    const sock = Object.assign(new EventEmitter(), {
      write(buf) {
        const op = buf.readInt32LE(0), body = JSON.parse(buf.slice(8));
        if (op === 0) setImmediate(() => sock.emit('data', Buffer.from('{"evt":"READY"}')));
        else d.sent.push(body.args.activity);
      },
      destroy() { d.destroys++; sock.emit('close'); },
    });
    return sock;
  };
  d.last = () => d.sent[d.sent.length - 1];
  return d;
}

test('app open -> presence; session starts/ends independently; app closes -> presence cleared and daemon stops', { skip: process.platform !== 'win32' }, async () => {
  const d = fakeDiscord();
  let stopped = false;
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  fs.writeFileSync(lock, '');                       // the Claude desktop app launches
  start({ connect: d.connect, pollMs: 30, minGapMs: 0, onStop: () => { stopped = true; } });

  assert.ok(await until(() => d.last()), 'app presence sent');
  assert.equal(d.last().details, 'Claude');         // chat: no Code session needed

  state.writeSession('s1', { project: 'p1', since: Date.now(), model: 'claude-sonnet-5-5', ctx: 1000, out: 500, busy: false });
  state.writeSession('s2', { project: 'p2', since: Date.now(), busy: false });
  assert.ok(await until(() => d.last().details === 'Claude Code'), 'session presence sent');

  state.removeSession('s2');                        // closing one window must not end the presence
  await wait(150);
  assert.equal(d.last().details, 'Claude Code');
  assert.equal(stopped, false);

  fs.rmSync(lock);                                  // the app quits; s1 was started while it was up
  assert.ok(await until(() => stopped), 'daemon stopped');
  assert.ok(d.destroys >= 1, 'connection closed so Discord clears the card');
  assert.deepEqual(state.listSessions(), [], 'app sessions dropped without a SessionEnd hook');
});

test('reconnects when Discord restarts', async () => {
  const d = fakeDiscord();
  let socks = [];
  const connect = async () => { const s = await d.connect(); socks.push(s); return s; };
  state.writeSession('s3', { project: 'p', since: Date.now(), busy: false });
  const stop = start({ connect, pollMs: 30, minGapMs: 0, onStop: () => {} });
  assert.ok(await until(() => d.sent.length >= 1));
  socks[0].emit('close');                           // Discord quit
  assert.ok(await until(() => d.opens >= 2 && d.sent.length >= 2), 'reconnected and re-sent');
  stop();
});

test('a second daemon does not start while one is alive', () => {
  state.claimDaemon();
  let called = false;
  const stop = start({ connect: async () => { called = true; throw new Error('x'); }, pollMs: 30, onStop: () => {} });
  assert.equal(stop, undefined);
  assert.equal(called, false);
});
