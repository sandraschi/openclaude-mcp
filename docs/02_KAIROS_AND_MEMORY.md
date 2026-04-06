# KAIROS: Background Memory Consolidation

KAIROS is a background daemon built into Claude Code (and exposed by the 2026 source leak). Its job is to keep `MEMORY.md` useful over long sessions.

## The problem it solves

In a long agentic session, the context window fills up with noise: failed attempts, superseded decisions, raw tool output, repeated errors. The agent starts contradicting itself and forgetting things it decided an hour ago. Forcing the agent to summarise its own context mid-session helps, but interrupts the current chain of thought and adds its own noise.

## How it works

KAIROS runs as a background asyncio task. Every 30 seconds it checks whether the session has been idle for longer than a configurable threshold (default 60s). If so, it runs a four-phase cycle:

1. **Orient** — reads the current `MEMORY.md` from the working directory, acquiring a file lock to prevent concurrent writes
2. **Gather** — collects recent session output (the last few hundred lines of stdout)
3. **Consolidate** — sends the existing memory and the new observations to a local Ollama model with instructions to merge, deduplicate, and resolve contradictions. The model only outputs the updated `MEMORY.md`, nothing else.
4. **Prune** — writes the updated file back under the same file lock

If the session becomes active while the consolidation LLM call is in progress (i.e., someone sent a new prompt), the write is aborted. The existing `MEMORY.md` is left intact and the cycle will retry next time the session goes idle.

## File locking

Both KAIROS and the OpenClaude process can write `MEMORY.md`. We use `filelock.FileLock` on a sidecar file (`MEMORY.md.lock`) with a 10s timeout. If the lock can't be acquired, the consolidation cycle is skipped and logged rather than corrupting the file.

## When to use it

Enable for sessions longer than ~15 minutes, or any session working on a codebase with complex state. Skip it for short tasks or single-file edits — the overhead isn't worth it.

```
kairos_enable(session_id, idle_threshold_seconds=60)
kairos_disable(session_id)
```

**Observability**: KAIROS activity is streamed in real-time to the **Logs** tab in the webapp. This includes exact timestamps for consolidation starts, Ollama call results, and MEMORY.md file lock acquisitions. The legacy `kairos_log()` tool is now deprecated in favor of this unified high-fidelity stream.

KAIROS quality depends on the model doing the consolidation. A faster model (gemma4:e4b) is fine for routine sessions; a stronger one (qwen2.5-coder:32b) produces better results for complex architectural decisions.
