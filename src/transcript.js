// Model + token usage, read from the Claude Code session transcript (JSONL).
const fs = require('fs');

// ctx = size of the latest request (input + cached); out = total output tokens this session.
function readUsage(file, prev) {
  const res = { model: prev.model, ctx: prev.ctx, out: prev.out };
  try {
    let out = 0;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      if (!line.includes('"usage"')) continue;
      const m = JSON.parse(line).message;
      if (!m || !m.usage || m.model === '<synthetic>') continue;
      const u = m.usage;
      res.model = m.model;
      res.ctx = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
      out += u.output_tokens || 0;
    }
    if (out) res.out = out;
  } catch {}
  return res;
}

module.exports = { readUsage };
