# openclaude-mcp — SOTA Industrial Dashboard (Windows/PowerShell)
#
# Rule: JUST-SOTA-2026-04
# Standard: PowerShell 7.4+ core-compliant

set windows-shell := ["pwsh.exe", "-NoLogo", "-Command"]

REPO   := "D:/Dev/repos/openclaude-mcp"
UV     := "C:/Users/sandr/.local/bin/uv.exe"
PYTHON := UV + " run python"
NAME   := "openclaude-mcp"
VER    := "0.1.0"

# ── Dashboard ─────────────────────────────────────────────────────────────────

# Display the SOTA Industrial Dashboard
default:
    @powershell -NoLogo -Command " \
        $lines = Get-Content '{{justfile()}}'; \
        Write-Host ' [OCP] OpenClaude Control Plane Dashboard v{{VER}}' -ForegroundColor White -BackgroundColor Magenta; \
        Write-Host '' ; \
        $currentCategory = ''; \
        foreach ($line in $lines) { \
            if ($line -match '^# ── ([^─]+) ─') { \
                $currentCategory = $matches[1].Trim(); \
                if ($currentCategory -ne 'Dashboard') { \
                    Write-Host \"`n  $currentCategory\" -ForegroundColor Magenta; \
                    Write-Host '  ' + ('─' * 45) -ForegroundColor Gray; \
                } \
            } elseif ($line -match '^# ([^─].+)') { \
                $desc = $matches[1].Trim(); \
                $idx = [array]::IndexOf($lines, $line); \
                if ($idx -lt $lines.Count - 1) { \
                    $nextLine = $lines[$idx + 1]; \
                    if ($nextLine -match '^([a-z0-9-]+):') { \
                        $recipe = $matches[1]; \
                        $pad = ' ' * [math]::Max(2, (18 - $recipe.Length)); \
                        Write-Host \"    $recipe\" -ForegroundColor White -NoNewline; \
                        Write-Host \"$pad$desc\" -ForegroundColor Gray; \
                    } \
                } \
            } \
        } \
        Write-Host \"`n  [System State: PROD/HARDENED]\" -ForegroundColor DarkGray; \
        Write-Host ''"

help: default

# ── Infrastructure ──────────────────────────────────────────────────────────

# One-time first-time setup (npm + uv)
setup:
    powershell -ExecutionPolicy Bypass -File setup.ps1

# Launch Control Plane (starts server + webapp)
start:
    powershell -ExecutionPolicy Bypass -File start.ps1

# Start FastMCP backend only (10932)
server:
    {{PYTHON}} server.py

# Start React oversight dashboard only (10933)
webapp:
    cd webapp && npm run dev

# ── Quality ──────────────────────────────────────────────────────────────────

# Execute Ruff v13.1 static analysis
lint:
    {{UV}} run ruff check .
    {{UV}} run ruff format --check .

# Perform automated repair and formatting
fix:
    {{UV}} run ruff check --fix --unsafe-fixes .
    {{UV}} run ruff format .

# Perform static type analysis (Pyright)
typecheck:
    {{UV}} run pyright openclaude/ server.py || true

# ── Hardening ────────────────────────────────────────────────────────────────

# Execute Bandit and Semgrep security scans
check-sec:
    {{UV}} run bandit -r openclaude/ server.py -ll
    {{UV}} run semgrep --config p/security-audit --error .

# Audit Python and Node dependencies for CVEs
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
