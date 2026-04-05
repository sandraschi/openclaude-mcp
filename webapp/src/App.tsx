import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, Terminal, Cpu, Brain, Settings, BookOpen,
  ChevronRight, CheckCircle, XCircle,
} from 'lucide-react'
import { useStore, Page } from './store'
import { Dashboard } from './pages/Dashboard'
import { Sessions } from './pages/Sessions'
import { Models } from './pages/Models'
import { Kairos } from './pages/Kairos'
import { SettingsPage } from './pages/SettingsPage'
import { HelpPage } from './pages/HelpPage'

const NAV: { id: Page; label: string; Icon: React.FC<{ size?: number }> }[] = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'sessions', label: 'Sessions', Icon: Terminal },
  { id: 'models', label: 'Models', Icon: Cpu },
  { id: 'kairos', label: 'KAIROS', Icon: Brain },
  { id: 'help', label: 'Help', Icon: BookOpen },
  { id: 'settings', label: 'Settings', Icon: Settings },
]

// ---------------------------------------------------------------------------
// Toast overlay
// ---------------------------------------------------------------------------

function Toasts() {
  const { toasts, dismissToast } = useStore()
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            onClick={() => dismissToast(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg cursor-pointer
              text-sm font-medium backdrop-blur border
              ${t.type === 'ok'
                ? 'bg-zinc-900/90 border-amber-500/40 text-zinc-100'
                : 'bg-zinc-900/90 border-red-500/40 text-red-400'}`}
          >
            {t.type === 'ok'
              ? <CheckCircle size={14} className="text-amber-400 shrink-0" />
              : <XCircle size={14} className="text-red-400 shrink-0" />}
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function Sidebar() {
  const { page, setPage, ollamaRunning } = useStore()

  return (
    <aside className="w-56 shrink-0 h-screen flex flex-col border-r border-zinc-800 bg-zinc-950">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-semibold tracking-tight text-sm">OpenClaude</span>
          <span className="text-zinc-600 text-xs">MCP</span>
        </div>
        <div className={`mt-1 flex items-center gap-1.5 text-xs ${ollamaRunning ? 'text-emerald-400' : 'text-red-400'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${ollamaRunning ? 'bg-emerald-400' : 'bg-red-500'}`} />
          {ollamaRunning ? 'Ollama connected' : 'Ollama offline'}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 flex flex-col gap-0.5 px-2">
        {NAV.map(({ id, label, Icon }) => {
          const active = page === id
          return (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors w-full text-left
                ${active
                  ? 'bg-amber-500/10 text-amber-300'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'}`}
            >
              <Icon size={15} />
              {label}
              {active && <ChevronRight size={12} className="ml-auto text-amber-500/60" />}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-zinc-800 text-xs text-zinc-600">
        v0.1.0 · :10932 / :10933
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// Page router
// ---------------------------------------------------------------------------

function PageContent() {
  const { page } = useStore()
  const pages: Record<Page, React.ReactNode> = {
    dashboard: <Dashboard />,
    sessions: <Sessions />,
    models: <Models />,
    kairos: <Kairos />,
    help: <HelpPage />,
    settings: <SettingsPage />,
  }
  return (
    <motion.div
      key={page}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="flex-1 overflow-auto"
    >
      {pages[page]}
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// App root
// ---------------------------------------------------------------------------

export default function App() {
  const { fetchModels, fetchSessions } = useStore()

  useEffect(() => {
    fetchModels()
    fetchSessions()
    const id = setInterval(() => {
      fetchSessions()
    }, 8000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      <Sidebar />
      <PageContent />
      <Toasts />
    </div>
  )
}
