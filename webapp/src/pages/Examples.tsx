import React, { useState, useCallback } from 'react'
import { Play, Terminal, RotateCw, CheckCircle, XCircle, ChevronDown, ChevronRight, Loader2, Copy, Check } from 'lucide-react'
import { api, getHealth, getCapabilities } from '../api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExampleResult {
  loading: boolean
  data: any
  error: string | null
  took: number | null
}

// ---------------------------------------------------------------------------
// API runner hook
// ---------------------------------------------------------------------------

function useRunner() {
  const [result, setResult] = useState<ExampleResult>({ loading: false, data: null, error: null, took: null })

  const run = useCallback(async (fn: () => Promise<any>) => {
    setResult({ loading: true, data: null, error: null, took: null })
    const start = performance.now()
    try {
      const data = await fn()
      setResult({ loading: false, data, error: null, took: Math.round(performance.now() - start) })
    } catch (e: any) {
      setResult({ loading: false, data: null, error: e.message ?? String(e), took: Math.round(performance.now() - start) })
    }
  }, [])

  return { result, run }
}

// ---------------------------------------------------------------------------
// Response panel
// ---------------------------------------------------------------------------

function ResponsePanel({ result }: { result: ExampleResult }) {
  if (!result.loading && !result.data && !result.error) return null
  return (
    <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden">
      <div className="px-3 py-1.5 border-b border-zinc-800 flex items-center gap-2 text-[10px] text-zinc-600 font-mono">
        {result.loading ? <Loader2 size={11} className="animate-spin text-amber-400" /> : result.error ? <XCircle size={11} className="text-red-400" /> : <CheckCircle size={11} className="text-emerald-400" />}
        {result.loading ? 'Running...' : result.error ? `Error (${result.took}ms)` : `Success (${result.took}ms)`}
      </div>
      <pre className="text-xs p-3 overflow-auto max-h-60 font-mono leading-relaxed text-zinc-300">
        {result.loading ? <span className="text-zinc-600 animate-pulse">Waiting for response...</span>
        : result.error ? <span className="text-red-400">{result.error}</span>
        : JSON.stringify(result.data, null, 2)}
      </pre>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Example card
// ---------------------------------------------------------------------------

function ExampleCard({ title, desc, code, onRun, result, children }: {
  title: string; desc: string; code: string; onRun: () => void; result: ExampleResult; children?: React.ReactNode
}) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-3">
        <span className="text-sm font-medium text-zinc-200 flex-1">{title}</span>
        <span className="text-[10px] text-zinc-600 hidden sm:block">{desc}</span>
      </div>
      <div className="p-3">
        <div className="relative group">
          <pre className="font-mono text-xs text-zinc-300 bg-zinc-950 rounded-lg p-3 border border-zinc-800 overflow-auto whitespace-pre-wrap leading-relaxed pr-20">{code}</pre>
          <div className="absolute top-2 right-2 flex gap-1">
            <button onClick={onRun} disabled={result.loading}
              className={`p-1.5 rounded border transition-colors text-[10px] flex items-center gap-1 ${
                result.loading ? 'bg-zinc-900 border-zinc-700 text-zinc-600' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-amber-500/10 hover:border-amber-500/40 hover:text-amber-300'
              }`}>
              {result.loading ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
              {result.loading ? '...' : 'Run'}
            </button>
            <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
              className="p-1.5 rounded border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition-colors">
              {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
            </button>
          </div>
        </div>
        <ResponsePanel result={result} />
        {children}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status bar
// ---------------------------------------------------------------------------

function StatusBar() {
  const [health, setHealth] = useState<any>(null)
  const [cap, setCap] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [h, c] = await Promise.all([getHealth(), getCapabilities()])
      setHealth(h); setCap(c)
    } catch { setHealth(null); setCap(null) }
    setLoading(false)
  }, [])

  if (!health && !loading) {
    return (
      <button onClick={refresh} disabled={loading}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900/40 text-xs text-zinc-500 hover:border-zinc-700 transition-colors">
        {loading ? <Loader2 size={12} className="animate-spin" /> : <RotateCw size={12} />}
        Check server status
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] ${health?.ollama ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${health?.ollama ? 'bg-emerald-400' : 'bg-red-500'}`} />
        Ollama {health?.ollama ? 'Connected' : 'Offline'}
      </div>
      <div className="text-[10px] text-zinc-600 font-mono">
        {health?.active_sessions ?? '?'} sessions · {health?.default_model ?? '?'} default
      </div>
      <button onClick={refresh} className="text-zinc-700 hover:text-zinc-400 transition-colors">
        <RotateCw size={11} />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step walkthrough
// ---------------------------------------------------------------------------

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-zinc-900/50 transition-colors">
        <span className="text-xs font-mono font-semibold text-amber-400 shrink-0 w-6">{n}</span>
        <span className="text-xs text-zinc-300 flex-1">{title}</span>
        {open ? <ChevronDown size={11} className="text-zinc-600" /> : <ChevronRight size={11} className="text-zinc-600" />}
      </button>
      {open && <div className="px-3 pb-3 pt-1">{children}</div>}
    </div>
  )
}

function StepCard({ onRun, result, code }: { onRun: () => void; result: ExampleResult; code: string }) {
  return (
    <div>
      <div className="relative group mt-1">
        <pre className="font-mono text-[11px] text-zinc-300 bg-zinc-900 rounded-lg p-2.5 border border-zinc-800 overflow-auto whitespace-pre-wrap leading-relaxed pr-16">{code}</pre>
        <button onClick={onRun} disabled={result.loading}
          className={`absolute top-2 right-2 p-1.5 rounded border transition-colors ${result.loading ? 'bg-zinc-800 border-zinc-700 text-zinc-600' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-amber-500/10 hover:border-amber-500/40'}`}>
          {result.loading ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
        </button>
      </div>
      <ResponsePanel result={result} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Examples page
// ---------------------------------------------------------------------------

export function Examples() {
  const models = useRunner()
  const health = useRunner()
  const sessStart = useRunner()
  const sessList = useRunner()
  const sessStop = useRunner()

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <Terminal size={18} className="text-amber-400" />
            Interactive Examples
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">Run real API calls against your MCP backend. Click <Play size={10} className="inline" /> to execute.</p>
        </div>
        <StatusBar />
      </div>

      {/* ── Quick Reference ──────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs uppercase tracking-wider text-zinc-600 mb-3 font-medium">Quick Reference</h2>
        <div className="grid gap-3">
          <ExampleCard title="List Models" desc="gemma4:26b · qwen3.5:27b · 7 known"
            code={`const models = await api.listModels()
models.known_models  // → { gemma4:26b: { ... }, ... }`}
            onRun={() => models.run(() => api.listModels())}
            result={models.result} />
          <ExampleCard title="Server Health" desc="Ollama status · active sessions"
            code={`const health = await getHealth()
// → { status: "ok", ollama: true, active_sessions: 2, default_model: "gemma4:26b" }`}
            onRun={() => health.run(() => getHealth())}
            result={health.result} />
        </div>
      </div>

      {/* ── Session Lifecycle Walkthrough ────────────────────────────── */}
      <div>
        <h2 className="text-xs uppercase tracking-wider text-zinc-600 mb-3 font-medium">Full Session Walkthrough</h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-2">
          <Step n="1" title="Start a session with KAIROS enabled">
            <StepCard onRun={() => sessStart.run(() => api.startSession('/tmp/demo', 'gemma4:26b', true))}
              result={sessStart.result}
              code={`const session = await api.startSession(
  "/tmp/demo",            // working directory
  "gemma4:26b",          // model
  true,                  // enable KAIROS
  "none"                 // safety mode
)
// → { session_id: "a1b2c3d4", status: "started" }`} />
          </Step>

          <Step n="2" title="List all active sessions">
            <StepCard onRun={() => sessList.run(() => api.listSessions())}
              result={sessList.result}
              code={`const sessions = await api.listSessions()
sessions.length  // → number of active sessions`} />
          </Step>

          <Step n="3" title="Stop the session">
            <StepCard onRun={() => {
              const sid = sessStart.result?.data?.session_id
              if (!sid) { sessStop.run(async () => { throw new Error('Start a session first (Step 1)') }); return }
              sessStop.run(() => api.stopSession(sid))
            }}
              result={sessStop.result}
              code={`await api.stopSession(session.session_id)
// → { session_id: "a1b2c3d4", status: "stopped" }`} />
          </Step>
        </div>
      </div>

      {/* ── Live API Browser ─────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs uppercase tracking-wider text-zinc-600 mb-3 font-medium">API Browser</h2>
        <div className="grid gap-3">
          {[
            { title: 'server capabilities', run: () => getCapabilities(), color: 'text-blue-400' },
            { title: 'list sessions', run: () => api.listSessions(), color: 'text-emerald-400' },
            { title: 'model status (default)', run: () => api.modelStatus(), color: 'text-amber-400' },
            { title: 'system logs', run: () => api.getSystemLogs(), color: 'text-purple-400' },
          ].map(({ title: t, run: r }) => {
            const runner = useRunner()
            return (
              <ExampleCard key={t} title={t} desc=""
                code={`await api.${t.replace(/ /g, '')}()`}
                onRun={() => runner.run(r)}
                result={runner.result} />
            )
          })}
        </div>
      </div>
    </div>
  )
}
