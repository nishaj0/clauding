// Optional: launch the daemon at Windows login so presence also covers chat-only use of the desktop app.
// Writes (or removes) one hidden launcher in the Startup folder. Windows only.
const fs = require('fs'), path = require('path');

const LAUNCHER = process.platform === 'win32' && process.env.APPDATA
  ? path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'clauding.vbs') : '';

function sync(enabled) {
  if (!LAUNCHER) return;
  try {
    if (!enabled) return fs.rmSync(LAUNCHER, { force: true });
    const cmd = `"${process.execPath}" "${path.join(__dirname, 'presence.js')}" daemon`;
    const vbs = `CreateObject("WScript.Shell").Run "${cmd.replace(/"/g, '""')}", 0, False\r\n`; // 0 = hidden window
    if (!fs.existsSync(LAUNCHER) || fs.readFileSync(LAUNCHER, 'utf8') !== vbs) fs.writeFileSync(LAUNCHER, vbs);
  } catch {}
}

module.exports = { sync };
