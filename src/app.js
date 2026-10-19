// Is the Claude desktop app running? Chromium holds %APPDATA%\Claude\lockfile for as long as the app
// is open (the OS deletes it when the process dies), so a stat tells us instantly and for free.
// Chat has no hooks, so this is the only way to know the app is in use. Windows only.
const fs = require('fs'), path = require('path');

const LOCK = process.platform === 'win32' && process.env.APPDATA ? path.join(process.env.APPDATA, 'Claude', 'lockfile') : '';

// Launch time of the app in ms (the lockfile is created at launch), or 0 when it is not running.
function startedAt() {
  try { return LOCK ? fs.statSync(LOCK).mtimeMs : 0; } catch { return 0; }
}

module.exports = { startedAt };
