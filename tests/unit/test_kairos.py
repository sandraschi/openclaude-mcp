"""tests/unit/test_kairos.py — unit tests for KairosController."""
from __future__ import annotations

import asyncio
import time
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from openclaude.kairos import KairosController
from openclaude.session import SessionStore, OpenClaudeSession


pytestmark = pytest.mark.unit


def _make_store_and_session(tmp_workdir):
    store = SessionStore()
    session = OpenClaudeSession(
        session_id="k0000001",
        working_dir=tmp_workdir,
        model="gemma4:26b-a4b",
        env={},
        kairos_enabled=True,
    )
    session._status = "running"
    return store, session


class TestKairosEnable:
    @pytest.mark.asyncio
    async def test_enable_returns_ok(self, tmp_workdir):
        store = SessionStore()
        kairos = KairosController(store)
        result = await kairos.enable("nosession", 60)
        assert result["kairos"] == "enabled"
        assert result["idle_threshold_seconds"] == 60
        await kairos.disable("nosession")

    @pytest.mark.asyncio
    async def test_enable_twice_returns_already_running(self, tmp_workdir):
        store = SessionStore()
        kairos = KairosController(store)
        await kairos.enable("sess1", 60)
        result = await kairos.enable("sess1", 60)
        assert result["kairos"] == "already_running"
        await kairos.disable("sess1")

    @pytest.mark.asyncio
    async def test_disable_cancels_task(self, tmp_workdir):
        store = SessionStore()
        kairos = KairosController(store)
        await kairos.enable("sess2", 60)
        assert "sess2" in kairos._tasks
        result = await kairos.disable("sess2")
        assert result["kairos"] == "disabled"
        assert kairos._tasks.get("sess2") is None or kairos._tasks["sess2"].done()


class TestKairosLog:
    @pytest.mark.asyncio
    async def test_log_empty_initially(self):
        store = SessionStore()
        kairos = KairosController(store)
        result = await kairos.get_log("nonexistent", 50)
        assert result["lines"] == []
        assert result["total_entries"] == 0

    @pytest.mark.asyncio
    async def test_log_respects_lines_limit(self):
        store = SessionStore()
        kairos = KairosController(store)
        kairos._logs["sess3"] = [f"line {i}" for i in range(100)]
        result = await kairos.get_log("sess3", 10)
        assert len(result["lines"]) == 10
        assert result["total_entries"] == 100

    @pytest.mark.asyncio
    async def test_log_returns_latest_lines(self):
        store = SessionStore()
        kairos = KairosController(store)
        kairos._logs["sess4"] = [f"line {i}" for i in range(20)]
        result = await kairos.get_log("sess4", 5)
        assert result["lines"] == ["line 15", "line 16", "line 17", "line 18", "line 19"]


class TestRecordActivity:
    def test_record_activity_updates_timestamp(self):
        store = SessionStore()
        kairos = KairosController(store)
        before = time.time() - 1
        kairos.record_activity("sess5")
        after = time.time() + 1
        ts = kairos._last_activity.get("sess5", 0)
        assert before < ts < after

    def test_record_activity_resets_idle_timer(self):
        store = SessionStore()
        kairos = KairosController(store)
        # Simulate old activity
        kairos._last_activity["sess6"] = time.time() - 200
        kairos.record_activity("sess6")
        idle = time.time() - kairos._last_activity["sess6"]
        assert idle < 2  # just reset, so idle should be tiny


class TestConsolidation:
    @pytest.mark.asyncio
    async def test_consolidate_skips_when_no_observations(self, tmp_workdir):
        """If session has no last_output_preview, consolidation skips."""
        store = SessionStore()
        session = OpenClaudeSession(
            session_id="c0000001",
            working_dir=tmp_workdir,
            model="gemma4:26b-a4b",
            env={},
        )
        session._status = "running"
        session._last_output = ""
        await store.add(session)

        kairos = KairosController(store)
        log = []
        result = await kairos._consolidate(session, log)
        assert result.get("skipped") is True

    @pytest.mark.asyncio
    async def test_consolidate_writes_memory_md(self, tmp_workdir):
        """Full consolidation with mocked Ollama call."""
        store = SessionStore()
        session = OpenClaudeSession(
            session_id="c0000002",
            working_dir=tmp_workdir,
            model="gemma4:26b-a4b",
            env={},
        )
        session._status = "running"
        session._last_output = "Added health endpoint to FastAPI app. Returns 200 OK."
        await store.add(session)

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "## Architecture\n- Health endpoint added\n"}}]
        }

        kairos = KairosController(store)
        with patch("httpx.AsyncClient") as mock_cls:
            mock_client = AsyncMock()
            mock_cls.return_value.__aenter__.return_value = mock_client
            mock_client.post.return_value = mock_response

            log = []
            result = await kairos._consolidate(session, log)

        assert result.get("skipped") is not True
        assert "memory_length" in result
        memory_path = tmp_workdir / "MEMORY.md"
        assert memory_path.exists()
        content = memory_path.read_text()
        assert "Health endpoint" in content
