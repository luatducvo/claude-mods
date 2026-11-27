# claude-mods

My Claude Code mods.

| Mod | What it does |
| --- | --- |
| `token-weather` | Context window "weather" forecast above the prompt |
| `usage-limits` | 5-hour and weekly usage (used / left / reset) above the prompt, `/usage-limits` command, 80% / 90% warnings |

## Install

At a Claude Code prompt:

```
/plugin install usage-limits --marketplace luatducvo/claude-mods
/plugin install token-weather --marketplace luatducvo/claude-mods
```

Answer `y` to add the marketplace, then pick a scope.

## Develop from this folder

Point `env.CLAUDE_CODE_PLUGIN_DIRS` in `~/.claude/settings.json` at the mod folders (`;` on Windows, `:` on macOS/Linux):

```json
{ "env": { "CLAUDE_CODE_PLUGIN_DIRS": "D:/repos/claude-mods/token-weather;D:/repos/claude-mods/usage-limits" } }
```

Edits reload live in an interactive session.
