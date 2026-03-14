# pi-multi-pass

Multi-subscription extension for [pi](https://github.com/badlogic/pi-mono) -- use multiple OAuth accounts per provider with automatic rate-limit rotation and project-level affinity.

## Install

```bash
pi install npm:pi-multi-pass
```

Or via git:

```bash
pi install git:github.com/hjanuschka/pi-multi-pass
```

## Features

- **Multiple subscriptions**: Add extra OAuth accounts for any provider
- **Rotation pools**: Group subscriptions and auto-rotate on rate limits
- **Project affinity**: Restrict which subs/pools are used per project
- **TUI management**: `/subs` and `/pool` commands -- no config files needed
- **Labels**: Tag subscriptions (e.g. "work", "personal")

## Quick start

```
/subs add              Pick a provider, add a subscription
/login                 Authenticate the new subscription
/pool create           Group subs into a rotation pool
```

When one account hits a rate limit, multi-pass automatically switches to the next and retries.

## Commands

### `/subs` -- Subscription management

```
/subs              Open menu
/subs add          Add a new subscription
/subs remove       Remove a subscription
/subs login        Login to a subscription
/subs logout       Logout from a subscription
/subs list         List all subscriptions with auth status
/subs status       Detailed status (token expiry, pool membership)
```

### `/pool` -- Rotation pool management

```
/pool              Open menu
/pool create       Create a pool (pick provider, select members)
/pool list         Show all pools
/pool toggle       Enable/disable a pool
/pool remove       Delete a pool (keeps subscriptions)
/pool status       Member health (logged in, rate limited, cooling down)
/pool project      Project-level config (restrict subs, override pools)
```

## Project-level configuration

Use `/pool project` to configure per-project subscription affinity. This creates `.pi/multi-pass.json` in your project directory.

### Use case: separate work and personal accounts

```
# Global: you have 3 Codex accounts
/subs add   -> openai-codex-2 (label: work)
/subs add   -> openai-codex-3 (label: personal)

# Corp project: restrict to team accounts only
cd ~/work/corp-project
/pool project -> restrict -> select openai-codex-2 only

# Side project: allow everything (no restriction)
cd ~/side-project
# No .pi/multi-pass.json needed -- uses all global subs
```

### What project config can do

| Feature | Description |
|---|---|
| **Restrict subs** | Only allow specific subscriptions in this project |
| **Override pools** | Use different pools than global (or disable some) |
| **Clear** | Remove project config, fall back to global |
| **Info** | Show effective config (which pools/subs are active) |

### Project config file

`.pi/multi-pass.json`:

```json
{
  "allowedSubs": ["openai-codex-2", "anthropic-2"],
  "pools": [
    {
      "name": "work-codex",
      "baseProvider": "openai-codex",
      "members": ["openai-codex-2"],
      "enabled": true
    }
  ]
}
```

- `allowedSubs`: whitelist of provider names. If set, only these (plus originals) are available. Omit to allow all.
- `pools`: if set, replaces global pools for this project. Omit to inherit global pools.

## How pools work

1. You're using `openai-codex` and hit a rate limit
2. Multi-pass detects the error, marks `openai-codex` as exhausted
3. Switches to `openai-codex-2` (same model ID, different account)
4. Retries your last prompt automatically
5. After a 5-minute cooldown, `openai-codex` becomes available again

## Supported providers

| Provider key | Service |
|---|---|
| `anthropic` | Claude Pro/Max |
| `openai-codex` | ChatGPT Plus/Pro (Codex) |
| `github-copilot` | GitHub Copilot |
| `google-gemini-cli` | Google Cloud Code Assist |
| `google-antigravity` | Antigravity |

## Environment variable (optional)

```bash
export MULTI_SUB="openai-codex:2,anthropic:1"
```

Env entries merge with saved config.

## Config files

| File | Scope | Contains |
|---|---|---|
| `~/.pi/agent/multi-pass.json` | Global | Subscriptions + default pools |
| `.pi/multi-pass.json` | Project | Pool overrides + sub restrictions |

## License

MIT
