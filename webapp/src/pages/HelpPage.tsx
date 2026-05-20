import { useState } from 'react'
import { BookOpen, Search, Cpu, Shield, Brain, Zap, Server, Settings, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

function useSearch(items: { id: string; title: string; keywords: string }[]) {
  const [q, setQ] = useState('')
  const lower = q.toLowerCase()
  const filtered = q ? items.filter(i => i.title.toLowerCase().includes(lower) || i.keywords.toLowerCase().includes(lower)) : items
  return { q, setQ, filtered }
}

// ---------------------------------------------------------------------------
// Collapsible section
// ---------------------------------------------------------------------------

function Section({ title, icon: Icon, children, defaultOpen = false, accent = false }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean; accent?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`rounded-xl border overflow-hidden ${accent ? 'border-amber-500/30' : 'border-zinc-800'}`}>
      <button onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${accent ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'bg-zinc-900/50 hover:bg-zinc-800/50'}`}>
        <Icon size={15} className={accent ? 'text-amber-400' : 'text-zinc-500'} />
        <span className={`text-sm font-medium flex-1 ${accent ? 'text-amber-200' : 'text-zinc-200'}`}>{title}</span>
        {open ? <ChevronDown size={13} className="text-zinc-500" /> : <ChevronRight size={13} className="text-zinc-500" />}
      </button>
      {open && <div className="px-4 pb-4 pt-3 text-sm text-zinc-400 space-y-3 border-t border-zinc-800/60">{children}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Reusable components
// ---------------------------------------------------------------------------

function P({ children }: { children: React.ReactNode }) { return <p className="leading-relaxed">{children}</p> }
function H({ children }: { children: React.ReactNode }) { return <h3 className="text-xs uppercase tracking-wider text-zinc-500 mt-4 mb-2 first:mt-0">{children}</h3> }
function Code({ children }: { children: React.ReactNode }) { return <code className="font-mono text-xs text-amber-300 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">{children}</code> }
function Pre({ children }: { children: string }) { return <pre className="font-mono text-xs text-zinc-300 bg-zinc-950 rounded-lg p-3 overflow-auto border border-zinc-800 whitespace-pre-wrap leading-relaxed">{children}</pre> }

// ---------------------------------------------------------------------------
// Table components
// ---------------------------------------------------------------------------

function Param({ name, type, def, desc }: { name: string; type: string; def: string; desc: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-0.5 py-2 border-b border-zinc-800/50 last:border-0">
      <span className="text-xs font-mono text-amber-300">{name}</span>
      <span className="text-[10px] text-zinc-600 font-mono">{type}</span>
      <span className="text-[10px] text-zinc-600 font-mono">{def}</span>
      <span className="text-xs text-zinc-400 col-span-3 row-start-2">{desc}</span>
    </div>
  )
}

function ReturnField({ name, type, desc }: { name: string; type: string; desc: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-x-3 py-1.5 border-b border-zinc-800/30 last:border-0">
      <span className="text-xs font-mono text-emerald-300">{name}</span>
      <span className="text-[10px] text-zinc-600 font-mono">{type}</span>
      <span className="text-xs text-zinc-500 col-span-2 row-start-2">{desc}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tool reference template
// ---------------------------------------------------------------------------

function ToolRef({ name, desc, params, returns, example }: {
  name: string; desc: string; params: { name: string; type: string; def: string; desc: string }[]; returns: { name: string; type: string; desc: string }[]; example: string
}) {
  return (
    <div className="bg-zinc-950 rounded-lg border border-zinc-800 p-3 space-y-3">
      <div>
        <span className="text-xs font-mono text-amber-300 font-semibold">{name}</span>
        <span className="text-xs text-zinc-500 ml-2">{desc}</span>
      </div>
      <div>
        <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Parameters</div>
        <div className="space-y-0">
          {params.length > 0 ? params.map(p => <Param key={p.name} {...p} />) : <span className="text-xs text-zinc-600 italic">None</span>}
        </div>
      </div>
      <div>
        <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Returns</div>
        {returns.map(r => <ReturnField key={r.name} {...r} />)}
      </div>
      <div>
        <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Example</div>
        <Pre>{example}</Pre>
      </div>
    </div>
  )
}

// ===========================================================================
// PAGE
// ===========================================================================

export function HelpPage() {
  const searchItems = [
    { id: 'tools', title: 'Tool Reference — All 15 Tools', keywords: 'tools parameters returns list_models set_default_model model_status start_session send_prompt send_multimodal session_status list_sessions stop_session kairos_enable kairos_disable kairos_log ultraplan caregiver_alert fleet_dashboard fleet_status' },
    { id: 'kairos', title: 'KAIROS — autoDream Memory Consolidation', keywords: 'memory background daemon auto-dream consolidate MEMORY.md idle threshold' },
    { id: 'ultraplan', title: 'ULTRAPLAN — Cloud Planning', keywords: 'anthropic opus sonnet cloud plan execute local' },
    { id: 'env', title: 'Environment Variables', keywords: 'env var configuration OPENCLAUDE_MCP_PORT OPENCLAUDE_MCP_TOKEN OPENCLAUDE_DIR KAIROS_POLL_SECONDS KAIROS_MAX_CONSOLIDATIONS CAREGIVER_WEBHOOK_URL ANTHROPIC_API_KEY' },
    { id: 'models', title: 'Model Guide — RTX 4090', keywords: 'vram gpu memory speed gemma qwen deepseek llama context window' },
    { id: 'errors', title: 'Error Codes & Troubleshooting', keywords: 'error status code 400 401 404 500 timeout' },
    { id: 'safety', title: 'Safety & Security', keywords: 'kid-safe caregiver alert content filter privacy auth token' },
  ]
  const { q, setQ, filtered } = useSearch(searchItems)

  const showAll = q === ''

  // -----------------------------------------------------------------------
  // Tools data
  // -----------------------------------------------------------------------
  const tools: { name: string; desc: string; params: { name: string; type: string; def: string; desc: string }[]; returns: { name: string; type: string; desc: string }[]; example: string }[] = [
    {
      name: 'list_models', desc: 'List known Ollama models with VRAM/speed/context metadata',
      params: [],
      returns: [
        { name: 'default', type: 'string', desc: 'Current default model tag' },
        { name: 'ollama_running', type: 'bool', desc: 'Whether Ollama is reachable' },
        { name: 'known_models', type: 'dict', desc: 'Model tag → { label, vram_q4_gb, est_toks, context_k, tool_calling, license }' },
        { name: 'all_ollama_models', type: 'list', desc: 'Raw model names from Ollama /api/tags' },
      ],
      example: 'curl -s :10932/tools/list_models | jq ".known_models | keys"',
    },
    {
      name: 'set_default_model', desc: 'Set default model for new sessions (persisted to disk)',
      params: [{ name: 'model_tag', type: 'string', def: 'required', desc: 'Ollama tag, e.g. gemma4:26b' }],
      returns: [{ name: 'default', type: 'string', desc: 'New default tag' }, { name: 'status', type: 'string', desc: '"ok"' }],
      example: 'curl -s :10932/tools/set_default_model -d \'{"model_tag":"qwen3.5:27b"}\'',
    },
    {
      name: 'model_status', desc: 'Check Ollama health and whether a specific model is loaded in VRAM',
      params: [{ name: 'model_tag', type: 'string?', def: 'default', desc: 'Tag to check. Omit for default.' }],
      returns: [
        { name: 'target', type: 'string', desc: 'Model tag checked' },
        { name: 'ollama_ok', type: 'bool', desc: 'Ollama reachable' },
        { name: 'model_available', type: 'bool', desc: 'Present in /api/tags' },
        { name: 'model_in_vram', type: 'bool', desc: 'Loaded in GPU memory' },
        { name: 'metadata', type: 'dict', desc: 'Known model specs if recognised' },
      ],
      example: 'curl -s :10932/tools/model_status -d \'{"model_tag":"gemma4:26b"}\'',
    },
    {
      name: 'start_session', desc: 'Launch an OpenClaude subprocess in a project directory',
      params: [
        { name: 'working_dir', type: 'string', def: 'required', desc: 'Absolute path to project' },
        { name: 'model_tag', type: 'string?', def: 'default', desc: 'Ollama model for this session' },
        { name: 'enable_kairos', type: 'bool', def: 'false', desc: 'Start KAIROS autoDream daemon' },
        { name: 'safety_mode', type: 'string', def: '"none"', desc: '"none" or "kid-safe"' },
        { name: 'custom_guardrails', type: 'string?', def: 'null', desc: 'Extra system prompt text' },
      ],
      returns: [
        { name: 'session_id', type: 'string', desc: '8-char hex identifier' },
        { name: 'model', type: 'string', desc: 'Model tag assigned' },
        { name: 'status', type: 'string', desc: '"started"' },
        { name: 'kairos', type: 'bool', desc: 'KAIROS enabled flag' },
      ],
      example: 'curl -s :10932/tools/start_session -d \'{"working_dir":"/tmp/demo","enable_kairos":true}\'',
    },
    {
      name: 'send_prompt', desc: 'Send a text instruction to a running session. Returns response.',
      params: [
        { name: 'session_id', type: 'string', def: 'required', desc: 'From start_session' },
        { name: 'prompt', type: 'string', def: 'required', desc: 'Natural language instruction' },
      ],
      returns: [
        { name: 'output', type: 'string', desc: 'Assistant response text' },
        { name: 'model', type: 'string', desc: 'Model used' },
        { name: 'turn_duration_seconds', type: 'float', desc: 'Wall-clock turn time' },
        { name: 'total_prompts', type: 'int', desc: 'Running prompt count this session' },
      ],
      example: 'curl -s :10932/tools/send_prompt -d \'{"session_id":"a1b2c3d4","prompt":"List files"}\'',
    },
    {
      name: 'send_multimodal', desc: 'Send text + images to a session (png, jpeg, webp, gif)',
      params: [
        { name: 'session_id', type: 'string', def: 'required', desc: 'From start_session' },
        { name: 'text', type: 'string', def: 'required', desc: 'Text prompt' },
        { name: 'image_paths', type: 'list?', def: 'null', desc: 'File paths to images (read + base64'd server-side)' },
      ],
      returns: [{ name: 'output', type: 'string', desc: 'Assistant response' }],
      example: 'curl -s :10932/tools/send_multimodal -d \'{"session_id":"a1b2c3d4","text":"Describe this image","image_paths":["/tmp/photo.png"]}\'',
    },
    {
      name: 'session_status', desc: 'Get session state, output buffer, and usage analytics',
      params: [{ name: 'session_id', type: 'string', def: 'required', desc: 'Target session' }],
      returns: [
        { name: 'status', type: 'string', desc: 'pending/provisioning/running/stopped/error' },
        { name: 'elapsed_seconds', type: 'int', desc: 'Session uptime' },
        { name: 'last_output_preview', type: 'string', desc: 'Recent output (500 chars)' },
        { name: 'usage', type: 'object', desc: '{ total_prompts, total_output_chars, estimated_input_tokens }' },
      ],
      example: 'curl -s :10932/tools/session_status -d \'{"session_id":"a1b2c3d4"}\'',
    },
    {
      name: 'list_sessions', desc: 'List all active sessions with their snapshots',
      params: [],
      returns: [{ name: 'sessions', type: 'list', desc: 'Array of session snapshot objects' }],
      example: 'curl -s :10932/tools/list_sessions | jq ".sessions | length"',
    },
    {
      name: 'stop_session', desc: 'Gracefully stop a session and clean up subprocess',
      params: [{ name: 'session_id', type: 'string', def: 'required', desc: 'Session to stop' }],
      returns: [{ name: 'status', type: 'string', desc: '"stopped"' }],
      example: 'curl -s :10932/tools/stop_session -d \'{"session_id":"a1b2c3d4"}\'',
    },
    {
      name: 'kairos_enable', desc: 'Start KAIROS autoDream daemon on a session',
      params: [
        { name: 'session_id', type: 'string', def: 'required', desc: 'Target session' },
        { name: 'idle_threshold_seconds', type: 'int', def: '60', desc: 'Idle time before consolidation triggers' },
      ],
      returns: [{ name: 'kairos', type: 'string', desc: '"enabled" or "already_running"' }],
      example: 'curl -s :10932/tools/kairos_enable -d \'{"session_id":"a1b2c3d4","idle_threshold_seconds":120}\'',
    },
    {
      name: 'kairos_disable', desc: 'Stop KAIROS daemon on a session',
      params: [{ name: 'session_id', type: 'string', def: 'required', desc: 'Target session' }],
      returns: [{ name: 'kairos', type: 'string', desc: '"disabled"' }],
      example: 'curl -s :10932/tools/kairos_disable -d \'{"session_id":"a1b2c3d4"}\'',
    },
    {
      name: 'kairos_log', desc: 'Retrieve KAIROS consolidation log entries for a session',
      params: [
        { name: 'session_id', type: 'string', def: 'required', desc: 'Target session' },
        { name: 'lines', type: 'int', def: '50', desc: 'Max log lines to return' },
      ],
      returns: [{ name: 'lines', type: 'list', desc: 'Array of log line strings' }, { name: 'total_entries', type: 'int', desc: 'Total entries found' }],
      example: 'curl -s :10932/tools/kairos_log -d \'{"session_id":"a1b2c3d4","lines":20}\'',
    },
    {
      name: 'ultraplan', desc: 'Route a planning goal to Anthropic, feed resulting plan into local session',
      params: [
        { name: 'session_id', type: 'string', def: 'required', desc: 'Local execution session' },
        { name: 'goal', type: 'string', def: 'required', desc: 'High-level goal description' },
      ],
      returns: [
        { name: 'plan', type: 'string', desc: 'Full plan text from Anthropic' },
        { name: 'model', type: 'string', desc: 'Anthropic model used' },
        { name: 'usage', type: 'object', desc: '{ input_tokens, output_tokens }' },
      ],
      example: 'curl -s :10932/tools/ultraplan -d \'{"session_id":"a1b2c3d4","goal":"Design auth system"}\'',
    },
    {
      name: 'caregiver_alert', desc: '[KID-SAFE] Notify caregivers of high-risk interaction attempt',
      params: [
        { name: 'session_id', type: 'string', def: 'required', desc: 'Session where risk detected' },
        { name: 'risk_topic', type: 'string', def: 'required', desc: 'e.g. drugs, self-harm' },
        { name: 'reason', type: 'string', def: 'required', desc: 'Context for the alert' },
      ],
      returns: [{ name: 'alert_logged', type: 'bool', desc: 'True if alert was recorded' }],
      example: 'curl -s :10932/tools/caregiver_alert -d \'{"session_id":"a1b2c3d4","risk_topic":"drugs","reason":"User asked about illegal substances"}\'',
    },
    {
      name: 'fleet_status', desc: 'Global fleet health summary — active sessions, KAIROS count, Ollama status',
      params: [],
      returns: [
        { name: 'active_sessions', type: 'int', desc: 'Currently running sessions' },
        { name: 'kairos_active', type: 'int', desc: 'Sessions with KAIROS enabled' },
        { name: 'ollama_running', type: 'bool', desc: 'Ollama connectivity' },
      ],
      example: 'curl -s :10932/tools/fleet_status',
    },
  ]

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <BookOpen size={18} className="text-amber-400" />
          API Reference & Documentation
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">openclaude-mcp · 15 tools · parameter reference · return schemas · env vars</p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search tools, parameters, env vars..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 pl-9 pr-4 text-sm text-zinc-200
            placeholder-zinc-600 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition-colors" />
        {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 text-xs">Clear</button>}
      </div>

      {/* Search results count */}
      {q && <div className="text-xs text-zinc-600 mb-4">Found {filtered.length} section(s) for &quot;{q}&quot;</div>}

      <div className="flex flex-col gap-3">

        {/* ── Tool Reference ─────────────────────────────────────────── */}
        {(showAll || filtered.some(f => f.id === 'tools')) && (
          <div id="tools">
            <Section title="Tool Reference — All 15 Tools" icon={Server} defaultOpen>
              <P>Every tool is callable via REST at <Code>POST /tools/{'{name}'}</Code> or through the MCP SSE transport.</P>
              <div className="space-y-3">
                {tools.map(t => <ToolRef key={t.name} {...t} />)}
              </div>
            </Section>
          </div>
        )}

        {/* ── KAIROS ─────────────────────────────────────────────────── */}
        {(showAll || filtered.some(f => f.id === 'kairos')) && (
          <div id="kairos">
            <Section title="KAIROS — autoDream Memory Consolidation" icon={Brain} defaultOpen accent>
              <P>KAIROS solves <strong className="text-zinc-200">context entropy</strong> — the degradation of signal-to-noise ratio in long agentic sessions. It runs a background subagent (forked to avoid corrupting the main reasoning chain) whenever the session is idle past a threshold.</P>
              <H>The Four-Phase Cycle</H>
              <div className="space-y-2">
                {[
                  { phase: '1. Orient', color: 'text-blue-400', desc: 'Read MEMORY.md under FileLock — the consolidated ground truth.' },
                  { phase: '2. Gather', color: 'text-emerald-400', desc: 'Collect recent session output as raw observations (2000 chars max).' },
                  { phase: '3. Consolidate', color: 'text-amber-400', desc: 'Ollama call (temp=0.2, 120s timeout) to merge, deduplicate, harden facts. Aborts if session becomes active mid-call.' },
                  { phase: '4. Prune', color: 'text-purple-400', desc: 'Write updated MEMORY.md under FileLock. Falls back if lock cannot be acquired in 10s.' },
                ].map(({ phase, color, desc }) => (
                  <div key={phase} className="flex gap-3 bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                    <span className={`text-xs font-mono font-semibold shrink-0 w-24 ${color}`}>{phase}</span>
                    <span className="text-xs text-zinc-400 leading-relaxed">{desc}</span>
                  </div>
                ))}
              </div>
              <H>Key Properties</H>
              <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                <li><strong className="text-zinc-300">Poll interval:</strong> <Code>KAIROS_POLL_SECONDS</Code> (default 30s)</li>
                <li><strong className="text-zinc-300">Consolidation budget:</strong> <Code>KAIROS_MAX_CONSOLIDATIONS</Code> (default 100 per session)</li>
                <li><strong className="text-zinc-300">File locking:</strong> MEMORY.md.lock sidecar, 10s timeout</li>
                <li><strong className="text-zinc-300">State persistence:</strong> Consolidation count saved to disk, restored on restart</li>
                <li><strong className="text-zinc-300">Logging:</strong> All events in centralized log buffer, visible via <Code>kairos_log</Code> tool and Logger page</li>
              </ul>
              <H>Example</H>
              <Pre>{`# Enable with custom threshold
curl -s :10932/tools/kairos_enable -d '{"session_id":"a1b2c3d4","idle_threshold_seconds":120}'

# Check logs after idle period
curl -s :10932/tools/kairos_log -d '{"session_id":"a1b2c3d4","lines":20}'`}</Pre>
            </Section>
          </div>
        )}

        {/* ── ULTRAPLAN ──────────────────────────────────────────────── */}
        {(showAll || filtered.some(f => f.id === 'ultraplan')) && (
          <div id="ultraplan">
            <Section title="ULTRAPLAN — Cloud Planning, Local Execution" icon={Zap}>
              <P>For architecturally complex tasks that benefit from extended reasoning. Sends a goal to an Anthropic model (default <Code>claude-sonnet-4-6</Code>), gets a structured plan, feeds it into the local session for step-by-step execution.</P>
              <P>Entirely optional — all local features work without <Code>ANTHROPIC_API_KEY</Code>.</P>
              <H>Error Handling</H>
              <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                <li><strong className="text-zinc-300">No API key:</strong> Returns <Code>{'{ status: "no_api_key", hint: "..." }'}</Code></li>
                <li><strong className="text-zinc-300">HTTP errors:</strong> Returns Anthropic status code + detail body</li>
                <li><strong className="text-zinc-300">Timeout:</strong> 30-minute client timeout, returns clean error message</li>
                <li><strong className="text-zinc-300">Connection:</strong> DNS/network failures caught and reported</li>
              </ul>
              <H>Example</H>
              <Pre>{`curl -s :10932/tools/ultraplan -d '{
  "session_id":"a1b2c3d4",
  "goal":"Design a REST API for a todo app"
}' | jq '.usage'
# → { "input_tokens": 142, "output_tokens": 2048 }`}</Pre>
            </Section>
          </div>
        )}

        {/* ── Environment Variables ──────────────────────────────────── */}
        {(showAll || filtered.some(f => f.id === 'env')) && (
          <div id="env">
            <Section title="Environment Variables" icon={Settings} defaultOpen>
              <div className="overflow-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="text-zinc-600 border-b border-zinc-800">
                      {['Variable', 'Default', 'Description'].map(h => <th key={h} className="text-left py-2 pr-3 font-medium">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {[
                      ['OPENCLAUDE_MCP_PORT', '10932', 'Backend port for SSE + REST'],
                      ['OPENCLAUDE_MCP_TOKEN', '(unset)', 'REST auth token; disables auth when unset'],
                      ['OPENCLAUDE_DIR', 'D:\\Dev\\repos\\external\\openclaude', 'Path to openclaude source clone'],
                      ['OPENCLAUDE_ULTRAPLAN_MODEL', 'claude-sonnet-4-6', 'Anthropic model for ULTRAPLAN'],
                      ['OPENCLAUDE_CONFIG_DIR', '~/.config/openclaude', 'Persistence directory for sessions + model defaults + KAIROS state'],
                      ['KAIROS_POLL_SECONDS', '30', 'KAIROS daemon poll interval'],
                      ['KAIROS_MAX_CONSOLIDATIONS', '100', 'Max consolidations per session before auto-disable'],
                      ['CAREGIVER_WEBHOOK_URL', '(unset)', 'Webhook URL for caregiver alert POSTs'],
                      ['ANTHROPIC_API_KEY', '(unset)', 'Required for ULTRAPLAN'],
                      ['OLLAMA_BASE_URL', 'http://localhost:11434', 'Ollama server URL'],
                    ].map(row => (
                      <tr key={row[0]}>
                        {row.map((cell, i) => (
                          <td key={i} className={`py-1.5 pr-3 ${i === 0 ? 'text-amber-300 font-mono' : i === 2 ? 'text-zinc-400' : 'text-zinc-600 font-mono'}`}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>
        )}

        {/* ── Model Guide ────────────────────────────────────────────── */}
        {(showAll || filtered.some(f => f.id === 'models')) && (
          <div id="models">
            <Section title="Model Guide — RTX 4090 24GB" icon={Cpu}>
              <div className="overflow-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="text-zinc-600 border-b border-zinc-800">
                      {['Model', 'Tag', 'Active', 'VRAM @Q4', 'tok/s', 'Ctx', 'Tool Use', 'License'].map(h => (
                        <th key={h} className="text-left py-2 pr-3 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {[
                      ['Gemma 4 26B ⭐', 'gemma4:26b', '26B', '~17 GB', '40-60', '256K', 'Yes', 'Apache-2.0'],
                      ['Gemma 4 E4B', 'gemma4:e4b', '4B', '~9 GB', '80-100', '256K', 'Yes', 'Apache-2.0'],
                      ['Qwen2.5-Coder 32B', 'qwen2.5-coder:32b-instruct-q4_K_M', '32B', '~19 GB', '30-40', '128K', 'Yes', 'Apache-2.0'],
                      ['DeepSeek R1 32B', 'deepseek-r1:32b', '32B', '~19 GB', '25-35', '64K', 'No', 'MIT'],
                      ['Qwen3.5 35B-A3B', 'qwen3.5:35b-a3b', '3B', '~8.5 GB', '112', '128K', 'Yes', 'Apache-2.0'],
                      ['Qwen3.5 27B', 'qwen3.5:27b', '27B', '~15 GB', '40', '128K', 'Yes', 'Apache-2.0'],
                      ['Llama 3.1 8B', 'llama3.1:8b', '8B', '~5 GB', '80-100', '128K', 'Yes', 'Meta Llama 3'],
                    ].map(row => (
                      <tr key={row[0]}>
                        {row.map((cell, i) => (
                          <td key={i} className={`py-1.5 pr-3 whitespace-nowrap ${i === 0 ? 'text-zinc-200 font-medium' : i === 1 ? 'text-amber-300 font-mono text-[10px]' : 'text-zinc-500'}`}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <P className="mt-3">Default: <Code>gemma4:26b</Code>. Best VRAM/quality/speed tradeoff on 4090. Vision-capable models (llava, qwen-vl) supported via <Code>send_multimodal</Code>.</P>
            </Section>
          </div>
        )}

        {/* ── Error Codes ────────────────────────────────────────────── */}
        {(showAll || filtered.some(f => f.id === 'errors')) && (
          <div id="errors">
            <Section title="Error Codes & Troubleshooting" icon={AlertTriangle}>
              <div className="overflow-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="text-zinc-600 border-b border-zinc-800">
                      {['Code', 'HTTP Status', 'Meaning', 'Fix'].map(h => <th key={h} className="text-left py-2 pr-3 font-medium">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {[
                      ['BAD_ARGS', '400', 'Missing/invalid parameter', 'Check required fields in tool params'],
                      ['UNAUTHORIZED', '401', 'Auth token missing or wrong', 'Set OPENCLAUDE_MCP_TOKEN or pass Authorization header'],
                      ['NOT_FOUND', '404', 'Unknown tool name', 'Check POST /tools/{name} path'],
                      ['INTERNAL', '500', 'Unhandled server error', 'Check server logs at /api/logs/system'],
                      ['NO_SESSION', '—', 'Session ID not found', 'Verify session_id from start_session or list_sessions'],
                      ['ANTHROPIC_NO_KEY', '—', 'ANTHROPIC_API_KEY not set', 'Set ANTHROPIC_API_KEY for ULTRAPLAN'],
                      ['ANTHROPIC_TIMEOUT', '—', 'Anthropic API timed out (30m)', 'Retry with simpler goal or check network'],
                      ['ANTHROPIC_CONNECT', '—', 'Cannot reach Anthropic API', 'Check network connectivity'],
                      ['OLLAMA_OFFLINE', '—', 'Ollama not reachable on :11434', 'Start Ollama: ollama serve'],
                    ].map(row => (
                      <tr key={row[0]}>
                        {row.map((cell, i) => (
                          <td key={i} className={`py-1.5 pr-3 ${i === 0 ? 'text-red-300 font-mono' : i === 3 ? 'text-zinc-400' : 'text-zinc-500'}`}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>
        )}

        {/* ── Safety ─────────────────────────────────────────────────── */}
        {(showAll || filtered.some(f => f.id === 'safety')) && (
          <div id="safety">
            <Section title="Safety & Security" icon={Shield} accent>
              <H>Authentication</H>
              <P>Set <Code>OPENCLAUDE_MCP_TOKEN</Code> to enable bearer token auth on REST endpoints. SSE transport is exempted for MCP clients. Without it, all endpoints are open on the local network.</P>
              <Pre>{`export OPENCLAUDE_MCP_TOKEN="my-secret-token"
start.ps1  # or: uv run python server.py
curl -H "Authorization: Bearer my-secret-token" :10932/tools/list_models`}</Pre>
              <H>Kid-Safe Mode</H>
              <P>Inject a multi-rule safety policy via <Code>safety_mode="kid-safe"</Code> when starting a session. The model is constrained to clinical, age-appropriate responses with proactive privacy reminders every 5-10 turns.</P>
              <P>High-risk topic detection calls <Code>caregiver_alert</Code>, which logs to <Code>%TEMP%/openclaude_caregiver_alerts.log</Code> and optionally POSTs to <Code>CAREGIVER_WEBHOOK_URL</Code>.</P>
              <Pre>{`curl -s :10932/tools/start_session -d '{
  "working_dir":"/tmp/safe",
  "safety_mode":"kid-safe"
}'`}</Pre>
              <H>Subprocess Isolation</H>
              <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                <li><strong className="text-zinc-300">No shell injection:</strong> <Code>asyncio.create_subprocess_exec</Code> with explicit args array</li>
                <li><strong className="text-zinc-300">Env whitelist:</strong> Only PATH, HOME, USERPROFILE, etc. + <Code>OPENCLAUDE_*</Code>/<Code>ANTHROPIC_*</Code>/<Code>OLLAMA_*</Code> prefixes</li>
                <li><strong className="text-zinc-300">Separate stderr:</strong> NDJSON stdout never polluted by error output</li>
                <li><strong className="text-zinc-300">Graceful shutdown:</strong> EOF → SIGTERM (5s) → SIGKILL (5s)</li>
              </ul>
            </Section>
          </div>
        )}

      </div>
    </div>
  )
}
