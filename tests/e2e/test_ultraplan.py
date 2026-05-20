"""tests/e2e/test_ultraplan.py — ULTRAPLAN e2e test with mocked Anthropic API.

Uses respx to mock the Anthropic API so no real API key is needed.
"""

from __future__ import annotations

from unittest.mock import MagicMock

import httpx
import pytest
import respx
from starlette.testclient import TestClient

pytestmark = pytest.mark.e2e


@pytest.fixture
def client():
    from server import build_app

    app = build_app()
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


@pytest.fixture(autouse=True)
def _set_anthropic_key(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-key-ultraplan")


@pytest.fixture(autouse=True)
def _cleanup_sessions():
    yield
    from server import sessions

    for s in sessions.all():
        sessions.remove(s.session_id)


class TestUltraplan:
    def test_ultraplan_returns_error_when_no_api_key(self, client, monkeypatch):
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        r = client.post("/tools/ultraplan", json={"session_id": "x", "goal": "test"})
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "no_api_key"

    def test_ultraplan_returns_error_for_nonexistent_session(self, client):
        r = client.post("/tools/ultraplan", json={"session_id": "doesnotexist", "goal": "test"})
        assert r.status_code == 200
        data = r.json()
        assert "error" in data

    @respx.mock
    def test_ultraplan_happy_path_with_mock_anthropic(self, client):
        """Full ULTRAPLAN flow with a mocked Anthropic API response."""
        from openclaude.session import OpenClaudeSession

        from server import sessions
        from server import model_router
        import tempfile
        from pathlib import Path

        tmp_dir = Path(tempfile.mkdtemp())
        sess = OpenClaudeSession(
            session_id="ultra-e2e",
            working_dir=tmp_dir,
            model="gemma4:26b",
            env={"OPENAI_API_KEY": "ollama", "OPENAI_BASE_URL": "http://localhost:11434/v1"},
        )
        sess._status = "running"
        sess._process = MagicMock()
        sess._process.returncode = None
        sess._process.stdin = MagicMock()
        sess._process.stdin.write = MagicMock()
        sess._process.stdin.drain = MagicMock()

        import asyncio

        async def setup():
            await sessions.add(sess)

        asyncio.run(setup())

        mock_plan = "## Plan\n1. Create file\n2. Run tests"

        anthropic_route = respx.post("https://api.anthropic.com/v1/messages")
        anthropic_route.mock(
            return_value=httpx.Response(
                200,
                json={
                    "content": [{"text": mock_plan, "type": "text"}],
                    "usage": {"input_tokens": 42, "output_tokens": 128},
                },
            )
        )

        r = client.post("/tools/ultraplan", json={"session_id": "ultra-e2e", "goal": "Build a feature"})
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"
        assert "plan" in data
        assert "Start by" in data["plan"] or "Create" in data["plan"]
        assert data.get("usage", {}).get("input_tokens") == 42
        assert data.get("usage", {}).get("output_tokens") == 128

    @respx.mock
    def test_ultraplan_handles_anthropic_timeout(self, client):
        """ULTRAPLAN should return a clean error on Anthropic API timeout."""
        from openclaude.session import OpenClaudeSession
        from server import sessions

        import tempfile
        from pathlib import Path
        import asyncio
        from unittest.mock import MagicMock

        tmp_dir = Path(tempfile.mkdtemp())
        sess = OpenClaudeSession(
            session_id="ultra-timeout",
            working_dir=tmp_dir,
            model="gemma4:26b",
            env={},
        )
        sess._status = "running"
        sess._process = MagicMock()
        sess._process.returncode = None
        sess._process.stdin = MagicMock()
        sess._process.stdin.write = MagicMock()
        sess._process.stdin.drain = MagicMock()

        async def setup():
            await sessions.add(sess)

        asyncio.run(setup())

        anthropic_route = respx.post("https://api.anthropic.com/v1/messages")
        anthropic_route.mock(side_effect=httpx.TimeoutException("Request timed out", request=None))

        r = client.post("/tools/ultraplan", json={"session_id": "ultra-timeout", "goal": "Do something"})
        assert r.status_code == 200
        data = r.json()
        assert "error" in data
        assert "timed out" in data["error"].lower()

    @respx.mock
    def test_ultraplan_handles_anthropic_connect_error(self, client):
        """ULTRAPLAN should return a clean error on connection failure."""
        from openclaude.session import OpenClaudeSession
        from server import sessions

        import tempfile
        from pathlib import Path
        import asyncio
        from unittest.mock import MagicMock

        tmp_dir = Path(tempfile.mkdtemp())
        sess = OpenClaudeSession(
            session_id="ultra-connect",
            working_dir=tmp_dir,
            model="gemma4:26b",
            env={},
        )
        sess._status = "running"
        sess._process = MagicMock()
        sess._process.returncode = None
        sess._process.stdin = MagicMock()
        sess._process.stdin.write = MagicMock()
        sess._process.stdin.drain = MagicMock()

        async def setup():
            await sessions.add(sess)

        asyncio.run(setup())

        anthropic_route = respx.post("https://api.anthropic.com/v1/messages")
        anthropic_route.mock(side_effect=httpx.ConnectError("connection refused"))

        r = client.post("/tools/ultraplan", json={"session_id": "ultra-connect", "goal": "Do something"})
        assert r.status_code == 200
        data = r.json()
        assert "error" in data
        assert "connect" in data["error"].lower()
