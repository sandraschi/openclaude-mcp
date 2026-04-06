"""tests/unit/test_session_env.py — unit tests for environment variable inheritance in OpenClaudeSession."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from openclaude.session import OpenClaudeSession


@pytest.mark.unit
@pytest.mark.asyncio
async def test_session_starts_with_safety_env(tmp_path):
    """Verify that custom safety prompts are passed to the subprocess environment."""
    env = {"OPENCLAUDE_CUSTOM_PROMPT": "KID-SAFE ACTIVE", "OPENCLAUDE_APPEND_PROMPT": "Caregiver alert enabled"}

    # We must mock _check_provisioning to avoid real side effects (npm/bun calls)
    with (
        patch("openclaude.session.OpenClaudeSession._check_provisioning", new_callable=AsyncMock),
        patch("openclaude.session.OpenClaudeSession._resolve_command", return_value=["node", "cli.mjs"]),
    ):
        s = OpenClaudeSession(session_id="env001", working_dir=tmp_path, model="gemma4:26b-a4b", env=env)

        # Mock subprocess creation
        mock_proc = MagicMock()
        mock_proc.pid = 9999
        mock_proc.returncode = 0
        mock_proc.stdout = AsyncMock()
        # Return empty once, then None for EOT
        mock_proc.stdout.readline = AsyncMock(side_effect=[b"started\n", b""])
        mock_proc.stdin = MagicMock()
        mock_proc.stdin.write = MagicMock()
        mock_proc.wait = AsyncMock(return_value=0)

        with patch("asyncio.create_subprocess_exec", return_value=mock_proc) as mock_exec:
            # We also need to stop the background reader immediately or it will hang
            with patch("openclaude.session.OpenClaudeSession._read_loop", new_callable=AsyncMock):
                await s.start()

                # Check if environment variables were passed to subprocess_exec
                _, kwargs = mock_exec.call_args
                passed_env = kwargs.get("env", {})

                assert passed_env.get("OPENCLAUDE_CUSTOM_PROMPT") == "KID-SAFE ACTIVE"
                assert passed_env.get("OPENCLAUDE_APPEND_PROMPT") == "Caregiver alert enabled"

                await s.stop()
