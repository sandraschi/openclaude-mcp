import { useEffect, useState } from 'react'
import { Brain, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react'
import { useStore } from '../store'

export function Kairos() {
  const { sessions, kairosLogs, fetchKairosLog, toggleKairos } = useStore()
  const [selected, setSelected] = useState<string | null>(null)

  const runningSessions = sessions.filter((s) => s.status === 'running')

  useEffect(() => {
    if (selected) {
      fetchKairosLog(selected)
      const id = setInterval(() => fetchKairosLog(selected), 5000)
      return () => clearInterval(id)
    }
  }, [selected])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <Brain size={18} className="text-amber-400" />
          KAIROS
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          autoDream memory consolidation daemon — from the Claude Code leak
        </p>
      </div>

      {/* What is KAIROS */}
      <div className="mb-5 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm">
        <div className="font-medium text-zinc-200 mb-2">What KAIROS does</div>
        <div className="text-zinc-500 text-xs space-y-1.5">
          <div><span className="text-zinc-400">Orient:</span> reads MEMORY.md from the working directory</div>
          <div><span className="text-zinc-400">Gather:</span> scans daily session logs for new signals</div>
          <div><span className="text-zinc-400">Consolidate:</span> calls the local model to merge observations, remove contradictions</div>
          <div><span className="text-zinc-400">Prune:</span> rewrites MEMORY.md — vague observations become durable facts</div>
          <div className="pt-1 text-zinc-600">
            Triggers when the session is idle for the configured threshold.
            LLM consolidation call is stubbed — loop runs and logs; wire the Ollama call to complete.
          </div>
        </div>
      </div>

      {runningSessions.length === 0 ? (
        <div className="text-center py-16 text-zinc-600 text-sm">
          No running sessions. Start a session first.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {runningSessions.map((s) => {
            const logs = kairosLogs[s.session_id] ?? []
            const isSelected = selected === s.session_id

            return (
              <div key={s.session_id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                {/* Session header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
                  <span className="font-mono text-xs text-amber-400">{s.session_id}</span>
                  <span className="text-xs text-zinc-500 flex-1 truncate">{s.working_dir}</span>

                  {/* KAIROS toggle */}
                  <button
                    onClick={() => toggleKairos(s.session_id, !s.kairos_enabled)}
                    className="flex items-center gap-1.5 text-xs transition-colors
                      hover:text-zinc-100"
                  >
                    {s.kairos_enabled
                      ? <ToggleRight size={16} className="text-amber-400" />
                      : <ToggleLeft size={16} className="text-zinc-600" />}
                    <span className={s.kairos_enabled ? 'text-amber-400' : 'text-zinc-600'}>
                      {s.kairos_enabled ? 'enabled' : 'disabled'}
                    </span>
                  </button>

                  {/* Log viewer toggle */}
                  {s.kairos_enabled && (
                    <button
                      onClick={() => {
                        if (isSelected) {
                          setSelected(null)
                        } else {
                          setSelected(s.session_id)
                          fetchKairosLog(s.session_id)
                        }
                      }}
                      className="flex items-center gap-1.5 px-2 py-1 rounded border border-zinc-700
                        text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
                    >
                      <RefreshCw size={11} className={isSelected ? 'animate-spin' : ''} />
                      {isSelected ? 'Hide log' : 'View log'}
                    </button>
                  )}
                </div>

                {/* Log pane */}
                {isSelected && s.kairos_enabled && (
                  <div className="p-3">
                    {logs.length === 0 ? (
                      <div className="text-xs text-zinc-600 py-4 text-center">
                        No log entries yet. KAIROS will log every 30s.
                      </div>
                    ) : (
                      <div className="font-mono text-xs text-zinc-400 bg-zinc-950 rounded-lg p-3
                        max-h-64 overflow-auto space-y-0.5">
                        {logs.map((line, i) => (
                          <div key={i} className={
                            line.includes('consolidation would run')
                              ? 'text-amber-400'
                              : 'text-zinc-500'
                          }>
                            {line}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
