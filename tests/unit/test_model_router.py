"""tests/unit/test_model_router.py — unit tests for ModelRouter."""


import pytest

from openclaude.model_router import ModelRouter

pytestmark = pytest.mark.unit


class TestModelRouterInit:
    def test_default_model(self):
        r = ModelRouter()
        assert r.default == "gemma4:26b-a4b"

    def test_known_models_present(self):
        r = ModelRouter()
        assert "gemma4:26b-a4b" in r.KNOWN_MODELS
        assert "gemma4:31b" in r.KNOWN_MODELS
        assert "qwen3.5:35b-a3b" in r.KNOWN_MODELS
        assert "qwen3.5:27b" in r.KNOWN_MODELS

    def test_known_models_have_required_fields(self):
        r = ModelRouter()
        required = {
            "label",
            "active_params_b",
            "total_params_b",
            "vram_q4_gb",
            "est_toks",
            "context_k",
            "tool_calling",
            "license",
            "notes",
        }
        for tag, meta in r.KNOWN_MODELS.items():
            for field in required:
                assert field in meta, f"Model {tag} missing field {field}"

    def test_default_model_in_known_models(self):
        r = ModelRouter()
        assert r.default in r.KNOWN_MODELS


class TestSetDefault:
    @pytest.mark.asyncio
    async def test_set_default(self):
        r = ModelRouter()
        result = await r.set_default("qwen3.5:35b-a3b")
        assert result["default"] == "qwen3.5:35b-a3b"
        assert result["status"] == "ok"
        assert r.default == "qwen3.5:35b-a3b"

    @pytest.mark.asyncio
    async def test_set_default_unknown_tag(self):
        """Unknown tags are accepted — Ollama may have arbitrary models."""
        r = ModelRouter()
        result = await r.set_default("llama4:latest")
        assert result["default"] == "llama4:latest"
        assert r.default == "llama4:latest"


class TestListModels:
    @pytest.mark.asyncio
    async def test_list_models_ollama_up(self, mock_ollama_ok):
        r = ModelRouter()
        result = await r.list_models()
        assert result["ollama_running"] is True
        assert result["default"] == "gemma4:26b-a4b"
        assert "known_models" in result
        assert "gemma4:26b-a4b" in result["known_models"]

    @pytest.mark.asyncio
    async def test_list_models_marks_available(self, mock_ollama_ok):
        r = ModelRouter()
        result = await r.list_models()
        default_meta = result["known_models"]["gemma4:26b-a4b"]
        assert default_meta["available_in_ollama"] is True

    @pytest.mark.asyncio
    async def test_list_models_marks_unavailable(self, mock_ollama_ok):
        r = ModelRouter()
        result = await r.list_models()
        # gemma4:31b is not in the mocked Ollama response
        if "gemma4:31b" in result["known_models"]:
            assert result["known_models"]["gemma4:31b"]["available_in_ollama"] is False

    @pytest.mark.asyncio
    async def test_list_models_ollama_down(self, mock_ollama_down):
        r = ModelRouter()
        result = await r.list_models()
        assert result["ollama_running"] is False
        # Still returns known models even when Ollama is down
        assert "known_models" in result

    @pytest.mark.asyncio
    async def test_list_models_marks_default(self, mock_ollama_ok):
        r = ModelRouter()
        result = await r.list_models()
        for tag, meta in result["known_models"].items():
            assert meta["is_default"] == (tag == r.default)


class TestModelStatus:
    @pytest.mark.asyncio
    async def test_status_ollama_up(self, mock_ollama_ok):
        r = ModelRouter()
        result = await r.status()
        assert result["ollama_ok"] is True
        assert result["target"] == "gemma4:26b-a4b"

    @pytest.mark.asyncio
    async def test_status_specific_model(self, mock_ollama_ok):
        r = ModelRouter()
        result = await r.status("qwen3.5:35b-a3b")
        assert result["target"] == "qwen3.5:35b-a3b"

    @pytest.mark.asyncio
    async def test_status_ollama_down(self, mock_ollama_down):
        r = ModelRouter()
        result = await r.status()
        assert result["ollama_ok"] is False
        assert "error" in result

    @pytest.mark.asyncio
    async def test_status_returns_metadata(self, mock_ollama_ok):
        r = ModelRouter()
        result = await r.status("gemma4:26b-a4b")
        assert "metadata" in result
        assert result["metadata"]["license"] == "Apache-2.0"
