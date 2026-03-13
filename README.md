# multi-pass

Multi-subscription extension for [pi](https://github.com/badlogic/pi-mono) -- use multiple OAuth accounts per provider.

If you have multiple ChatGPT, Claude, Copilot, or other subscription accounts, this extension lets you log in to all of them and switch between accounts via `/model`.

## Install

```bash
pi install git:github.com/hjanuschka/multi-pass
```

Or with npm (once published):

```bash
pi install npm:pi-multi-pass
```

## Configuration

Set the `MULTI_SUB` environment variable with the providers and number of extra accounts:

```bash
export MULTI_SUB="openai-codex:1,anthropic:1"
```

This creates:
- `openai-codex-2` -- a second Codex subscription with its own OAuth login
- `anthropic-2` -- a second Anthropic subscription with its own OAuth login

For more accounts, increase the count:

```bash
# 3 total Codex accounts (original + 2 extra)
export MULTI_SUB="openai-codex:2"
```

This creates `openai-codex-2` and `openai-codex-3`.

## Supported providers

| Provider key | Service | Login flow |
|---|---|---|
| `anthropic` | Claude Pro/Max | Browser + paste code |
| `openai-codex` | ChatGPT Plus/Pro (Codex) | Browser + local callback |
| `github-copilot` | GitHub Copilot | Device code flow |
| `google-gemini-cli` | Google Cloud Code Assist | Browser + local callback |
| `google-antigravity` | Antigravity (Gemini 3, Claude, GPT-OSS) | Browser + local callback |

## Usage

1. Set `MULTI_SUB` in your shell profile (`.bashrc`, `.zshrc`, etc.)
2. Start pi
3. Run `/login` and select the new provider (e.g., "ChatGPT Plus/Pro (Codex) #2")
4. Complete the OAuth flow for your second account
5. Use `/model` to switch between accounts -- models are suffixed with `(#2)`, `(#3)`, etc.

Each account has independent OAuth tokens and rate limits, stored separately in `auth.json`.

## How it works

- Dynamically clones models from the built-in provider using `getModels()`, so new models added in pi updates are picked up automatically
- Reuses the built-in OAuth login/refresh functions and API stream handlers
- Each cloned provider gets a unique name (e.g., `anthropic-2`) with separate auth storage
- GitHub Copilot's dynamic base URL (`modifyModels`) is handled correctly
- If `MULTI_SUB` is unset, the extension does nothing

## Example

```bash
# Two Codex accounts + two Claude accounts + one extra Copilot
export MULTI_SUB="openai-codex:2,anthropic:2,github-copilot:1"
pi
```

This registers:
- `openai-codex-2`, `openai-codex-3` with models like "GPT-5.2 (#2)", "GPT-5.2 (#3)"
- `anthropic-2`, `anthropic-3` with models like "Claude Sonnet 4.5 (#2)", "Claude Sonnet 4.5 (#3)"
- `github-copilot-2` with models like "Claude Sonnet 4.5 (#2)", "GPT-5.1 (#2)"

## License

MIT
