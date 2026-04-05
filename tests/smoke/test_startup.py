"""tests/smoke/test_startup.py — smoke tests.

Validates that the server module imports cleanly, the tool registry is
populated, and the REST bridge responds correctly.
No running server process required — uses Starlette TestClient.

Run: just smoke
"""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.smoke


class TestServerImports:
    def test_server_module_imports(self):
        """server.py must import without errors."""
        import server  # noqa: F401

    def test_tool_registry_populated(self):
        from server import TOOL_REGISTRY

        expected = {
            "list_models",
            "set_default_model",
            "model_status",
            "start_session",
            "send_prompt",
            "session_status",
            "list_sessions",
            "stop_session",
            "kairos_enable",
            "kairos_disable",
            "kairos_log",
            "ultraplan",
            "fleet_status",
        }
        assert expected.issubset(set(TOOL_REGISTRY.keys())), f"Missing tools: {expected - set(TOOL_REGISTRY.keys())}"

    def test_tool_registry_all_callable(self):
        import asyncio

        from server import TOOL_REGISTRY

        for name, fn in TOOL_REGISTRY.items():
            assert callable(fn), f"Tool {name} is not callable"
            assert asyncio.iscoroutinefunction(fn), f"Tool {name} is not async"

    def test_model_router_default_set(self):
        from server import model_router

        assert model_router.default == "gemma4:26b-a4b"

    def test_session_store_empty_on_import(self):
        from server import sessions

        assert sessions.all() == []

    def test_fastmcpapp_registered(self):
        """fleet_app must be added as provider to mcp."""
        from server import fleet_app

        assert fleet_app is not None

    def test_build_app_returns_starlette(self):
        from starlette.applications import Starlette

        from server import build_app

        app = build_app()
        assert isinstance(app, Starlette)


class TestSmokePing:
    @pytest.fixture(scope="class")
    def client(self):
        from starlette.testclient import TestClient

        from server import build_app

        with TestClient(build_app(), raise_server_exceptions=False) as c:
            yield c

    def test_health_ping(self, client):
        r = client.get("/api/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_capabilities_ping(self, client):
        r = client.get("/api/capabilities")
        assert r.status_code == 200
        assert "tools" in r.json()

    def test_list_sessions_ping(self, client):
        r = client.post("/tools/list_sessions", json={})
        assert r.status_code == 200

    def test_list_models_ping(self, client):
        r = client.post("/tools/list_models", json={})
        assert r.status_code == 200

    def test_unknown_tool_404(self, client):
        r = client.post("/tools/this_does_not_exist", json={})
        assert r.status_code == 404
