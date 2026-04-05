"""Model routing — Ollama health checks and model metadata."""

from __future__ import annotations

from typing import Any

import httpx

OLLAMA_BASE = "http://localhost:11434"


class ModelRouter:
    KNOWN_MODELS: dict[str, dict] = {
        "gemma4:26b-a4b": {
            "label": "Gemma 4 26B MoE (recommended)",
            "active_params_b": 3.8,
            "total_params_b": 26,
            "vram_q4_gb": 9.5,
            "est_toks": "80-100",
            "context_k": 256,
            "tool_calling": True,
            "license": "Apache-2.0",
            "notes": "Sweet spot on 4090. 97% of 31B quality at 4B active params speed.",
        },
        "gemma4:31b": {
            "label": "Gemma 4 31B Dense (max quality)",
            "active_params_b": 31,
            "total_params_b": 31,
            "vram_q4_gb": 20,
            "est_toks": "45-60",
            "context_k": 256,
            "tool_calling": True,
            "license": "Apache-2.0",
            "notes": "#3 open model on Arena. Fits Q4 on 4090 with full 256K ctx.",
        },
        "qwen3.5:35b-a3b": {
            "label": "Qwen3.5 35B-A3B MoE (fastest)",
            "active_params_b": 3,
            "total_params_b": 35,
            "vram_q4_gb": 8.5,
            "est_toks": "112",
            "context_k": 128,
            "tool_calling": True,
            "license": "Apache-2.0",
            "notes": "Fastest option. Only 3B active. Strong agentic tool use.",
        },
        "qwen3.5:27b": {
            "label": "Qwen3.5 27B Dense",
            "active_params_b": 27,
            "total_params_b": 27,
            "vram_q4_gb": 15,
            "est_toks": "40",
            "context_k": 128,
            "tool_calling": True,
            "license": "Apache-2.0",
            "notes": "SWE-bench 72.4%. Best reasoning among 27B class.",
        },
        "qwen3-coder-next": {
            "label": "Qwen3-Coder-Next (agentic coding specialist)",
            "active_params_b": None,
            "total_params_b": None,
            "vram_q4_gb": None,
            "est_toks": "TBD",
            "context_k": None,
            "tool_calling": True,
            "license": "Apache-2.0",
            "notes": "Purpose-built for agentic coding workflows. Monitor for Ollama tag.",
        },
        "glm5": {
            "label": "GLM-5 (MIT, #1 open SWE-bench)",
            "active_params_b": None,
            "total_params_b": None,
            "vram_q4_gb": None,
            "est_toks": "TBD",
            "context_k": None,
            "tool_calling": True,
            "license": "MIT",
            "notes": "Zhipu GLM-5. Watch for Ollama tag.",
        },
    }

    def __init__(self) -> None:
        self.default = "gemma4:26b-a4b"

    async def list_models(self) -> dict[str, Any]:
        available: list[str] = []
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                r = await client.get(f"{OLLAMA_BASE}/api/tags")
                if r.status_code == 200:
                    available = [m["name"] for m in r.json().get("models", [])]
        except Exception:
            pass

        models = {}
        for tag, meta in self.KNOWN_MODELS.items():
            models[tag] = {
                **meta,
                "available_in_ollama": any(tag in a or a in tag for a in available),
                "is_default": tag == self.default,
            }

        return {
            "default": self.default,
            "ollama_running": len(available) > 0,
            "known_models": models,
            "all_ollama_models": available,
        }

    async def set_default(self, tag: str) -> dict[str, Any]:
        self.default = tag
        return {"default": self.default, "status": "ok"}

    async def status(self, tag: str | None = None) -> dict[str, Any]:
        target = tag or self.default
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                r = await client.get(f"{OLLAMA_BASE}/api/tags")
                models = [m["name"] for m in r.json().get("models", [])]
                loaded_r = await client.get(f"{OLLAMA_BASE}/api/ps")
                running = [m["name"] for m in loaded_r.json().get("models", [])]
            return {
                "target": target,
                "ollama_ok": True,
                "model_available": any(target in m or m in target for m in models),
                "model_in_vram": any(target in m or m in target for m in running),
                "metadata": self.KNOWN_MODELS.get(target, {}),
            }
        except Exception as e:
            return {"target": target, "ollama_ok": False, "error": str(e)}
