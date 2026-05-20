# OpenClaude MCP — Assessment & TODOs

## Completed 2026-05-02 — all gaps fixed

### P0 — Broken Features
- [x] **Fix `kairos_log`** — Now filters centralized `GLOBAL_LOG_HANDLER.lines` by session ID tag (`[session_id]`). Returns real KAIROS events. Webapp Kairos page works.
- [x] **Fix model tag mismatch** — Removed `gemma4:26b-a4b` fallback from `fleet_dashboard`. Now uses `model_router.default`. Webapp store also fixed.

### P1 — Hardening
- [x] **Add REST auth** — `AuthMiddleware` checks `Authorization: Bearer <token>` when `OPENCLAUDE_MCP_TOKEN` env var is set (SSE exempted for MCP clients).
- [x] **Fix ULTRAPLAN error handling** — Added specific catches for `httpx.TimeoutException`, `httpx.ConnectError`.
- [x] **Make ULTRAPLAN model configurable** — `OPENCLAUDE_ULTRAPLAN_MODEL` env var, defaults to `claude-sonnet-4-6`.
- [x] **Replace `_install_bun()` shell=True** — Downloads installer via `httpx.get()`, executes with `create_subprocess_exec`. No more `powershell -c "irm ...|iex"`.

### P2 — Feature Completion
- [x] **Implement caregiver_alert delivery** — Logs to persistent file (`%TEMP%/openclaude_caregiver_alerts.log`) + optional webhook via `CAREGIVER_WEBHOOK_URL` env var (POSTs JSON payload).
- [x] **Persist model defaults** — Saved to `~/.config/openclaude/default_model.json`. On startup, `ModelRouter` reads saved default. `set_default_model` persists.
- [x] **Add ULTRAPLAN token cost tracking** — Returns `usage.input_tokens` and `usage.output_tokens` in response. Logged to server.
- [x] **Configurable KAIROS poll interval** — `KAIROS_POLL_SECONDS` env var (default 30).

### P3 — Architecture Improvements
- [x] **Unify `fleet_dashboard` and `fleet_status`** — Single `_build_fleet_data()` helper. Both tools call it. No duplicated iteration logic.
- [x] **Add KAIROS consolidation budget** — `KAIROS_MAX_CONSOLIDATIONS` env var (default 100). After reaching limit, KAIROS disables with log message.
- [x] **Fix test_startup.py** — Removed `fleet_app` ImportError. Updated model tag test from `gemma4:26b-a4b` to `gemma4:26b`.

### P4 — Polish
- [x] **Clean up xterm duplicates** — Removed `xterm` v5 and `xterm-addon-fit` v0.8 packages (unused). Only `@xterm/xterm` v6 and `@xterm/addon-fit` v0.11 remain.
- [x] **Remove LogBuffer shim** — Uses `GLOBAL_LOG_HANDLER.lines` directly. No more compatibility wrapper.
- [x] **Add structured logging** — Replaced all bare `except Exception: pass` with `logger.warning/exc_info` in `_read_stdout`, `_drain_stderr`.
- [x] **Bulk up start.ps1** — Added: dependency checks (uv, ollama), port clearing, uv sync, health-gate loop (30s timeout), live output capture.
- [x] **Configurable OPENCLAUDE_DIR** — `OPENCLAUDE_DIR` env var, defaults to `D:\Dev\repos\external\openclaude`.
