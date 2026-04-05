# openclaude-mcp — User Tutorial
# Natural language guide for using the server from Claude Desktop or other MCP clients
# 4,000+ words of practical usage

## Getting Started

Welcome to openclaude-mcp. This server lets you run AI-powered coding sessions on your own machine using local Ollama models — no API costs, no rate limits, 24/7 availability. The underlying agent is OpenClaude, a community fork of Anthropic's Claude Code tool.

Before your first session, make sure:
1. Ollama is running (`ollama serve`)
2. At least one model is pulled (`ollama pull gemma4:26b-a4b`)
3. OpenClaude is installed (`npm install -g @gitlawb/openclaude`)

The server starts with `.\start.ps1` from the repo, or via Claude Desktop if configured.

---

## Your First Session

Let's say you have a Python project at `D:\Dev\repos\my-project` and you want to add a REST endpoint.

Start by checking what models are available:

> "Check which Ollama models I have available and start a session in my project"

The assistant will:
1. Call `list_models()` to see what's in Ollama
2. Call `start_session("D:\\Dev\\repos\\my-project")` using the default model
3. Return the session_id

Now send a prompt:

> "Add a /health endpoint to the FastAPI app that returns status, version, and uptime"

The assistant calls `send_prompt(session_id, "Add a /health endpoint...")` and OpenClaude:
- Reads the existing codebase (grep, glob tools)
- Plans the changes
- Writes the code
- Runs tests if configured

Check what happened:

> "What did openclaude do in session abc12345?"

Calls `session_status()` to show the latest output.

When done:

> "Stop the session"

Calls `stop_session()`.

---

## Working with the Fleet Dashboard

The fleet dashboard gives you a bird's-eye view of all running sessions.

> "Show me the fleet dashboard"

If you have prefab-ui installed (run `just install-apps` first), this renders a live table in Claude Desktop showing all sessions, their models, KAIROS status, and uptime.

Without prefab-ui, `fleet_status()` returns the same data as JSON.

> "What sessions are currently running and what are they doing?"

This calls `list_sessions()` followed by `session_status()` for each active session.

---

## Using KAIROS for Long Sessions

KAIROS is the memory consolidation daemon. For any session lasting more than 15-20 minutes, you should enable it.

> "Start a session in my yahboom-mcp repo with KAIROS enabled"

The assistant calls `start_session("D:\\Dev\\repos\\yahboom-mcp", enable_kairos=True)`.

Or enable it on an existing session:

> "Enable KAIROS on session abc12345 with a 2-minute idle threshold"

Calls `kairos_enable("abc12345", idle_threshold_seconds=120)`.

KAIROS creates and maintains a `MEMORY.md` file in your project directory. After some work:

> "Show me what KAIROS has consolidated so far in session abc12345"

Calls `kairos_log("abc12345")` to show the daemon log, then reads `MEMORY.md` from the working directory via filesystem-mcp.

**How to tell if KAIROS is helping:**
- The session stays coherent over long periods
- The model doesn't repeat questions it already answered
- MEMORY.md accumulates accurate project facts over time
- The consolidation log shows entries like "autoDream consolidation #3 complete"

**KAIROS and model quality:**
The consolidation step calls the same Ollama model as the session. gemma4:26b-a4b does a reasonable job. For best results, use qwen3.5:27b — its thinking mode produces noticeably cleaner consolidation, catching more contradictions and being more precise about what's a fact vs. an observation.

---

## ULTRAPLAN: When You Need Opus

For genuinely complex decisions — not routine coding — you can engage Anthropic's Opus model for the planning step while keeping execution local.

**Good ULTRAPLAN candidates:**
- "Redesign the auth system to support OAuth2 while keeping our existing API"
- "Plan the migration from SQLite to PostgreSQL with zero downtime"
- "Design a plugin architecture for the MCP server that supports hot reload"
- "Plan a refactor to add proper async/await throughout the codebase"

**Bad ULTRAPLAN candidates (local model is fine):**
- "Fix the bug in line 47 of server.py"
- "Add a type hint to this function"
- "Write a unit test for this class"

> "Use ULTRAPLAN to design a new event-sourcing architecture for the dreame-mcp server"

This calls `ultraplan(session_id, "Design a new event-sourcing architecture...")`.

Opus thinks for up to 30 minutes (though usually much less for a planning task). The plan comes back as numbered steps and is automatically fed to the local session for execution.

**Cost awareness:** Opus 4.6 at 8192 output tokens is not cheap. Each ULTRAPLAN call costs real money. Use it when the planning complexity genuinely warrants it. For most day-to-day coding, gemma4:26b-a4b is sufficient.

---

## Choosing the Right Model

For most work, stick with the default (gemma4:26b-a4b). But here's when to switch:

**Use qwen3.5:35b-a3b when:**
- You need fast turnaround (112 tok/s vs 80-100)
- KAIROS is running and you want quick consolidation cycles
- The task is relatively straightforward and speed matters

> "Start a quick session for a simple bug fix, use the fastest model"

```
set_default_model("qwen3.5:35b-a3b")
start_session("D:\\Dev\\repos\\my-project")
```

**Use gemma4:31b when:**
- You're working on something where correctness is critical
- You have the VRAM to spare (20 GB at Q4)
- You're doing complex multi-file refactoring

> "Start a session with the best quality model for a complex refactor"

**Use qwen3.5:27b when:**
- You need strong reasoning, not just fast generation
- Debugging a subtle logic bug
- Planning-heavy work where the model needs to think carefully

**Check current VRAM usage before switching models:**

> "What model is currently loaded in VRAM?"

Calls `model_status()` which checks Ollama's loaded models endpoint.

---

## Running Multiple Sessions

openclaude-mcp supports multiple simultaneous sessions. This is useful for parallel work on different parts of a codebase.

> "Start two sessions — one for the frontend and one for the backend"

```
start_session("D:\\Dev\\repos\\project\\frontend", model_tag="qwen3.5:35b-a3b")
start_session("D:\\Dev\\repos\\project\\backend", model_tag="gemma4:26b-a4b")
```

> "Send the API contract to both sessions"

```
send_prompt(frontend_id, "The backend API contract is: POST /api/v2/users returns {id, email, created_at}")
send_prompt(backend_id, "The API contract for the new users endpoint: POST /api/v2/users returns {id, email, created_at}")
```

**Note on VRAM:** Running two large sessions simultaneously uses more VRAM. Gemma4 26B-A4B uses ~9.5 GB. Two sessions of the same model share the loaded weights (Ollama caches them), so you don't double the VRAM — the KV cache is per-session but the model weights are shared.

---

## Session Monitoring and Debugging

**Checking session health:**

> "Is session abc12345 still running? Show me what it last produced."

`session_status("abc12345")` returns status, elapsed time, last 500 chars of output, PID, and line count.

**When a session seems stuck:**
OpenClaude uses `--dangerously-skip-permissions` which skips interactive prompts. If it's stuck waiting for input it didn't expect, send a nudge:

> "Send 'continue' to session abc12345"

`send_prompt("abc12345", "continue")`

**When a session produces errors:**

> "The session is showing errors about missing modules. What should I do?"

You can check the last output via `session_status()` and send corrective prompts. OpenClaude has bash access so it can install packages, run tests, etc.

**When you want to start fresh:**

> "Stop all running sessions and start a new one in the same directory"

```
list_sessions() → get all session IDs
stop_session(id1), stop_session(id2), ...
start_session(original_dir)
```

---

## Integration with Other MCP Servers

openclaude-mcp works well alongside the rest of the fleet.

**With filesystem-mcp:**
While OpenClaude has file access within its session, you can use fileops to read MEMORY.md that KAIROS writes, inspect outputs, or manage files outside the session scope.

**With git-github-mcp:**
After openclaude completes a coding task, use git-github-mcp to commit and push:
```
send_prompt(id, "Run the tests and fix any failures")
→ session_status() confirms tests pass
→ git-github-mcp: git_ops("commit", message="feat: add health endpoint")
```

**With advanced-memory-mcp:**
openclaude's MEMORY.md output can be ingested into the central Zettelkasten:
```
read MEMORY.md from working_dir (via filesystem-mcp)
write_note(title="yahboom-mcp session findings", content=memory_content)
```

**With meta_mcp:**
Fleet monitoring tracks openclaude sessions alongside all other MCP servers. The health endpoint at `http://localhost:10932/api/health` is probed by meta_mcp's fleet scanner.

---

## Common Workflows

### Workflow: MCP Server Development

1. Check relevant standards in mcp-central-docs
2. Start an openclaude session in the server's repo
3. Send implementation prompts
4. Enable KAIROS for longer sessions
5. Use ULTRAPLAN for architecture decisions
6. Use git-github-mcp to commit

### Workflow: Bug Hunting

1. Start a session
2. Send prompt: "Read the error log at logs/error.log and identify the root cause"
3. Let OpenClaude grep, analyse, and propose fix
4. Send prompt: "Implement the fix and write a regression test"
5. Stop session

### Workflow: New Feature from Spec

1. ULTRAPLAN: "Design the API and data model for a user preferences system"
2. Local session executes the plan
3. KAIROS keeps the model oriented as the feature grows
4. git-github-mcp commits when ready

---

## Troubleshooting

**"openclaude not found on PATH"**
Run: `npm install -g @gitlawb/openclaude`
Verify: `openclaude --version`

**Sessions start but immediately show stopped status**
Check whether the working_dir exists. OpenClaude creates MEMORY.md there so it needs write access.

**KAIROS logs show "no new observations"**
The session's last_output_preview was empty. Send a prompt first so there's output to consolidate.

**ULTRAPLAN returns "no_api_key"**
Set the environment variable: `$env:ANTHROPIC_API_KEY = "sk-ant-..."`
Then restart the MCP server so it picks up the env var.

**Ollama returns 500 errors**
The model may not be pulled. Run: `ollama pull gemma4:26b-a4b`
Check VRAM: if another model is loaded, it may need to be evicted first.

**Sessions seem slow**
Check if multiple sessions are running simultaneously. Each session has its own KV cache even if models are shared. More parallel sessions = more VRAM for KV cache.

**Prefab UI not rendering in Claude Desktop**
Run: `just install-apps` (installs fastmcp[apps] which pulls prefab-ui)
Then restart the server.

---

## Useful Phrases for Claude Desktop

When using openclaude-mcp through Claude Desktop, these phrases work well:

- "Start a coding session in [directory]"
- "What are my active coding sessions?"
- "Show the fleet status"
- "Send this to the session: [your instruction]"
- "Enable KAIROS on my session"
- "What's the KAIROS log say?"
- "Use ULTRAPLAN to design [complex thing]"
- "Stop all sessions"
- "Switch to the fastest model"
- "What model is loaded in VRAM?"
- "Pull the Gemma 4 26B model"
- "Is Ollama running?"
