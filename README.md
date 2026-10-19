# Clauding — Discord Rich Presence for Claude Code

Show on your Discord profile that you're using [Claude Code](https://claude.com/claude-code): a crab icon, the model you're on, and live context / output token counts.

```
Playing Clauding
Claude Code
Sonnet 5.5 · 129k ctx · 63k out
00:42 elapsed
```

- Appears when a Claude Code session **starts**, disappears when it **ends**.
- No idle/working flicker, nothing to configure.
- Tiny: one background Node process (~55 MB, wakes every 15 s), **zero dependencies**. Talks to Discord over its local IPC pipe, no web API, no tokens, no network access.

> Unofficial community project, not affiliated with or endorsed by Anthropic or Discord. The crab is original pixel art inspired by the Claude Code mascot.

## Requirements

- Node.js 18+
- Discord **desktop** app running (the browser version has no local IPC)
- Claude Code with hooks support
- Tested on Windows 11. The code also has macOS/Linux pipe paths (`$XDG_RUNTIME_DIR/discord-ipc-N`) but they are untested, so reports are welcome.

## Install

```bash
git clone https://github.com/nishaj0/clauding-discord-presence.git
cd clauding-discord-presence
node install.js
```

That adds four hooks (`SessionStart`, `UserPromptSubmit`, `Stop`, `SessionEnd`) to `~/.claude/settings.json`, pointing at `presence.js` in this folder, so don't move or delete the folder afterwards. Start a new Claude Code session and check your profile.

Uninstall: `node install.js --remove`

## How it works

```
Claude Code hook ──▶ presence.js (writes state.json, starts daemon if needed)
                                   │
                    daemon ◀───────┘   reads state every 15 s
                       │
                       └── Discord IPC pipe ──▶ SET_ACTIVITY
```

- The hook reads the session transcript (`transcript_path` from the hook input) to get the latest model and token usage. **ctx** = size of the last request (input + cached tokens), **out** = total output tokens this session. Nothing is read beyond that and nothing leaves your machine except what Discord itself displays.
- `SessionEnd` makes the daemon exit. It also exits if Discord quits, or after 30 minutes without any hook event (crashed session).
- State lives in `%TEMP%/claude-discord-presence/`.

## Use your own Discord app (optional)

`presence.js` ships with the Application ID of the public "Clauding" app, which is fine to use (an Application ID is public, not a secret). To brand it yourself:

1. Create an app at <https://discord.com/developers/applications>. The name is what shows after "Playing". Discord rejects names containing "Claude".
2. Upload `claude_code.png` under **Rich Presence → Art Assets** with the key `claude_code`.
3. Set your Application ID: `export DISCORD_CLIENT_ID=123...` (or edit `CLIENT_ID` in `presence.js`).

`node make-logo.js` regenerates `claude_code.png` (pure Node, no dependencies).

## Troubleshooting

| Problem | Fix |
|---|---|
| Nothing shows up | Discord desktop must be open. Check *Settings → Activity Privacy → Share your detected activities*. |
| Image missing | New art assets can take a few minutes to propagate. The key must be exactly `claude_code`. |
| Stale card after a crash | It clears itself within 30 min, or kill the `node` process whose PID is in `%TEMP%/claude-discord-presence/daemon.pid`. |

## License

MIT, see [LICENSE](LICENSE).
