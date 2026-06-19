"""Session persistence — write/read session metadata and KAIROS state to/from JSON."""

from __future__ import annotations

import asyncio
import json
import os
import time
from pathlib import Path
from typing import Any

from openclaude.logging_util import get_logger

logger = get_logger("session_persistence")

PERSISTENCE_DIR = Path(os.environ.get("OPENCLAUDE_CONFIG_DIR", str(Path.home() / ".config" / "openclaude")))
SESSIONS_FILE = PERSISTENCE_DIR / "sessions.json"
KAIROS_FILE = PERSISTENCE_DIR / "kairos_state.json"
_lock = asyncio.Lock()


def _serialize(snapshot: dict[str, Any]) -> dict[str, Any]:
    return {
        "session_id": snapshot.get("session_id", ""),
        "model": snapshot.get("model", ""),
        "working_dir": snapshot.get("working_dir", ""),
        "status": snapshot.get("status", ""),
        "kairos_enabled": snapshot.get("kairos_enabled", False),
        "pid": snapshot.get("pid"),
        "started_at": time.time() - snapshot.get("elapsed_seconds", 0),
        "usage": snapshot.get("usage", {}),
    }


async def save_sessions(sessions_list: list[Any]) -> None:
    async with _lock:
        try:
            PERSISTENCE_DIR.mkdir(parents=True, exist_ok=True)
            data = [_serialize(s.snapshot()) for s in sessions_list]
            SESSIONS_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
        except OSError as e:
            logger.warning(f"Failed to persist sessions: {e}")


async def load_sessions() -> list[dict[str, Any]]:
    async with _lock:
        try:
            if SESSIONS_FILE.exists():
                return json.loads(SESSIONS_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as e:
            logger.warning(f"Failed to load sessions: {e}")
    return []


async def cleanup_stale() -> None:
    saved = await load_sessions()
    if not saved:
        return

    alive: list[dict[str, Any]] = []
    for s in saved:
        pid = s.get("pid")
        if pid:
            try:
                import signal
                os.kill(pid, signal.Signals.SIG_DFL)
                alive.append(s)
            except (OSError, ProcessLookupError):
                logger.info(f"Cleaning stale session {s.get('session_id')} (pid {pid} gone)")
        else:
            alive.append(s)

    if len(alive) != len(saved):
        async with _lock:
            PERSISTENCE_DIR.mkdir(parents=True, exist_ok=True)
            SESSIONS_FILE.write_text(json.dumps(alive, indent=2), encoding="utf-8")
        logger.info(f"Cleaned {len(saved) - len(alive)} stale sessions")


# ---------------------------------------------------------------------------
# KAIROS state persistence
# ---------------------------------------------------------------------------


async def save_kairos_state(consolidation_count: dict[str, int], thresholds: dict[str, int]) -> None:
    async with _lock:
        try:
            PERSISTENCE_DIR.mkdir(parents=True, exist_ok=True)
            data = {
                "consolidation_count": consolidation_count,
                "thresholds": thresholds,
            }
            KAIROS_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
        except OSError as e:
            logger.warning(f"Failed to persist KAIROS state: {e}")


async def load_kairos_state() -> dict[str, Any]:
    async with _lock:
        try:
            if KAIROS_FILE.exists():
                return json.loads(KAIROS_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as e:
            logger.warning(f"Failed to load KAIROS state: {e}")
    return {}
