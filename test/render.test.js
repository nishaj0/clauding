const test = require('node:test'), assert = require('node:assert');
const { buildActivity, prettyModel, fill } = require('../src/render');
const { DEFAULTS } = require('../src/config');

const state = { project: 'my-app', since: 1_700_000_000_000, model: 'claude-sonnet-5-5', ctx: 128671, out: 63140, busy: true };
const cfg = (over = {}) => ({ ...DEFAULTS, ...over, show: { ...DEFAULTS.show, ...over.show } });

test('prettyModel', () => {
  assert.equal(prettyModel('claude-sonnet-5-5'), 'Sonnet 5.5');
  assert.equal(prettyModel('claude-opus-4-1-20250805'), 'Opus 4.1');
  assert.equal(prettyModel('claude-3-5-sonnet-20241022'), 'Sonnet 3.5');
});

test('defaults: model + tokens, no status, button, timer', () => {
  const a = buildActivity(state, cfg());
  assert.equal(a.details, 'Claude Code');
  assert.equal(a.state, 'Sonnet 5.5 · 129k ctx · 63k out');
  assert.equal(a.assets.large_text, 'my-app');
  assert.equal(a.timestamps.start, 1_700_000_000);
  assert.equal(a.buttons.length, 1);
});

test('status toggle', () => {
  assert.match(buildActivity(state, cfg({ show: { status: true } })).state, /^Working\.\.\. · Sonnet/);
  assert.match(buildActivity({ ...state, busy: false }, cfg({ show: { status: true } })).state, /^Idle · /);
});

test('toggles drop their segments and fields', () => {
  const a = buildActivity(state, cfg({ show: { tokens: false, project: false, timer: false } }));
  assert.equal(a.state, 'Sonnet 5.5');
  assert.equal(a.assets.large_text, undefined);
  assert.equal(a.timestamps, undefined);
});

test('fresh session (no usage yet) omits state instead of printing blanks', () => {
  const a = buildActivity({ project: 'p', since: 1000 }, cfg());
  assert.equal(a.state, undefined);
});

test('custom text and button validation', () => {
  const a = buildActivity(state, cfg({
    details: 'Shipping {project}', state: 'vibes',
    buttons: [{ label: 'ok', url: 'https://x.dev' }, { label: 'bad', url: 'javascript:1' }, { label: 'b', url: 'http://y' }, { label: 'c', url: 'http://z' }],
  }));
  assert.equal(a.details, 'Shipping my-app');
  assert.equal(a.state, 'vibes');
  assert.deepEqual(a.buttons.map(b => b.label), ['ok', 'b']);
});

test('fill drops empty segments only', () => {
  assert.equal(fill('{a} · x · {b}', { a: '', b: 'B' }), 'x · B');
});
