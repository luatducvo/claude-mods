# usage-limits

A Claude Code CLI mod that shows your **5-hour** and **weekly** usage (used, left, time to reset) in one line above the prompt, styled like token-weather. Includes a `/usage-limits` command for details and a toast when a window reaches 80% / 90%.

Needs a Claude subscription (Pro/Max); figures appear after the session's first response.

## Install on another machine

1. Copy the whole `usage-limits` folder into `~/.claude/mods/` (Windows: `C:\Users\<name>\.claude\mods\`).
2. In `~/.claude/settings.json`, add its path to `env.CLAUDE_CODE_PLUGIN_DIRS` (separate paths with `;` on Windows, `:` on macOS/Linux):

```json
{ "env": { "CLAUDE_CODE_PLUGIN_DIRS": "~/.claude/mods/token-weather;~/.claude/mods/usage-limits" } }
```

3. Restart `claude`.
