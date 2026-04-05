import { useEffect } from 'react'
import { RefreshCw, CheckCircle, XCircle, Star } from 'lucide-react'
import { useStore, ModelInfo } from '../store'

function ModelCard({ tag, meta }: { tag: string; meta: ModelInfo }) {
  const { defaultModel, setDefaultModel } = useStore()
  const isDefault = tag === defaultModel

  return (
    <div className={`rounded-xl border p-4 transition-colors
      ${isDefault ? 'border-amber-500/40 bg-amber-500/5' : 'border-zinc-800 bg-zinc-900/40'}`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-zinc-100 truncate">{meta.label}</div>
          <code className="text-xs text-zinc-500 font-mono">{tag}</code>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Availability badge */}
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border
            ${meta.available_in_ollama
              ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
              : 'border-zinc-700 text-zinc-600 bg-zinc-800/50'}`}>
            {meta.available_in_ollama
              ? <><CheckCircle size={10} /> ready</>
              : <><XCircle size={10} /> not pulled</>}
          </span>
          {/* Set default button */}
          {!isDefault && (
            <button
              onClick={() => setDefaultModel(tag)}
              className="text-xs px-2 py-0.5 rounded border border-zinc-700 text-zinc-500
                hover:border-amber-500/40 hover:text-amber-400 transition-colors"
            >
              Set default
            </button>
          )}
          {isDefault && <Star size={13} className="text-amber-400" />}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
        {[
          { k: 'Active params', v: meta.active_params_b != null ? `${meta.active_params_b}B` : '—' },
          { k: 'Total params', v: meta.total_params_b != null ? `${meta.total_params_b}B` : '—' },
          { k: 'VRAM @ Q4', v: meta.vram_q4_gb != null ? `${meta.vram_q4_gb} GB` : '—' },
          { k: 'Speed', v: `~${meta.est_toks} tok/s` },
          { k: 'Context', v: meta.context_k != null ? `${meta.context_k}K` : '—' },
          { k: 'License', v: meta.license },
        ].map(({ k, v }) => (
          <div key={k}>
            <div className="text-zinc-600">{k}</div>
            <div className="text-zinc-300 font-mono mt-0.5">{v}</div>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="text-xs text-zinc-500 border-t border-zinc-800/80 pt-2">{meta.notes}</div>

      {/* Pull command if not available */}
      {!meta.available_in_ollama && (
        <div className="mt-2 flex items-center gap-2">
          <code className="text-xs text-zinc-400 bg-zinc-950 px-2 py-1 rounded font-mono">
            ollama pull {tag}
          </code>
        </div>
      )}
    </div>
  )
}

export function Models() {
  const { models, modelsLoading, ollamaRunning, fetchModels } = useStore()
  const entries = Object.entries(models)

  useEffect(() => { fetchModels() }, [])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Models</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {ollamaRunning
              ? `Ollama running · ${entries.filter(([, m]) => m.available_in_ollama).length} of ${entries.length} ready`
              : 'Ollama offline — start with: ollama serve'}
          </p>
        </div>
        <button
          onClick={fetchModels}
          disabled={modelsLoading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-700
            text-zinc-400 text-sm hover:border-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={13} className={modelsLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Info banner */}
      <div className="mb-5 p-3 rounded-lg border border-zinc-800 bg-zinc-900/30 text-xs text-zinc-500">
        All models are tested on RTX 4090 (24 GB VRAM). Gemma 4 26B-A4B and Qwen3.5 35B-A3B
        are the primary recommendations — both run at Q4 with significant VRAM headroom,
        leaving room for KV cache on long agentic sessions.
        GLM-5 and Qwen3-Coder-Next are tracked but require Ollama tags to drop.
      </div>

      <div className="flex flex-col gap-3">
        {entries.map(([tag, meta]) => (
          <ModelCard key={tag} tag={tag} meta={meta} />
        ))}
      </div>
    </div>
  )
}
