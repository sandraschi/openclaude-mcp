# openclaude-mcp start script
# Clears ports, starts MCP backend + React webapp, opens browser

$BackendPort = 10932
$WebPort = 10933
$RepoDir = $PSScriptRoot
$uvPath = "C:\Users\sandr\.local\bin\uv.exe"

Write-Host "openclaude-mcp starting..." -ForegroundColor Cyan

# Clear ports
foreach ($port in @($BackendPort, $WebPort)) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
        $conns | ForEach-Object { 
            if ($_.OwningProcess -gt 0) {
                try { 
                    Stop-Process -Id $_.OwningProcess -Force -ErrorAction Stop
                    Write-Host "Cleared port $port (pid $($_.OwningProcess))" -ForegroundColor Yellow
                } catch {
                    Write-Host "Failed to clear port $port (pid $($_.OwningProcess))" -ForegroundColor Red
                }
            }
        }
    }
}

# 1. Self-healing: Python dependencies
Write-Host "`nChecking Python environment..." -ForegroundColor Gray
# Kill any processes locking the .venv
Get-Process | Where-Object { try { $_.Path -like "$RepoDir\.venv*" } catch { $false } } | Stop-Process -Force -ErrorAction SilentlyContinue

$null = & $uvPath sync --check --directory $RepoDir 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Python environment outdated. Syncing..." -ForegroundColor Yellow
    & $uvPath sync --directory $RepoDir
    if ($LASTEXITCODE -ne 0) { 
        Write-Host "WARNING: uv sync failed (likely file lock). Attempting to proceed with current env..." -ForegroundColor Red
    } else {
        Write-Host "Python deps synced" -ForegroundColor Green
    }
} else {
    Write-Host "Python deps OK" -ForegroundColor Green
}

# 2. Self-healing: Webapp dependencies
if (-not (Test-Path "$RepoDir\webapp\node_modules")) {
    Write-Host "`nWebapp node_modules missing. Installing..." -ForegroundColor Yellow
    Push-Location "$RepoDir\webapp"
    npm install
    if ($LASTEXITCODE -ne 0) { Write-Host "npm install failed" -ForegroundColor Red; Pop-Location; exit 1 }
    Pop-Location
    Write-Host "Webapp deps installed" -ForegroundColor Green
} else {
    Write-Host "Webapp deps OK" -ForegroundColor Green
}

# Check Ollama
try {
    $ollamaCheck = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 3 -ErrorAction Stop
    $modelCount = $ollamaCheck.models.Count
    Write-Host "`nOllama OK - $modelCount models available" -ForegroundColor Green
} catch {
    Write-Host "`nWARNING: Ollama not responding on :11434. Sessions will fail until Ollama is running." -ForegroundColor Red
}

# Start MCP backend
$BackendLog = "$RepoDir\backend_startup.log"
Remove-Item $BackendLog -ErrorAction SilentlyContinue
$backend = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c $uvPath run --directory $RepoDir python server.py > `"$BackendLog`" 2>&1" `
    -WorkingDirectory $RepoDir `
    -PassThru -WindowStyle Minimized
Write-Host "MCP backend started (pid $($backend.Id)) on :$BackendPort" -ForegroundColor Green

# 3. Wait for backend health before starting webapp
$backWaited = 0
$backMaxWait = 15
Write-Host "Waiting for backend health..." -ForegroundColor Gray
while ($backWaited -lt $backMaxWait) {
    try {
        # Use 127.0.0.1 for faster/reliable connection
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:$BackendPort/api/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
        if ($health.status -eq "ok") {
            Write-Host "Backend OK (Ollama: $($health.ollama))" -ForegroundColor Green
            break
        }
    } catch {}
    Start-Sleep -Seconds 1
    $backWaited++
}

if ($backWaited -ge $backMaxWait) {
    Write-Host "ERROR: Backend failed to respond healthily within ${backMaxWait}s." -ForegroundColor Red
    Write-Host "Check $BackendLog for details." -ForegroundColor Yellow
    exit 1
}

# Start webapp
$WebLog = "$RepoDir\webapp\webapp_startup.log"
Remove-Item $WebLog -ErrorAction SilentlyContinue
$null = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c npm run dev > `"$WebLog`" 2>&1" `
    -WorkingDirectory "$RepoDir\webapp" `
    -PassThru -WindowStyle Minimized
Write-Host "Webapp starting on :$WebPort (logging to webapp_startup.log)..." -ForegroundColor Green

# Poll until webapp is up, then open browser
$maxWait = 60
$waited = 0
Write-Host "Waiting for webapp on http://localhost:$WebPort..." -ForegroundColor Gray
while ($waited -lt $maxWait) {
    Start-Sleep -Seconds 2
    $waited += 2
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:$WebPort" -TimeoutSec 2 -ErrorAction Stop
        Write-Host "`nWebapp ready. Opening browser..." -ForegroundColor Green
        Start-Process "http://localhost:$WebPort"
        break
    } catch {
        if ($waited % 6 -eq 0) {
            Write-Host "Waiting for webapp (${waited}s)..." -ForegroundColor Gray
        }
    }
}

if ($waited -ge $maxWait) {
    Write-Host "`nERROR: Webapp failed to start within ${maxWait}s." -ForegroundColor Red
    Write-Host "Check 'npm run dev' manually in $RepoDir\webapp to debug." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "openclaude-mcp running" -ForegroundColor Cyan
Write-Host "  MCP SSE:     http://localhost:$BackendPort/sse" -ForegroundColor White
Write-Host "  REST bridge: http://localhost:$BackendPort/tools/{name}" -ForegroundColor White
Write-Host "  Webapp:      http://localhost:$WebPort" -ForegroundColor White
Write-Host "  Health:      http://localhost:$BackendPort/api/health" -ForegroundColor White
Write-Host ""
Write-Host "Quick model pull:" -ForegroundColor Yellow
Write-Host "  ollama pull gemma4:26b-a4b" -ForegroundColor Gray
Write-Host "  ollama pull qwen3.5:35b-a3b" -ForegroundColor Gray
