@echo off
:: push-to-github.bat — initial push of openclaude-mcp to sandraschi/openclaude-mcp
:: Run this ONCE after creating the repo on GitHub (empty, no README)
:: GitHub auth: uses Windows Credential Manager or will prompt

setlocal
cd /d "D:\Dev\repos\openclaude-mcp"
set GIT="C:\Program Files\Git\bin\git.exe"

echo === openclaude-mcp initial GitHub push ===
echo.

:: Check we have a git repo
%GIT% status --short
if errorlevel 1 (
    echo ERROR: Not a git repo. Run: git init
    exit /b 1
)

:: Stage everything
echo [1/4] Staging all files...
%GIT% add -A
echo Staged.

:: Commit
echo [2/4] Committing...
%GIT% commit -m "feat: initial release v0.1.0 — FastMCP 3.2 MCP server for OpenClaude + Ollama

- FastMCP 3.2 server with SSE transport + REST bridge on port 10932
- FastMCPApp fleet dashboard (Prefab UI, graceful fallback)
- KAIROS autoDream daemon with real Ollama LLM consolidation
- ULTRAPLAN relay to Anthropic Opus (optional, requires API key)
- Model routing: Gemma 4 26B-A4B (default), Qwen3.5 35B-A3B, Gemma 4 31B
- React+Vite webapp on port 10933 (Dashboard, Sessions, Models, KAIROS, Help)
- Full test suite: unit, integration, smoke, e2e
- MCPB package: manifest.json + assets/prompts (3-4-100 rule)
- glama.json, llms.txt, llms-full.txt, justfile
- Help page: full Great Leak of 2026 narrative + KAIROS deep dive
- Fleet integrated: WEBAPP_PORTS.md, webapp-registry.json, FLEET_INDEX.md
- starts/openclaude-mcp-start.bat for fleet launcher

Background: Claude Code leaked March 31 2026 via npm source map in
@anthropic-ai/claude-code v2.1.88. OpenClaude (Gitlawb/openclaude)
is the primary community fork. This MCP server wraps it for local inference.

Zero cloud token cost. 24/7 on RTX 4090."

if errorlevel 1 (
    echo Nothing to commit or commit failed.
    exit /b 1
)

:: Set main branch
echo [3/4] Setting branch to main...
%GIT% branch -M main

:: Push
echo [4/4] Pushing to origin...
%GIT% push -u origin main

if errorlevel 1 (
    echo.
    echo PUSH FAILED. Possible causes:
    echo   - Repo doesn't exist yet: create it at https://github.com/new
    echo     Name: openclaude-mcp, empty repo, no README/license/gitignore
    echo   - Auth issue: gh auth login  OR  git credential manager
    exit /b 1
)

echo.
echo === Push complete ===
echo https://github.com/sandraschi/openclaude-mcp
endlocal
