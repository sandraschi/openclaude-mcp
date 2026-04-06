import { create } from 'zustand'
import { api, getHealth } from './api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Session {
  session_id: string
  model: string
  working_dir: string
  status: 'pending' | 'provisioning' | 'running' | 'stopped'
  kairos_enabled: boolean
  elapsed_seconds: number
  last_output_preview: string
  last_output: string
  pid: number | null
}

export interface ModelInfo {
  label: string
  active_params_b: number | null
  total_params_b: number | null
  vram_q4_gb: number | null
  est_toks: string
  context_k: number | null
  tool_calling: boolean
  license: string
  notes: string
  available_in_ollama: boolean
  is_default: boolean
}

export type Page = 'dashboard' | 'sessions' | 'models' | 'kairos' | 'logs' | 'help' | 'settings'

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface Store {
  page: Page
  setPage: (p: Page) => void

  sessions: Session[]
  sessionsLoading: boolean
  fetchSessions: () => Promise<void>
  stopSession: (id: string) => Promise<void>
  
  selectedSessionId: string | null
  setSelectedSessionId: (id: string | null) => void
  sendPrompt: (sessionId: string, prompt: string) => Promise<void>

  models: Record<string, ModelInfo>
  defaultModel: string
  ollamaRunning: boolean
  modelsLoading: boolean
  fetchModels: () => Promise<void>
  setDefaultModel: (tag: string) => Promise<void>

  kairosLogs: Record<string, string[]>
  fetchKairosLog: (session_id: string) => Promise<void>
  toggleKairos: (session_id: string, enabled: boolean) => Promise<void>

  // New session form
  newSessionDir: string
  newSessionModel: string
  newSessionKairos: boolean
  newSessionSafetyMode: string
  newSessionCustomGuardrails: string
  sessionStarting: boolean
  setNewSessionDir: (v: string) => void
  setNewSessionModel: (v: string) => void
  setNewSessionKairos: (v: boolean) => void
  setNewSessionSafetyMode: (v: string) => void
  setNewSessionCustomGuardrails: (v: string) => void
  startSession: () => Promise<void>

  systemLogs: string[]
  fetchSystemLogs: () => Promise<void>

  toasts: { id: string; msg: string; type: 'ok' | 'err' }[]
  toast: (msg: string, type?: 'ok' | 'err') => void
  dismissToast: (id: string) => void
}

let toastCounter = 0

export const useStore = create<Store>((set, get) => ({
  page: 'dashboard',
  setPage: (page) => set({ page }),

  // ── Sessions ──────────────────────────────────────────────────────────────
  sessions: [],
  sessionsLoading: false,
  fetchSessions: async () => {
    set({ sessionsLoading: true })
    try {
      const r = await api.listSessions()
      set({ sessions: r.sessions ?? [] })
    } catch (e: any) {
      get().toast(e.message, 'err')
    } finally {
      set({ sessionsLoading: false })
    }
  },
  stopSession: async (id) => {
    try {
      await api.stopSession(id)
      get().toast(`Session ${id} stopped`, 'ok')
      get().fetchSessions()
    } catch (e: any) {
      get().toast(e.message, 'err')
    }
  },
  selectedSessionId: null,
  setSelectedSessionId: (id) => set({ selectedSessionId: id }),
  sendPrompt: async (sessionId, prompt) => {
    try {
      await api.sendPrompt(sessionId, prompt)
      // Refresh to show output
      get().fetchSessions()
    } catch (e: any) {
      get().toast(e.message, 'err')
    }
  },

  // ── Models ────────────────────────────────────────────────────────────────
  models: {},
  defaultModel: 'gemma4:26b-a4b',
  ollamaRunning: false,
  modelsLoading: false,
  fetchModels: async () => {
    set({ modelsLoading: true })
    try {
      const health = await getHealth().catch(() => null)
      const r = await api.listModels()
      set({
        models: r.known_models ?? {},
        defaultModel: r.default ?? 'gemma4:26b-a4b',
        ollamaRunning: health?.ollama ?? r.ollama_running ?? false,
      })
    } catch (e: any) {
      get().toast('Could not reach MCP backend', 'err')
    } finally {
      set({ modelsLoading: false })
    }
  },
  setDefaultModel: async (tag) => {
    try {
      await api.setDefaultModel(tag)
      set({ defaultModel: tag })
      get().toast(`Default → ${tag}`, 'ok')
    } catch (e: any) {
      get().toast(e.message, 'err')
    }
  },

  // ── KAIROS ────────────────────────────────────────────────────────────────
  kairosLogs: {},
  fetchKairosLog: async (session_id) => {
    try {
      const r = await api.kairosLog(session_id, 100)
      set((s) => ({ kairosLogs: { ...s.kairosLogs, [session_id]: r.lines ?? [] } }))
    } catch (e: any) {
      get().toast(e.message, 'err')
    }
  },
  toggleKairos: async (session_id, enabled) => {
    try {
      if (enabled) {
        await api.kairosEnable(session_id)
        get().toast(`KAIROS enabled on ${session_id}`, 'ok')
      } else {
        await api.kairosDisable(session_id)
        get().toast(`KAIROS disabled on ${session_id}`, 'ok')
      }
      get().fetchSessions()
    } catch (e: any) {
      get().toast(e.message, 'err')
    }
  },

  // ── New session form ──────────────────────────────────────────────────────
  newSessionDir: '',
  newSessionModel: '',
  newSessionKairos: false,
  newSessionSafetyMode: 'none',
  newSessionCustomGuardrails: '',
  sessionStarting: false,
  setNewSessionDir: (v) => set({ newSessionDir: v }),
  setNewSessionModel: (v) => set({ newSessionModel: v }),
  setNewSessionKairos: (v) => set({ newSessionKairos: v }),
  setNewSessionSafetyMode: (v) => set({ newSessionSafetyMode: v }),
  setNewSessionCustomGuardrails: (v) => set({ newSessionCustomGuardrails: v }),
  startSession: async () => {
    const { 
      newSessionDir, newSessionModel, newSessionKairos, 
      newSessionSafetyMode, newSessionCustomGuardrails,
      sessionStarting 
    } = get()
    if (sessionStarting) return

    set({ sessionStarting: true })
    try {
      const r = await api.startSession(
        newSessionDir.trim() || 'D:/Dev/repos/claude-code-1',
        newSessionModel || undefined,
        newSessionKairos,
        newSessionSafetyMode,
        newSessionCustomGuardrails.trim() || undefined,
      )
      get().toast(`Session ${r.session_id} started`, 'ok')
      set({ 
        newSessionDir: '', 
        newSessionModel: '', 
        newSessionKairos: false,
        newSessionSafetyMode: 'none',
        newSessionCustomGuardrails: '',
        selectedSessionId: r.session_id 
      })
      get().fetchSessions()
    } catch (e: any) {
      get().toast(e.message, 'err')
    } finally {
      set({ sessionStarting: false })
    }
  },

  // ── System Logs ──────────────────────────────────────────────────────────
  systemLogs: [],
  fetchSystemLogs: async () => {
    try {
      const r = await api.getSystemLogs()
      set({ systemLogs: r.lines ?? [] })
    } catch (e: any) {
      // Don't toast for log fetch failures to avoid spam
      console.error('System log fetch failed:', e)
    }
  },

  // ── Toasts ────────────────────────────────────────────────────────────────
  toasts: [],
  toast: (msg, type = 'ok') => {
    const id = String(++toastCounter)
    set((s) => ({ toasts: [...s.toasts, { id, msg, type }] }))
    setTimeout(() => get().dismissToast(id), 4000)
  },
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
