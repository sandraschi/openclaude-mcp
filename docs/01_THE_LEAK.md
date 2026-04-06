# The 2026 Claude Code Source Leak

On March 31, 2026, Anthropic accidentally included the full Claude Code source map in npm package `@anthropic-ai/claude-code v2.1.88`. The file was a 59.8 MB `.js.map` containing 1,906 TypeScript files and roughly 512,000 lines of code — the complete agent harness, not model weights.

Chaofan Shou noted it on X; within hours the package had been mirrored widely. The primary GitHub mirror reached 84,000+ stars and 82,000+ forks before Anthropic began issuing DMCA takedowns.

## What was in it

The leaked source included:

- Full tool implementations: Bash, file read/write, grep, glob, agents
- The KAIROS autoDream memory consolidation system
- The ULTRAPLAN cloud planning relay
- Internal codenames: Capybara/Mythos (next model family), Tengu (Claude Code itself)
- 44 unreleased feature flags
- Anti-distillation mechanisms

## What happened next

Anthropic's DMCA takedowns removed direct mirrors of the source map. Projects that replaced Anthropic-specific API calls with OpenAI-compatible shims — like OpenClaude — were harder to challenge, since they don't redistribute the original IP.

**Security note:** The early fork scene had a malware problem. Many repositories labelled "Claude Code Leaked" on GitHub delivered payloads (Vidar Stealer, GhostSocks). Only install from audited sources. The `@gitlawb/openclaude` package is the reference used by this project.

## Why this matters for openclaude-mcp

The harness — the part that does tool use, file editing, bash execution, memory, and multi-turn conversation — turns out to be separable from the inference backend. OpenClaude swaps Anthropic's API for an OpenAI-compatible shim, which means it can point at Ollama. This project provides the MCP wrapper around that.
