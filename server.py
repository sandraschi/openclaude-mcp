"""
openclaude-mcp  —  FastMCP 3.2 server + Starlette REST bridge

FastMCP 3.2 features used:
  - lifespan context manager (startup health check, graceful shutdown)
  - mcp.http_app(transport="sse")  — ASGI SSE transport mount
  - FastMCPApp + @app.ui()         — Prefab fleet dashboard (requires fastmcp[apps])
  - mcp.add_provider(fleet_app)    — Provider composition pattern
  - Context | None                 — tools callable from both MCP and REST

Two transports on port 10932:
  /sse            → FastMCP SSE (Claude Desktop, Cursor, other MCP clients)
  /tools/{name}   → REST JSON bridge (webapp, curl)
  /api/health     → health check
  /api/capabilities → capabilities

Prefab UI (FastMCPApp):
  fleet_dashboard  — @app.ui() entry point → calls app.tool() backend tools
  Requires: uv sync --extra apps  (installs prefab-ui)
  Without prefab-ui installed the fleet_app is registered but ui() calls
  return a plain JSON fallback so the server still starts cleanly.
"""

from __future__ import annotations

import json
import os
import tempfile
import traceback
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import httpx
import logging
import time
import uvicorn
from fastmcp import Context, FastMCP
from fastmcp.apps import FastMCPApp
from starlette.applications import Starlette
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Mount, Route

from openclaude.kairos import KairosController
from openclaude.model_router import ModelRouter
from openclaude.session import OpenClaudeSession, SessionStore
from openclaude.logging_util import logger as app_logger, get_logger

# ---------------------------------------------------------------------------
# Logging — capture logs for web UI
# ---------------------------------------------------------------------------

class WebLogHandler(logging.Handler):
    def __init__(self, max_lines: int = 200) -> None:
        super().__init__()
        self.lines: list[str] = []
        self.max_lines = max_lines

    def emit(self, record: logging.LogRecord) -> None:
        try:
            # Skip noise: health checks and periodic polls
            if "/api/health" in record.getMessage() or "/api/tags" in record.getMessage():
                return
            
            msg = self.format(record)
            ts = time.strftime("%H:%M:%S", time.localtime(record.created))
            
            # Add level marker for browser console coloring
            level = f"[{record.levelname}]"
            line = f"[{ts}] {level} {msg}"
            
            self.lines.append(line)
            if len(self.lines) > self.max_lines:
                self.lines.pop(0)
        except Exception:
            self.handleError(record)

# Attach WebLogHandler to our unified app logger
GLOBAL_LOG_HANDLER = WebLogHandler()
GLOBAL_LOG_HANDLER.setFormatter(logging.Formatter('%(message)s'))
app_logger.addHandler(GLOBAL_LOG_HANDLER)

# Root logger — still route console output but keep it quiet
logging.getLogger().setLevel(logging.WARNING)

# Uvicorn loggers — attach our handler directly so we see startup events
for log_name in ["uvicorn", "uvicorn.error", "uvicorn.access"]:
    uv_logger = logging.getLogger(log_name)
    uv_logger.addHandler(GLOBAL_LOG_HANDLER)
    uv_logger.propagate = False # avoid double logs

class LogBuffer:
    """Compatibility shim for existing GLOBAL_LOGS.lines references."""
    @property
    def lines(self) -> list[str]:
        return GLOBAL_LOG_HANDLER.lines

GLOBAL_LOGS = LogBuffer()
logger = get_logger("server")

# ---------------------------------------------------------------------------
# Core objects
# ---------------------------------------------------------------------------

sessions = SessionStore()
model_router = ModelRouter()
kairos = KairosController(sessions)

OLLAMA_BASE = "http://localhost:11434"
BACKEND_PORT = int(os.environ.get("OPENCLAUDE_MCP_PORT", "10932"))

# ---------------------------------------------------------------------------
# FastMCPApp — Prefab fleet dashboard
# Gracefully degrades if prefab-ui not installed
# ---------------------------------------------------------------------------

fleet_app = FastMCPApp("fleet")

try:
    from prefab_ui.components import Badge, Column, Row, Table, Text  # type: ignore[import]

    _PREFAB_AVAILABLE = True
except ImportError:
    _PREFAB_AVAILABLE = False


@fleet_app.ui(description="Show live OpenClaude fleet status as a Prefab dashboard")
async def fleet_dashboard(ctx: Context) -> dict[str, Any]:
    """Entry-point UI tool — the model calls this to open the fleet dashboard."""
    all_sessions = sessions.all()
    model_data = await model_router.list_models()
    default_model = model_data.get("default", "gemma4:26b-a4b")
    ollama_ok = model_data.get("ollama_running", False)
    running = [s for s in all_sessions if s.snapshot()["status"] == "running"]
    kairos_active = [s for s in running if s.kairos_enabled]

    if not _PREFAB_AVAILABLE:
        # Plain dict fallback — still useful without prefab-ui
        return {
            "active_sessions": len(running),
            "kairos_daemons": len(kairos_active),
            "default_model": default_model,
            "ollama": "online" if ollama_ok else "offline",
            "sessions": [s.snapshot() for s in all_sessions],
            "_note": "Install fastmcp[apps] for rich Prefab UI rendering",
        }

    rows = [
        {
            "ID": s.snapshot()["session_id"],
            "Model": s.snapshot()["model"].split(":")[0],
            "Dir": str(s.working_dir)[-40:],
            "Status": s.snapshot()["status"],
            "KAIROS": "yes" if s.kairos_enabled else "-",
            "Uptime": f"{s.snapshot()['elapsed_seconds']}s",
        }
        for s in all_sessions
    ]

    return Column(
        Row(
            Badge(f"Sessions: {len(running)}", color="green" if running else "gray"),
            Badge(f"KAIROS: {len(kairos_active)}", color="amber" if kairos_active else "gray"),
            Badge(f"Ollama: {'online' if ollama_ok else 'offline'}", color="green" if ollama_ok else "red"),
            Badge(f"Default: {default_model.split(':')[0]}", color="blue"),
        ),
        Table(data=rows) if rows else Text("No sessions running.", variant="muted"),
    )


@fleet_app.tool(model=True, description="Get raw fleet status data")
async def fleet_status(ctx: Context | None = None) -> dict[str, Any]:
    """Backend tool — also visible to the model (model=True)."""
    all_sessions = sessions.all()
    model_data = await model_router.list_models()
    return {
        "active_sessions": len([s for s in all_sessions if s.snapshot()["status"] == "running"]),
        "total_sessions": len(all_sessions),
        "kairos_active": len([s for s in all_sessions if s.kairos_enabled]),
        "default_model": model_data.get("default"),
        "ollama_running": model_data.get("ollama_running", False),
    }


# ---------------------------------------------------------------------------
# FastMCP 3.2 — lifespan
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(server: FastMCP) -> Any:  # noqa: ANN401
    print(f"openclaude-mcp starting on :{BACKEND_PORT}")
    print(f"  Prefab UI: {'available' if _PREFAB_AVAILABLE else 'not installed (run: uv sync --extra apps)'}")
    print(f"  Default model: {model_router.default}")
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            r = await client.get(f"{OLLAMA_BASE}/api/tags")
            models = [m["name"] for m in r.json().get("models", [])]
            print(f"  Ollama OK — {len(models)} model(s)")
    except Exception:
        print("  WARNING: Ollama not reachable on :11434")
    yield
    print("Shutting down — stopping all sessions...")
    for s in sessions.all():
        await s.stop()


mcp = FastMCP(
    name="openclaude-mcp",
    version="0.1.0",
    instructions=(
        "Control plane for OpenClaude — run the Claude Code harness against "
        "local Ollama models. Zero cloud token cost. Supports KAIROS autoDream "
        "memory consolidation and optional ULTRAPLAN cloud planning relay."
    ),
    lifespan=lifespan,
)

# Register the fleet_app as a provider
mcp.add_provider(fleet_app)

# ---------------------------------------------------------------------------
# Safety & Policy Helpers
# ---------------------------------------------------------------------------


def get_safety_prompt(mode: str) -> str:
    """Return a system prompt fragment for the given safety mode."""
    if mode == "kid-safe":
        return (
            "SAFETY POLICY (Kid-Safe v1.0): You are an educational mentor for a 12-year-old. "
            "Maintain a calm, encouraging, and informative tone. Avoid extreme emotions. "
            "CONTENT FILTERS: "
            "1. Sex Ed: Provide only clinical, age-appropriate biological facts. No parasexuality. "
            "2. Violence: No hyperviolence or gore. "
            "3. Self-Harm: No discussion of self-harm or eating disorders. "
            "4. Medical: Provide only restricted, conservative clinical information. "
            "TRANSPARENCY: If you refuse a request or filter content, you MUST explain your reasoning "
            "clearly and kindly. "
            "PROACTIVE SAFETY: Every 5-10 turns, insert a brief, friendly reminder about online privacy, "
            "safety, and the importance of verifying information with parents/guardgivers. "
            "IMPORTANT: For high-risk topics (illegal drugs/harm), you MUST call the `caregiver_alert` "
            "tool immediately."
        )
    return ""


@mcp.tool()
async def caregiver_alert(session_id: str, risk_topic: str, reason: str, ctx: Context | None = None) -> dict[str, Any]:
    """[KID-SAFE] Notify caregivers of high-risk interaction attempt.

    Args:
        session_id: Current session identifier.
        risk_topic: The topic of concern (e.g. 'drugs', 'self-harm').
        reason: Context for why this was flagged.
    """
    alert_msg = f"[CAREGIVER ALERT] Session: {session_id} | Topic: {risk_topic} | Reason: {reason}"
    if ctx:
        ctx.info(alert_msg)
    else:
        print(f"\n{alert_msg}\n")

    return {
        "success": True,
        "message": "Caregivers have been notified of this high-risk request.",
        "alert_logged": True,
    }


# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------


@mcp.tool()
async def list_models(ctx: Context | None = None) -> dict[str, Any]:
    """List available Ollama models and their readiness for agentic tool use."""
    return await model_router.list_models()


@mcp.tool()
async def set_default_model(model_tag: str, ctx: Context | None = None) -> dict[str, Any]:
    """Set the default Ollama model for new OpenClaude sessions.

    Args:
        model_tag: Ollama tag, e.g. 'gemma4:26b-a4b', 'qwen3.5:35b-a3b'
    """
    return await model_router.set_default(model_tag)


@mcp.tool()
async def model_status(model_tag: str | None = None, ctx: Context | None = None) -> dict[str, Any]:
    """Check Ollama health and whether a specific model is loaded in VRAM.

    Args:
        model_tag: Optional. If None, checks the default model.
    """
    return await model_router.status(model_tag)


@mcp.tool()
async def start_session(
    working_dir: str,
    model_tag: str | None = None,
    enable_kairos: bool = False,
    safety_mode: str = "none",
    custom_guardrails: str | None = None,
    ctx: Context | None = None,
) -> dict[str, Any]:
    """Launch an OpenClaude session in the given directory.

    Args:
        working_dir: Absolute path to the project directory.
        model_tag: Ollama model. Defaults to current default.
        enable_kairos: Enable KAIROS autoDream memory consolidation daemon.
        safety_mode: Predefined safety policy ('none', 'kid-safe').
        custom_guardrails: Additional system prompt instructions.
    """
    model = model_tag or model_router.default
    session_id = str(uuid.uuid4())[:8]

    # Assemble safety prompts
    append_prompt = ""
    if safety_mode != "none":
        append_prompt += get_safety_prompt(safety_mode)
    if custom_guardrails:
        if append_prompt:
            append_prompt += "\n\n"
        append_prompt += custom_guardrails

    env = {
        "CLAUDE_CODE_USE_OPENAI": "1",
        "OPENAI_BASE_URL": f"{OLLAMA_BASE}/v1",
        "OPENAI_MODEL": model,
        "OPENAI_API_KEY": "ollama",
        "OLLAMA_BASE_URL": OLLAMA_BASE,
    }

    if append_prompt:
        env["OPENCLAUDE_APPEND_PROMPT"] = append_prompt

    # Injection for safety tools if in kid-safe mode
    mcp_config_path = None
    if safety_mode == "kid-safe":
        mcp_config = {
            "mcpServers": {
                "openclaude-mcp": {
                    "url": f"http://localhost:{BACKEND_PORT}/sse",
                }
            }
        }
        # Use a persistent temp file prefix for this session
        fd, mcp_config_path = tempfile.mkstemp(suffix=".json", prefix=f"oc-mcp-{session_id}-")
        with os.fdopen(fd, "w") as f:
            json.dump(mcp_config, f)

    session = OpenClaudeSession(
        session_id=session_id,
        working_dir=Path(working_dir),
        model=model,
        env=env,
        kairos_enabled=enable_kairos,
        mcp_config_path=mcp_config_path,
    )
    await sessions.add(session)
    await session.start()
    session.on_activity = lambda: kairos.record_activity(session_id)
    if enable_kairos:
        await kairos.attach(session_id)
    return {
        "session_id": session_id,
        "model": model,
        "working_dir": working_dir,
        "kairos": enable_kairos,
        "status": "started",
    }


@mcp.tool()
async def send_prompt(session_id: str, prompt: str, ctx: Context | None = None) -> dict[str, Any]:
    """Send a prompt to a running OpenClaude session.

    Args:
        session_id: From start_session.
        prompt: Natural language instruction for the agent.
    """
    session = sessions.get(session_id)
    if not session:
        return {"error": f"No session with id {session_id}"}
    return await session.send(prompt)


@mcp.tool()
async def session_status(session_id: str, ctx: Context | None = None) -> dict[str, Any]:
    """Get current output and status of an OpenClaude session."""
    session = sessions.get(session_id)
    if not session:
        return {"error": f"No session with id {session_id}"}
    return session.snapshot()


@mcp.tool()
async def list_sessions(ctx: Context | None = None) -> dict[str, Any]:
    """List all active OpenClaude sessions."""
    return {"sessions": [s.snapshot() for s in sessions.all()]}


@mcp.tool()
async def stop_session(session_id: str, ctx: Context | None = None) -> dict[str, Any]:
    """Stop and clean up an OpenClaude session."""
    session = sessions.get(session_id)
    if not session:
        return {"error": f"No session with id {session_id}"}
    await kairos.detach(session_id)
    await session.stop()
    sessions.remove(session_id)
    return {"session_id": session_id, "status": "stopped"}


@mcp.tool()
async def kairos_enable(
    session_id: str,
    idle_threshold_seconds: int = 60,
    ctx: Context | None = None,
) -> dict[str, Any]:
    """Enable KAIROS autoDream memory consolidation daemon on a session.

    Args:
        session_id: Target session.
        idle_threshold_seconds: Seconds of inactivity before consolidation triggers.
    """
    return await kairos.enable(session_id, idle_threshold_seconds)


@mcp.tool()
async def kairos_disable(session_id: str, _ctx: Context | None = None) -> dict[str, Any]:
    """Disable KAIROS on a session."""
    return await kairos.disable(session_id)


@mcp.tool()
async def kairos_log(session_id: str, lines: int = 50, _ctx: Context | None = None) -> dict[str, Any]:
    """Get KAIROS consolidation log for a session."""
    return await kairos.get_log(session_id, lines)


@mcp.tool()
async def ultraplan(session_id: str, goal: str, ctx: Context | None = None) -> dict[str, Any]:
    """Route a complex planning goal to Anthropic Opus for deep planning (up to 30 min),
    then feed the resulting plan into the local session for execution.

    KAIROS handles memory. ULTRAPLAN handles planning. Local model executes.
    Requires ANTHROPIC_API_KEY. Optional — all local features work without it.

    Args:
        session_id: Local session that will execute the resulting plan.
        goal: High-level goal description for the Opus planning model.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return {
            "error": "ANTHROPIC_API_KEY not set.",
            "status": "no_api_key",
            "hint": "Set ANTHROPIC_API_KEY to use ULTRAPLAN. Local sessions work without it.",
        }
    session = sessions.get(session_id)
    if not session:
        return {"error": f"No session {session_id}"}
    snap = session.snapshot()
    system_prompt = (
        "You are an expert software architect. Produce a detailed, numbered, "
        "step-by-step implementation plan. Be specific about file paths, "
        "function signatures, and sequencing. Output the plan only — no preamble."
    )
    user_message = f"Project: {snap['working_dir']}\nLocal model: {snap['model']}\n\nGoal: {goal}"
    try:
        async with httpx.AsyncClient(timeout=1800) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-opus-4-6",
                    "max_tokens": 8192,
                    "system": system_prompt,
                    "messages": [{"role": "user", "content": user_message}],
                },
            )
            response.raise_for_status()
            plan_text = response.json()["content"][0]["text"]
    except httpx.HTTPStatusError as e:
        return {"error": f"Anthropic API {e.response.status_code}", "detail": e.response.text}
    except Exception as e:
        return {"error": str(e)}
    feed_result = await session.send(f"ULTRAPLAN — execute this plan step by step:\n\n{plan_text}")
    return {"status": "ok", "session_id": session_id, "goal": goal, "plan": plan_text, "session_feed": feed_result}


# ---------------------------------------------------------------------------
# Register tools with FastMCP
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# REST registry — direct function dispatch for webapp HTTP calls
# ---------------------------------------------------------------------------

TOOL_REGISTRY: dict[str, Any] = {
    "list_models": list_models,
    "set_default_model": set_default_model,
    "model_status": model_status,
    "start_session": start_session,
    "send_prompt": send_prompt,
    "session_status": session_status,
    "list_sessions": list_sessions,
    "stop_session": stop_session,
    "kairos_enable": kairos_enable,
    "kairos_disable": kairos_disable,
    "kairos_log": kairos_log,
    "ultraplan": ultraplan,
    "caregiver_alert": caregiver_alert,
    "fleet_status": fleet_dashboard,
}

# ---------------------------------------------------------------------------
# REST route handlers
# ---------------------------------------------------------------------------


async def _rest_tool_handler(request: Request) -> JSONResponse:
    tool_name = request.path_params["tool_name"]
    fn = TOOL_REGISTRY.get(tool_name)
    if fn is None:
        return JSONResponse({"error": f"Unknown tool: {tool_name}"}, status_code=404)
    try:
        body = await request.body()
        args = json.loads(body) if body else {}
    except Exception:
        args = {}
    try:
        result = await fn(**args, ctx=None)
        return JSONResponse(result)
    except TypeError as e:
        return JSONResponse({"error": f"Bad arguments: {e}"}, status_code=400)
    except Exception as e:
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)


async def _logs_handler(_request: Request) -> JSONResponse:
    return JSONResponse({"lines": GLOBAL_LOGS.lines})


async def _health_handler(_request: Request) -> JSONResponse:
    ollama_ok = False
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            r = await client.get(f"{OLLAMA_BASE}/api/tags")
            ollama_ok = r.status_code == httpx.codes.OK
    except Exception:  # noqa: S110
        # Silent pass for health check to avoid log spam
        pass
    return JSONResponse(
        {
            "status": "ok",
            "ollama": ollama_ok,
            "tools": list(TOOL_REGISTRY.keys()),
            "default_model": model_router.default,
            "active_sessions": len(sessions.all()),
            "prefab_ui": _PREFAB_AVAILABLE,
        }
    )


async def _capabilities_handler(_request: Request) -> JSONResponse:
    return JSONResponse(
        {
            "server": "openclaude-mcp",
            "version": "0.1.0",
            "fastmcp_version": "3.2.0",
            "ports": {"backend": BACKEND_PORT, "webapp": BACKEND_PORT + 1},
            "features": {
                "session_management": True,
                "model_routing": True,
                "kairos": True,
                "ultraplan": bool(os.environ.get("ANTHROPIC_API_KEY")),
                "prefab_ui": _PREFAB_AVAILABLE,
                "fleet_dashboard": True,
            },
            "supported_models": model_router.KNOWN_MODELS,
            "ollama_base": OLLAMA_BASE,
            "tools": list(TOOL_REGISTRY.keys()),
        }
    )


# ---------------------------------------------------------------------------
# Composite Starlette app
# mcp.http_app(transport="sse") — FastMCP 3.2 SSE ASGI mount
# ---------------------------------------------------------------------------


def build_app() -> Starlette:
    mcp_asgi = mcp.http_app(transport="sse", path="/sse")

    routes = [
        Route("/tools/{tool_name}", _rest_tool_handler, methods=["POST"]),
        Route("/api/health", _health_handler, methods=["GET"]),
        Route("/api/capabilities", _capabilities_handler, methods=["GET"]),
        Route("/api/logs/system", _logs_handler, methods=["GET"]),
        Mount("/", app=mcp_asgi),
    ]
    app = Starlette(routes=routes)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    return app


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print(f"openclaude-mcp on :{BACKEND_PORT}")
    print(f"  MCP SSE:      http://localhost:{BACKEND_PORT}/sse")
    print(f"  REST tools:   http://localhost:{BACKEND_PORT}/tools/{{name}}")
    print(f"  Health:       http://localhost:{BACKEND_PORT}/api/health")
    print(f"  Capabilities: http://localhost:{BACKEND_PORT}/api/capabilities")
    uvicorn.run(build_app(), host="127.0.0.1", port=BACKEND_PORT, log_level="info")
