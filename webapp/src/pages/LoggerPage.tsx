import { useEffect, useRef } from 'react'
import { Activity, Cpu, Terminal } from 'lucide-react'
import { useStore } from '../store'

export function LoggerPage() {
  const { systemLogs, fetchSystemLogs, sessions } = useStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchSystemLogs()
    const id = setInterval(fetchSystemLogs, 2000)
    return () => clearInterval(id)
  }, [fetchSystemLogs])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [systemLogs])

  const runningCount = sessions.filter(s => s.status === 'running').length

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col h-full overflow-hidden">
      <div className="mb-6 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <Activity size={18} className="text-emerald-400" />
            System Logger
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Real-time activity feed from the OpenClaude Python backend.
          </p>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Active Sessions</span>
                <span className="text-lg font-mono text-emerald-400">{runningCount}</span>
            </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden shadow-2xl">
        <div className="px-4 py-2 bg-zinc-900/50 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu size={14} className="text-zinc-500" />
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Backend Output</span>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-zinc-500 font-mono uppercase">Live</span>
             </div>
          </div>
        </div>
        
        <div 
          ref={scrollRef}
          className="flex-1 overflow-auto p-4 font-mono text-[11px] leading-relaxed scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
        >
          {systemLogs.length === 0 ? (
            <div className="text-zinc-700 italic flex items-center gap-2">
                <Terminal size={12} />
                Waiting for backend activity...
            </div>
          ) : (
            <div className="space-y-0.5">
              {systemLogs.map((line, i) => {
                let color = 'text-zinc-500'
                if (line.toLowerCase().includes('error')) color = 'text-red-400 font-bold'
                if (line.toLowerCase().includes('warning')) color = 'text-amber-400'
                if (line.includes('started on')) color = 'text-emerald-400'
                if (line.includes('Backend OK')) color = 'text-emerald-500'
                
                return (
                  <div key={i} className={`${color} whitespace-pre-wrap break-all border-l-2 border-transparent hover:border-zinc-800 hover:bg-zinc-900/30 px-2 transition-colors`}>
                    {line}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 shrink-0 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-lg">
            <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Status</div>
            <div className="text-xs text-zinc-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Operational
            </div>
        </div>
        <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-lg">
            <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Transport</div>
            <div className="text-xs text-zinc-300">SSE + REST Bridge</div>
        </div>
        <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-lg">
            <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Buffer</div>
            <div className="text-xs text-zinc-300">{systemLogs.length} / 200 lines</div>
        </div>
      </div>
    </div>
  )
}
