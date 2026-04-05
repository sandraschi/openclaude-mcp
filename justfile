REPO   := "D:/Dev/repos/openclaude-mcp"
UV     := "C:/Users/sandr/.local/bin/uv.exe"
PYTHON := UV + " run python"
NAME   := "openclaude-mcp"
VER    := "0.1.0"

# ── Default ──────────────────────────────────────────────────────────────────

default:
    @just --list

# ── Dev ──────────────────────────────────────────────────────────────────────

# Install all dependencies
install:
    {{UV}} sync

# Install with Prefab UI support (fastmcp[apps])
install-apps:
    {{UV}} sync --extra apps

# Install with dev + test dependencies
install-dev:
    {{UV}} sync --extra dev

# Start MCP backend only (port 10932)
server:
    {{PYTHON}} server.py

# Start webapp only (port 10933)
webapp:
    cd webapp && npm run dev

# Start both via start.ps1 (Windows — clears ports, opens browser)
start:
    powershell -ExecutionPolicy Bypass -File start.ps1

# One-time first-time setup
setup:
    powershell -ExecutionPolicy Bypass -File setup.ps1

# ── Quality ───────────────────────────────────────────────────────────────────

# Lint
lint:
    {{UV}} run ruff check .
    {{UV}} run ruff format --check .

# Format in place
fmt:
    {{UV}} run ruff format .
    {{UV}} run ruff check --fix .

# Type check (non-blocking during adoption)
typecheck:
    {{UV}} run pyright openclaude/ server.py || true

# ── Security ──────────────────────────────────────────────────────────────────

# Static analysis security scan (Bandit + Semgrep)
check-sec:
    {{UV}} run bandit -r openclaude/ server.py -ll
    {{UV}} run semgrep --config p/security-audit --error .

# Audit dependencies for CVEs
audit-deps:
    {{UV}} run safety check
    cd webapp && npm audit

# ── Testing ───────────────────────────────────────────────────────────────────

# Run all tests
test:
    {{UV}} run pytest tests/ -v

# Unit tests only (fast, no I/O)
test-unit:
    {{UV}} run pytest tests/unit/ -v

# Integration tests (requires Ollama running)
test-integration:
    {{UV}} run pytest tests/integration/ -v -m integration

# Smoke test (start server, hit /api/health, stop)
smoke:
    {{UV}} run pytest tests/smoke/ -v -m smoke

# E2E test (full session lifecycle, requires Ollama + openclaude on PATH)
test-e2e:
    {{UV}} run pytest tests/e2e/ -v -m e2e

# All tests with coverage
test-cov:
    {{UV}} run pytest tests/ -v --tb=short --cov=openclaude --cov=server --cov-report=term-missing

# ── Models ────────────────────────────────────────────────────────────────────

# Pull recommended Ollama models
pull-models:
    ollama pull gemma4:26b-a4b
    ollama pull qwen3.5:35b-a3b

# Pull max-quality model (needs 20GB VRAM)
pull-max:
    ollama pull gemma4:31b

# ── Webapp ────────────────────────────────────────────────────────────────────

# Install webapp npm deps
webapp-install:
    cd webapp && npm install

# Build webapp for production
webapp-build:
    cd webapp && npm run build

# ── Packaging ─────────────────────────────────────────────────────────────────

# Build MCPB bundle for Claude Desktop
mcpb-pack:
    mcpb pack . dist/{{NAME}}-v{{VER}}.mcpb

# Validate the manifest before packing
mcpb-validate:
    mcpb validate manifest.json

# Inspect a built bundle
mcpb-inspect:
    mcpb inspect dist/{{NAME}}-v{{VER}}.mcpb

# Full packaging pipeline: validate → pack → inspect
pack: mcpb-validate mcpb-pack mcpb-inspect

# ── Housekeeping ──────────────────────────────────────────────────────────────

# Remove build artefacts and cache
clean:
    powershell -Command "Remove-Item -Recurse -Force dist,__pycache__,'.pytest_cache','.ruff_cache' -ErrorAction SilentlyContinue"

# Remove everything including venv (nuclear option)
clean-all: clean
    powershell -Command "Remove-Item -Recurse -Force .venv,webapp/node_modules -ErrorAction SilentlyContinue"
