# run-tests.ps1 — run unit + smoke tests, write results to temp
$ErrorActionPreference = "Continue"
Set-Location "D:\Dev\repos\openclaude-mcp"
$py = "D:\Dev\repos\openclaude-mcp\.venv\Scripts\python.exe"
& $py -m pytest tests/smoke/ tests/unit/ -v --tb=short --no-header --rootdir="D:\Dev\repos\openclaude-mcp" -p no:cacheprovider `
    | Tee-Object -FilePath "D:\Dev\repos\temp\test_results.txt"
$LASTEXITCODE | Out-File "D:\Dev\repos\temp\test_exit.txt" -NoNewline
