#!/usr/bin/env node
// Adds (or removes) the Discord presence hooks in ~/.claude/settings.json.
//   node install.js            install
//   node install.js --remove   uninstall
const fs = require('fs'), os = require('os'), path = require('path');
const file = path.join(os.homedir(), '.claude', 'settings.json');
const script = path.join(__dirname, '..', 'src', 'presence.js').replace(/\\/g, '/');
const command = `node "${script}"`;
const events = ['SessionStart', 'UserPromptSubmit', 'Stop', 'SessionEnd'];
const remove = process.argv.includes('--remove');
const mine = h => JSON.stringify(h).includes('src/presence.js') && !JSON.stringify(h).includes('CLAUDE_PLUGIN_ROOT');

let settings = {};
try { settings = JSON.parse(fs.readFileSync(file, 'utf8')); }
catch (e) { if (e.code !== 'ENOENT') { console.error(`Could not parse ${file}: ${e.message}`); process.exit(1); } }

settings.hooks = settings.hooks || {};
for (const ev of events) {
  const list = (settings.hooks[ev] || []).filter(h => !mine(h)); // idempotent: drop our old entry first
  if (!remove) list.push({ hooks: [{ type: 'command', command }] });
  if (list.length) settings.hooks[ev] = list; else delete settings.hooks[ev];
}
if (!Object.keys(settings.hooks).length) delete settings.hooks;

fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(settings, null, 2));
console.log(remove ? 'Hooks removed.' : `Hooks installed -> ${command}\nStart a new Claude Code session to see it.`);
