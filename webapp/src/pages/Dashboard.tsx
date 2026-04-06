import { useEffect } from 'react'
import { Terminal, Cpu, Brain, Activity, AlertTriangle } from 'lucide-react'
import { useStore } from '../store'

function StatCard({
  label, value, sub, icon: Icon, accent = false
}: {
  label: string
  value: string | number
  sub?: string
  icon: any
  accent?: boolean
}) {
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-3
      ${accent ? 'border-amber-500/30 bg-amber-500/5' : 'border-zinc-800 bg-zinc-900/50'}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">{label}</span>
        <Icon size={14} className={accent ? 'text-amber-400' : 'text-zinc-600'} />
      </div>
      <div>
        <div className={`text-2xl font-semibold ${accent ? 'text-amber-300' : 'text-zinc-100'}`}>
          {value}
        </div>
        {sub && <div className="text-xs text-zinc-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

export function Dashboard() {
  const { sessions, models, defaultModel, ollamaRunning, fetchSessions, fetchModels, setPage } = useStore()

  useEffect(() => {
    fetchSessions()
    fetchModels()
  }, [])

  const running = sessions.filter((s) => s.status === 'running').length
  const kairosActive = sessions.filter((s) => s.kairos_enabled && s.status === 'running').length
  const available = Object.values(models).filter((m) => m.available_in_ollama).length
  const defaultMeta = models[defaultModel]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Claude Code harness · zero cloud cost · local inference
        </p>
      </div>

      {/* Ollama warning */}
      {!ollamaRunning && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-lg border border-red-500/30
          bg-red-500/5 text-red-400 text-sm">
          <AlertTriangle size={14} className="shrink-0" />
          Ollama not detected on :11434. Start Ollama before launching sessions.
          <code className="ml-2 text-xs text-red-300 bg-red-900/30 px-2 py-0.5 rounded font-mono">
            ollama serve
          </code>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Active sessions"
          value={running}
          sub={`${sessions.length} total`}
          icon={Terminal}
          accent={running > 0}
        />
        <StatCard
          label="KAIROS daemons"
          value={kairosActive}
          sub="autoDream active"
          icon={Brain}
          accent={kairosActive > 0}
        />
        <StatCard
          label="Models available"
          value={available}
          sub="in Ollama"
          icon={Cpu}
        />
        <StatCard
          label="Default model"
          value={defaultMeta?.label?.split(' ')[0] ?? defaultModel.split(':')[0]}
          sub={defaultModel}
          icon={Activity}
          accent
        />
      </div>

      {/* Default model info card */}
      {defaultMeta && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 mb-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-sm font-medium text-zinc-100">{defaultMeta.label}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{defaultModel}</div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full border
              ${defaultMeta.available_in_ollama
                ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                : 'border-zinc-700 text-zinc-500'}`}>
              {defaultMeta.available_in_ollama ? 'ready' : 'not pulled'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            {[
              { k: 'Active params', v: defaultMeta.active_params_b ? `${defaultMeta.active_params_b}B` : '—' },
              { k: 'VRAM @ Q4', v: defaultMeta.vram_q4_gb ? `${defaultMeta.vram_q4_gb} GB` : '—' },
              { k: 'Context', v: defaultMeta.context_k ? `${defaultMeta.context_k}K` : '—' },
              { k: 'Speed', v: `~${defaultMeta.est_toks} tok/s` },
              { k: 'Tool calling', v: defaultMeta.tool_calling ? 'yes' : 'no' },
              { k: 'License', v: defaultMeta.license },
            ].map(({ k, v }) => (
              <div key={k}>
                <div className="text-zinc-600">{k}</div>
                <div className="text-zinc-300 font-mono mt-0.5">{v}</div>
              </div>
            ))}
          </div>
          {defaultMeta.notes && (
            <div className="mt-3 text-xs text-zinc-500 border-t border-zinc-800 pt-3">
              {defaultMeta.notes}
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setPage('sessions')}
          className="px-4 py-2 rounded-lg bg-amber-500 text-zinc-950 text-sm font-medium
            hover:bg-amber-400 transition-colors"
        >
          + New Session
        </button>
        <button
          onClick={() => setPage('models')}
          className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 text-sm
            hover:border-zinc-500 hover:text-zinc-100 transition-colors"
        >
          Manage Models
        </button>
      </div>

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">Recent Sessions</h2>
          <div className="flex flex-col gap-2">
            {sessions.slice(0, 5).map((s) => (
              <div key={s.session_id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-zinc-800
                  bg-zinc-900/30 text-sm">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0
                  ${s.status === 'running' ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                <span className="font-mono text-xs text-zinc-400 w-20 shrink-0">{s.session_id}</span>
                <span className="text-zinc-300 truncate flex-1">{s.working_dir}</span>
                <span className="text-xs text-zinc-500 shrink-0">{s.model.split(':')[0]}</span>
                {s.kairos_enabled && (
                  <span className="text-xs text-amber-400 shrink-0">KAIROS</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
