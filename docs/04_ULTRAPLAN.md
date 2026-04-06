# ULTRAPLAN: Cloud Planning + Local Execution

ULTRAPLAN is an optional feature that uses a cloud model for upfront planning and a local model for execution. The idea is that planning is relatively cheap in tokens (one focused burst), while execution (editing files, running commands, iterating on errors) is token-heavy but mostly mechanical — a good fit for a fast local model.

## When to use it

Good for:
- Designing a new system from scratch where you want a senior-level architecture decision before touching code
- Database migrations, auth redesigns, major refactors
- Any problem where getting the plan wrong means redoing a lot of work

Not worth it for:
- Bug fixes where the problem is already understood
- Routine feature additions
- Anything you can spec out yourself in five minutes

## How it works

```python
ultraplan(session_id, "Redesign the auth layer to use JWT with refresh tokens, keeping backward compat with the existing session API")
```

1. Sends the goal + current working directory + local model name to Claude Opus via the Anthropic API
2. Opus produces a detailed numbered execution plan (up to 8192 tokens)
3. The plan is fed directly into the local OpenClaude session as a prompt
4. The local model executes step by step

The Opus call has a 30-minute timeout. In practice it finishes in a few minutes for most goals.

## Requirements

Requires `ANTHROPIC_API_KEY` set in the environment. Without it, all other tools work normally — ULTRAPLAN just returns an error if called.

## Cost

You pay for the Opus planning call (one request, up to 8192 output tokens). Everything after that runs locally. At current Opus pricing that's roughly $0.10-0.50 per plan depending on complexity.
