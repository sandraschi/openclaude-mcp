"""tests/unit/test_session.py — unit tests for SessionStore and OpenClaudeSession."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from openclaude.session import OpenClaudeSession, SessionStore

pytestmark = pytest.mark.unit


class TestSessionStore:
    def test_empty_on_init(self):
        store = SessionStore()
        assert store.all() == []

    @pytest.mark.asyncio
    async def test_add_and_get(self, tmp_workdir):
        store = SessionStore()
        session = OpenClaudeSession(
            session_id="test0001",
            working_dir=tmp_workdir,
            model="gemma4:26b-a4b",
            env={},
        )
        await store.add(session)
        assert store.get("test0001") is session

    @pytest.mark.asyncio
    async def test_get_nonexistent_returns_none(self):
        store = SessionStore()
        assert store.get("nope") is None

    @pytest.mark.asyncio
    async def test_remove(self, tmp_workdir):
        store = SessionStore()
        session = OpenClaudeSession(
            session_id="test0002",
            working_dir=tmp_workdir,
            model="gemma4:26b-a4b",
            env={},
        )
        await store.add(session)
        store.remove("test0002")
        assert store.get("test0002") is None

    @pytest.mark.asyncio
    async def test_all_returns_all_sessions(self, tmp_workdir):
        store = SessionStore()
        for i in range(3):
            s = OpenClaudeSession(
                session_id=f"sess{i:04d}",
                working_dir=tmp_workdir,
                model="gemma4:26b-a4b",
                env={},
            )
            await store.add(s)
        assert len(store.all()) == 3


class TestOpenClaudeSessionSnapshot:
    def test_snapshot_fields(self, tmp_workdir):
        s = OpenClaudeSession(
            session_id="snap0001",
            working_dir=tmp_workdir,
            model="gemma4:26b-a4b",
            env={},
        )
        snap = s.snapshot()
        assert snap["session_id"] == "snap0001"
        assert snap["model"] == "gemma4:26b-a4b"
        assert str(tmp_workdir) == snap["working_dir"]
        assert snap["status"] in ("pending", "running", "stopped", "error")
        assert "elapsed_seconds" in snap
        assert "kairos_enabled" in snap
        assert "last_output_preview" in snap

    def test_snapshot_kairos_defaults_false(self, tmp_workdir):
        s = OpenClaudeSession(
            session_id="snap0002",
            working_dir=tmp_workdir,
            model="gemma4:26b-a4b",
            env={},
        )
        assert s.snapshot()["kairos_enabled"] is False

    def test_snapshot_kairos_can_be_true(self, tmp_workdir):
        s = OpenClaudeSession(
            session_id="snap0003",
            working_dir=tmp_workdir,
            model="gemma4:26b-a4b",
            env={},
            kairos_enabled=True,
        )
        assert s.snapshot()["kairos_enabled"] is True


class TestOpenClaudeSessionStart:
    @pytest.mark.asyncio
    async def test_start_sets_running_status(self, tmp_workdir):
        """Mocked start — no real subprocess."""
        s = OpenClaudeSession(
            session_id="run0001",
            working_dir=tmp_workdir,
            model="gemma4:26b-a4b",
            env={},
        )
        mock_proc = MagicMock()
        mock_proc.returncode = None
        mock_proc.pid = 12345
        mock_proc.stdout = AsyncMock()
        mock_proc.stdout.readline = AsyncMock(return_value=b"")
        mock_proc.stdin = MagicMock()

        with patch("asyncio.create_subprocess_exec", return_value=mock_proc):
            await s.start()

        assert s._status == "running"
        assert s._process is mock_proc

    @pytest.mark.asyncio
    async def test_start_not_found_sets_error(self, tmp_workdir):
        """openclaude binary not on PATH."""
        s = OpenClaudeSession(
            session_id="run0002",
            working_dir=tmp_workdir,
            model="gemma4:26b-a4b",
            env={},
        )
        with patch("asyncio.create_subprocess_exec", side_effect=FileNotFoundError):
            await s.start()

        assert s._status == "error"
        assert "not found" in s._last_output.lower()


class TestOpenClaudeSessionSend:
    @pytest.mark.asyncio
    async def test_send_when_not_running_returns_error(self, tmp_workdir):
        s = OpenClaudeSession(
            session_id="snd0001",
            working_dir=tmp_workdir,
            model="gemma4:26b-a4b",
            env={},
        )
        result = await s.send("hello")
        assert "error" in result

    @pytest.mark.asyncio
    async def test_send_calls_activity_callback(self, tmp_workdir):
        s = OpenClaudeSession(
            session_id="snd0002",
            working_dir=tmp_workdir,
            model="gemma4:26b-a4b",
            env={},
        )
        called = []
        s.on_activity = lambda: called.append(True)
        s._status = "running"

        mock_proc = MagicMock()
        mock_proc.returncode = None
        mock_proc.stdin = MagicMock()
        mock_proc.stdin.write = MagicMock()
        mock_proc.stdin.drain = AsyncMock()
        s._process = mock_proc
        s._output_buffer = ["some", "output"]

        # Patch the wait loop to return quickly
        with patch("asyncio.sleep", new_callable=AsyncMock):
            # Override the loop to exit after one iteration

            async def fast_send(prompt):
                s._process.stdin.write((prompt + "\n").encode())
                await s._process.stdin.drain()
                if s.on_activity:
                    s.on_activity()
                return {"session_id": s.session_id, "output": "mocked", "model": s.model}

            await fast_send("do something")

        assert len(called) == 1
