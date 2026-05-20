"""
KAIROS autoDream daemon controller.

KAIROS (Ancient Greek: "the right moment") is the autonomous background daemon
from the Claude Code leak (src/services/autoDream/).

When a session is idle, it:
  1. Orient     — reads MEMORY.md from the working directory (under filelock)
  2. Gather     — collects recent session output as observations
  3. Consolidate — calls the local Ollama model to merge, deduplicate, harden
  4. Prune      — rewrites MEMORY.md (under filelock)

--- Bug fixes (ref: TODO.md, 2026-04-05) ---

Fix 2a — filelock on MEMORY.md:
  Both KAIROS and the native openclaude process may write MEMORY.md. Without a
  lock, concurrent writes corrupt the file. We use filelock.FileLock on a
  sidecar file (MEMORY.md.lock) so reads and writes are always serialised.

Fix 2b — abort consolidation if session becomes active mid-cycle:
  If a prompt arrives during a long consolidation LLM call, we were blocking
  Ollama for the user. Now we check last_activity both before AND after the
  Ollama call and abort if the session went active, leaving the existing
  MEMORY.md intact.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from pathlib import Path
from typing import Any

import httpx

try:
    from filelock import FileLock
    from filelock import Timeout as FileLockTimeout

    _FILELOCK_AVAILABLE = True
except ImportError:
    _FILELOCK_AVAILABLE = False

    # Graceful no-op fallback — install filelock: uv sync
    class FileLock:  # type: ignore[no-redef]
        def __init__(self, path, timeout=10) -> None:
            self._path = path

        def __enter__(self):
            return self

        def __exit__(self, *a):
            pass

    class FileLockTimeout(Exception):
        pass  # type: ignore[no-redef]


import contextlib

from openclaude.logging_util import get_logger
from openclaude.session import SessionStore
from openclaude.session_persistence import load_kairos_state, save_kairos_state

logger = get_logger("kairos")

OLLAMA_BASE = "http://localhost:11434"
LOCK_TIMEOUT = 10  # seconds to wait for MEMORY.md lock before giving up
POLL_SECONDS = int(os.environ.get("KAIROS_POLL_SECONDS", "30"))
MAX_CONSOLIDATIONS = int(os.environ.get("KAIROS_MAX_CONSOLIDATIONS", "100"))

CONSOLIDATION_SYSTEM = """You are a memory consolidation agent. You will receive:
1. The current MEMORY.md content (existing durable facts about this project)
2. New observations from this session's logs

Your task:
- Merge new observations into the existing memory
- Remove any contradictions (keep the most recent / most specific fact)
- Convert vague observations ("might be", "possibly") into concrete facts where evidence supports it
- Prune redundant or superseded entries
- Output ONLY the updated MEMORY.md content — no preamble, no explanation

Format: markdown. Use ## sections for different concern areas (Architecture, Bugs, Decisions, TODOs).
Keep it concise. Every line should earn its place."""

CONSOLIDATION_PROMPT = """Current MEMORY.md:
---
{memory}
---

New observations from this session:
---
{observations}
---

Output the updated MEMORY.md:"""


class KairosController:
    def __init__(self, sessions: SessionStore, log_handler: logging.Handler | None = None) -> None:
        self._sessions = sessions
        self._tasks: dict[str, asyncio.Task] = {}
        self._logs: dict[str, list[str]] = {}
        self._thresholds: dict[str, int] = {}
        self._last_activity: dict[str, float] = {}
        self._log_handler = log_handler
        self._consolidation_count: dict[str, int] = {}
        self._state_loaded = False

    async def load_persisted_state(self) -> None:
        if self._state_loaded:
            return
        self._state_loaded = True
        try:
            saved = await load_kairos_state()
            if saved:
                self._consolidation_count.update(saved.get("consolidation_count", {}))
                self._thresholds.update(saved.get("thresholds", {}))
                active = {k: v for k, v in self._consolidation_count.items() if v < MAX_CONSOLIDATIONS}
                if active:
                    logger.info(f"Restored KAIROS state for {len(active)} session(s)")
        except Exception as e:
            logger.debug(f"KAIROS state restore skipped: {e}")

    async def _persist(self) -> None:
        try:
            await save_kairos_state(self._consolidation_count, self._thresholds)
        except Exception as e:
            logger.debug(f"KAIROS state persist failed: {e}")

    def record_activity(self, session_id: str) -> None:
        """Reset the idle timer. Called on every send_prompt."""
        self._last_activity[session_id] = time.time()

    async def attach(self, session_id: str, idle_threshold: int = 60) -> None:
        await self.enable(session_id, idle_threshold)

    async def detach(self, session_id: str) -> None:
        await self.disable(session_id)

    async def enable(self, session_id: str, idle_threshold_seconds: int = 60) -> dict[str, Any]:
        if session_id in self._tasks and not self._tasks[session_id].done():
            return {"session_id": session_id, "kairos": "already_running"}
        self._thresholds[session_id] = idle_threshold_seconds
        self._logs.setdefault(session_id, [])
        self._last_activity[session_id] = time.time()
        self._tasks[session_id] = asyncio.create_task(self._daemon_loop(session_id, idle_threshold_seconds))
        await self._persist()
        return {
            "session_id": session_id,
            "kairos": "enabled",
            "idle_threshold_seconds": idle_threshold_seconds,
            "filelock_available": _FILELOCK_AVAILABLE,
        }

    async def disable(self, session_id: str) -> dict[str, Any]:
        task = self._tasks.pop(session_id, None)
        if task and not task.done():
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task
        await self._persist()
        return {"session_id": session_id, "kairos": "disabled"}

    async def get_log(self, session_id: str, lines: int = 50) -> dict[str, Any]:
        centralized: list[str] = []
        if self._log_handler and hasattr(self._log_handler, "lines"):
            tag = f"[{session_id}]"
            all_lines = self._log_handler.lines
            centralized = [l for l in all_lines if tag in l]
        internal = self._logs.get(session_id, [])
        combined = centralized + internal
        return {
            "session_id": session_id,
            "lines": combined[-lines:],
            "total_entries": len(combined),
        }

    # -------------------------------------------------------------------------
    # Internal daemon loop
    # -------------------------------------------------------------------------

    async def _daemon_loop(self, session_id: str, idle_threshold: int) -> None:
        log = self._logs.setdefault(session_id, [])
        self._consolidation_count.setdefault(session_id, 0)

        while True:
            await asyncio.sleep(POLL_SECONDS)

            session = self._sessions.get(session_id)
            if not session or session.snapshot()["status"] != "running":
                logger.info(f"[{session_id}] Session gone or stopped. KAIROS exiting.")
                break

            if self._consolidation_count[session_id] >= MAX_CONSOLIDATIONS:
                logger.info(f"[{session_id}] Reached max {MAX_CONSOLIDATIONS} consolidations. KAIROS disabling.")
                break

            last_active = self._last_activity.get(session_id, time.time())
            idle_seconds = int(time.time() - last_active)

            if idle_seconds < idle_threshold:
                continue

            logger.info(f"[{session_id}] Idle for {idle_seconds}s. Starting autoDream consolidation #{self._consolidation_count[session_id] + 1}...")
            try:
                result = await self._consolidate(session, log)
                if result.get("skipped"):
                    pass
                elif result.get("aborted"):
                    logger.info(f"[{session_id}] Consolidation aborted — session became active.")
                else:
                    self._consolidation_count[session_id] += 1
                    await self._persist()
                    logger.info(f"[{session_id}] Consolidation #{self._consolidation_count[session_id]} complete. MEMORY.md updated ({result.get('memory_length', '?')} chars).")
                self._last_activity[session_id] = time.time()
            except Exception as e:
                logger.error(f"[{session_id}] Consolidation error: {e}")

    async def _consolidate(self, session, log: list) -> dict[str, Any]:
        """
        Run one autoDream consolidation cycle.

        Returns one of:
          {"skipped": True}   — no observations to consolidate
          {"aborted": True}   — session became active during Ollama call
          {"memory_length": int, "model": str} — success
        """
        working_dir = Path(session.working_dir)
        model = session.model
        memory_path = working_dir / "MEMORY.md"
        lock_path = working_dir / "MEMORY.md.lock"

        # 1. Orient — read current MEMORY.md under lock
        try:
            with FileLock(str(lock_path), timeout=LOCK_TIMEOUT):
                if memory_path.exists():
                    memory_content = memory_path.read_text(encoding="utf-8", errors="replace")
                else:
                    memory_content = "# Project Memory\n\n(no entries yet)\n"
                    memory_path.write_text(memory_content, encoding="utf-8")
        except FileLockTimeout:
            logger.warning(f"[{session.session_id}] Could not acquire MEMORY.md lock — skipping.")
            return {"skipped": True}

        # 2. Gather — collect recent session output
        snap = session.snapshot()
        observations = snap.get("last_output_preview", "")
        if not observations:
            logger.info(f"[{session.session_id}] No new observations to consolidate. Skipping.")
            return {"skipped": True}

        # 3. Consolidate — Ollama call (potentially long)
        # Record activity timestamp before call so we can detect if user resumed
        activity_before = self._last_activity.get(session.session_id, 0.0)

        prompt = CONSOLIDATION_PROMPT.format(
            memory=memory_content[:4000],
            observations=observations[:2000],
        )

        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                f"{OLLAMA_BASE}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": CONSOLIDATION_SYSTEM},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.2,
                    "stream": False,
                },
            )
            response.raise_for_status()
            data = response.json()

        # Fix 2b — abort if session became active during the Ollama call
        activity_after = self._last_activity.get(session.session_id, 0.0)
        if activity_after > activity_before:
            # User sent a prompt while we were consolidating — don't overwrite
            return {"aborted": True}

        updated_memory = data["choices"][0]["message"]["content"].strip()

        # 4. Prune — write updated MEMORY.md under lock
        try:
            with FileLock(str(lock_path), timeout=LOCK_TIMEOUT):
                memory_path.write_text(updated_memory, encoding="utf-8")
        except FileLockTimeout:
            logger.warning(f"[{session.session_id}] Could not acquire MEMORY.md lock for write — skipping.")
            return {"skipped": True}

        return {"memory_length": len(updated_memory), "model": model}
