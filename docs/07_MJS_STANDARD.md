# .mjs Standard: ES Modules in OpenClaude

OpenClaude utilizes the `.mjs` extension for its mission-critical engine bundle (`dist/cli.mjs`). This document explains the technical rationale and benefits of this standard.

## What is .mjs?

The `.mjs` extension explicitly identifies a file as an **ECMAScript Module (ESM)**. In the Node.js ecosystem, this distinguishes it from the older **CommonJS (CJS)** standard (which usually uses `.js` or `.cjs`).

| Feature | CommonJS (.js / .cjs) | ES Modules (.mjs) |
| :--- | :--- | :--- |
| **Syntax** | `require()` / `module.exports` | `import` / `export` |
| **Loading** | Synchronous (blocking) | Asynchronous (non-blocking) |
| **Top-level Await** | ❌ Not supported | ✅ Supported natively |
| **Strict Mode** | Optional (`"use strict"`) | ✅ Enabled by default |
| **Tree Shaking** | ❌ Limited | ✅ Highly efficient |

## Why OpenClaude uses .mjs

Industrializing a complex AI agent like OpenClaude requires a robust module system for several reasons:

### 1. High-Performance Cold Starts
By bundling 700+ dependencies into a single `.mjs` file, we eliminate the recursive file-system traversal required to resolve `node_modules`. This reduces cold-start latency from seconds to milliseconds.

### 2. Top-Level Await
Agentic workflows often require initial asynchronous handshake operations (e.g., checking for Ollama availability or loading local settings) before the CLI even starts. ESM's top-level await makes this patterns clean and deterministic.

### 3. Tree Shaking & Minification
The `.mjs` standard allows the Bun bundler to perform aggressive **Tree Shaking**—removing unused code paths from the 100MB+ dependency tree. This resulting core is lean, fast, and secure.

### 4. Modern Ecosystem Compatibility
Most newer libraries in the AI/LLM space (including many Anthropic and Google SDK components) are increasingly ESM-only. Using `.mjs` ensures we are using the most stable, modern versions of our dependencies.

## Execution

To run the OpenClaude engine, use:
```powershell
node dist/cli.mjs
```
*Note: Node.js v20+ is required for full SOTA compatible performance.*
