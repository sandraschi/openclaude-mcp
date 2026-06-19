param([switch]$Headless, [switch]$BackendOnly, [switch]$NoBrowser,
    [switch]$ReuseIfRunning)

if ($Headless -and ($Host.UI.RawUI.WindowTitle -notmatch 'Hidden')) {
    Start-Process pwsh -ArgumentList '-NoProfile', '-File', $PSCommandPath, '-Headless' -WindowStyle Hidden
    exit
}

$ScriptRoot = $PSScriptRoot
if ($env:OPENCLAUDE_MCP_PORT) {
    $BackendPort = [int]$env:OPENCLAUDE_MCP_PORT
} else {
    $BackendPort = 10932
$FleetStartPath = Join-Path $ProjectRoot "scripts\FleetStartMode.ps1"
if (-not (Test-Path -LiteralPath $FleetStartPath)) {
    Write-Host "ERROR: Missing vendored launcher helper: $FleetStartPath" -ForegroundColor Red
    exit 1
}
. $FleetStartPath

}
$WebappPort = $BackendPort + 1

$FleetStartPath = Join-Path $ScriptRoot "scripts\FleetStartMode.ps1"
if (-not (Test-Path -LiteralPath $FleetStartPath)) {
    Write-Host "ERROR: Missing vendored launcher helper: $FleetStartPath" -ForegroundColor Red
    exit 1
}
. $FleetStartPath


Write-Host '=== openclaude-mcp Start ===' -ForegroundColor Cyan

$hasUv = Get-Command uv -ErrorAction SilentlyContinue
if (-not $hasUv) {
    Write-Host 'ERROR: uv not found. Install from https://docs.astral.sh/uv/' -ForegroundColor Red
    exit 1
}

$hasOllama = Get-Command ollama -ErrorAction SilentlyContinue
if (-not $hasOllama) {
    Write-Host 'WARNING: ollama not found on PATH. Sessions will fail to start.' -ForegroundColor Yellow
}

Write-Host 'Syncing Python dependencies...' -ForegroundColor Cyan
Set-Location $ScriptRoot
uv sync --project $ScriptRoot
if ($LASTEXITCODE -ne 0) {
    Write-Host 'ERROR: uv sync failed.' -ForegroundColor Red
    exit 1
}

Write-Host "Starting backend on :$BackendPort ..." -ForegroundColor Cyan
$backendCmd = "`$env:OPENCLAUDE_MCP_PORT='$BackendPort'; Set-Location '$ScriptRoot'; uv run --project '$ScriptRoot' python server.py"
$BackendProc = Start-Process powershell -ArgumentList "-NoProfile", "-WindowStyle", "Normal", "-Command", $backendCmd -PassThru

$maxRetries = 45
$retry = 0
while ($retry -lt $maxRetries) {
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:$BackendPort/api/health" -ErrorAction Stop
        if ($health.status -eq 'ok') {
            Write-Host "Backend healthy on :$BackendPort" -ForegroundColor Green
            break
        }
    } catch {}
    $retry++
    Start-Sleep -Seconds 1
}

if ($retry -ge $maxRetries) {
    Write-Host 'ERROR: Backend failed to respond within 45s.' -ForegroundColor Red
    exit 1
}

if ($BackendOnly) {
    while (-not $BackendProc.HasExited) { Start-Sleep 2 }
    exit
}

$WebRoot = Join-Path $ScriptRoot "webapp"
if (-not (Test-Path (Join-Path $WebRoot "node_modules"))) {
    Set-Location $WebRoot
    npm install
}

if (-not $NoBrowser -and -not $Headless) {
    $frontendUrl = "http://127.0.0.1:$WebappPort/"
    $pollAndOpen = "for (`$i = 0; `$i -lt 60; `$i++) { try { `$null = Invoke-WebRequest -Uri '$frontendUrl' -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop; Start-Process '$frontendUrl'; exit } catch { Start-Sleep -Seconds 1 } }"
    Start-Process powershell -ArgumentList "-NoProfile", "-WindowStyle", "Hidden", "-Command", $pollAndOpen
}

Write-Host "Starting Vite frontend on port $WebappPort ..." -ForegroundColor Green
Set-Location $WebRoot
npm run dev


