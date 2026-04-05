# OpenClaude MCP — Assessment & TODOs

Based on deep analysis of the repository. All three technical debt items fixed 2026-04-05.

## Technical Debt & Risks

- [x] **Subprocess Pipe Hanging (`session.py`)**
  ~~The `_read_output` task reads `stdout` endlessly until EOF. During `send()`, the script loops
  up to 60 seconds waiting for the buffer length to stabilize. This heuristic is fragile.~~
  **Fixed:** EOT sentinel pattern. Every prompt gets `__OC_EOT_<session_id>__` appended on a
  separate line. `_read_output` signals an `asyncio.Event` the moment it sees it. `send()` awaits
  the event (timeout 120s) instead of polling output length. Fast, reliable, model-speed-agnostic.

- [x] **Ollama Serial Request Queue (`kairos.py` + Ollama config)**
  ~~Default `OLLAMA_NUM_PARALLEL=1` means KAIROS consolidation and interactive session prompts
  queue serially — one blocks the other.~~
  **Fixed (two parts):**
  1. `OLLAMA_NUM_PARALLEL=2` and `OLLAMA_MAX_QUEUE=8` set via `setx` in `setup.ps1` and already
     applied to current user environment. Restart Ollama for them to take effect.
  2. KAIROS now checks `last_activity` before AND after the Ollama call and aborts the write if
     the session became active during consolidation, so even if queueing occurs the user's
     interactive response is never delayed by a stale consolidation write.

- [x] **`MEMORY.md` Race Conditions (`kairos.py`)**
  ~~The autoDream process reads and overwrites `MEMORY.md` without acquiring a file lock. If the
  openclaude native Node.js process modifies `MEMORY.md` exactly while autoDream is running,
  data could be corrupted.~~
  **Fixed:** `filelock.FileLock` on `MEMORY.md.lock` (sidecar file) wraps both the read (Orient)
  and write (Prune) phases. Timeout 10s — if the lock can't be acquired the cycle is skipped and
  logged rather than corrupting the file. `filelock>=3.13.0` added to `pyproject.toml` deps.

- [x] Resolve `FastMCPApp` import error in `server.py`.
- [x] Fix `fleet_status` `TypeError` (missing `ctx`) in REST handler.
- [x] Run full test suite: `just test` (or qualified `pytest` in venv) — **Passed (73 passed, 3 skipped)**.

## Remaining

- [ ] Finalize testing of ULTRAPLAN handoffs from cloud to local.
- [ ] Complete OpenClaude Node.js wrapper integration tracking (npm install @gitlawb/openclaude).
- [x] Run full test suite: `just test` — **Passed 2026-04-05**.
- [ ] Verify EOT sentinel round-trip with real openclaude once it's on PATH.
