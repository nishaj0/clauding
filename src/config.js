// User-editable settings. Lives outside the repo so plugin updates never overwrite it.
const fs = require('fs'), os = require('os'), path = require('path');

const CONFIG_FILE = path.join(os.homedir(), '.claude', 'clauding-presence.json');
const CLIENT_ID = '1561708884283105392';
const REPO_URL = 'https://github.com/nishaj0/clauding-discord-presence';

const DEFAULTS = {
  // Text lines. Placeholders: {status} {model} {ctx} {out} {project}.
  // " · " separates segments; a segment whose placeholder is empty/disabled is dropped.
  details: 'Claude Code',
  state: '{status} · {model} · {ctx} ctx · {out} out',
  largeText: '{project}', // tooltip on the crab
  show: {
    status: false, // working / idle indicator
    model: true,
    tokens: true,  // context size + total output tokens
    project: true, // project folder name (crab tooltip)
    timer: true,   // "elapsed" counter
  },
  statusText: { working: 'Working...', idle: 'Idle' },
  // Up to 2 buttons shown to OTHER people on your profile (Discord hides them from you). [] to disable.
  buttons: [{ label: 'Get Clauding', url: REPO_URL }],
};

function loadConfig() {
  let user = {};
  try { user = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch {} // missing/invalid -> defaults
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
