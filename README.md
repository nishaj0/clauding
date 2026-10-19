# clauding-discord-presence

Discord Rich Presence for [Claude Code](https://claude.com/claude-code). Shows the model and live token counts while a session is open.

```
Playing Clauding
Claude Code
Sonnet 5.5 · 129k ctx · 63k out
```

- Appears when a session starts, disappears when it ends.
- Everything shown is configurable (see [Configuration](#configuration)).
- No dependencies. Talks to Discord over its local IPC pipe.

Unofficial. Not affiliated with Anthropic or Discord.

## Requirements

- Discord **desktop** app running
- Node.js
- Claude Code
- Tested on Windows 11 only

## Installation

### Plugin (recommended)

```bash
claude plugin marketplace add nishaj0/clauding-discord-presence
claude plugin install clauding-discord-presence@clauding-discord-presence
```

Start a new Claude Code session.

Update:

```bash
claude plugin marketplace update clauding-discord-presence
claude plugin update clauding-discord-presence@clauding-discord-presence
```

Uninstall:

```bash
claude plugin uninstall clauding-discord-presence@clauding-discord-presence
```

### Manual

```bash
git clone https://github.com/nishaj0/clauding-discord-presence.git
cd clauding-discord-presence
node scripts/install.js
```

This adds the hooks to `~/.claude/settings.json` pointing at this folder, so keep the folder where it is. Remove them with `node scripts/install.js --remove`. Use either the plugin or the manual install, not both.

## Configuration

A config file is created at `~/.claude/clauding-presence.json` on the first session start. Edit it and save; changes apply within ~15 seconds.

```json
{
  "details": "Claude Code",
  "state": "{status} · {model} · {ctx} ctx · {out} out",
  "largeText": "{project}",
  "show": { "status": false, "model": true, "tokens": true, "project": true, "timer": true },
  "statusText": { "working": "Working...", "idle": "Idle" },
  "buttons": [{ "label": "Get Clauding", "url": "https://github.com/nishaj0/clauding-discord-presence" }]
}
```

| Option | What it does |
|---|---|
| `details` | Top line. Any text. |
| `state` | Second line. Any text. |
| `largeText` | Tooltip when hovering the crab. |
| `show.status` | Show `statusText.working` / `statusText.idle` (off by default). |
| `show.model` | Show the model name. |
| `show.tokens` | Show context size (`ctx`) and total output tokens (`out`). |
| `show.project` | Make the project folder name available as `{project}`. |
| `show.timer` | Show the elapsed-time counter. |
| `statusText` | The words used for `{status}`. |
| `buttons` | Up to 2 `{label, url}` links on your profile card. `[]` removes them. Other people see them, you don't. |

Placeholders for the text options: `{status}` `{model}` `{ctx}` `{out}` `{project}`.
Segments are separated by ` · `. A segment is left out when it uses a placeholder that is empty or turned off, so turning off `show.tokens` removes `129k ctx · 63k out` and nothing else. Discord needs each line to be at least 2 characters, otherwise it is omitted.

Example, a custom line with the status on:

```json
{
  "details": "Building {project}",
  "state": "{status} · {model}",
  "show": { "status": true, "tokens": false }
}
```

## How it works

Claude Code hooks (`SessionStart`, `UserPromptSubmit`, `Stop`, `SessionEnd`) run `src/presence.js`, which saves the session state and starts a small background process on the first event. That process holds the Discord connection and updates your presence every 15 seconds. The model and token numbers are read from the session transcript on your machine. It exits on `SessionEnd`, when Discord closes, or after 30 minutes without activity.

## Development

```bash
npm test
```

## License

[MIT](LICENSE)
