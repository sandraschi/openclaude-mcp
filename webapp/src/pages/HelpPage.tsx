import { useState } from 'react'
import {
  BookOpen, ChevronDown, ChevronRight, ExternalLink,
  AlertTriangle, Brain, Zap, Server, Globe, Star,
  GitFork, Shield, Clock, Terminal, Cpu
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Section component
// ---------------------------------------------------------------------------

function Section({
  title, icon: Icon, children, defaultOpen = false, accent = false
}: {
  title: string
  icon: React.FC<{ size?: number; className?: string }>
  children: React.ReactNode
  defaultOpen?: boolean
  accent?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`rounded-xl border overflow-hidden
      ${accent ? 'border-amber-500/30' : 'border-zinc-800'}`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
          ${accent ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'bg-zinc-900/50 hover:bg-zinc-800/50'}`}
      >
        <Icon size={15} className={accent ? 'text-amber-400' : 'text-zinc-500'} />
        <span className={`text-sm font-medium flex-1 ${accent ? 'text-amber-200' : 'text-zinc-200'}`}>
          {title}
        </span>
        {open
          ? <ChevronDown size={13} className="text-zinc-500" />
          : <ChevronRight size={13} className="text-zinc-500" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-3 text-sm text-zinc-400 space-y-3 border-t border-zinc-800/60">
          {children}
        </div>
      )}
    </div>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="leading-relaxed">{children}</p>
}

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs uppercase tracking-wider text-zinc-500 mt-4 mb-2 first:mt-0">{children}</h3>
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-xs text-amber-300 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
      {children}
    </code>
  )
}

function Pre({ children }: { children: string }) {
  return (
    <pre className="font-mono text-xs text-zinc-300 bg-zinc-950 rounded-lg p-3
      overflow-auto border border-zinc-800 whitespace-pre-wrap leading-relaxed">
      {children}
    </pre>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-zinc-900/60 rounded-lg p-3 border border-zinc-800">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-lg font-semibold text-amber-300 mt-0.5">{value}</div>
      {sub && <div className="text-xs text-zinc-600 mt-0.5">{sub}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Help page
// ---------------------------------------------------------------------------

export function HelpPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <BookOpen size={18} className="text-amber-400" />
          Help & Documentation
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          openclaude-mcp · the full story · deep reference
        </p>
      </div>

      <div className="flex flex-col gap-3">

        {/* ── The Great Leak ─────────────────────────────────────────────── */}
        <Section title="The Great Claude Code Leak of 2026" icon={Globe} defaultOpen accent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <Stat label="Primary repo stars" value="84,000+" sub="as of Apr 3 2026" />
            <Stat label="Forks" value="82,000+" sub="primary mirror" />
            <Stat label="Claw-code stars" value="55,800+" sub="in 2 hours — GitHub record" />
            <Stat label="Chaofan's X post" value="28.8M" sub="views" />
          </div>

          <H>What happened — the technical chain</H>
          <P>
            On March 31, 2026 at approximately 00:21 UTC, Anthropic published{' '}
            <Code>@anthropic-ai/claude-code v2.1.88</Code> to the public npm registry.
            Buried inside was a 59.8 MB JavaScript source map file — a{' '}
            <Code>.map</Code> artifact whose entire purpose is debugging: it maps
            minified bundle bytes back to readable source lines. Source maps should
            never ship in production packages. The root cause was a missing{' '}
            <Code>*.map</Code> entry in <Code>.npmignore</Code>, combined with a
            known Bun bug (Anthropic acquired Bun in late 2025) that generates source
            maps in production mode even when explicitly disabled in docs.
          </P>
          <P>
            The map file contained a reference to a zip archive on Anthropic's own
            Cloudflare R2 storage bucket. Security researcher{' '}
            <strong className="text-zinc-200">Chaofan Shou</strong> found it within
            hours, downloaded the zip, and posted: "Claude code source code has been
            leaked via a map file in their npm registry!" The post hit 28.8 million
            views. Within minutes, developers had mirrored the 1,906 TypeScript files
            (512,000 lines) to GitHub.
          </P>

          <H>The numbers</H>
          <P>
            Claw-code — a clean-room rewrite started within hours of the leak — reached
            50,000 GitHub stars in approximately two hours, making it almost certainly
            the fastest-growing repository in GitHub's history. The primary source
            mirror surpassed 84,000 stars and 82,000 forks within days. Chaofan's
            discovery post hit 28.8 million views. The Chinese developer community
            had architectural analysis, video walkthroughs, and full research reports
            published in multiple languages within 24 hours.
          </P>

          <H>What was in it</H>
          <P>
            The leaked source is the <em>agent harness</em> — not the model weights.
            It's the TypeScript scaffolding that wraps Claude API calls and gives the
            AI its hands: file tools, bash execution, grep/glob, multi-agent
            orchestration, slash commands, memory management. Specifically exposed:
          </P>
          <ul className="list-disc list-inside space-y-1 text-zinc-400 text-sm ml-2">
            <li>44 hidden feature flags — fully implemented, compiled to <Code>false</Code> in public builds</li>
            <li><strong className="text-zinc-300">KAIROS</strong> — autonomous background daemon with autoDream memory consolidation</li>
            <li><strong className="text-zinc-300">ULTRAPLAN</strong> — offload planning to cloud Opus (up to 30 min), execute locally</li>
            <li><strong className="text-zinc-300">undercover.ts</strong> — strips AI attribution from commits in external repos for Anthropic employees</li>
            <li><strong className="text-zinc-300">ANTI_DISTILLATION_CC</strong> — injects fake decoy tools to pollute competitor training data</li>
            <li>Internal codenames: <strong className="text-zinc-300">Capybara / Mythos</strong> (next model family), <strong className="text-zinc-300">Tengu</strong> (Claude Code internal name)</li>
            <li>Full system prompts — in the CLI binary, not server-side</li>
            <li>187 spinner loading verbs (someone at Anthropic had fun)</li>
            <li>A regex list of hundreds of swear words for sentiment detection</li>
          </ul>

          <H>The supply chain complication</H>
          <P>
            Coincidentally (Anthropic confirmed it was unrelated), a real supply chain
            attack hit npm the same morning. Malicious versions of the{' '}
            <Code>axios</Code> HTTP library (1.14.1 and 0.30.4) contained a
            cross-platform Remote Access Trojan via a dependency called{' '}
            <Code>plain-crypto-js</Code>. Anyone who ran{' '}
            <Code>npm install</Code> between 00:21–03:29 UTC on March 31 should
            treat their machine as compromised and rotate all secrets.
          </P>

          <H>Legal status (April 2026)</H>
          <P>
            Anthropic issued DMCA takedowns against direct mirrors. Clean-room
            rewrites (Python, Rust) occupy murkier legal ground — Gergely Orosz
            noted that if Anthropic claims AI-assisted rewrites infringe copyright,
            it could undermine their own training-data fair use defense. Claw-code
            and OpenClaude have not been targeted as of this writing. Personal and
            research use is low-risk. Corporate deployment warrants legal review.
          </P>

          <div className="mt-3 p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-xs text-red-400">
            <AlertTriangle size={12} className="inline mr-1.5" />
            <strong>Security warning:</strong> Multiple malicious repos impersonate
            the leak with Vidar Stealer + GhostSocks payloads. Only install from
            known, reviewed forks. The <Code>@gitlawb/openclaude</Code> npm package
            is the reference fork used by this server — review it before installing.
          </div>
        </Section>

        {/* ── KAIROS deep dive ───────────────────────────────────────────── */}
        <Section title="KAIROS — Deep Dive" icon={Brain} defaultOpen accent>
          <P>
            KAIROS is named after the Ancient Greek concept of "the right moment" —
            the qualitative, opportune instant as opposed to chronological time
            (chronos). In the Claude Code source it appears over 150 times. It
            represents Anthropic's solution to one of the deepest problems in long
            agentic sessions: <strong className="text-zinc-200">context entropy</strong>.
          </P>

          <H>The problem KAIROS solves</H>
          <P>
            Every LLM has a fixed context window. In a long coding session, the
            context fills with a mix of: the original task, intermediate steps,
            failed attempts, corrected facts, superseded decisions, and accumulated
            observations. Over time the signal-to-noise ratio degrades. The model
            starts contradicting earlier decisions, losing track of architecture
            choices, re-discovering things it already knew. This is context entropy —
            and it's the main reason long agentic sessions go sideways.
          </P>

          <H>The four-phase autoDream cycle</H>
          <P>
            KAIROS runs a background subagent (forked from the main agent to avoid
            corrupting its "train of thought") whenever the user is idle past a
            configurable threshold. The cycle has four phases:
          </P>
          <div className="space-y-2">
            {[
              { phase: "1. Orient", color: "text-blue-400", desc: "Read MEMORY.md — the durable, consolidated facts about this project accumulated over all previous sessions. This is the ground truth the agent starts from." },
              { phase: "2. Gather", color: "text-emerald-400", desc: "Scan today's session logs for new signals: observations, decisions, bugs found, APIs discovered, architecture choices made. Raw, unprocessed, potentially contradictory." },
              { phase: "3. Consolidate", color: "text-amber-400", desc: "The LLM call. Merge gathered signals with existing memory: promote vague observations (\"might be\", \"possibly\") to concrete facts where evidence supports it, remove contradictions (keeping most recent/specific), delete superseded entries." },
              { phase: "4. Prune", color: "text-purple-400", desc: "Write the updated MEMORY.md. Every line earns its place. The result is a clean, dense, accurate representation of project state — ready for the next session or the next wakeup." },
            ].map(({ phase, color, desc }) => (
              <div key={phase} className="flex gap-3 bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                <span className={`text-xs font-mono font-semibold shrink-0 w-28 ${color}`}>{phase}</span>
                <span className="text-xs text-zinc-400 leading-relaxed">{desc}</span>
              </div>
            ))}
          </div>

          <H>Why a forked subagent?</H>
          <P>
            The main session's context holds the current "train of thought" — the
            active task, the current file, the reasoning chain. If you ran
            consolidation inside the main session, you'd interrupt and contaminate
            that reasoning. KAIROS forks a separate, lightweight subagent that
            operates on MEMORY.md independently, then writes back without touching
            the main session's context. The main session wakes from idle with a
            cleaner, denser memory to reference.
          </P>

          <H>Quality scales with model intelligence</H>
          <P>
            The consolidation step is an LLM inference call. The quality of the
            resulting MEMORY.md is directly proportional to the model's ability to:
            identify contradictions, promote evidence-backed inferences, and write
            concise, dense prose. Rough quality ladder for your 4090:
          </P>
          <div className="grid grid-cols-1 gap-1.5">
            {[
              { model: "claude-opus-4-6", quality: "Excellent", note: "What Anthropic built it for. Brilliant contradiction detection, nuanced inference promotion.", cloud: true },
              { model: "qwen3.5:27b (thinking)", quality: "Very good", note: "Strong reasoning, good at spotting logical inconsistencies. Recommended local option." },
              { model: "gemma4:26b-a4b", quality: "Good", note: "Solid for straightforward consolidation. Occasional missed contradictions on complex sessions." },
              { model: "qwen3.5:35b-a3b", quality: "Adequate", note: "Fast (112 tok/s) but only 3B active params. Good for frequent lightweight cycles." },
            ].map(({ model, quality, note, cloud }) => (
              <div key={model} className="flex items-start gap-3 text-xs bg-zinc-950 rounded p-2 border border-zinc-800">
                <Code>{model}</Code>
                <span className={`shrink-0 font-medium ${quality === 'Excellent' ? 'text-amber-400' : quality === 'Very good' ? 'text-emerald-400' : 'text-zinc-400'}`}>
                  {quality}
                </span>
                {cloud && <span className="text-xs text-blue-400 shrink-0">cloud</span>}
                <span className="text-zinc-500">{note}</span>
              </div>
            ))}
          </div>

          <H>KAIROS in openclaude-mcp</H>
          <P>
            This server implements the KAIROS architecture as described in the leak.
            The daemon runs as an asyncio background task per session, polling every
            30 seconds, triggering consolidation when idle time exceeds the configured
            threshold. The LLM call goes through Ollama's OpenAI-compatible endpoint
            using the same model as the parent session. MEMORY.md is written to the
            session's working directory.
          </P>
          <Pre>{`# Control KAIROS from Claude Desktop:
kairos_enable(session_id="abc12345", idle_threshold_seconds=120)
kairos_disable(session_id="abc12345")
kairos_log(session_id="abc12345", lines=50)

# Or from the webapp: Sessions → expand session → KAIROS toggle`}</Pre>
        </Section>

        {/* ── ULTRAPLAN ──────────────────────────────────────────────────── */}
        <Section title="ULTRAPLAN — Cloud Planning, Local Execution" icon={Zap} icon-class="text-blue-400">
          <P>
            ULTRAPLAN is the other major unreleased feature from the leak. The
            concept: some tasks are architecturally complex enough that they benefit
            from extended, deep reasoning before a single line of code is written.
            Claude Code's solution was to spin up a dedicated cloud session running
            Opus 4.6 with up to 30 minutes of uninterrupted think time, generate a
            detailed step-by-step plan, then feed that plan back into the local
            session for mechanical execution.
          </P>
          <P>
            In openclaude-mcp, ULTRAPLAN is optional and requires{' '}
            <Code>ANTHROPIC_API_KEY</Code>. The planning call goes to{' '}
            <Code>claude-opus-4-6</Code> with a 1800-second timeout. The resulting
            plan is automatically fed into the local session's stdin as the next
            prompt, so your local Gemma 4 or Qwen model executes it step by step.
          </P>
          <P>
            Cost note: Opus 4.6 at up to 8192 output tokens per ULTRAPLAN call is
            not cheap. Use it for genuinely complex architecture decisions, not
            routine tasks. For most work, your local model is sufficient.
          </P>
          <Pre>{`# Enable ULTRAPLAN (requires ANTHROPIC_API_KEY env var):
$env:ANTHROPIC_API_KEY = "sk-ant-..."

# Then from Claude Desktop or webapp:
ultraplan(session_id="abc12345", goal="Refactor the auth system to use OAuth2 with refresh tokens, maintaining backward compat with existing API consumers")`}</Pre>
        </Section>

        {/* ── MCP Server ─────────────────────────────────────────────────── */}
        <Section title="openclaude-mcp — MCP Server Reference" icon={Server} defaultOpen>
          <H>Architecture</H>
          <P>
            A single Python process on port 10932 serving two transports simultaneously
            via a Starlette composite ASGI app:
          </P>
          <Pre>{`Port 10932:
  /sse              → FastMCP 3.2 SSE transport (Claude Desktop, Cursor, etc.)
  /tools/{name}     → REST bridge (webapp, curl, scripts)
  /api/health       → { status, ollama, tools, active_sessions }
  /api/capabilities → server feature flags and model list

Port 10933:
  React + Vite webapp (Tailwind, Zustand, Framer Motion)`}</Pre>

          <H>FastMCP 3.2 features used</H>
          <ul className="space-y-1.5 text-sm">
            {[
              ["lifespan context manager", "Startup Ollama health check, graceful shutdown of all sessions"],
              ["mcp.http_app(path='/sse')", "ASGI mount — integrates SSE transport into Starlette routing"],
              ["@mcp.tool(app=True)", "Prefab UI tool — fleet_dashboard renders a live table in Claude Desktop"],
              ["PrefabApp DSL", "StatGroup, Stat, Table — compiled to React, rendered in-chat"],
              ["Context | None pattern", "All tools accept optional ctx for both MCP and direct REST calls"],
              ["Lazy imports", "Heavy deps (fastmcp.apps.*) only imported at startup"],
            ].map(([feature, desc]) => (
              <li key={feature as string} className="flex gap-2">
                <Code>{feature as string}</Code>
                <span className="text-zinc-500 text-xs mt-0.5">{desc as string}</span>
              </li>
            ))}
          </ul>

          <H>Tools (13 total)</H>
          <div className="grid grid-cols-1 gap-1">
            {[
              ["list_models", "Ollama model inventory with VRAM/speed/license metadata"],
              ["set_default_model", "Change default for new sessions"],
              ["model_status", "Ollama health + VRAM loaded check"],
              ["start_session", "Launch openclaude subprocess in a directory"],
              ["send_prompt", "Send natural language instruction to running session"],
              ["session_status", "Current output, status, elapsed time"],
              ["list_sessions", "All active sessions"],
              ["stop_session", "Terminate and clean up"],
              ["kairos_enable", "Start autoDream daemon with idle threshold"],
              ["kairos_disable", "Stop daemon"],
              ["kairos_log", "Retrieve consolidation log"],
              ["ultraplan", "Cloud Opus planning → local execution (requires API key)"],
              ["fleet_dashboard", "Prefab UI — live dashboard in Claude Desktop"],
            ].map(([name, desc]) => (
              <div key={name as string} className="flex gap-2 text-xs">
                <Code>{name as string}</Code>
                <span className="text-zinc-500">{desc as string}</span>
              </div>
            ))}
          </div>

          <H>Claude Desktop config</H>
          <Pre>{`// C:\\Users\\sandr\\AppData\\Roaming\\Claude\\claude_desktop_config.json
{
  "mcpServers": {
    "openclaude-mcp": {
      "command": "C:\\\\Users\\\\sandr\\\\.local\\\\bin\\\\uv.exe",
      "args": [
        "--directory",
        "D:\\\\Dev\\\\repos\\\\openclaude-mcp",
        "run",
        "python",
        "server.py"
      ]
    }
  }
}`}</Pre>
        </Section>

        {/* ── OpenClaude ─────────────────────────────────────────────────── */}
        <Section title="OpenClaude — The Fork" icon={GitFork}>
          <P>
            OpenClaude is a community fork of the leaked Claude Code TypeScript
            source. The key addition is an OpenAI-compatible provider shim
            (<Code>src/services/api/openaiShim.ts</Code>, ~724 lines) that
            duck-types the Anthropic SDK interface, translating all internal API
            calls to OpenAI chat completions format. The rest of Claude Code —
            bash tool, file tools, grep/glob, multi-agent orchestration, slash
            commands, MCP integration — works unchanged, just backed by whatever
            model you point it at.
          </P>

          <H>Install</H>
          <Pre>{`npm install -g @gitlawb/openclaude

# Verify:
openclaude --version`}</Pre>

          <H>Manual usage (without this MCP server)</H>
          <Pre>{`# Point at Ollama:
$env:CLAUDE_CODE_USE_OPENAI = "1"
$env:OPENAI_BASE_URL = "http://localhost:11434/v1"
$env:OPENAI_MODEL = "gemma4:26b-a4b"
$env:OPENAI_API_KEY = "ollama"   # required but ignored

cd D:\\Dev\\repos\\my-project
openclaude --dangerously-skip-permissions`}</Pre>

          <H>Tool-calling requirements</H>
          <P>
            Not all models handle agentic tool use well. The shim translates
            tool schemas to OpenAI function calling format. Models need reliable
            JSON function-call output. Gemma 4 26B-A4B and Qwen3.5 are both
            tested and work. Smaller models (&lt;7B) frequently hallucinate tool
            call syntax.
          </P>
        </Section>

        {/* ── Models ─────────────────────────────────────────────────────── */}
        <Section title="Model Guide — RTX 4090 (24 GB VRAM)" icon={Cpu}>
          <P>
            All measurements at Q4_K_M quantization via Ollama on a single
            RTX 4090. VRAM figures include KV cache for a typical agentic session
            context (~8K tokens).
          </P>
          <div className="overflow-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800">
                  {["Model", "Tag", "Active", "VRAM", "tok/s", "Context", "SWE-bench", "License", "Notes"].map(h => (
                    <th key={h} className="text-left py-2 pr-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {[
                  ["Gemma 4 26B-A4B ★", "gemma4:26b-a4b", "3.8B", "~9.5 GB", "80-100", "256K", "~80%*", "Apache-2.0", "Default. MoE, 97% of 31B quality."],
                  ["Gemma 4 31B Dense", "gemma4:31b", "31B", "~20 GB", "45-60", "256K", "~80%", "Apache-2.0", "#3 open model Arena. Max quality on 4090."],
                  ["Qwen3.5 35B-A3B", "qwen3.5:35b-a3b", "3B", "~8.5 GB", "112", "128K", "~72%", "Apache-2.0", "Fastest. 3B active. Best for KAIROS loops."],
                  ["Qwen3.5 27B", "qwen3.5:27b", "27B", "~15 GB", "40", "128K", "72.4%", "Apache-2.0", "Best reasoning. Recommended for KAIROS."],
                  ["Qwen3-Coder-Next", "qwen3-coder-next", "TBD", "TBD", "TBD", "TBD", "TBD", "Apache-2.0", "Agentic coding specialist. Watch for tag."],
                  ["GLM-5", "glm5", "TBD", "TBD", "TBD", "TBD", "#1 open", "MIT", "#1 open SWE-bench. Watch for Ollama tag."],
                ].map(row => (
                  <tr key={row[0]}>
                    {row.map((cell, i) => (
                      <td key={i} className={`py-1.5 pr-3 ${i === 0 ? 'text-zinc-200 font-medium' : 'text-zinc-500'}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-zinc-600 mt-2">* LiveCodeBench v6 estimate based on Gemma 4 benchmarks</div>
        </Section>

        {/* ── Security ───────────────────────────────────────────────────── */}
        <Section title="Security Notes" icon={Shield}>
          <div className="space-y-2">
            {[
              {
                title: "Axios supply chain attack (Mar 31 2026, 00:21–03:29 UTC)",
                body: "If you installed or updated any npm package in this window, check for axios 1.14.1, 0.30.4, or the plain-crypto-js dependency. If found, treat the machine as fully compromised: rotate all secrets, reinstall OS. North Korean hackers (Lazarus) confirmed by Google as responsible.",
                color: "red",
              },
              {
                title: "Malicious 'leaked Claude Code' repos",
                body: "Multiple GitHub repos impersonate the leak and deliver Vidar Stealer + GhostSocks via ClaudeCode_x64.exe (Rust dropper). One had 793 forks and 564 stars before takedown. Never download .7z or .exe from any 'leaked Claude Code' repo. Verify every source.",
                color: "red",
              },
              {
                title: "Typosquatting attacks",
                body: "Attackers are squatting internal npm package names referenced in the source (e.g. 'pacifier136' account). If compiling the source yourself, audit every dependency against the npm registry before installing.",
                color: "yellow",
              },
              {
                title: "openclaude-mcp itself",
                body: "The MCP server runs an openclaude subprocess with --dangerously-skip-permissions, which gives it bash access to the working directory. Run sessions only in directories you control. The server is local-only (binds 0.0.0.0 but no auth).",
                color: "yellow",
              },
            ].map(({ title, body, color }) => (
              <div key={title}
                className={`p-3 rounded-lg border text-xs
                  ${color === 'red' ? 'border-red-500/30 bg-red-500/5' : 'border-yellow-500/20 bg-yellow-500/5'}`}>
                <div className={`font-medium mb-1 ${color === 'red' ? 'text-red-300' : 'text-yellow-300'}`}>
                  <AlertTriangle size={11} className="inline mr-1.5" />
                  {title}
                </div>
                <div className={color === 'red' ? 'text-red-400/80' : 'text-yellow-400/70'}>{body}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Community ──────────────────────────────────────────────────── */}
        <Section title="Community Activity" icon={Star}>
          <P>The leak spawned one of the fastest open-source mobilizations ever seen:</P>
          <div className="space-y-1.5 text-xs">
            {[
              ["Mar 31, 00:21 UTC", "v2.1.88 published to npm with source map attached"],
              ["Mar 31, ~03:00 UTC", "Chaofan Shou discovers and posts on X"],
              ["Mar 31, ~04:00 UTC", "First GitHub mirrors appear. Downloading begins."],
              ["Mar 31, ~05:00 UTC", "HN thread goes to #1. Community dissection begins."],
              ["Mar 31, 05:03 UTC", "First English analysis: 'Anthropic's AI Coding Tool Leaks Its Own Source Code'"],
              ["Mar 31, 07:07 UTC", "First Chinese walkthrough of the full source published"],
              ["Mar 31, ~08:00 UTC", "Nano Claude Code v1.0 — Python reimplementation, ~1300 lines"],
              ["Mar 31, ~10:00 UTC", "Claw-code hits 50,000 stars — GitHub record"],
              ["Mar 31, day end", "DMCA notices begin. Mirrors move to decentralized git forges."],
              ["Apr 1", "Nano Claude Code v2.0 (~3400 lines). OpenClaude npm shim published."],
              ["Apr 2", "Nano Claude Code v3.0 (~5000 lines): multi-agent, memory, skills packages"],
              ["Apr 2", "Google Gemma 4 released. Developers immediately test with OpenClaude forks."],
              ["Apr 3", "Zscaler reports malware campaign using the leak as social engineering lure"],
              ["Apr 5", "openclaude-mcp scaffold complete. You are here."],
            ].map(([date, event]) => (
              <div key={date as string} className="flex gap-3">
                <span className="text-amber-500/60 font-mono shrink-0 w-40">{date as string}</span>
                <span className="text-zinc-400">{event as string}</span>
              </div>
            ))}
          </div>
        </Section>

      </div>
    </div>
  )
}
