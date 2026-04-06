# openclaude-mcp

An MCP server that lets you run [OpenClaude](https://github.com/gitlawb/openclaude) — a community fork of the Claude Code harness — against local Ollama models.

**What it does:** you give it a project directory and a prompt, it spawns an OpenClaude subprocess pointed at a local model, and returns the agent's output. No Anthropic API key required for the local path.

---

## How it works

Claude Code (and by extension OpenClaude) is a TypeScript agent harness: it handles tool use, file system access, bash execution, and multi-turn memory. It was designed to talk to Anthropic's API, but the harness itself is model-agnostic. OpenClaude replaces the Anthropic backend with an OpenAI-compatible shim, so you can point it at Ollama instead.

This MCP server wraps that subprocess in a FastMCP 3.2 interface with:

- **Session management** — start/stop OpenClaude processes per project directory
- **KAIROS** — background memory consolidation daemon that maintains `MEMORY.md` between turns
- **ULTRAPLAN** — optional handoff to Claude Opus for complex planning, with local execution of the resulting plan
- **REST bridge** — all MCP tools also available as HTTP endpoints for the React dashboard
- **Fleet dashboard** — React UI at `http://localhost:10933`

---

## Quick start

```powershell
# First run: installs Python deps and Node deps
.\setup.ps1

# Start the MCP server + webapp
.\start.ps1
```

MCP SSE endpoint: `http://localhost:10932/sse`  
Dashboard: `http://localhost:10933`  
Health check: `http://localhost:10932/api/health`

---

## Prerequisites

- [Ollama](https://ollama.ai) running locally with at least one model pulled
- Node.js (for OpenClaude)
- Python 3.13+, uv
- The [OpenClaude](https://github.com/gitlawb/openclaude) repo cloned to `D:\Dev\repos\external\openclaude` and built (`bun run build`)

---

## Models (RTX 4090 / 24 GB VRAM)

| Model | Ollama tag | VRAM | Notes |
|---|---|---|---|
| Gemma 4 26B | `gemma4:26b` | ~17 GB | Default. Good all-rounder, 256K context. |
| Gemma 4 E4B | `gemma4:e4b` | ~9 GB | Faster. Good for KAIROS consolidation loops. |
| Qwen2.5-Coder 32B | `qwen2.5-coder:32b-instruct-q4_K_M` | ~19 GB | Best coding quality available locally. |
| DeepSeek R1 32B | `deepseek-r1:32b` | ~19 GB | Strong reasoning, no tool calling. |

The first call to a model will be slow (~60-90s) while Ollama loads it into VRAM. Subsequent calls in the same session are much faster.

---

## Tool reference

| Tool | Description |
|---|---|
| `start_session(working_dir, model_tag?, enable_kairos?)` | Spawn an OpenClaude subprocess |
| `send_prompt(session_id, prompt)` | Send a prompt, wait for response |
| `session_status(session_id)` | Get current output and process state |
| `list_sessions()` | All active sessions |
| `stop_session(session_id)` | Clean shutdown |
| `kairos_enable(session_id, idle_threshold_seconds?)` | Start background memory consolidation |
| `kairos_disable(session_id)` | Stop it |
| `kairos_log(session_id)` | See what was consolidated |
| `list_models()` | Ollama model inventory + availability |
| `set_default_model(model_tag)` | Change default for new sessions |
| `model_status(model_tag?)` | Check if a model is loaded in VRAM |
| `ultraplan(session_id, goal)` | Plan with Opus, execute locally (requires `ANTHROPIC_API_KEY`) |
| `fleet_dashboard()` | Open the Prefab fleet UI |

---

## Architecture docs

- [The 2026 source leak](docs/01_THE_LEAK.md) — what was leaked, what it contained, what happened next
- [KAIROS: background memory](docs/02_KAIROS_AND_MEMORY.md) — how the autoDream consolidation cycle works
- [ULTRAPLAN](docs/04_ULTRAPLAN.md) — cloud planning + local execution
- [Hardening](docs/05_HARDENING.md) — startup reliability and subprocess isolation

---

## Legal

MIT license. "Claude" is a trademark of Anthropic PBC. OpenClaude is an independent community project.
