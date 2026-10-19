// User-editable settings. Lives outside the repo so plugin updates never overwrite it.
const fs = require('fs'), os = require('os'), path = require('path');

const CONFIG_FILE = path.join(os.homedir(), '.claude', 'clauding.json');
const CLIENT_ID = '1561708884283105392';
const REPO_URL = 'https://github.com/nishaj0/clauding';

const DEFAULTS = {
  // Text lines. Placeholders: {status} {model} {ctx} {out} {project}.
  // " · " separates segments; a segment whose placeholder is empty/disabled is dropped.
  details: 'Claude Code',
  state: '{status} · {model} · {ctx} ctx · {out} out',
  largeText: '{project}', // tooltip on the crab
  appDetails: 'Claude',   // top line while the desktop app is open but no Claude Code session is active (chat)
  show: {
    app: true,     // show the presence whenever the Claude desktop app is open, not only during Code sessions
    status: false, // working / idle indicator
    model: true,
    tokens: true,  // context size + total output tokens
    project: true, // project folder name (crab tooltip)
    timer: true,   // "elapsed" counter
  },
  statusText: { working: 'Working...', idle: 'Idle' },
  // Windows only: start at login so the presence also works when you only chat in the desktop app.
  autostart: false,
  // Up to 2 buttons shown to OTHER people on your profile (Discord hides them from you). [] to disable.
  buttons: [{ label: 'Get Clauding', url: REPO_URL }],
};

let lastGood = {};

function loadConfig() {
  try {
    const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    if (parsed && typeof parsed === 'object') lastGood = parsed;
  } catch (e) {
    if (e.code === 'ENOENT') lastGood = {}; // deleted -> defaults; a typo keeps the last valid config
  }
  const user = lastGood;
  return {
    ...DEFAULTS, ...user,
    show: { ...DEFAULTS.show, ...user.show },
    statusText: { ...DEFAULTS.statusText, ...user.statusText },
  };
}

// First run: drop the defaults where users can find and edit them.
function ensureConfig() {
  if (fs.existsSync(CONFIG_FILE)) return;
  try {
    fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULTS, null, 2) + '\n');
  } catch {}
}

module.exports = { CONFIG_FILE, CLIENT_ID, DEFAULTS, loadConfig, ensureConfig };
