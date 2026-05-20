# Changelog

## [0.2.2] - 2026-05-02

### Interactive Examples page + API Reference Page overhaul

#### Examples Page (new)
- **Interactive playground**: Every example has a live "Run" button that calls the real backend — response JSON, timing, loading states.
- **Status bar**: Live Ollama/server health with refresh button at the top of the page.
- **Quick Reference**: List Models and Server Health one-click examples.
- **Full Session Walkthrough**: 3-step sequential flow (start → list → stop) with result chaining — run step 1, pass the session_id to step 2.
- **API Browser**: 4 one-click cards for capabilities, sessions, model status, system logs.

#### Help Page (overhauled)
- **Search bar**: Real-time section filtering across all doc categories.
- **Tool Reference**: All 15 tools documented with parameter tables (name, type, default, description), return value schemas, and curl examples.
- **Environment Variables**: 10-variable reference table with defaults and descriptions.
- **Error Codes**: 9-code troubleshooting table (400/401/404/500/NO_SESSION/ANTHROPIC_*) with meanings and fixes.
- **Model Guide**: Fixed model tags (gemma4:26b, not gemma4:26b-a4b), 7 models with VRAM/speed/context/license.
- **KAIROS/ULTRAPLAN/Safety**: Trimmed lore, focused on technical reference.

#### Navigation
- **New sidebar entry**: "Examples" added between KAIROS and Help.
- **Webapp pages**: 9 total pages (Dashboard, Sessions, Models, KAIROS, Examples, Logs, Help, Settings).

## [0.2.1] - 2026-05-02

### Usage analytics, KAIROS state persistence, multimodal input

#### Usage Analytics
- **Per-session tracking**: `total_prompts`, `total_output_chars`, `estimated_input_tokens` tracked in `OpenClaudeSession`.
- **snapshot()**: Returns `usage` object with all counters. Persisted to disk on shutdown.
- **Turn timing**: `send()` returns `turn_duration_seconds` for performance monitoring.

#### KAIROS State Persistence
- **kairos_state.json**: Consolidation count and thresholds saved per session via `save_kairos_state()` / `load_kairos_state()`.
- **Deferred async init**: `KairosController.load_persisted_state()` called during server lifespan startup. Auto-persists after every `enable`, `disable`, and consolidation cycle.
- Survives server restarts — KAIROS knows which sessions it was tracking and how many consolidations remain.

#### Multimodal Input
- **`send_multimodal` tool**: New 15th MCP tool — accepts `text` + `image_paths` (file paths).
- **Content blocks**: Images are base64-encoded and sent as native Claude Code SDK content blocks (`type: "image"`).
- **Formats**: png, jpeg, webp, gif. Works with any vision-capable Ollama model (llava, qwen-vl, etc.).
- Registered in both FastMCP and REST bridge. Exposed in webapp `api.ts`.

#### Tools: 15 total (added `send_multimodal`)

#### Examples Page
- **New webapp page**: `Examples.tsx` — 6 sections with copy-pasteable curl/Python examples for every tool.
- **Sections**: Quick Reference (all 15 tools), Full Session Walkthrough (7-step code review), Multimodal (image analysis), KAIROS Workflow (memory consolidation), ULTRAPLAN (cloud planning), Python SDK.
- **UX**: Expandable sections with one-click copy buttons. Examples use real session IDs and response JSON.
- **Navigation**: Added "Examples" to sidebar between KAIROS and Help.

## [0.2.0] - 2026-05-02

### Full architecture overhaul — all gaps closed

#### P0 — Broken Features
- **`kairos_log` fixed**: Now filters centralized `GLOBAL_LOG_HANDLER.lines` by session ID tag + internal fallback. KAIROS page in webapp shows real consolidation events.
- **Model tag mismatch fixed**: Removed `gemma4:26b-a4b` fallback everywhere — `model_router.default` is the single source of truth.

#### P1 — Hardening
- **REST auth**: `AuthMiddleware` checks `Authorization: Bearer <token>` when `OPENCLAUDE_MCP_TOKEN` is set. SSE transport exempted for MCP clients.
- **ULTRAPLAN error handling**: Added specific catches for `httpx.TimeoutException` and `httpx.ConnectError`. Configurable model via `OPENCLAUDE_ULTRAPLAN_MODEL` env var (default `claude-sonnet-4-6`). Token cost tracking (input/output tokens logged and returned).
- **Safer Bun install**: `_install_bun()` downloads installer via `httpx.get()` and runs with `create_subprocess_exec`. No more `shell=True`/`iex` pipe.
- **Structured logging**: All bare `except Exception: pass` replaced with `logger.warning/exc_info`.

#### P2 — Feature Completion
- **Caregiver alert delivery**: Logs to persistent file (`%TEMP%/openclaude_caregiver_alerts.log`) + optional webhook via `CAREGIVER_WEBHOOK_URL` env var.
- **Model default persistence**: Saved to `~/.config/openclaude/default_model.json`. Loads on startup — survives restarts.
- **KAIROS consolidation budget**: `KAIROS_MAX_CONSOLIDATIONS` env var (default 100). Loop exits when reached.
- **Configurable KAIROS poll interval**: `KAIROS_POLL_SECONDS` env var (was hardcoded 30).

#### P3 — Architecture Improvements
- **Fleet data unified**: Single `_build_fleet_data()` helper powers both `fleet_dashboard` (Prefab UI) and `fleet_status` (raw JSON). No duplicated logic.
- **Session persistence**: `openclaude/session_persistence.py` — JSON-based metadata store. On shutdown, saves session state. On startup, loads and reports count. Stale PID auto-cleanup.
- **SSE push for webapp**: `GET /api/events` SSE endpoint broadcasts `sessions` and `logs` events. Webapp uses `EventSource` — no more 8s polling.

#### P4 — Polish
- **xterm duplicate cleanup**: Removed unused `xterm` v5 and `xterm-addon-fit` v0.8 packages.
- **LogBuffer shim removed**: Uses `GLOBAL_LOG_HANDLER.lines` directly.
- **start.ps1**: Dependency checks (uv, ollama), port clearing, uv sync, health-gate loop (30s timeout), live output capture.
- **Configurable `OPENCLAUDE_DIR`**: `OPENCLAUDE_DIR` env var. Defaults to `D:\Dev\repos\external\openclaude`.
- **Docker Compose**: Full stack (`docker-compose.yml` + `Dockerfile` + nginx config) — ollama/mcp/webapp.
- **CI/CD**: `.github/workflows/ci.yml` — ruff + pytest on push/PR.
- **ULTRAPLAN e2e tests**: 5 tests with `respx`-mocked Anthropic API — happy path, timeout, connect error, no key, missing session.
- **Tests**: 79/79 passing (was 74/74 + 5 new e2e).

## [0.1.4] - 2026-04-06

### Hardened Startup & High-Fidelity Logging
- **Nuclear Port Clearing**: `start.ps1` now aggressively terminates processes on ports 10932 and 10933 before launch, preventing "Address already in use" failures.
- **Backend Health Gating**: Added mandatory health check in `start.ps1` (via `/api/health`) before starting the webapp, ensuring frontend requests never hit a dead backend.
- **Unified Log Engine**: Implemented `openclaude/logging_util.py` to consolidate all application logic from Session Manager and KAIROS.
- **Real-Time Logger Page**: Added a new "Logs" tab to the webapp for live, terminal-style visibility into session starts, KAIROS consolidation, and turn completions.
- **Noise Suppression**: Automated filtering of redundant health/Ollama polling from the log stream for cleaner debugging.
- **Architecture Sync**: Updated `docs/architecture.md` with NDJSON v2 protocol details and centralized logging specifications.

## [0.1.3] - 2026-04-06

### Docs
- README rewritten: removed hype copy ("zeropaid", "industrial control plane", "leak of the century", "Chinese heavyweight", "sub-matrix routing"). Now describes what the project actually does in plain terms.
- `docs/01_THE_LEAK.md` — stripped editorial framing, kept the factual account of what was in the leak and what happened
- `docs/02_KAIROS_AND_MEMORY.md` — rewrote as a technical reference: problem, mechanism, file locking, when to use
- `docs/04_ULTRAPLAN.md` — rewrote as a practical guide: when to use it, how it works, cost

## [0.1.2] - 2026-04-06

### Critical fix: session protocol rewrite (v3)

Full account of the bug cascade that prevented any response from OpenClaude:

- **Bug 1 (v1 sentinel)**: Raw text EOT sentinel sent to stdin. openclaude calls `JSON.parse()` on every stdin line — the sentinel caused a parse failure and `process.exit(1)`. Every `send_prompt()` silently killed the subprocess.
- **Bug 2 (v2 --print only)**: `--print` without `--input-format=stream-json` means the prompt is read from `argv`, not stdin. Our NDJSON messages were ignored.
- **Bug 3 (stream-json without --verbose)**: openclaude rejects `--output-format=stream-json` without `--verbose` and exits with an error message to stderr.
- **Bug 4 (wrong provider env var)**: `CLAUDE_CODE_USE_OPENAI=1` was removed on the assumption it wasn't real. It is real — it's what actually activates the OpenAI/Ollama provider path. Without it, openclaude uses stored OAuth credentials, which were expired → 401.
- **Bug 5 (wrong model tag)**: `gemma4:26b-a4b` doesn't exist in Ollama. Actual tag is `gemma4:26b`.
- **Bug 6 (timeout too short)**: `gemma4:26b` cold-loads from disk in ~77s. The 120s timeout was marginal; bumped to 180s.

Final working launch flags: `--print --input-format=stream-json --output-format=stream-json --verbose --dangerously-skip-permissions`

Final working env: `CLAUDE_CODE_USE_OPENAI=1`, `OPENAI_BASE_URL=http://localhost:11434/v1`, `OPENAI_MODEL=<tag>`, `OPENAI_API_KEY=ollama`, `OLLAMA_BASE_URL=http://localhost:11434`

Model tags in `model_router.py` updated to match actual Ollama inventory on Goliath.

## [0.1.1] - 2026-04-06

### Hardening
- `start.ps1`: dependency audits, stale `.venv` lock recovery, `cmd.exe /c npm run dev` for stable Node invocation
- `vite.config.ts`: `host: true` to fix IPv4/IPv6 hang on cold start
- `webapp/webapp_startup.log`: real-time startup diagnostics
- Justfile: escaped `$$` in PowerShell dashboard commands

## [0.1.0] - 2026-04-05

### Initial fixes
- EOT sentinel pattern replacing output-length polling (later superseded)
- `OLLAMA_NUM_PARALLEL=2`, `OLLAMA_MAX_QUEUE=8` in `setup.ps1`
- `filelock.FileLock` on `MEMORY.md` in KAIROS
- `FastMCPApp` import error fixed, `fleet_status` REST handler fixed
- Test suite: 73 passed, 3 skipped
