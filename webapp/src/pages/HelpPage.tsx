import { useState } from 'react'
import {
  BookOpen, ChevronDown, ChevronRight,
  AlertTriangle, Brain, Zap, Server, Globe, Star,
  GitFork, Shield, Cpu
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Section component
// ---------------------------------------------------------------------------

function Section({
  title, icon: Icon, children, defaultOpen = false, accent = false
}: {
  title: string
  icon: any
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

function QuickLink({ title, target }: { title: string; target: string }) {
  return (
    <a 
      href={`#${target}`}
      className="px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 
        hover:border-amber-500/30 hover:bg-amber-500/5 transition-all
        text-[11px] text-zinc-500 hover:text-amber-200 whitespace-nowrap"
    >
      {title}
    </a>
  )
}

export function HelpPage() {
  const sections = [
    { title: "The Leak", target: "leak" },
    { title: "KAIROS", target: "kairos" },
    { title: "ULTRAPLAN", target: "ultraplan" },
    { title: "MCP Server", target: "mcp-server" },
    { title: "OpenClaude", target: "openclaude" },
    { title: "Model Guide", target: "models" },
    { title: "Security", target: "security" },
    { title: "Safety", target: "safety" },
    { title: "Timeline", target: "community" },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <BookOpen size={18} className="text-amber-400" />
            Help & Documentation
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            openclaude-mcp · the full story · deep reference
          </p>
        </div>
        
        <div className="hidden lg:flex flex-wrap justify-end gap-1.5 max-w-sm">
          {sections.map(s => <QuickLink key={s.target} {...s} />)}
        </div>
      </div>

      <div className="lg:hidden flex flex-wrap gap-1.5 mb-6">
        {sections.map(s => <QuickLink key={s.target} {...s} />)}
      </div>

      <div className="flex flex-col gap-3">

        {/* ── The Great Leak ─────────────────────────────────────────────── */}
        <div id="leak">
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
        </div>

        {/* ── KAIROS deep dive ───────────────────────────────────────────── */}
        <div id="kairos">
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
                { phase: "1. Orient", color: "text-blue-400", desc: "Read MEMORY.md — the consolidated facts about this project." },
                { phase: "2. Gather", color: "text-emerald-400", desc: "Scan today's session logs for new signals." },
                { phase: "3. Consolidate", color: "text-amber-400", desc: "Merge gathered signals with existing memory." },
                { phase: "4. Prune", color: "text-purple-400", desc: "Write the updated MEMORY.md." },
              ].map(({ phase, color, desc }) => (
                <div key={phase} className="flex gap-3 bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                  <span className={`text-xs font-mono font-semibold shrink-0 w-28 ${color}`}>{phase}</span>
                  <span className="text-xs text-zinc-400 leading-relaxed">{desc}</span>
                </div>
              ))}
            </div>

            <H>KAIROS in openclaude-mcp</H>
            <P>
              This server implements the KAIROS architecture as described in the leak.
            </P>
            <Pre>{`# Control KAIROS:
kairos_enable(session_id="abc12345", idle_threshold_seconds=120)
kairos_disable(session_id="abc12345")
kairos_log(session_id="abc12345", lines=50)`}</Pre>
          </Section>
        </div>

        {/* ── ULTRAPLAN ──────────────────────────────────────────────────── */}
        <div id="ultraplan">
          <Section title="ULTRAPLAN — Cloud Planning, Local Execution" icon={Zap}>
            <P>
              ULTRAPLAN is the other major unreleased feature from the leak. The
              concept: some tasks are architecturally complex enough that they benefit
              from extended, deep reasoning.
            </P>
            <Pre>{`# Enable ULTRAPLAN (requires ANTHROPIC_API_KEY):
ultraplan(session_id="abc12345", goal="Refactor the auth system")`}</Pre>
          </Section>
        </div>

        {/* ── MCP Server ─────────────────────────────────────────────────── */}
        <div id="mcp-server">
          <Section title="openclaude-mcp — MCP Server Reference" icon={Server} defaultOpen>
            <H>Architecture</H>
            <P>
              A single Python process on port 10932 serving two transports simultaneously.
            </P>
            <Pre>{`Port 10932:
  /sse              → FastMCP 3.2 SSE
  /tools/{name}     → REST bridge
  /api/health       → health check
  /api/capabilities → features`}</Pre>
          </Section>
        </div>

        {/* ── Safety Protocols ───────────────────────────────────────────── */}
        <div id="safety">
          <Section title="Safety Protocols (Kid-Safe Mode)" icon={Shield} accent>
            <P>
              OpenClaude-MCP includes a specialized <strong className="text-zinc-200">Kid-Safe v1.0</strong> mode 
              designed for educational environments and younger users. This is not just a content filter; 
              it is an active oversight system that binds the AI to a strict behavioral contract.
            </P>

            <H>How it works</H>
            <P>
              When enabled, the server injects a non-bypassable safety policy into the system prompt 
              and establishes an out-of-band monitoring channel via the <Code>caregiver_alert</Code> MCP tool.
              The AI is instructed to maintain a clinical, mentor-like tone and explicitly refuse 
              high-risk topics (illegal substances, self-harm, medical advice) while explaining its reasoning.
            </P>

            <H>The Caregiver Alert System</H>
            <P>
              For high-risk requests, the model is required to invoke the <Code>caregiver_alert</Code> tool.
              This bypasses the normal conversation flow and sends an immediate notification 
              to the server console and web dashboard. 
            </P>
            <ul className="list-disc list-inside space-y-1 text-zinc-400 text-sm ml-2">
              <li><strong className="text-zinc-300">Tone Constraint:</strong> Strict limit on emotional variance.</li>
              <li><strong className="text-zinc-300">Privacy Reminders:</strong> Proactive pings about online privacy every 5-10 turns.</li>
              <li><strong className="text-zinc-300">Hard Refusals:</strong> Zero-tolerance policy for bypass attempts (jailbreaks).</li>
            </ul>
          </Section>
        </div>

        {/* ── OpenClaude ─────────────────────────────────────────────────── */}
        <div id="openclaude">
          <Section title="OpenClaude — The Fork" icon={GitFork}>
            <P>
              OpenClaude is a community fork of the leaked Claude Code source.
              It uses an OpenAI-compatible provider shim to back internal
              Anthropic SDK calls with local models via Ollama.
            </P>
          </Section>
        </div>

        {/* ── Models ─────────────────────────────────────────────────────── */}
        <div id="models">
          <Section title="Model Guide — RTX 4090" icon={Cpu}>
            <div className="overflow-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-zinc-500 border-b border-zinc-800">
                    {["Model", "Tag", "Active", "VRAM", "tok/s"].map(h => (
                      <th key={h} className="text-left py-2 pr-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {[
                    ["Gemma 4 26B-A4B", "gemma4:26b-a4b", "3.8B", "~10 GB", "80-100"],
                    ["Qwen3.5 35B-A3B", "qwen3.5:35b-a3b", "3B", "~9 GB", "112"],
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
          </Section>
        </div>

        {/* ── Security ───────────────────────────────────────────────────── */}
        <div id="security">
          <Section title="Security Notes" icon={Shield}>
            <div className="space-y-2">
              {[
                { title: "Supply chain attack", body: "Check for axios 1.14.1, 0.30.4 if you installed packages on Mar 31.", color: "red" },
                { title: "Permissions", body: "OpenClaude has full bash access. Use only in trusted directories.", color: "yellow" },
              ].map(({ title, body, color }) => (
                <div key={title} className={`p-3 rounded-lg border text-xs ${color === 'red' ? 'border-red-500/30 bg-red-500/5' : 'border-yellow-500/20 bg-yellow-500/5'}`}>
                  <div className={`font-medium mb-1 ${color === 'red' ? 'text-red-300' : 'text-yellow-300'}`}>
                    <AlertTriangle size={11} className="inline mr-1.5" />
                    {title}
                  </div>
                  <div className={color === 'red' ? 'text-red-400/80' : 'text-yellow-400/70'}>{body}</div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* ── Community ──────────────────────────────────────────────────── */}
        <div id="community">
          <Section title="Community Activity" icon={Star}>
            <div className="space-y-1.5 text-xs">
              {[
                ["Mar 31, 00:21 UTC", "v2.1.88 leak begins"],
                ["Apr 5, 2026", "openclaude-mcp complete"],
              ].map(([date, event]) => (
                <div key={date as string} className="flex gap-3">
                  <span className="text-amber-500/60 font-mono shrink-0 w-36">{date as string}</span>
                  <span className="text-zinc-400">{event as string}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>

      </div>
    </div>
  )
}
