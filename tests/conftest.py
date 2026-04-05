"""
tests/conftest.py — shared fixtures for openclaude-mcp test suite.

Markers:
  unit        — no external deps, fast
  integration — requires Ollama running on :11434
  smoke       — requires server on :10932
  e2e         — requires Ollama + openclaude on PATH
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ---------------------------------------------------------------------------
# pytest marks
# ---------------------------------------------------------------------------


def pytest_configure(config):
    config.addinivalue_line("markers", "unit: fast unit tests, no external deps")
    config.addinivalue_line("markers", "integration: requires Ollama on :11434")
    config.addinivalue_line("markers", "smoke: requires server running on :10932")
    config.addinivalue_line("markers", "e2e: requires Ollama + openclaude on PATH")


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def tmp_workdir(tmp_path: Path) -> Path:
    """Temporary working directory for session tests."""
    (tmp_path / "MEMORY.md").touch()
    return tmp_path


@pytest.fixture
def mock_ollama_ok():
    """Mock httpx so Ollama appears to be running."""
    tags_response = MagicMock()
    tags_response.status_code = 200
    tags_response.json.return_value = {
        "models": [
            {"name": "gemma4:26b-a4b"},
            {"name": "qwen3.5:35b-a3b"},
        ]
    }
    ps_response = MagicMock()
    ps_response.status_code = 200
    ps_response.json.return_value = {"models": [{"name": "gemma4:26b-a4b"}]}

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client_cls.return_value.__aenter__.return_value = mock_client
        mock_client.get.side_effect = lambda url, **kw: tags_response if "tags" in url else ps_response
        yield mock_client


@pytest.fixture
def mock_ollama_down():
    """Mock httpx so Ollama appears to be offline."""
    import httpx

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client_cls.return_value.__aenter__.return_value = mock_client
        mock_client.get.side_effect = httpx.ConnectError("connection refused")
        yield mock_client
