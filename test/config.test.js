const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), os = require('os'), path = require('path');

// Point the config at a throwaway home before it is loaded.
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'clauding-test-'));
process.env.USERPROFILE = process.env.HOME = home;
const { CONFIG_FILE, DEFAULTS, loadConfig } = require('../src/config');
const write = text => { fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true }); fs.writeFileSync(CONFIG_FILE, text); };

test('missing file -> defaults', () => {
  assert.deepEqual(loadConfig(), DEFAULTS);
});

test('edits are picked up, partial config merges over defaults', () => {
  write('{"details":"Hi","show":{"status":true}}');
  const c = loadConfig();
  assert.equal(c.details, 'Hi');
  assert.equal(c.show.status, true);
  assert.equal(c.show.model, true); // untouched default
  write('{"details":"Changed"}');
  assert.equal(loadConfig().details, 'Changed');
});

test('invalid JSON or non-object keeps the last good config', () => {
  write('{"details":"Good"}'); loadConfig();
  write('{"details": "oops'); assert.equal(loadConfig().details, 'Good');
  write('null');             assert.equal(loadConfig().details, 'Good');
});

test('deleting the file resets to defaults', () => {
  fs.rmSync(CONFIG_FILE);
  assert.deepEqual(loadConfig(), DEFAULTS);
});
