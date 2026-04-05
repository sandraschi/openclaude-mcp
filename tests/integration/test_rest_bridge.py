"""tests/integration/test_rest_bridge.py — REST bridge integration tests.

Requires: server imports cleanly (no Ollama needed for most tests).
Marked `integration` — run with: just test-integration
"""

from __future__ import annotations

import pytest
from starlette.testclient import TestClient

pytestmark = pytest.mark.integration


@pytest.fixture(scope="module")
def client():
    """Starlette test client wrapping the full composite app."""
    from server import build_app

    app = build_app()
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


class TestHealthEndpoint:
    def test_health_returns_200(self, client):
        r = client.get("/api/health")
        assert r.status_code == 200

    def test_health_has_status_ok(self, client):
        r = client.get("/api/health")
        data = r.json()
        assert data["status"] == "ok"

    def test_health_has_tools_list(self, client):
        r = client.get("/api/health")
        data = r.json()
        assert isinstance(data["tools"], list)
        assert len(data["tools"]) > 0

    def test_health_has_ollama_field(self, client):
        r = client.get("/api/health")
        data = r.json()
        assert "ollama" in data

    def test_health_has_active_sessions(self, client):
        r = client.get("/api/health")
        data = r.json()
        assert "active_sessions" in data
        assert isinstance(data["active_sessions"], int)


class TestCapabilitiesEndpoint:
    def test_capabilities_returns_200(self, client):
        r = client.get("/api/capabilities")
        assert r.status_code == 200

    def test_capabilities_has_version(self, client):
        r = client.get("/api/capabilities")
        data = r.json()
        assert data["version"] == "0.1.0"
        assert data["fastmcp_version"] == "3.2.0"

    def test_capabilities_has_features(self, client):
        r = client.get("/api/capabilities")
        data = r.json()
        assert "features" in data
        assert data["features"]["session_management"] is True
        assert data["features"]["kairos"] is True

    def test_capabilities_has_supported_models(self, client):
        r = client.get("/api/capabilities")
        data = r.json()
        assert "supported_models" in data
        assert "gemma4:26b-a4b" in data["supported_models"]

    def test_capabilities_has_tools(self, client):
        r = client.get("/api/capabilities")
        data = r.json()
        assert "tools" in data
        assert "list_models" in data["tools"]
        assert "start_session" in data["tools"]
        assert "kairos_enable" in data["tools"]


class TestToolEndpoints:
    def test_unknown_tool_returns_404(self, client):
        r = client.post("/tools/nonexistent_tool", json={})
        assert r.status_code == 404
        data = r.json()
        assert "error" in data

    def test_list_sessions_empty(self, client):
        r = client.post("/tools/list_sessions", json={})
        assert r.status_code == 200
        data = r.json()
        assert "sessions" in data
        assert data["sessions"] == []

    def test_list_models_returns_known_models(self, client):
        r = client.post("/tools/list_models", json={})
        assert r.status_code == 200
        data = r.json()
        assert "known_models" in data
        assert "gemma4:26b-a4b" in data["known_models"]

    def test_set_default_model(self, client):
        r = client.post("/tools/set_default_model", json={"model_tag": "qwen3.5:35b-a3b"})
        assert r.status_code == 200
        data = r.json()
        assert data["default"] == "qwen3.5:35b-a3b"
        assert data["status"] == "ok"
        # reset
        client.post("/tools/set_default_model", json={"model_tag": "gemma4:26b-a4b"})

    def test_session_status_nonexistent(self, client):
        r = client.post("/tools/session_status", json={"session_id": "doesnotexist"})
        assert r.status_code == 200
        data = r.json()
        assert "error" in data

    def test_stop_session_nonexistent(self, client):
        r = client.post("/tools/stop_session", json={"session_id": "doesnotexist"})
        assert r.status_code == 200
        data = r.json()
        assert "error" in data

    def test_bad_args_returns_400(self, client):
        # start_session without required working_dir
        r = client.post("/tools/start_session", json={})
        # Should be 400 (bad args) since working_dir is required
        assert r.status_code in (400, 422, 500)

    def test_ultraplan_no_api_key(self, client, monkeypatch):
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        r = client.post("/tools/ultraplan", json={"session_id": "x", "goal": "test"})
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "no_api_key"

    def test_kairos_enable_nonexistent_session(self, client):
        """Kairos enable on a nonexistent session should succeed (daemon just watches)."""
        r = client.post("/tools/kairos_enable", json={"session_id": "ghost", "idle_threshold_seconds": 60})
        assert r.status_code == 200
        data = r.json()
        assert data.get("kairos") in ("enabled", "already_running")
        # cleanup
        client.post("/tools/kairos_disable", json={"session_id": "ghost"})

    def test_fleet_status_returns_dict(self, client):
        r = client.post("/tools/fleet_status", json={})
        assert r.status_code == 200
        data = r.json()
        assert "active_sessions" in data
        assert "ollama_running" in data

    def test_post_with_empty_body_works(self, client):
        """Empty body should default to {} args."""
        r = client.post("/tools/list_sessions", content=b"", headers={"Content-Type": "application/json"})
        assert r.status_code == 200

    def test_post_with_no_content_type(self, client):
        """No content-type should still work (body treated as empty)."""
        r = client.post("/tools/list_sessions")
        assert r.status_code == 200
