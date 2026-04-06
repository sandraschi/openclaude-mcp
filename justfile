set windows-shell := ["pwsh.exe", "-NoLogo", "-Command"]

UV     := "C:/Users/sandr/.local/bin/uv.exe"
NAME   := "openclaude-mcp"
VER    := "0.1.0"
PORT   := "10932"

# ── Dashboard ─────────────────────────────────────────────────────────────────

# Show live status + recipe list
default:
    @$port = {{PORT}}; \
    $health = $null; \
    try { \
        $health = Invoke-RestMethod "http://localhost:$port/api/health" -TimeoutSec 2 -ErrorAction Stop; \
    } catch {}; \
    $serverState  = if ($health) { 'RUNNING' }  else { 'STOPPED' }; \
    $serverColor  = if ($health) { 'Green' }   else { 'Yellow' }; \
    $ollamaState  = if ($health -and $health.ollama) { 'ONLINE' } else { 'OFFLINE' }; \
    $ollamaColor  = if ($health -and $health.ollama) { 'Green' }  else { 'Yellow' }; \
    $model        = if ($health -and $health.default_model) { $health.default_model } else { '—' }; \
    $sessions     = if ($health) { $health.active_sessions } else { '—' }; \
    $prefab       = if ($health -and $health.prefab_ui) { 'YES' } else { 'no' }; \
    $prefabColor  = if ($health -and $health.prefab_ui) { 'Cyan' } else { 'Gray' }; \
    Write-Host ''; \
    Write-Host ' [OCP] OpenClaude Control Plane  v{{VER}} ' -ForegroundColor White -BackgroundColor Magenta -NoNewline; \
    Write-Host "  :$port" -ForegroundColor Gray; \
    Write-Host ''; \
    Write-Host '  Server  ' -NoNewline; Write-Host $serverState  -ForegroundColor $serverColor  -NoNewline; \
    Write-Host '   Ollama  ' -NoNewline; Write-Host $ollamaState -ForegroundColor $ollamaColor  -NoNewline; \
    Write-Host '   Sessions  ' -NoNewline; Write-Host $sessions   -ForegroundColor White         -NoNewline; \
    Write-Host '   Model  ' -NoNewline; Write-Host $model         -ForegroundColor Cyan          -NoNewline; \
    Write-Host '   Prefab  ' -NoNewline; Write-Host $prefab       -ForegroundColor $prefabColor; \
    Write-Host ''; \
    $lines = Get-Content '{{justfile()}}'; \
    $currentCategory = ''; \
    foreach ($line in $lines) { \
        if ($line -match '^# ── ([^─]+) ─') { \
            $currentCategory = $matches[1].Trim(); \
            if ($currentCategory -ne 'Dashboard') { \
                Write-Host "  $currentCategory" -ForegroundColor Magenta; \
                Write-Host ('  ' + ('─' * 45)) -ForegroundColor Gray; \
            } \
        } elseif ($line -match '^# ([^─].+)') { \
            $desc = $matches[1].Trim(); \
            $idx = [array]::IndexOf($lines, $line); \
            if ($idx -lt $lines.Count - 1) { \
                $nextLine = $lines[$idx + 1]; \
                if ($nextLine -match '^([a-z0-9-]+):') { \
                    $recipe = $matches[1]; \
                    $pad = ' ' * [math]::Max(2, (20 - $recipe.Length)); \
                    Write-Host "    $recipe" -ForegroundColor White -NoNewline; \
                    Write-Host "$pad$desc" -ForegroundColor Gray; \
                } \
            } \
        } \
    } \
    Write-Host ''

# ── Operation ─────────────────────────────────────────────────────────────────

# One-time first-time setup (npm + uv sync)
setup:
    pwsh -ExecutionPolicy Bypass -File setup.ps1

# Launch Control Plane (starts server + webapp via start.ps1)
start:
    pwsh -ExecutionPolicy Bypass -File start.ps1

# Run FastMCP backend only on fleet port 10932
serve:
    {{UV}} run python server.py

# stdio transport for Claude Desktop / Cursor
stdio:
    {{UV}} run python server.py --transport stdio

# Run the React webapp on port 10933
webapp:
    cd webapp && npm run dev -- --port 10933

# Kill the backend process on port 10932
stop:
    $conn = Get-NetTCPConnection -LocalPort {{PORT}} -ErrorAction SilentlyContinue; \
    if ($conn) { Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue; Write-Host 'Stopped.' -ForegroundColor Green } \
    else { Write-Host 'Nothing on port {{PORT}}.' -ForegroundColor Yellow }

# Stop backend then relaunch it
restart: stop
    {{UV}} run python server.py

# Tail the backend startup log live (Ctrl-C to exit)
logs:
    Get-Content backend_startup.log -Wait -Tail 40

# ── Quality ───────────────────────────────────────────────────────────────────

# Ruff lint check
lint:
    {{UV}} run ruff check .
    {{UV}} run ruff format --check .

# Ruff fix + format
fix:
    {{UV}} run ruff check . --fix --unsafe-fixes
    {{UV}} run ruff format .

# Pyright type check (non-blocking)
typecheck:
    {{UV}} run pyright openclaude/ server.py || true

# Lint + typecheck + unit tests — run before every commit
check: lint typecheck test-unit

# ── Security ──────────────────────────────────────────────────────────────────

# Bandit + Semgrep static security scan
check-sec:
    {{UV}} run bandit -r openclaude/ server.py -ll
    {{UV}} run semgrep --config p/security-audit --error .

# Audit Python + Node deps for CVEs
audit-deps:
    {{UV}} run safety check
    cd webapp && npm audit

# ── Testing ───────────────────────────────────────────────────────────────────

# Run all tests
test:
    {{UV}} run pytest tests/ -v

# Alias (common typo)
tests: test

# Unit tests only (fast, no I/O)
test-unit:
    {{UV}} run pytest tests/unit/ -v

# Integration tests (requires Ollama on :11434)
test-integration:
    {{UV}} run pytest tests/integration/ -v -m integration

# Smoke tests (requires server on :10932)
smoke:
    {{UV}} run pytest tests/smoke/ -v -m smoke

# E2E tests (requires Ollama + openclaude on PATH)
test-e2e:
    {{UV}} run pytest tests/e2e/ -v -m e2e

# All tests with coverage report
test-cov:
    {{UV}} run pytest tests/ -v --tb=short --cov=openclaude --cov=server --cov-report=term-missing

# ── Models ────────────────────────────────────────────────────────────────────

# List models currently available in Ollama
list-models:
    ollama list

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

# Full pipeline: validate → pack
pack: mcpb-validate mcpb-pack

# Build MCPB bundle
mcpb-pack:
    mcpb pack . dist/{{NAME}}-v{{VER}}.mcpb

# Validate manifest
mcpb-validate:
    mcpb validate manifest.json

# ── Housekeeping ──────────────────────────────────────────────────────────────

# Remove build artefacts and cache
clean:
    Remove-Item -Recurse -Force dist,__pycache__,'.pytest_cache','.ruff_cache' -ErrorAction SilentlyContinue

# Remove everything including venv and node_modules — fresh start
reset: clean
    Remove-Item -Recurse -Force .venv,webapp/node_modules -ErrorAction SilentlyContinue

# Free port 10932 without touching anything else
kill-port:
    $conn = Get-NetTCPConnection -LocalPort {{PORT}} -ErrorAction SilentlyContinue; \
    if ($conn) { Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue; Write-Host 'Port {{PORT}} cleared.' -ForegroundColor Green } \
    else { Write-Host 'Port {{PORT}} already free.' -ForegroundColor Yellow }
