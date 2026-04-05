import { useEffect, useState } from 'react'
import { Square, Brain, FolderOpen, RefreshCw, ChevronDown, Zap } from 'lucide-react'
import { useStore } from '../store'
import { api } from '../api'

// ---------------------------------------------------------------------------
// New session form
// ---------------------------------------------------------------------------

function NewSessionForm() {
  const {
    models, defaultModel,
    newSessionDir, newSessionModel, newSessionKairos,
    setNewSessionDir, setNewSessionModel, setNewSessionKairos,
    startSession,
  } = useStore()

  const modelKeys = Object.keys(models)

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 mb-6">
      <h2 className="text-sm font-medium text-zinc-200 mb-4">New Session</h2>
      <div className="flex flex-col gap-3">
        {/* Working dir */}
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Working directory</label>
          <div className="flex gap-2">
            <input
              value={newSessionDir}
              onChange={(e) => setNewSessionDir(e.target.value)}
              placeholder="D:\Dev\repos\my-project"
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2
                text-sm text-zinc-100 font-mono placeholder:text-zinc-600
                focus:outline-none focus:border-amber-500/60"
            />
            <button className="p-2 border border-zinc-700 rounded-lg text-zinc-500
              hover:border-zinc-500 hover:text-zinc-300 transition-colors">
              <FolderOpen size={14} />
            </button>
          </div>
        </div>

        {/* Model selector */}
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">
            Model <span className="text-zinc-600">(default: {defaultModel})</span>
          </label>
          <div className="relative">
            <select
              value={newSessionModel}
              onChange={(e) => setNewSessionModel(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2
                text-sm text-zinc-100 appearance-none focus:outline-none focus:border-amber-500/60"
            >
              <option value="">Use default ({defaultModel})</option>
              {modelKeys.map((tag) => (
                <option key={tag} value={tag}>{models[tag].label} — {tag}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          </div>
        </div>

        {/* KAIROS toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setNewSessionKairos(!newSessionKairos)}
            className={`relative w-10 h-5 rounded-full transition-colors
              ${newSessionKairos ? 'bg-amber-500' : 'bg-zinc-700'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform
              ${newSessionKairos ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
          <span className="text-sm text-zinc-300">Enable KAIROS autoDream</span>
          <span className="text-xs text-zinc-600">(memory consolidation daemon)</span>
        </div>

        <button
          onClick={startSession}
          className="mt-1 self-start px-4 py-2 rounded-lg bg-amber-500 text-zinc-950
            text-sm font-medium hover:bg-amber-400 transition-colors"
        >
          Start Session
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ULTRAPLAN panel
// ---------------------------------------------------------------------------

function UltraplanPanel({ sessionId, running }: { sessionId: string; running: boolean }) {
  const { toast } = useStore()
  const [goal, setGoal] = useState('')
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    if (!goal.trim()) return
    setLoading(true)
    setError(null)
    setPlan(null)
    try {
      const r = await api.ultraplan(sessionId, goal.trim())
      if (r.error) {
        setError(r.error + (r.hint ? `\n${r.hint}` : ''))
      } else {
        setPlan(r.plan)
        toast('ULTRAPLAN complete — plan fed into session', 'ok')
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pt-1 border-t border-zinc-800">
      <div className="flex items-center gap-2 mb-2">
        <Zap size={13} className="text-blue-400 shrink-0" />
        <span className="text-xs text-zinc-500">ULTRAPLAN</span>
        <span className="text-xs text-zinc-700">— cloud Opus plans, local model executes</span>
      </div>
      <div className="flex gap-2">
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          placeholder="Describe a complex goal for Opus to plan..."
          disabled={loading || !running}
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5
            text-xs text-zinc-300 font-mono placeholder:text-zinc-700
            focus:outline-none focus:border-blue-500/50 disabled:opacity-40"
        />
        <button
          onClick={run}
          disabled={loading || !running || !goal.trim()}
          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium
            hover:bg-blue-500 transition-colors disabled:opacity-40"
        >
          {loading ? 'Planning...' : 'Plan'}
        </button>
      </div>
      {error && (
        <div className="mt-2 text-xs text-red-400 font-mono bg-red-900/10 rounded p-2 whitespace-pre-wrap">
          {error}
        </div>
      )}
      {plan && (
        <div className="mt-2">
          <div className="text-xs text-zinc-600 mb-1">Plan (fed to session):</div>
          <pre className="text-xs text-zinc-300 font-mono bg-zinc-950 rounded-lg p-3
            max-h-48 overflow-auto whitespace-pre-wrap border border-zinc-800">
            {plan}
          </pre>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Session card
// ---------------------------------------------------------------------------

function SessionCard({ s }: { s: ReturnType<typeof useStore>['sessions'][0] }) {
  const { stopSession, toggleKairos, toast } = useStore()
  const [output, setOutput] = useState('')
  const [prompt, setPrompt] = useState('')
  const [sending, setSending] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const send = async () => {
    if (!prompt.trim()) return
    setSending(true)
    try {
      const r = await api.sendPrompt(s.session_id, prompt)
      setOutput(r.output ?? r.error ?? '')
      setPrompt('')
    } catch (e: any) {
      toast(e.message, 'err')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
        <span className={`w-2 h-2 rounded-full shrink-0
          ${s.status === 'running' ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-zinc-600'}`} />
        <span className="font-mono text-xs text-amber-400">{s.session_id}</span>
        <span className="text-sm text-zinc-300 truncate flex-1">{s.working_dir}</span>
        <span className="text-xs text-zinc-500">{s.model}</span>
        <span className="text-xs text-zinc-600">{s.elapsed_seconds}s</span>
        {s.kairos_enabled && (
          <span className="text-xs text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded">
            KAIROS
          </span>
        )}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
        <button
          onClick={() => stopSession(s.session_id)}
          className="text-zinc-600 hover:text-red-400 transition-colors"
          title="Stop session"
        >
          <Square size={13} />
        </button>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="p-4 flex flex-col gap-3">
          {/* Last output */}
          {s.last_output_preview && (
            <div>
              <div className="text-xs text-zinc-600 mb-1">Last output</div>
              <pre className="text-xs text-zinc-300 font-mono bg-zinc-950 rounded-lg p-3
                overflow-auto max-h-32 whitespace-pre-wrap">{s.last_output_preview}</pre>
            </div>
          )}

          {/* Live output */}
          {output && (
            <div>
              <div className="text-xs text-zinc-600 mb-1">Response</div>
              <pre className="text-xs text-zinc-200 font-mono bg-zinc-950 rounded-lg p-3
                overflow-auto max-h-48 whitespace-pre-wrap">{output}</pre>
            </div>
          )}

          {/* Prompt input */}
          <div className="flex gap-2">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Send a prompt to this session..."
              disabled={sending || s.status !== 'running'}
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2
                text-sm text-zinc-100 font-mono placeholder:text-zinc-600
                focus:outline-none focus:border-amber-500/60 disabled:opacity-40"
            />
            <button
              onClick={send}
              disabled={sending || s.status !== 'running'}
              className="px-3 py-2 rounded-lg bg-amber-500 text-zinc-950 text-sm font-medium
                hover:bg-amber-400 transition-colors disabled:opacity-40"
            >
              {sending ? '...' : 'Send'}
            </button>
          </div>

          {/* KAIROS toggle */}
          <div className="flex items-center gap-3 pt-1 border-t border-zinc-800">
            <Brain size={13} className="text-zinc-500" />
            <span className="text-xs text-zinc-500">KAIROS</span>
            <button
              onClick={() => toggleKairos(s.session_id, !s.kairos_enabled)}
              className={`relative w-8 h-4 rounded-full transition-colors
                ${s.kairos_enabled ? 'bg-amber-500' : 'bg-zinc-700'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform
                ${s.kairos_enabled ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
            <span className="text-xs text-zinc-600">
              {s.kairos_enabled ? 'active' : 'disabled'}
            </span>
          </div>

          {/* ULTRAPLAN */}
          <UltraplanPanel sessionId={s.session_id} running={s.status === 'running'} />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sessions page
// ---------------------------------------------------------------------------

export function Sessions() {
  const { sessions, sessionsLoading, fetchSessions } = useStore()

  useEffect(() => { fetchSessions() }, [])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Sessions</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={fetchSessions}
          disabled={sessionsLoading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-700
            text-zinc-400 text-sm hover:border-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={13} className={sessionsLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <NewSessionForm />

      {sessions.length === 0 ? (
        <div className="text-center py-16 text-zinc-600 text-sm">
          No sessions. Start one above.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map((s) => <SessionCard key={s.session_id} s={s} />)}
        </div>
      )}
    </div>
  )
}
