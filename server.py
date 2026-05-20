"""
openclaude-mcp  —  FastMCP 3.2 server + Starlette REST bridge

FastMCP 3.2 features used:
  - lifespan context manager (startup health check, graceful shutdown)
  - mcp.http_app(transport="sse")  — ASGI SSE transport mount
  - @mcp.tool(app=True)            — Prefab fleet dashboard (requires fastmcp[apps])
  - Context | None                 — tools callable from both MCP and REST

Two transports on port 10932:
  /sse            → FastMCP SSE (Claude Desktop, Cursor, other MCP clients)
  /tools/{name}   → REST JSON bridge (webapp, curl)
  /api/health     → health check
  /api/capabilities → capabilities

Prefab UI:
  fleet_dashboard  — @mcp.tool(app=True) returns PrefabApp when prefab-ui installed
  Requires: uv sync --extra apps  (installs prefab-ui)
  Without prefab-ui installed the tool returns a plain JSON dict fallback.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import tempfile
import time
import traceback
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import httpx
import uvicorn
from fastmcp import Context, FastMCP
from fastmcp.server import create_proxy
from starlette.applications import Starlette
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.routing import Mount, Route

from openclaude.kairos import KairosController
from openclaude.logging_util import get_logger
from openclaude.logging_util import logger as app_logger
from openclaude.model_router import ModelRouter
from openclaude.session import OpenClaudeSession, SessionStore
from openclaude.session_persistence import cleanup_stale, load_sessions, save_sessions

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
GLOBAL_LOG_HANDLER.setFormatter(logging.Formatter("%(message)s"))
app_logger.addHandler(GLOBAL_LOG_HANDLER)

# Root logger — still route console output but keep it quiet
logging.getLogger().setLevel(logging.WARNING)

# Uvicorn loggers — attach our handler directly so we see startup events
for log_name in ["uvicorn", "uvicorn.error", "uvicorn.access"]:
    uv_logger = logging.getLogger(log_name)
    uv_logger.addHandler(GLOBAL_LOG_HANDLER)
    uv_logger.propagate = False # avoid double logs

logger = get_logger("server")

# ---------------------------------------------------------------------------
# SSE event bus — pushes real-time state changes to the webapp
# ---------------------------------------------------------------------------

_event_subscribers: list[asyncio.Queue] = []


async def _broadcast(event: str, data: dict[str, Any]) -> None:
    payload = f"event: {event}\ndata: {json.dumps(data)}\n\n"
    for q in _event_subscribers:
        await q.put(payload)


async def _events_handler(request: Request) -> Response:
    queue: asyncio.Queue = asyncio.Queue()
    _event_subscribers.append(queue)

    async def event_stream():
        try:
            while True:
                payload = await queue.get()
                yield payload.encode("utf-8")
        except asyncio.CancelledError:
            pass
        finally:
            if queue in _event_subscribers:
                _event_subscribers.remove(queue)

    return Response(
        content=event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def _notify_sessions() -> None:
    """Push a snapshot event to all SSE subscribers."""
    snapshot = {"sessions": [s.snapshot() for s in sessions.all()]}
    asyncio.create_task(_broadcast("sessions", snapshot))


def _notify_logs() -> None:
    asyncio.create_task(_broadcast("logs", {"lines": GLOBAL_LOG_HANDLER.lines}))


# ---------------------------------------------------------------------------
# Core objects
# ---------------------------------------------------------------------------

sessions = SessionStore()
model_router = ModelRouter()
kairos = KairosController(sessions, GLOBAL_LOG_HANDLER)

OLLAMA_BASE = "http://localhost:11434"
BACKEND_PORT = int(os.environ.get("OPENCLAUDE_MCP_PORT", "10932"))
AUTH_TOKEN = os.environ.get("OPENCLAUDE_MCP_TOKEN") or None
CAREGIVER_WEBHOOK_URL = os.environ.get("CAREGIVER_WEBHOOK_URL") or None
OPENCLAUDE_ULTRAPLAN_MODEL = os.environ.get("OPENCLAUDE_ULTRAPLAN_MODEL", "claude-sonnet-4-6")

# ---------------------------------------------------------------------------
# Prefab UI — optional dependency check (import only, no mcp reference yet)
# ---------------------------------------------------------------------------

try:
    from prefab_ui.app import PrefabApp  # type: ignore[import]
    from prefab_ui.components import Badge, Column, Row, Table, Text  # type: ignore[import]

    _PREFAB_AVAILABLE = True
except ImportError:
    _PREFAB_AVAILABLE = False


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

    # Restore sessions from disk
    saved = await load_sessions()
    if saved:
        print(f"  Found {len(saved)} persisted session(s) — rehydrating ({len([s for s in saved if s.get('pid')])} with PIDs)")

    # Restore KAIROS state
    await kairos.load_persisted_state()

    yield

    print("Shutting down — stopping all sessions...")
    for s in sessions.all():
        await s.stop()
    await save_sessions(sessions.all())


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

# MCP Bridge — proxy remote MCP servers via ProxyProvider
MCP_BRIDGE_URLS = os.environ.get("MCP_BRIDGE_URLS", "")
if MCP_BRIDGE_URLS:
    for url in MCP_BRIDGE_URLS.split(","):
        url = url.strip()
        if url:
            mcp.add_provider(create_proxy(url))

# ---------------------------------------------------------------------------
# Prefab fleet dashboard — registered after mcp is instantiated
# ---------------------------------------------------------------------------


_fleet_tool_kwargs: dict[str, Any] = {"description": "Show live OpenClaude fleet status as a Prefab dashboard"}
if _PREFAB_AVAILABLE:
    _fleet_tool_kwargs["app"] = True


async def _build_fleet_data() -> dict[str, Any]:
    all_sessions = sessions.all()
    model_data = await model_router.list_models()
    running = [s for s in all_sessions if s.snapshot()["status"] == "running"]
    kairos_active = [s for s in running if s.kairos_enabled]
    return {
        "all_sessions": all_sessions,
        "running": running,
        "kairos_active": kairos_active,
        "default_model": model_router.default,
        "ollama_running": model_data.get("ollama_running", False),
    }


@mcp.tool(**_fleet_tool_kwargs)
async def fleet_dashboard(ctx: Context | None = None) -> Any:
    """Fleet status — returns Prefab UI when available, plain dict otherwise."""
    fleet = await _build_fleet_data()
    if not _PREFAB_AVAILABLE:
        return {
            "active_sessions": len(fleet["running"]),
            "kairos_daemons": len(fleet["kairos_active"]),
            "default_model": fleet["default_model"],
            "ollama": "online" if fleet["ollama_running"] else "offline",
            "sessions": [s.snapshot() for s in fleet["all_sessions"]],
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
        for s in fleet["all_sessions"]
    ]

    return Column(
        Row(
            Badge(f"Sessions: {len(fleet['running'])}", color="green" if fleet["running"] else "gray"),
            Badge(f"KAIROS: {len(fleet['kairos_active'])}", color="amber" if fleet["kairos_active"] else "gray"),
            Badge(f"Ollama: {'online' if fleet['ollama_running'] else 'offline'}", color="green" if fleet["ollama_running"] else "red"),
            Badge(f"Default: {fleet['default_model'].split(':')[0]}", color="blue"),
        ),
        Table(data=rows) if rows else Text("No sessions running.", variant="muted"),
    )


@mcp.tool(description="Get raw fleet status data")
async def fleet_status(ctx: Context | None = None) -> dict[str, Any]:
    """Backend tool — raw fleet data."""
    fleet = await _build_fleet_data()
    return {
        "active_sessions": len(fleet["running"]),
        "total_sessions": len(fleet["all_sessions"]),
        "kairos_active": len(fleet["kairos_active"]),
        "default_model": fleet["default_model"],
        "ollama_running": fleet["ollama_running"],
    }

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
    logger.warning(alert_msg)

    alert_file = Path(tempfile.gettempdir()) / "openclaude_caregiver_alerts.log"
    try:
        with open(alert_file, "a", encoding="utf-8") as f:
            f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} {alert_msg}\n")
    except OSError as e:
        logger.error(f"Could not write caregiver alert file: {e}")

    if CAREGIVER_WEBHOOK_URL:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                await client.post(
                    CAREGIVER_WEBHOOK_URL,
                    json={"session_id": session_id, "risk_topic": risk_topic, "reason": reason, "timestamp": time.time()},
                )
        except Exception as e:
            logger.error(f"Caregiver webhook failed: {e}")

    return {
        "success": True,
        "message": "Caregivers have been notified of this high-risk request.",
        "alert_logged": True,
        "alert_file": str(alert_file),
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
    _notify_sessions()
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
async def send_multimodal(session_id: str, text: str, image_paths: list[str] | None = None, ctx: Context | None = None) -> dict[str, Any]:
    """Send a prompt with image attachments to a running OpenClaude session.

    Args:
        session_id: From start_session.
        text: Natural language instruction.
        image_paths: Optional list of image file paths (png, jpeg, webp, gif).
    """
    session = sessions.get(session_id)
    if not session:
        return {"error": f"No session with id {session_id}"}
    return await session.send_multimodal(text, image_paths)


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
    _notify_sessions()
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
    """Route a complex planning goal to Anthropic for deep planning (up to 30 min),
    then feed the resulting plan into the local session for execution.

    KAIROS handles memory. ULTRAPLAN handles planning. Local model executes.
    Requires ANTHROPIC_API_KEY. Optional — all local features work without it.

    Args:
        session_id: Local session that will execute the resulting plan.
        goal: High-level goal description for the planning model.
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
                    "model": OPENCLAUDE_ULTRAPLAN_MODEL,
                    "max_tokens": 8192,
                    "system": system_prompt,
                    "messages": [{"role": "user", "content": user_message}],
                },
            )
            response.raise_for_status()
            data = response.json()
            plan_text = data["content"][0]["text"]
            input_tokens = data.get("usage", {}).get("input_tokens", 0)
            output_tokens = data.get("usage", {}).get("output_tokens", 0)
    except httpx.HTTPStatusError as e:
        return {"error": f"Anthropic API {e.response.status_code}", "detail": e.response.text}
    except httpx.TimeoutException:
        return {"error": "Anthropic API timed out after 30 minutes."}
    except httpx.ConnectError:
        return {"error": "Could not connect to Anthropic API. Check network."}
    except Exception as e:
        return {"error": str(e)}
    feed_result = await session.send(f"ULTRAPLAN — execute this plan step by step:\n\n{plan_text}")
    logger.info(f"[ULTRAPLAN] {OPENCLAUDE_ULTRAPLAN_MODEL} — goal: {goal[:80]} — tokens: {input_tokens} in / {output_tokens} out")
    return {
        "status": "ok",
        "session_id": session_id,
        "goal": goal,
        "model": OPENCLAUDE_ULTRAPLAN_MODEL,
        "plan": plan_text,
        "session_feed": feed_result,
        "usage": {"input_tokens": input_tokens, "output_tokens": output_tokens},
    }


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
    "send_multimodal": send_multimodal,
    "session_status": session_status,
    "list_sessions": list_sessions,
    "stop_session": stop_session,
    "kairos_enable": kairos_enable,
    "kairos_disable": kairos_disable,
    "kairos_log": kairos_log,
    "ultraplan": ultraplan,
    "caregiver_alert": caregiver_alert,
    "fleet_status": fleet_status,
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
    except TypeError as e:
        return JSONResponse({"error": f"Bad arguments: {e}"}, status_code=400)
    except Exception as e:
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)
    # Serialize separately to catch non-JSON-serializable results (e.g. Prefab UI components)
    try:
        return JSONResponse(result)
    except TypeError as e:
        return JSONResponse({"error": f"Response not serializable: {e}", "result_preview": str(result)[:200]}, status_code=500)


async def _logs_handler(_request: Request) -> JSONResponse:
    return JSONResponse({"lines": GLOBAL_LOG_HANDLER.lines})


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


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if AUTH_TOKEN and not request.url.path.startswith("/sse"):
            auth = request.headers.get("Authorization", "")
            if auth != f"Bearer {AUTH_TOKEN}":
                return JSONResponse({"error": "Unauthorized"}, status_code=401)
        return await call_next(request)


def build_app() -> Starlette:
    mcp_asgi = mcp.http_app(transport="sse", path="/sse")

    routes = [
        Route("/tools/{tool_name}", _rest_tool_handler, methods=["POST"]),
        Route("/api/health", _health_handler, methods=["GET"]),
        Route("/api/capabilities", _capabilities_handler, methods=["GET"]),
        Route("/api/logs/system", _logs_handler, methods=["GET"]),
        Route("/api/events", _events_handler, methods=["GET"]),
        Mount("/", app=mcp_asgi),
    ]
    app = Starlette(routes=routes)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    if AUTH_TOKEN:
        app.add_middleware(AuthMiddleware)
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
