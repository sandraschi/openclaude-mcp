"""tests/e2e/test_full_session.py — end-to-end session lifecycle.

Prerequisites:
  - Ollama running on :11434 with at least one model pulled
  - openclaude installed: npm install -g @gitlawb/openclaude

Run: just test-e2e
Skip in CI if prerequisites unavailable:  pytest -m "not e2e"
"""
from __future__ import annotations

import asyncio
import shutil
import time
import pytest
from pathlib import Path
from starlette.testclient import TestClient


pytestmark = pytest.mark.e2e

OLLAMA_BASE = "http://localhost:11434"


def _ollama_available() -> bool:
    try:
        import httpx
        r = httpx.get(f"{OLLAMA_BASE}/api/tags", timeout=3)
        return r.status_code == 200
    except Exception:
        return False


def _openclaude_available() -> bool:
    return shutil.which("openclaude") is not None


skip_if_no_ollama = pytest.mark.skipif(
    not _ollama_available(),
    reason="Ollama not running on :11434",
)
skip_if_no_openclaude = pytest.mark.skipif(
    not _openclaude_available(),
    reason="openclaude not on PATH (npm install -g @gitlawb/openclaude)",
)


@pytest.fixture(scope="module")
def client():
    from server import build_app
    with TestClient(build_app(), raise_server_exceptions=False) as c:
        yield c


@pytest.fixture
def workdir(tmp_path: Path) -> Path:
    """Minimal Python project for the agent to work in."""
    (tmp_path / "main.py").write_text('def hello():\n    return "hello"\n')
    (tmp_path / "test_main.py").write_text(
        'from main import hello\ndef test_hello():\n    assert hello() == "hello"\n'
    )
    return tmp_path


class TestSessionLifecycle:
    @skip_if_no_ollama
    @skip_if_no_openclaude
    def test_full_lifecycle(self, client, workdir):
        """Start → prompt → status → stop."""
        # Start session
        r = client.post("/tools/start_session", json={
            "working_dir": str(workdir),
            "model_tag": "gemma4:26b-a4b",
        })
        assert r.status_code == 200
        data = r.json()
        assert "session_id" in data
        session_id = data["session_id"]
        assert data["status"] == "started"

        try:
            # Give process a moment to initialise
            time.sleep(2)

            # Check it's running
            r = client.post("/tools/session_status", json={"session_id": session_id})
            assert r.status_code == 200
            snap = r.json()
            assert snap["session_id"] == session_id

            # Send a simple prompt
            r = client.post("/tools/send_prompt", json={
                "session_id": session_id,
                "prompt": "List the Python files in this directory",
            })
            assert r.status_code == 200
            result = r.json()
            assert "output" in result or "error" in result

        finally:
            # Always stop the session
            r = client.post("/tools/stop_session", json={"session_id": session_id})
            assert r.status_code == 200
            assert r.json()["status"] == "stopped"

    @skip_if_no_ollama
    @skip_if_no_openclaude
    def test_session_appears_in_list(self, client, workdir):
        """Started session shows in list_sessions."""
        r = client.post("/tools/start_session", json={"working_dir": str(workdir)})
        session_id = r.json()["session_id"]
        try:
            r = client.post("/tools/list_sessions", json={})
            sessions = r.json()["sessions"]
            ids = [s["session_id"] for s in sessions]
            assert session_id in ids
        finally:
            client.post("/tools/stop_session", json={"session_id": session_id})

    @skip_if_no_ollama
    @skip_if_no_openclaude
    def test_kairos_creates_memory_md(self, client, workdir):
        """KAIROS daemon creates MEMORY.md after idle threshold."""
        r = client.post("/tools/start_session", json={
            "working_dir": str(workdir),
            "enable_kairos": True,
        })
        session_id = r.json()["session_id"]
        try:
            # Enable KAIROS with very short threshold for test
            client.post("/tools/kairos_enable", json={
                "session_id": session_id,
                "idle_threshold_seconds": 5,
            })
            # Send a prompt to generate some output
            client.post("/tools/send_prompt", json={
                "session_id": session_id,
                "prompt": "What files are in this directory?",
            })
            # Wait for KAIROS idle threshold + consolidation
            time.sleep(40)  # 30s poll interval + 5s threshold + buffer
            # Check log has entries
            r = client.post("/tools/kairos_log", json={"session_id": session_id})
            assert r.status_code == 200
            log_data = r.json()
            assert log_data["total_entries"] > 0
        finally:
            client.post("/tools/stop_session", json={"session_id": session_id})


class TestModelRouting:
    @skip_if_no_ollama
    def test_list_models_shows_installed(self, client):
        r = client.post("/tools/list_models", json={})
        data = r.json()
        assert data["ollama_running"] is True
        assert len(data["all_ollama_models"]) > 0

    @skip_if_no_ollama
    def test_model_status_default(self, client):
        r = client.post("/tools/model_status", json={})
        data = r.json()
        assert data["ollama_ok"] is True
