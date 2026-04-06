# OpenClaude MCP: Prompt System & Safety Guardrails

This document details the dynamic prompt assembly logic and the multi-layered safety guardrails implemented in the OpenClaude engine.

## 1. Prompt Composition

The system prompt is not a static string. It is dynamically assembled for every message turn to ensure the agent has the correct identity, context, and tool definitions.

### Composition Flow:
1.  **Identity**: (from `IDENTITY` in `prompts.ts`) Defines the agent as a senior software engineer.
2.  **Capability**: Enumerates the tools available (from the CLI and external MCP servers).
3.  **Safety Hooks**: Injects explicit instructions on security and destructive actions.
4.  **Session Context**: Injects the current working directory, OS information, and project-specific state.
5.  **Long-term Memory**: Injects consolidated summaries from `MEMORY.md` (managed by KAIROS).

---

## 2. Safety Guardrails

OpenClaude implements three primary layers of safety.

### Layer 1: Prompt-Level Instructions (`CYBER_RISK_INSTRUCTION`)
The agent is explicitly instructed to avoid "shadow" activities and insecure coding practices:
- **No URL Guessing**: The agent will not attempt to guess internal or external URLs.
- **Insecure Credential Handling**: The agent is forbidden from generating or storing hardcoded credentials.
- **Verification Priority**: The agent must prefer verifying state via tools before making assumptions.

### Layer 2: Tool Access Protocol (`getActionsSection`)
The `getActionsSection()` logic kategorizes tools and defines behavior for each:
- **Read-Only Tools**: Can be used freely for discovery (e.g., `grep`, `ls`, `cat`).
- **Risky/Destructive Tools**: Requires explicit user confirmation (e.g., `rm`, `git push --force`).
- **External Communication**: Tools that make network requests are flagged for user oversight.

### Layer 3: Permission Management
The OpenClaude CLI itself acts as a gatekeeper. Even if the LLM attempts to call a tool, the CLI executes it within a permission-gated environment.

---

## 3. KAIROS & Memory Consolidation

The prompt system is the primary consumer of KAIROS.

When KAIROS consolidates memory, it generates a "Project Summary" that is injected into the starting context of every new session. This ensures that even if a session is restarted, the agent "remembers" the high-level architecture and decisions made in previous sessions.

---

## 4. Customizing the Prompt

If you need to modify the identity or safety behavior of the agent, you can edit the source at:
`external/openclaude/src/constants/prompts.ts`

> [!CAUTION]
> Modifying the safety hooks or identity can lead to unstable agent behavior or security risks. Ensure you test your changes in a sandbox environment.
