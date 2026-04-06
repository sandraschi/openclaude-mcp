# Changelog

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
