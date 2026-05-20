Param([switch]$Headless)

# --- SOTA Headless Standard ---
if ($Headless -and ($Host.UI.RawUI.WindowTitle -notmatch 'Hidden')) {
    Start-Process pwsh -ArgumentList '-NoProfile', '-File', $PSCommandPath, '-Headless' -WindowStyle Hidden
    exit
}
$WindowStyle = if ($Headless) { 'Hidden' } else { 'Normal' }
# ------------------------------

$BackendPort = [int]($env:OPENCLAUDE_MCP_PORT ?? 10932)
$WebappPort = $BackendPort + 1

Write-Host '=== openclaude-mcp Start ===' -ForegroundColor Cyan

# --- Dependency checks ---
$hasUv = Get-Command uv -ErrorAction SilentlyContinue
if (-not $hasUv) {
    Write-Host 'ERROR: uv not found. Install from https://docs.astral.sh/uv/' -ForegroundColor Red
    exit 1
}

$hasOllama = Get-Command ollama -ErrorAction SilentlyContinue
if (-not $hasOllama) {
    Write-Host 'WARNING: ollama not found on PATH. Sessions will fail to start.' -ForegroundColor Yellow
}

# --- Kill stale processes on backend port ---
$existing = Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Port $BackendPort is in use. Stopping existing process..." -ForegroundColor Yellow
    $existing.OwningProcess | ForEach-Object {
        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
}

# --- Sync dependencies ---
Write-Host 'Syncing Python dependencies...' -ForegroundColor Cyan
uv sync
if ($LASTEXITCODE -ne 0) {
    Write-Host 'ERROR: uv sync failed.' -ForegroundColor Red
    exit 1
}

# --- Launch backend ---
Write-Host "Starting backend on :$BackendPort ..." -ForegroundColor Cyan
$job = Start-Job -ScriptBlock {
    param($p)
    uv run python server.py
} -ArgumentList $BackendPort

# --- Health gate: wait for backend to respond ---
$maxRetries = 30
$retry = 0
while ($retry -lt $maxRetries) {
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:$BackendPort/api/health" -ErrorAction Stop
        if ($health.status -eq 'ok') {
            Write-Host "Backend healthy on :$BackendPort" -ForegroundColor Green
            break
        }
    } catch {
        # Not ready yet
    }
    $retry++
    Start-Sleep -Seconds 1
}

if ($retry -ge $maxRetries) {
    Write-Host 'ERROR: Backend failed to respond within 30s.' -ForegroundColor Red
    Write-Host "Check logs at http://127.0.0.1:$BackendPort/api/logs/system" -ForegroundColor Yellow
    exit 1
}

Write-Host "  MCP SSE:      http://localhost:$BackendPort/sse" -ForegroundColor Gray
Write-Host "  REST tools:   http://localhost:$BackendPort/tools/{name}" -ForegroundColor Gray
Write-Host "  Health:       http://localhost:$BackendPort/api/health" -ForegroundColor Gray
Write-Host "  Capabilities: http://localhost:$BackendPort/api/capabilities" -ForegroundColor Gray
Write-Host "  Logs:         http://localhost:$BackendPort/api/logs/system" -ForegroundColor Gray

if (-not $Headless) {
    Write-Host "`nWebapp URL: http://localhost:$WebappPort" -ForegroundColor Cyan
}

# Keep script alive
while ($job.State -eq 'Running') {
    Start-Sleep -Seconds 5
    Receive-Job $job | ForEach-Object { Write-Host $_ }
}

Write-Host 'Backend process exited.' -ForegroundColor Red
