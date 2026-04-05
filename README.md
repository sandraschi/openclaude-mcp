# OpenClaude MCP

An industrial-grade, FastMCP 3.2 control plane for running OpenClaude (the Claude Code harness) locally. Zero cloud token costs. 24/7 on-device agentic operation perfectly tuned for the RTX 4090.

Welcome to the cutting edge of local AI sovereignty. 

> [!TIP]
> **New to OpenClaude?** The leaked Anthropic harness is incredible, but its default configuration is built to burn expensive API credits. This MCP server breaks those chains by plugging into local Ollama models.

## 📚 Deep Dives (The Story & The Architecture)

The March 31, 2026 leak of the Claude Code harness exposed Anthropic's most advanced unreleased agentic features. Rather than cluttering this primary Readme, we've broken down the fascinating history, architecture, and hidden secrets into dedicated guides:

- 📖 **[01. The Great Leak: Forks, Politics, and "API Calls Pfrrrt"](docs/01_THE_LEAK.md)** — The day the walled gardens cracked, the DMCA whack-a-mole, and how local inference changes the game forever.
- 🧠 **[02. KAIROS: The autoDream Daemon](docs/02_KAIROS_AND_MEMORY.md)** — How Anthropic solved "context entropy" with a brilliant 4-phase background memory consolidator.
- 🐈 **[03. Surprises, Secrets, and The Cat](docs/03_SURPRISES_AND_SECRETS.md)** — Decoy generation tools, undercover commit strippers, and the legendary terminal cat easter egg.
- ⚡ **[04. ULTRAPLAN: Cloud Brain, Local Muscle](docs/04_ULTRAPLAN.md)** — The architectural pattern of routing heavy planning to Opus 4.6 while the local 4090 handles the grueling execution loop.

---

## 🚀 Quick Start

> [!IMPORTANT]
> **Prerequisite:** This MCP server acts exclusively as a control plane. You **must** have the underlying harness installed locally on your PC for it to function. Running `.\setup.ps1` will automatically install the `@gitlawb/openclaude` community fork globally via npm.

```powershell
# 1. One-time setup (installs deps + openclaude npm package)
.\setup.ps1

# 2. Start server + webapp (polls until ready, opens browser)
.\start.ps1
```

Once running, the React Webapp will open at `http://localhost:10911`, giving you full control over sessions, models, and KAIROS autoDream settings.

## ⚙️ How it Works

OpenClaude is the community fork of the leaked Claude Code source. Because the core harness expects a cloud API, this MCP server wraps the node application and provides:

1. **Session management** — Graceful start/stop and output buffering.
2. **Model routing** — Switch between Ollama models on the fly.
3. **KAIROS daemon control** — Toggle the autoDream background memory consolidation.
4. **ULTRAPLAN relay** — Intercept planning requests and route them strategically.
5. **Webapp control panel** — A premium React dashboard for oversight.

## 💻 Hardware Configurations

Your local hardware dictates the agent's speed and capability. While the RTX 4090 is the absolute gold standard for zero-cost agentic inference, the control plane is highly adaptable.

### 1. The Gold Standard: RTX 4090 (24 GB VRAM)
On a single 24GB card, you have the headroom to run high-capability models with ample context:

| Model | Ollama Tag | VRAM @ Q4 | Est. Speed | Notes |
|---|---|---|---|---|
| **Gemma 4 26B-A4B** | `gemma4:26b-a4b` | ~9.5 GB | ~80-100 tok/s | **Default.** Sweet spot of VRAM & quality. |
| **Qwen3.5 35B-A3B MoE** | `qwen3.5:35b-a3b` | ~8.5 GB | ~112 tok/s | Fastest runner. Great for lightweight KAIROS loops. |
| **Qwen3.5 27B dense** | `qwen3.5:27b` | ~15 GB | ~40 tok/s | Highest reasoning quality for its size. |

### 2. The 16GB Tier (RTX 4080 / 4070 Ti)
If you are capped at 16GB, avoid the 27B/35B models unless you quantize heavily. You must aggressively manage KAIROS memory limits to prevent out-of-memory (OOM) errors during long reasoning chains.
- **Recommended Model:** `phi-4` (14B) or `qwen3.5:14b` 
- **Tuning:** Constrain the context window to `32K` to ensure the model fits perfectly within your VRAM budget alongside overhead.

### 3. Apple Silicon (M3 / M4 Max)
Hefty Macs with unified memory are exceptionally capable for this workflow. Because the M-series GPU can address up to 128GB of high-bandwidth memory, you can run massive unquantized models (like Llama 3.3 70B) natively. Token throughput is bottlenecked by memory bandwidth (~400 GB/s vs the 4090's 1+ TB/s), but the logic fidelity is incredible.

### 4. Raspberry Pi 5 (16GB) + Goliath Gateway
You can easily spin up the control plane on a Raspberry Pi 5, provided you don't run the inference on it. 
Simply point your `OLLAMA_HOST` variable (or an LM Studio endpoint link) to a dedicated "Goliath-type" GPU server on your local network. The Pi 5 natively handles the FastMCP server, the Vite webapp UI, the subprocess pipes, and file writes, while farming out the heavy matrix multiplication to the big rig.

## 🔌 Claude Desktop Configuration

If you want to invoke OpenClaude sessions directly from Claude Desktop as an MCP server:

```json
{
  "mcpServers": {
    "openclaude-mcp": {
      "command": "C:\\Users\\sandr\\.local\\bin\\uv.exe",
      "args": ["--directory", "D:\\Dev\\repos\\openclaude-mcp", "run", "python", "server.py"]
    }
  }
}
```

## ⚖️ Legal Status
OpenClaude is a clean-room fork derived from the ecosystem following the March 31 2026 leak. While direct mirrors of Anthropic's source map face DMCA takedowns, clean forks have remained unaffected. This specific MCP control plane (`openclaude-mcp`) is original Python/React code and licensed under MIT.
