"""
Session lifecycle — start/stop/snapshot OpenClaude subprocesses.

OpenClaude is a Node.js CLI. It runs interactively, reading prompts from
stdin and writing responses to stdout.

--- Bug fixes (ref: TODO.md, 2026-04-05) ---

Fix 1 — EOT sentinel (replaces fragile time-based stabilisation heuristic):
  We append a unique sentinel string to every prompt. The background reader
  watches for it and signals an asyncio.Event the moment it appears. This
  means send() returns immediately when the response is complete rather than
  polling for 3 seconds of output silence, which was both slow and broken for
  slow models that pause mid-response.

  Sentinel format:  __OC_EOT_<session_id>__
  It is appended after the user prompt separated by a newline, so openclaude
  echoes it back at the end of its reply. We strip it from the output.
"""

from __future__ import annotations

import asyncio
import os
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# Timeout waiting for EOT sentinel before giving up and returning partial output
SEND_TIMEOUT_SECONDS = 120


@dataclass
class OpenClaudeSession:
    session_id: str
    working_dir: Path
    model: str
    env: dict[str, str]
    kairos_enabled: bool = False

    # Optional activity callback — set by server after session creation
    on_activity: Callable | None = field(default=None, init=False, repr=False)

    _process: asyncio.subprocess.Process | None = field(default=None, init=False, repr=False)
    _started_at: float = field(default_factory=time.time, init=False, repr=False)
    _last_output: str = field(default="", init=False, repr=False)
    _status: str = field(default="pending", init=False, repr=False)
    _output_buffer: list[str] = field(default_factory=list, init=False, repr=False)

    # EOT signalling: maps sentinel_string → asyncio.Event
    _eot_events: dict[str, asyncio.Event] = field(default_factory=dict, init=False, repr=False)
    # Per-sentinel capture buffer: maps sentinel_string → lines collected since send()
    _eot_buffers: dict[str, list[str]] = field(default_factory=dict, init=False, repr=False)

    @property
    def _sentinel(self) -> str:
        return f"__OC_EOT_{self.session_id}__"

    async def start(self) -> None:
        """Launch openclaude subprocess in the working directory."""
        # Security Hardening: Sanitize environment variables to prevent leaks.
        # We whitelist only essential variables and project-specific ones.
        whitelist = {"PATH", "HOME", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "LANG", "LC_ALL", "TERM", "TEMP", "TMP"}
        # Include specific OpenClaude or Anthropic config if provided
        project_prefixes = ("OPENCLAUDE_", "ANTHROPIC_", "OLLAMA_")

        full_env = {}
        for key, value in os.environ.items():
            if key in whitelist or key.startswith(project_prefixes):
                full_env[key] = value

        # Merge session-specific env overrides
        full_env.update(self.env)

        self.working_dir.mkdir(parents=True, exist_ok=True)

        # Audit Log (Red-Flag detection support)

        try:
            self._process = await asyncio.create_subprocess_exec(
                "openclaude",
                "--dangerously-skip-permissions",
                cwd=str(self.working_dir),
                env=full_env,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
            )
            self._status = "running"
            asyncio.create_task(self._read_output())
        except FileNotFoundError:
            self._status = "error"
            self._last_output = (
                "ERROR: 'openclaude' not found on PATH. Install with: npm install -g @gitlawb/openclaude"
            )
        except Exception as e:
            self._status = "error"
            self._last_output = f"ERROR: {e}"

    async def _read_output(self) -> None:
        """Background task: continuously read stdout, signal EOT events."""
        if not self._process:
            return
        try:
            while True:
                line = await self._process.stdout.readline()
                if not line:
                    break
                decoded = line.decode(errors="replace").rstrip()

                # Check if this line contains any pending EOT sentinel
                for sentinel, event in list(self._eot_events.items()):
                    if sentinel in decoded:
                        # Strip the sentinel from the line before buffering
                        clean = decoded.replace(sentinel, "").strip()
                        if clean and sentinel in self._eot_buffers:
                            self._eot_buffers[sentinel].append(clean)
                        event.set()
                        continue
                    # Normal line — append to this sentinel's capture buffer
                    if sentinel in self._eot_buffers:
                        self._eot_buffers[sentinel].append(decoded)

                # Always append to the rolling global buffer
                self._output_buffer.append(decoded)
                if len(self._output_buffer) > 200:
                    self._output_buffer = self._output_buffer[-200:]
                self._last_output = "\n".join(self._output_buffer[-50:])

        except Exception:
            pass
        if self._status == "running":
            self._status = "stopped"

    async def send(self, prompt: str) -> dict[str, Any]:
        """Send a prompt to stdin and wait for the EOT sentinel response."""
        if not self._process or self._status != "running":
            return {
                "error": f"Session {self.session_id} not running (status: {self._status})",
                "hint": self._last_output if "ERROR" in self._last_output else None,
            }

        if self.on_activity:
            self.on_activity()

        sentinel = self._sentinel
        event = asyncio.Event()
        self._eot_events[sentinel] = event
        self._eot_buffers[sentinel] = []

        try:
            # Send prompt + sentinel on a separate line.
            # openclaude will echo the sentinel back when it finishes responding.
            payload = f"{prompt}\n{sentinel}\n"
            self._process.stdin.write(payload.encode())
            await self._process.stdin.drain()

            # Wait for the sentinel to appear in stdout (with timeout)
            try:
                await asyncio.wait_for(event.wait(), timeout=SEND_TIMEOUT_SECONDS)
                response_lines = self._eot_buffers.get(sentinel, [])
                response_text = "\n".join(response_lines) if response_lines else "(empty response)"
            except TimeoutError:
                response_lines = self._eot_buffers.get(sentinel, [])
                response_text = (
                    "\n".join(response_lines)
                    if response_lines
                    else f"(timeout after {SEND_TIMEOUT_SECONDS}s — model still running)"
                )

            self._last_output = "\n".join(self._output_buffer[-50:])
            return {
                "session_id": self.session_id,
                "output": response_text,
                "model": self.model,
            }
        except BrokenPipeError:
            self._status = "stopped"
            return {"error": "Process pipe broken — session likely exited"}
        except Exception as e:
            return {"error": str(e)}
        finally:
            # Always clean up sentinel tracking
            self._eot_events.pop(sentinel, None)
            self._eot_buffers.pop(sentinel, None)

    async def stop(self) -> None:
        if self._process and self._process.returncode is None:
            # Signal any waiting send() calls that we're done
            for event in self._eot_events.values():
                event.set()
            try:
                self._process.stdin.write(b"/exit\n")
                await self._process.stdin.drain()
                await asyncio.wait_for(self._process.wait(), timeout=5)
            except Exception:
                pass
            if self._process.returncode is None:
                self._process.terminate()
                try:
                    await asyncio.wait_for(self._process.wait(), timeout=5)
                except TimeoutError:
                    self._process.kill()
        self._status = "stopped"

    def snapshot(self) -> dict[str, Any]:
        elapsed = int(time.time() - self._started_at)
        proc_alive = self._process is not None and self._process.returncode is None
        return {
            "session_id": self.session_id,
            "model": self.model,
            "working_dir": str(self.working_dir),
            "status": self._status if proc_alive else "stopped",
            "kairos_enabled": self.kairos_enabled,
            "elapsed_seconds": elapsed,
            "last_output_preview": self._last_output[:500] if self._last_output else "",
            "pid": self._process.pid if self._process else None,
            "output_lines": len(self._output_buffer),
        }


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, OpenClaudeSession] = {}

    def get(self, session_id: str) -> OpenClaudeSession | None:
        return self._sessions.get(session_id)

    async def add(self, session: OpenClaudeSession) -> None:
        self._sessions[session.session_id] = session

    def remove(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)

    def all(self) -> list[OpenClaudeSession]:
        return list(self._sessions.values())
