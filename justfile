set windows-shell := ["pwsh.exe", "-NoLogo", "-Command"]

# ── Dashboard ─────────────────────────────────────────────────────────────────

# Display the SOTA Industrial Dashboard
default:
    @$lines = Get-Content '{{justfile()}}'; \
    Write-Host ' [SOTA] Industrial Operations Dashboard v1.3.2' -ForegroundColor White -BackgroundColor Cyan; \
    Write-Host '' ; \
    $currentCategory = ''; \
    foreach ($line in $lines) { \
        if ($line -match '^# ── ([^─]+) ─') { \
            $currentCategory = $matches[1].Trim(); \
            Write-Host "`n  $currentCategory" -ForegroundColor Cyan; \
            Write-Host ('  ' + ('─' * 45)) -ForegroundColor Gray; \
        } elseif ($line -match '^# ([^─].+)') { \
            $desc = $matches[1].Trim(); \
            $idx = [array]::IndexOf($lines, $line); \
            if ($idx -lt $lines.Count - 1) { \
                $nextLine = $lines[$idx + 1]; \
                if ($nextLine -match '^([a-z0-9-]+):') { \
                    $recipe = $matches[1]; \
                    $pad = ' ' * [math]::Max(2, (18 - $recipe.Length)); \
                    Write-Host "    $recipe" -ForegroundColor White -NoNewline; \
                    Write-Host "$pad$desc" -ForegroundColor Gray; \
                } \
            } \
        } \
    } \
    Write-Host "`n  [System State: PROD/HARDENED]" -ForegroundColor DarkGray; \
    Write-Host ''

# ── Operation ─────────────────────────────────────────────────────────────────

# Project Automation
# ---------------------------------------------------------------------------

# Run the MCP backend + REST bridge on fleet port 10932
serve:
    uv run python server.py

# Run in stdio mode for Claude Desktop / Cursor
stdio:
    uv run python server.py --transport stdio

# Run the React webapp
webapp:
    cd webapp && npm run dev -- --port 10933

# Start both via start.ps1 (Windows — clears ports, opens browser)
start:
    powershell -ExecutionPolicy Bypass -File start.ps1

# One-time first-time setup
setup:
    powershell -ExecutionPolicy Bypass -File setup.ps1

# ── Quality ───────────────────────────────────────────────────────────────────

# Execute Ruff SOTA v13.1 linting
lint:
    uv run ruff check .
    uv run ruff format --check .

# Execute Ruff SOTA v13.1 fix and formatting
fix:
    uv run ruff check . --fix --unsafe-fixes
    uv run ruff format .

# Type check (non-blocking during adoption)
typecheck:
    uv run pyright openclaude/ server.py || true

# ── Security ──────────────────────────────────────────────────────────────────

# Static analysis security scan (Bandit + Semgrep)
check-sec:
    uv run bandit -r openclaude/ server.py -ll
    uv run semgrep --config p/security-audit --error .

# Audit dependencies for CVEs
audit-deps:
    uv run safety check
    cd webapp && npm audit

# ── Testing ───────────────────────────────────────────────────────────────────

# Run all tests
test:
    uv run pytest tests/ -v

# Unit tests only (fast, no I/O)
test-unit:
    uv run pytest tests/unit/ -v

# Integration tests (requires Ollama running)
test-integration:
    uv run pytest tests/integration/ -v -m integration

# All tests with coverage
test-cov:
    uv run pytest tests/ -v --tb=short --cov=openclaude --cov=server --cov-report=term-missing

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

# Full packaging pipeline: validate → pack → inspect
pack: mcpb-validate mcpb-pack mcpb-inspect

# Build MCPB bundle for Claude Desktop
mcpb-pack:
    mcpb pack . dist/openclaude-v0.1.0.mcpb

# Validate the manifest before packing
mcpb-validate:
    mcpb validate manifest.json

# Inspect a built bundle
mcpb-inspect:
    mcpb inspect dist/openclaude-v0.1.0.mcpb

# ── Housekeeping ──────────────────────────────────────────────────────────────

# Remove build artefacts and cache
clean:
    powershell -Command "Remove-Item -Recurse -Force dist,__pycache__,'.pytest_cache','.ruff_cache' -ErrorAction SilentlyContinue"

# Remove everything including venv (nuclear option)
clean-all: clean
    powershell -Command "Remove-Item -Recurse -Force .venv,webapp/node_modules -ErrorAction SilentlyContinue"
