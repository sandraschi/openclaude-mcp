# KAIROS (autoDream) & Project Memory

This document describes the **KAIROS** system, the proactive memory daemon that powers the long-term context retention in OpenClaude MCP.

## 1. What is KAIROS?

**KAIROS** (Key Adaptive Information Retrieval & Orchestration System) is a background daemon that runs within the OpenClaude Python manager. Its mission is to bridge the gap between short-term chat interaction and long-term project knowledge.

## 2. Operation: The "Dream" Phase

KAIROS operates on an **Idle-Trigger Pattern**:
- It monitors activity in every active session.
- When a session has been idle for a period of time (default: 5 minutes), KAIROS initiates a **Dream Phase**.
- During this phase, it reads the recent interaction history from the session buffers.
- It uses a specialized summarization prompt to synthesize key decisions, architectural changes, and technical debt items.

## 3. Storage: `MEMORY.md`

The synthesized knowledge is committed to a `MEMORY.md` file located at the root of the project's working directory.

### Structure of `MEMORY.md`:
- **Project Overview**: High-level goal and architecture.
- **Key Decisions**: Log of why certain technical paths were chosen.
- **Technical Debt**: Tracking of `TODO` items and known issues.
- **Current Objective**: The immediate focus for the next session.

## 4. Context Injection

Upon starting a new session or after a "Dream" cycle, the prompt system dynamically injects the contents of `MEMORY.md` into the agent's starting context. This provides "Zero-Latency Context" — the agent doesn't need to re-read the entire codebase to understand where it left off.

## 5. Configuration

You can configure KAIROS in the session creation parameters:
- `kairos_enabled`: Toggle background summarization.
- `dream_interval`: Customize the idle time trigger.

---
*OpenClaude MCP: Materialist, reductionist, and optimized for data-scale reasoning.*
