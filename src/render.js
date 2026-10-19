// State + config -> Discord activity payload. Pure, so it is unit-tested.
const k = n => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(n));

// claude-sonnet-5-5 -> "Sonnet 5.5"
function prettyModel(id = '') {
  const m = id.match(/claude-(?:(\d+)-(\d+)-)?([a-z]+)(?:-(\d+))?(?:-(\d+))?/);
  if (!m) return id || 'Claude';
  const ver = m[1] ? `${m[1]}.${m[2]}` : m[4] ? (m[5] && m[5].length < 3 ? `${m[4]}.${m[5]}` : m[4]) : '';
  return `${m[3][0].toUpperCase()}${m[3].slice(1)} ${ver}`.trim();
}

// Fill {placeholders}; drop any " · "-separated segment that references an empty value.
function fill(template, vars) {
  return String(template).split(' · ').map(seg => {
    let missing = false;
    const out = seg.replace(/\{(\w+)\}/g, (_, key) => { if (!vars[key]) missing = true; return vars[key] || ''; });
    return missing ? null : out;
  }).filter(s => s !== null).join(' · ');
}

function buildActivity(state, cfg) {
  const { show } = cfg, hasUsage = show.tokens && state.ctx != null;
  const vars = {
    status: show.status ? (state.busy ? cfg.statusText.working : cfg.statusText.idle) : '',
    model: show.model && state.model ? prettyModel(state.model) : '',
    ctx: hasUsage ? k(state.ctx) : '',
    out: hasUsage && state.out != null ? k(state.out) : '',
    project: show.project ? state.project : '',
  };
  const text = tpl => fill(tpl, vars).slice(0, 128); // Discord: 2..128 chars
  const activity = {};
  const details = text(cfg.details), line = text(cfg.state), tip = text(cfg.largeText);
  if (details.length >= 2) { activity.details = details; activity.status_display_type = 2; } // show details as the status line
  if (line.length >= 2) activity.state = line;
  activity.assets = { large_image: 'claude_code', ...(tip.length >= 2 && { large_text: tip }) };
  if (show.timer) activity.timestamps = { start: Math.floor(state.since / 1000) };
  const buttons = (Array.isArray(cfg.buttons) ? cfg.buttons : [])
    .filter(b => b && b.label && /^https?:\/\//.test(b.url)).slice(0, 2)
    .map(b => ({ label: String(b.label).slice(0, 32), url: b.url }));
  if (buttons.length) activity.buttons = buttons;
  return activity;
}

module.exports = { buildActivity, prettyModel, fill };
