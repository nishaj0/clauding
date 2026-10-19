// Minimal Discord IPC client: framing + pipe discovery.
const net = require('net'), os = require('os'), path = require('path');

function frame(op, obj) {
  const body = Buffer.from(JSON.stringify(obj)), head = Buffer.alloc(8);
  head.writeInt32LE(op, 0); head.writeInt32LE(body.length, 4);
  return Buffer.concat([head, body]);
}

function pipePath(i) {
  return process.platform === 'win32'
    ? `\\\\?\\pipe\\discord-ipc-${i}`
    : path.join(process.env.XDG_RUNTIME_DIR || os.tmpdir(), `discord-ipc-${i}`);
}

// Resolves with the first discord-ipc-0..9 socket that accepts a connection.
function connect(i = 0) {
  return new Promise((resolve, reject) => {
    if (i > 9) return reject(new Error('Discord not running'));
    const sock = net.connect(pipePath(i));
    sock.once('connect', () => resolve(sock));
    sock.once('error', () => connect(i + 1).then(resolve, reject));
  });
}

module.exports = { frame, connect };
