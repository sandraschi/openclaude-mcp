# setup.ps1  —  one-time setup for openclaude-mcp
# Run this ONCE before start.ps1

$RepoDir = $PSScriptRoot
$uvPath = "C:\Users\sandr\.local\bin\uv.exe"

Write-Host "=== openclaude-mcp one-time setup ===" -ForegroundColor Cyan

# 1. Python deps (includes filelock for MEMORY.md race fix)
Write-Host "`n[1/5] Installing Python dependencies..." -ForegroundColor Yellow
& $uvPath sync --directory $RepoDir
if ($LASTEXITCODE -ne 0) { Write-Host "uv sync failed" -ForegroundColor Red; exit 1 }
Write-Host "Python deps OK" -ForegroundColor Green

# 2. Webapp deps
Write-Host "`n[2/5] Installing webapp (npm install)..." -ForegroundColor Yellow
Push-Location "$RepoDir\webapp"
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "npm install failed" -ForegroundColor Red; Pop-Location; exit 1 }
Pop-Location
Write-Host "Webapp deps OK" -ForegroundColor Green

# 3. Install OpenClaude fork
Write-Host "`n[3/5] Installing OpenClaude fork..." -ForegroundColor Yellow
npm install -g @gitlawb/openclaude
if ($LASTEXITCODE -ne 0) {
    Write-Host "npm install -g @gitlawb/openclaude failed." -ForegroundColor Red
    Write-Host "  Try manually: npm install -g @gitlawb/openclaude" -ForegroundColor Yellow
} else {
    Write-Host "OpenClaude installed OK" -ForegroundColor Green
}

# 4. Pull recommended Ollama models
Write-Host "`n[4/5] Pulling Ollama models..." -ForegroundColor Yellow
foreach ($m in @("gemma4:26b-a4b", "qwen3.5:35b-a3b")) {
    Write-Host "  ollama pull $m" -ForegroundColor Gray
    ollama pull $m
}

# 5. Configure Ollama for parallel requests
# Default OLLAMA_NUM_PARALLEL=1 means KAIROS and interactive sessions queue
# serially. With a 4090 (24GB) and gemma4:26b-a4b (~9.5GB), 2 parallel
# requests fit comfortably. Set permanently in the Machine environment.
Write-Host "`n[5/5] Configuring Ollama parallel inference..." -ForegroundColor Yellow

$currentParallel = [System.Environment]::GetEnvironmentVariable("OLLAMA_NUM_PARALLEL", "User")
$currentQueue    = [System.Environment]::GetEnvironmentVariable("OLLAMA_MAX_QUEUE", "User")

if ($currentParallel -ne "2") {
    setx OLLAMA_NUM_PARALLEL 2 | Out-Null
    Write-Host "  OLLAMA_NUM_PARALLEL set to 2 (was: $currentParallel)" -ForegroundColor Green
} else {
    Write-Host "  OLLAMA_NUM_PARALLEL already 2 - OK" -ForegroundColor Gray
}

if ($currentQueue -ne "8") {
    setx OLLAMA_MAX_QUEUE 8 | Out-Null
    Write-Host "  OLLAMA_MAX_QUEUE set to 8 (was: $currentQueue)" -ForegroundColor Green
} else {
    Write-Host "  OLLAMA_MAX_QUEUE already 8 - OK" -ForegroundColor Gray
}

Write-Host "  NOTE: Restart Ollama (or reboot) for parallel settings to take effect." -ForegroundColor Yellow
Write-Host "  With gemma4:26b-a4b (~9.5GB), 2 parallel slots = KAIROS + interactive session" -ForegroundColor Gray
Write-Host "  concurrently without either blocking the other." -ForegroundColor Gray

Write-Host "`n=== Setup complete ===" -ForegroundColor Cyan
Write-Host "Run: .\start.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Optional: set ANTHROPIC_API_KEY for ULTRAPLAN support" -ForegroundColor Gray
Write-Host '  $env:ANTHROPIC_API_KEY = "sk-ant-..."' -ForegroundColor Gray
Write-Host ""
Write-Host "Optional: Prefab UI (fleet_dashboard rich rendering)" -ForegroundColor Gray
Write-Host "  & `"$uvPath`" sync --extra apps" -ForegroundColor Gray
