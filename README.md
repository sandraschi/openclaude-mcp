# OpenClaude MCP Server

[![FastMCP Version](https://img.shields.io/badge/FastMCP-3.2.0-blue?style=flat-square&logo=python&logoColor=white)](https://github.com/sandraschi/fastmcp) [![Ruff](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json)](https://github.com/astral-sh/ruff) [![Linted with Biome](https://img.shields.io/badge/Linted_with-Biome-60a5fa?style=flat-square&logo=biome&logoColor=white)](https://biomejs.dev/) [![Built with Just](https://img.shields.io/badge/Built_with-Just-000000?style=flat-square&logo=gnu-bash&logoColor=white)](https://github.com/casey/just)

A high-performance control plane for Ollama-based local LLM sessions and background memory consolidation. Optimized for RTX 4090 environments and large-context model orchestration.

### 🚀 What is this?
If you need a reliable way to manage local LLM sessions, monitor VRAM usage, and maintain a structured memory between tasks without manual overhead—this is for you.

- **Background Memory (KAIROS)**: Automatically consolidates session data into a persistent `MEMORY.md` using asynchronous background cycles.
- **Ollama Control Plane**: Comprehensive toolset for model management, health checks, and high-speed local inference.
- **Hybrid Planning (ULTRAPLAN)**: Optional handoff to Claude Opus for complex reasoning, while maintaining 100% local tool execution.
- **Fleet Observability**: Integrated React dashboard for real-time monitoring of sessions, models, and memory status.

---

## Quick Start

```powershell
# Install dependencies
.\setup.ps1

# Start the MCP server + webapp
.\start.ps1
```

- **SSE Endpoint**: `http://localhost:10932/sse`  
- **Fleet Dashboard**: `http://localhost:10933`  
- **Health API**: `http://localhost:10932/api/health`

---

## Available Tools

| Tool | Action |
|:---|:---|
| `start_session` | Initialize a new Ollama session |
| `send_prompt` | Execute a prompt in an active session |
| `kairos_enable` | Activate background memory consolidation |
| `kairos_disable` | Halt background memory consolidation |
| `list_models` | Inventory of available Ollama models |
| `model_status` | Check VRAM and load status |
| `ultraplan` | Hybrid cloud/local planning cycle |
| `fleet_status` | Global health of the instance |

---

## Architecture

OpenClaude operates as a unified REST bridge for FastMCP, providing a robust integration layer between local LLM runtimes and agentic workflows. It is hardened for Windows environments with UV dependency management and subprocess isolation.

- [Memory Management](docs/02_KAIROS_AND_MEMORY.md) — KAIROS implementation details
- [Hybrid Planning](docs/04_ULTRAPLAN.md) — ULTRAPLAN handoff logic
- [Reliability & Hardening](docs/05_HARDENING.md) — Process management and stability

## Prerequisites

- [Ollama](https://ollama.ai) (running locally)
- Node.js (v20+)
- Python 3.13+ with `uv`
- Local model pulled (e.g., `gemma2`, `llama3.3`)


## 🛡️ Industrial Quality Stack

This project adheres to **SOTA 14.1** industrial standards for high-fidelity agentic orchestration:

- **Python (Core)**: [Ruff](https://astral.sh/ruff) for linting and formatting. Zero-tolerance for `print` statements in core handlers (`T201`).
- **Webapp (UI)**: [Biome](https://biomejs.dev/) for sub-millisecond linting. Strict `noConsoleLog` enforcement.
- **Protocol Compliance**: Hardened `stdout/stderr` isolation to ensure crash-resistant JSON-RPC communication.
- **Automation**: [Justfile](./justfile) recipes for all fleet operations (`just lint`, `just fix`, `just dev`).
- **Security**: Automated audits via `bandit` and `safety`.

## License

MIT
