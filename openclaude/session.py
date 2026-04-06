"""
Session lifecycle — start/stop/snapshot OpenClaude subprocesses.

OpenClaude is a Node.js CLI that implements the Claude Code SDK wire protocol:
- stdin:  NDJSON lines, each a StdinMessage (type: 'user' | 'control_response' | ...)
- stdout: NDJSON lines, each a StdoutMessage (type: 'assistant' | 'system' | 'result' | ...)

Key message types we care about:
  stdin  → {"type":"user","session_id":"","message":{"role":"user","content":"..."},"parent_tool_use_id":null}
  stdout ← {"type":"assistant","message":{...}}        — model response chunks
  stdout ← {"type":"system","subtype":"turn_complete"} — turn is done
  stdout ← {"type":"result","subtype":"success",...}   — print-mode final result

The subprocess is launched with --print so it runs in SDK/non-interactive mode
and exits after each turn (or stays alive if we keep piping — print mode stays
alive as long as stdin stays open in piped mode).

--- History ---

v1 (2026-04-05): EOT sentinel approach — BROKEN. openclaude calls JSON.parse()
  on every stdin line. Sending a raw "__OC_EOT__" string causes JSON.parse()
  to throw and the process calls process.exit(1). This is why no responses
  were ever received.

v2 (2026-04-06): NDJSON protocol — correct. User messages sent as JSON objects,
  turn completion detected by watching for 'system'/'turn_complete' or
  'result'/'success' stdout messages.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import os
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from openclaude.logging_util import get_logger

logger = get_logger("session")

# Timeout waiting for turn_complete before giving up and returning partial output.
# gemma4:26b cold-loads from disk in ~77s on Goliath — keep headroom above that.
SEND_TIMEOUT_SECONDS = 180

# Default paths for zero-friction startup
OPENCLAUDE_DIR = Path(r"D:\Dev\repos\external\openclaude")
DEFAULT_WORKING_DIR = Path(r"D:\Dev\repos\claude-code-1")


@dataclass
class OpenClaudeSession:
    session_id: str
    working_dir: Path
    model: str
    env: dict[str, str]
    kairos_enabled: bool = False
    mcp_config_path: str | None = None

    # Optional activity callback — set by server after session creation
    on_activity: Callable | None = field(default=None, init=False, repr=False)

    _process: asyncio.subprocess.Process | None = field(default=None, init=False, repr=False)
    _started_at: float = field(default_factory=time.time, init=False, repr=False)
    _last_output: str = field(default="", init=False, repr=False)
    _status: str = field(default="pending", init=False, repr=False)
    _output_buffer: list[str] = field(default_factory=list, init=False, repr=False)
    _messages: list[dict[str, str]] = field(default_factory=list, init=False, repr=False)

    # Per-turn signalling: event set when turn_complete/result arrives
    # Only one send() at a time is supported (openclaude is sequential per session).
    _turn_event: asyncio.Event = field(default_factory=asyncio.Event, init=False, repr=False)
    _turn_response_lines: list[str] = field(default_factory=list, init=False, repr=False)
    _turn_in_flight: bool = field(default=False, init=False, repr=False)

    # -------------------------------------------------------------------------
    # Provisioning helpers
    # -------------------------------------------------------------------------

    async def _install_bun(self) -> None:
        """Detect and install Bun if missing."""
        try:
            proc = await asyncio.create_subprocess_shell(
                "bun --version", stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            await proc.wait()
            if proc.returncode == 0:
                return
        except Exception:
            pass

        self._last_output = "Provisioning: Bun missing. Installing via PowerShell..."
        install_cmd = 'powershell -c "irm bun.sh/install.ps1|iex"'
        proc = await asyncio.create_subprocess_shell(
            install_cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT
        )
        stdout, _ = await proc.communicate()
        if proc.returncode != 0:
            raise RuntimeError(f"Bun installation failed: {stdout.decode()}")

        bun_bin = Path(os.environ.get("USERPROFILE", "")) / ".bun" / "bin"
        if bun_bin.exists():
            path = os.environ.get("PATH", "")
            if str(bun_bin) not in path:
                os.environ["PATH"] = f"{bun_bin};{path}"

        self._last_output = "Provisioning: Bun installed successfully."

    async def _run_build(self) -> None:
        """Run the build command to generate dist/cli.mjs."""
        self._last_output = "Provisioning: Building OpenClaude (npm run build)..."
        proc = await asyncio.create_subprocess_exec(
            "npm",
            "run",
            "build",
            cwd=str(OPENCLAUDE_DIR),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            env=os.environ.copy(),
        )
        if proc.stdout:
            while True:
                line = await proc.stdout.readline()
                if not line:
                    break
                decoded = line.decode(errors="replace").strip()
                if decoded:
                    self._last_output = f"Provisioning (Build): {decoded}"
        await proc.wait()
        if proc.returncode != 0:
            raise RuntimeError("OpenClaude build failed. Check logs.")
        self._last_output = "Provisioning: Build completed successfully."

    async def _check_provisioning(self) -> None:
        """Ensure dependencies are installed and project is built."""
        if not OPENCLAUDE_DIR.exists():
            raise FileNotFoundError(f"OpenClaude clone not found at {OPENCLAUDE_DIR}")

        node_modules = OPENCLAUDE_DIR / "node_modules"
        if not node_modules.exists():
            self._last_output = "Provisioning: Running 'npm install'..."
            proc = await asyncio.create_subprocess_exec(
                "npm",
                "install",
                cwd=str(OPENCLAUDE_DIR),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
            )
            stdout, _ = await proc.communicate()
            if proc.returncode != 0:
                raise RuntimeError(f"npm install failed: {stdout.decode()}")
            self._last_output = "Provisioning: npm dependencies installed."

        dist_file = OPENCLAUDE_DIR / "dist" / "cli.mjs"
        if not dist_file.exists():
            await self._install_bun()
            await self._run_build()

    def _resolve_command(self) -> list[str]:
        """Resolve the best way to run OpenClaude, preferring the built MJS."""
        dist_mjs = OPENCLAUDE_DIR / "dist" / "cli.mjs"
        if dist_mjs.exists():
            return ["node", str(dist_mjs)]

        entrypoint = OPENCLAUDE_DIR / "src" / "entrypoints" / "cli.tsx"
        if entrypoint.exists():
            return ["npx", "tsx", str(entrypoint)]

        return ["openclaude"]  # Global fallback

    # -------------------------------------------------------------------------
    # Startup
    # -------------------------------------------------------------------------

    async def start(self) -> None:
        """Kick off provisioning and startup in a background task."""
        if str(self.working_dir) in (".", "", "None"):
            self.working_dir = DEFAULT_WORKING_DIR

        self._status = "provisioning"
        logger.info(f"[{self.session_id}] Starting session (working_dir: {self.working_dir})")
        asyncio.create_task(self._startup_sequence())

    async def _startup_sequence(self) -> None:
        """Internal sequence: Provision -> Launch."""
        try:
            await self._check_provisioning()

            # Security: whitelist-based env var filtering
            whitelist = {
                "PATH",
                "HOME",
                "USERPROFILE",
                "APPDATA",
                "LOCALAPPDATA",
                "LANG",
                "LC_ALL",
                "TERM",
                "TEMP",
                "TMP",
            }
            project_prefixes = ("OPENCLAUDE_", "ANTHROPIC_", "OLLAMA_")

            full_env = {}
            for key, value in os.environ.items():
                if key in whitelist or key.startswith(project_prefixes):
                    full_env[key] = value

            full_env.update(self.env)
            self.working_dir.mkdir(parents=True, exist_ok=True)

            cmd = self._resolve_command()
            # Protocol flags for SDK/non-interactive piped mode:
            # --print:                    non-interactive mode (read from stdin, exit when done)
            # --input-format=stream-json: treat stdin as NDJSON SDKUserMessage stream
            # --output-format=stream-json: write NDJSON SDKMessage stream to stdout
            # --verbose:                  required by openclaude when using stream-json output
            cmd_full = [
                *cmd,
                "--print",
                "--input-format=stream-json",
                "--output-format=stream-json",
                "--verbose",
                "--dangerously-skip-permissions",
            ]
            if self.mcp_config_path:
                cmd_full.extend(["--mcp-config", self.mcp_config_path])
            
            logger.info(f"[{self.session_id}] Executing: {' '.join(cmd_full)}")
            self._last_output = f"Starting session: {' '.join(cmd_full)}"

            self._process = await asyncio.create_subprocess_exec(
                *cmd_full,
                cwd=str(self.working_dir),
                env=full_env,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,  # Separate stderr so it doesn't pollute NDJSON stdout
            )
            self._status = "running"
            logger.info(f"[{self.session_id}] Process started (pid: {self._process.pid})")
            asyncio.create_task(self._read_stdout())
            asyncio.create_task(self._drain_stderr())

        except Exception as e:
            self._status = "error"
            self._last_output = f"STARTUP ERROR: {e}"

    # -------------------------------------------------------------------------
    # Output readers
    # -------------------------------------------------------------------------

    async def _drain_stderr(self) -> None:
        """Drain stderr into the log buffer (doesn't affect NDJSON stdout)."""
        if not self._process or not self._process.stderr:
            return
        try:
            while True:
                line = await self._process.stderr.readline()
                if not line:
                    break
                decoded = line.decode(errors="replace").rstrip()
                if decoded:
                    self._output_buffer.append(f"[stderr] {decoded}")
                    if len(self._output_buffer) > 200:
                        self._output_buffer = self._output_buffer[-200:]
                    self._last_output = "\n".join(self._output_buffer[-50:])
        except Exception:
            pass

    async def _read_stdout(self) -> None:
        """Background task: read NDJSON stdout, collect turn responses, signal completion."""
        if not self._process or not self._process.stdout:
            return
        try:
            while True:
                line_bytes = await self._process.stdout.readline()
                if not line_bytes:
                    break
                line = line_bytes.decode(errors="replace").strip()
                if not line:
                    continue

                # Always log to rolling buffer for debugging / KAIROS observations
                self._output_buffer.append(line)
                if len(self._output_buffer) > 200:
                    self._output_buffer = self._output_buffer[-200:]
                self._last_output = "\n".join(self._output_buffer[-50:])

                # Parse NDJSON message
                try:
                    msg = json.loads(line)
                except json.JSONDecodeError:
                    # Non-JSON line (e.g. startup banner) — log and continue
                    continue

                msg_type = msg.get("type", "")

                # Collect assistant text into the current turn's response
                if msg_type == "assistant":
                    if self._turn_in_flight:
                        # Extract text content from the assistant message
                        message = msg.get("message", {})
                        content = message.get("content", [])
                        if isinstance(content, list):
                            for block in content:
                                if isinstance(block, dict) and block.get("type") == "text":
                                    self._turn_response_lines.append(block.get("text", ""))
                        elif isinstance(content, str):
                            self._turn_response_lines.append(content)

                # Turn complete signals
                elif msg_type == "system":
                    subtype = msg.get("subtype", "")
                    if subtype == "turn_complete" and self._turn_in_flight:
                        self._turn_event.set()

                elif msg_type == "result":
                    # print-mode final result — also signals end of turn
                    if self._turn_in_flight:
                        # result may carry the full response text
                        result_text = msg.get("result", "")
                        if result_text and result_text not in self._turn_response_lines:
                            self._turn_response_lines.append(result_text)
                        self._turn_event.set()

        except Exception:
            pass
        if self._status == "running":
            self._status = "stopped"
        # Signal any waiting send() calls that we're done
        self._turn_event.set()

    # -------------------------------------------------------------------------
    # Public API
    # -------------------------------------------------------------------------

    async def send(self, prompt: str) -> dict[str, Any]:
        """Send a prompt via NDJSON protocol and wait for turn_complete."""
        if not self._process or self._status != "running":
            return {
                "error": f"Session {self.session_id} not running (status: {self._status})",
                "hint": self._last_output[-300:] if "ERROR" in self._last_output else None,
            }

        if self.on_activity:
            self.on_activity()

        # Prepare turn state
        self._turn_event.clear()
        self._turn_response_lines = []
        self._turn_in_flight = True

        # Build NDJSON user message (Claude Code SDK wire protocol)
        user_msg = {
            "type": "user",
            "session_id": "",
            "message": {"role": "user", "content": prompt},
            "parent_tool_use_id": None,
        }
        payload = json.dumps(user_msg, ensure_ascii=False) + "\n"

        try:
            logger.info(f"[{self.session_id}] Send prompt: {prompt[:100]}{'...' if len(prompt) > 100 else ''}")
            self._process.stdin.write(payload.encode("utf-8"))
            await self._process.stdin.drain()

            # Optimistically add user message to history
            self._messages.append({"role": "user", "content": prompt})
            if len(self._messages) > 100: # Slightly larger buffer for history
                self._messages = self._messages[-100:]

            # Wait for turn_complete or timeout
            try:
                await asyncio.wait_for(self._turn_event.wait(), timeout=SEND_TIMEOUT_SECONDS)
                response_text = "\n".join(self._turn_response_lines).strip()
                if not response_text:
                    response_text = "(empty response — model may still be starting up)"
            except TimeoutError:
                response_text = "\n".join(self._turn_response_lines).strip()
                if not response_text:
                    response_text = f"(timeout after {SEND_TIMEOUT_SECONDS}s — model may still be processing)"

            # Store assistant response
            if response_text:
                self._messages.append({"role": "assistant", "content": response_text})
                if len(self._messages) > 100:
                    self._messages = self._messages[-100:]

            logger.info(f"[{self.session_id}] Turn complete ({len(self._turn_response_lines)} response blocks)")
            self._last_output = "\n".join(self._output_buffer[-50:])
            return {
                "session_id": self.session_id,
                "output": response_text,
                "model": self.model,
            }

        except BrokenPipeError:
            self._status = "stopped"
            return {"error": "Process terminated during send."}
        except Exception as e:
            return {"error": str(e)}
        finally:
            self._turn_in_flight = False

    async def stop(self) -> None:
        if self._process and self._process.returncode is None:
            # Unblock any waiting send()
            self._turn_event.set()
            with contextlib.suppress(Exception):
                self._process.stdin.write_eof()
            with contextlib.suppress(Exception):
                await asyncio.wait_for(self._process.wait(), timeout=5)
            if self._process.returncode is None:
                self._process.terminate()
                try:
                    await asyncio.wait_for(self._process.wait(), timeout=5)
                except TimeoutError:
                    self._process.kill()
        if self.mcp_config_path:
            with contextlib.suppress(Exception):
                os.remove(self.mcp_config_path)
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
            "messages": self._messages,
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
