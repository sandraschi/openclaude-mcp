# OpenClaude MCP Server

<p align="center">
  <a href="https://github.com/casey/just"><img src="https://img.shields.io/badge/just-ready_to_go-7c5cfc?style=flat-square&logo=just&logoColor=white" alt="Just"></a>
  <a href="https://github.com/astral-sh/ruff"><img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json" alt="Ruff"></a>
  <a href="https://python.org"><img src="https://img.shields.io/badge/Python-3.13+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python"></a>
  <a href="https://biomejs.dev"><img src="https://img.shields.io/badge/Linted_with-Biome-60a5fa?style=flat-square&logo=biome&logoColor=white" alt="Biome"></a>
  <a href="https://github.com/PrefectHQ/fastmcp"><img src="https://img.shields.io/badge/FastMCP-3.2-7c5cfc?style=flat-square" alt="FastMCP"></a>
</p>


> 📖 **[Installation Guide](INSTALL.md)** — quick start, manual setup, and troubleshooting

A high-performance control plane for Ollama-based local LLM sessions, with background memory consolidation (KAIROS), hybrid cloud planning (ULTRAPLAN), and real-time fleet monitoring. Optimized for RTX 4090 environments.

### Features

- **Background Memory (KAIROS)**: Auto-consolidates session data into `MEMORY.md` using asynchronous background cycles. Configurable poll interval and consolidation budget. State persists across restarts.
- **Session Management**: Launch, prompt, monitor, and stop multiple OpenClaude subprocesses concurrently. Persistent across restarts with usage analytics (prompts, output chars, estimated tokens).
- **Multimodal Input**: Send images (png, jpeg, webp, gif) alongside text instructions via the `send_multimodal` tool. Works with any vision-capable Ollama model.
- **Ollama Control Plane**: Model management with VRAM/speed/context metadata, health checks, default persistence.
- **Hybrid Planning (ULTRAPLAN)**: Optional cloud Opus/Sonnet handoff for complex reasoning, local execution. Token cost tracking included.
- **Fleet Observability**: React dashboard with real-time SSE push, xterm.js terminal, system log viewer, KAIROS status, interactive API playground.
- **Interactive Examples**: Live "Run" buttons on every example — calls the real backend, shows response JSON with timing.
- **API Reference**: Searchable documentation with parameter tables, return schemas, env vars, error codes for all 15 tools.
- **Safety Guardrails**: Kid-safe mode with content filters, proactive privacy reminders, caregiver alerts (file + webhook).
- **Dual Transport**: MCP SSE (Claude Desktop) + REST bridge (webapp/curl) on the same port.

---

## Quick Start

```powershell
git clone https://github.com/sandraschi/openclaude-mcp
cd openclaude-mcp
just
```

This opens an interactive dashboard showing all available commands. Run `just bootstrap` to install dependencies, then `just serve` or `just dev` to start.

### Manual Setup

If you don't have `just` installed:
.\setup.ps1
.\start.ps1
- **SSE Endpoint**: `http://localhost:10932/sse`
- **Fleet Dashboard**: `http://localhost:10933`
- **API Events**: `http://localhost:10932/api/events` (SSE push)
- **Health API**: `http://localhost:10932/api/health`
Or with Docker:
docker compose up

## Available Tools (15)

| Tool | Action |
|:---|:---|
| `start_session` | Initialize a new Ollama session |
| `send_prompt` | Execute a prompt in an active session |
| `send_multimodal` | Send text + images to a session (png, jpeg, webp, gif) |
| `session_status` | Get output/status/usage/elapsed of a session |
| `list_sessions` | List all active sessions |
| `stop_session` | Stop and clean up a session |
| `kairos_enable` | Activate background memory consolidation |
| `kairos_disable` | Halt background memory consolidation |
| `kairos_log` | Retrieve KAIROS consolidation log |
| `list_models` | Inventory of available Ollama models |
| `set_default_model` | Set default model for new sessions |
| `model_status` | Check VRAM and load status |
| `ultraplan` | Hybrid cloud/local planning cycle |
| `fleet_dashboard` | Prefab UI fleet status overview |
| `fleet_status` | Raw fleet status JSON |
| `caregiver_alert` | [KID-SAFE] Notify caregivers of high-risk interaction |

---

## Architecture

```
                    ┌─────────────────┐
                    │  Claude Desktop  │── SSE ──────┐
                    │  Cursor / VSCode │             │
                    └─────────────────┘             │
                                                    ▼
┌──────────────┐  REST  ┌────────────────────────────┐  stdio (NDJSON)  ┌──────────────────┐
│  React Webapp│───────►│  server.py (FastMCP 3.2)   │◄────────────────│  OpenClaude CLI   │
│  (SSE push)  │◄───────│  + SessionStore             │    subprocess    │  (Node.js/Bun)    │
└──────────────┘        │  + ModelRouter              │◄───────────────►│  + Ollama :11434  │
                        │  + KairosController         │                 └──────────────────┘
                        │  + SessionPersistence       │
                        │  + SSE Event Bus            │
                        └────────────────────────────┘
```

## Configuration (env vars)

| Variable | Default | Description |
|:---|:---|:---|
| `OPENCLAUDE_MCP_PORT` | `10932` | Backend port |
| `OPENCLAUDE_MCP_TOKEN` | — | REST auth token (disable if unset) |
| `OPENCLAUDE_DIR` | `D:\Dev\repos\external\openclaude` | OpenClaude source path |
| `OPENCLAUDE_ULTRAPLAN_MODEL` | `claude-sonnet-4-6` | Anthropic model for ULTRAPLAN |
| `OPENCLAUDE_CONFIG_DIR` | `~/.config/openclaude` | Persistence directory |
| `KAIROS_POLL_SECONDS` | `30` | KAIROS daemon poll interval |
| `KAIROS_MAX_CONSOLIDATIONS` | `100` | Max consolidations per session |
| `CAREGIVER_WEBHOOK_URL` | — | Webhook for caregiver alerts |

## Prerequisites

- [Ollama](https://ollama.ai) (running locally)
- Node.js (v20+)
- Python 3.13+ with `uv`
- Local model pulled (e.g., `gemma4:26b`, `qwen3.5:35b-a3b`)

## Test Suite

```powershell
uv run pytest                    # 79 tests (unit + smoke + integration + e2e)
uv run pytest tests/unit/        # fast, no external deps
uv run pytest tests/e2e/         # Anthropic API mocked via respx
```

## License

MIT
