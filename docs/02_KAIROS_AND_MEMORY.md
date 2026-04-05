# KAIROS: The autoDream Daemon

Buried deep within the unreleased (and subsequently leaked) features of Claude Code was a system internally designated as **KAIROS** (from the Greek for "the right, critical, or opportune moment"). 

KAIROS is an autonomous background memory daemon. It fundamentally changes how long-running AI sessions handle context saturation.

## The Context Entropy Problem

During long agentic coding sessions, the context window fills with a toxic mix of signal and noise. Raw tool outputs, failed implementations, superseded decisions, and repetitive bash errors crowd out the critical architecture choices. 

This leads to a state called **Context Entropy**:
- The agent starts contradicting itself.
- It forgets decisions made 30 minutes ago.
- The system prompt instructions are drowned out by recent noisy stdout logs.

## The 4-Phase autoDream Cycle

KAIROS solves this via an out-of-band "dream" cycle. Rather than forcing the active session to summarize its own context (which interrupts the chain-of-thought and further contaminates the context window with the meta-reasoning of the summary), KAIROS forks a lightweight, separate subagent. 

When the main session is idle (e.g., waiting for user input), KAIROS triggers the following cycle:

1. **Orient**: The daemon reads the existing `MEMORY.md` from the working directory. This file serves as the established "ground truth" of the project.
2. **Gather**: It collects recent session log snippets, focusing on unprocessed raw observations, console errors, and successful file modifications.
3. **Consolidate (The LLM Call)**: The daemon passes the old memory and the new observations to a local model (often Gemma 4 or Qwen 3.5). The instructions are strict: merge the data, resolve contradictions, and elevate vague hints to concrete facts.
4. **Prune**: The updated state is rewritten to `MEMORY.md`. Every line must earn its right to consume precious context space. 

When the primary agent takes its next action, it natively injects the fresh, hyper-condensed `MEMORY.md` back into its system prompt. The context is magically cleansed, and the agent continues without missing a beat—all without paying external API fees.
