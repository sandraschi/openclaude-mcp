# openclaude-mcp start script
# Clears ports, starts MCP backend + React webapp, opens browser

$BackendPort = 10932
$WebPort = 10933
$RepoDir = $PSScriptRoot
$uvPath = "C:\Users\sandr\.local\bin\uv.exe"

Write-Host "openclaude-mcp starting..." -ForegroundColor Cyan

# Clear ports
foreach ($port in @($BackendPort, $WebPort)) {
    $procs = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($procs) {
        $procs | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
        Write-Host "Cleared port $port" -ForegroundColor Yellow
    }
}

# Check Ollama
try {
    $ollamaCheck = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 3 -ErrorAction Stop
    $modelCount = $ollamaCheck.models.Count
    Write-Host "Ollama OK - $modelCount models available" -ForegroundColor Green
} catch {
    Write-Host "WARNING: Ollama not responding on :11434. Sessions will fail until Ollama is running." -ForegroundColor Red
}

# Start MCP backend
$backend = Start-Process -FilePath $uvPath `
    -ArgumentList "run", "--directory", $RepoDir, "python", "server.py" `
    -WorkingDirectory $RepoDir `
    -PassThru -WindowStyle Minimized
Write-Host "MCP backend started (pid $($backend.Id)) on :$BackendPort" -ForegroundColor Green

# Start webapp
$null = Start-Process -FilePath "npm" `
    -ArgumentList "run", "dev" `
    -WorkingDirectory "$RepoDir\webapp" `
    -PassThru -WindowStyle Minimized
Write-Host "Webapp starting on :$WebPort..." -ForegroundColor Green

# Poll until webapp is up, then open browser
$maxWait = 30
$waited = 0
while ($waited -lt $maxWait) {
    Start-Sleep -Seconds 2
    $waited += 2
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:$WebPort" -TimeoutSec 2 -ErrorAction Stop
        Write-Host "Webapp ready. Opening browser..." -ForegroundColor Green
        Start-Process "http://localhost:$WebPort"
        break
    } catch {
        Write-Host "Waiting for webapp (${waited}s)..." -ForegroundColor Gray
    }
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
