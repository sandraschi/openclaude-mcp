# OpenClaude MCP

**Industrial Control Plane for Local Autonomous Engineering**

OpenClaude-MCP is a standardized execution environment for the 2026 Claude Code agentic harness. This repository enables high-fidelity software engineering by routing leaked autonomous logic to **"zeropaid" local models** (Gemma 4, Qwen 3.5), eliminating mandatory dependency on proprietary cloud inference and maximizing technical sovereignty.

---

## Technical Inflection Point: The 2026 Leak

The March 31, 2026 leak of the Claude Code harness constitutes a fundamental shift in AI-assisted engineering — the **leak of the century**. By exposing the machine that orchestrates agentic tool use, it allows for a decoupling of the **Agentic Machine** from the **Inference Engine**.

While the harness originally prioritized Anthropic infrastructure, this control plane validates that agentic engineering is a structural property of the harness itself. By utilizing "Chinese heavyweight" models and SOTA local weights, users can maintain industrial-grade throughput without recurring API overhead.

### Core Architecture
- **Standard Control Plane**: FastMCP 3.2 implementation for local process management.
- **Zeropaid Inference**: Optimized for local execution on RTX 4090 (24GB) and M4 Max (128GB Unified).
- **Sub-Matrix Routing**: Redirects planning requests to high-speed local "Chinese heavyweight" models (Qwen 3.5).

### Technical Documentation
Detailed analysis of the internal mechanics and deployment strategies:
- [01. Chronology of the 2026 Leak](docs/01_THE_LEAK.md) — Analysis of the DMCA cycle and emergence of independent forks.
- [02. KAIROS: Background Memory Consolidation](docs/02_KAIROS_AND_MEMORY.md) — Architectural breakdown of the 4-phase context entropy solution.
- [03. ULTRAPLAN Implementation](docs/04_ULTRAPLAN.md) — Routing strategies for hybrid cloud/local execution loops.

---

## Operational Interface

This MCP server acts as the administrative layer for the underlying Node-based harness. It provides:

1. **Process Lifecycle Management** — Buffered output handling and graceful session termination.
2. **Model Hot-Switching** — Real-time reallocation of Ollama-based inference targets.
3. **KAIROS Oversight** — Configuration and monitoring of background memory daemons.
4. **Industrial Oversight Dashboard** — A React-based interface for multi-session oversight.

## Execution

```powershell
# 1. Initialize environment (dependency audit and global npm linking)
.\setup.ps1

# 2. Launch Control Plane (starts FastMCP server + React UI)
.\start.ps1
```

The industrial oversight dashboard is available at `http://localhost:10911`.

---

## Hardware Benchmarks (RTX 4090 / 24 GB VRAM)

Optimized for high-throughput engineering on modern consumer hardware:

| Model | Ollama Tag | VRAM @ Q4 | Throughput | Role |
|---|---|---|---|---|
| **Gemma 4 26B-A4B** | `gemma4:26b-a4b` | ~9.5 GB | 80-100 tok/s | **Primary Execution** (High Logic Fidelity) |
| **Qwen 3.5 35B MoE** | `qwen3.5:35b-a3b` | ~8.5 GB | 110+ tok/s | **KAIROS Ops** (Maximized Speed) |
| **Qwen 3.5 27B Dense** | `qwen3.5:27b` | ~15 GB | 40-50 tok/s | **Complex Planning** (High Reasoning) |

## Legal and Licensing
OpenClaude-MCP is an original implementation of a control plane targeting the independent community fork of the leaked source. This framework is licensed under MIT. "Claude" is a trademark of Anthropic PBC.
