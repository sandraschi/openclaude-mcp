import { useEffect, useState } from 'react'
import { Square, Brain, FolderOpen, RefreshCw, ChevronDown, Zap, Plus, X, Terminal, Cpu, Shield, Lock } from 'lucide-react'
import { useStore } from '../store'
import { api } from '../api'
import { ChatWindow } from '../components/Chat/ChatWindow'

// ---------------------------------------------------------------------------
// New session form
// ---------------------------------------------------------------------------

function NewSessionForm() {
  const {
    models, defaultModel,
    newSessionDir, newSessionModel, newSessionKairos,
    newSessionSafetyMode, newSessionCustomGuardrails,
    sessionStarting,
    setNewSessionDir, setNewSessionModel, setNewSessionKairos,
    setNewSessionSafetyMode, setNewSessionCustomGuardrails,
    startSession,
  } = useStore()

  const modelKeys = Object.keys(models)

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 mb-6 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
            <Plus size={18} />
          </div>
          <h2 className="text-lg font-semibold text-zinc-100">Initialize Environment</h2>
        </div>
        {sessionStarting && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] uppercase tracking-wider text-amber-500 font-bold animate-pulse">
            <RefreshCw size={10} className="animate-spin" />
            Provisioning Session
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Working dir */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block">
            Working directory
          </label>
          <div className="flex gap-2">
            <input
              value={newSessionDir}
              onChange={(e) => setNewSessionDir(e.target.value)}
              placeholder="D:\Dev\repos\claude-code-1"
              disabled={sessionStarting}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5
                text-sm text-zinc-100 font-mono placeholder:text-zinc-700
                focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 disabled:opacity-50 transition-all"
              title="Working Directory"
            />
            <button 
              disabled={sessionStarting}
              title="Open directory picker"
              className="p-2.5 border border-zinc-800 rounded-lg text-zinc-500
              hover:border-zinc-700 hover:text-zinc-300 transition-all disabled:opacity-50">
              <FolderOpen size={16} />
            </button>
          </div>
          <p className="text-[10px] text-zinc-600">Defaults to a new standalone repo if empty.</p>
        </div>

        {/* Model selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block">
            Execution Engine (Model)
          </label>
          <div className="relative">
            <select
              value={newSessionModel}
              onChange={(e) => setNewSessionModel(e.target.value)}
              disabled={sessionStarting}
              title="Select model"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5
                text-sm text-zinc-100 appearance-none focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 disabled:opacity-50 transition-all font-mono"
            >
              <option value="">Use default ({defaultModel})</option>
              {modelKeys.map((tag) => (
                <option key={tag} value={tag}>{models[tag].label} — {tag}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          </div>
        </div>
      </div>
      
      {/* Safety & Policy Section */}
      <div className="mt-8 pt-6 border-t border-zinc-800/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
            <Shield size={16} />
          </div>
          <h3 className="text-sm font-semibold text-zinc-300">Execution Safety & Guardrails</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Safety mode */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block">
              Policy Preset
            </label>
            <div className="relative">
              <select
                value={newSessionSafetyMode}
                onChange={(e) => setNewSessionSafetyMode(e.target.value)}
                disabled={sessionStarting}
                title="Safety Policy"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5
                  text-sm text-zinc-100 appearance-none focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 disabled:opacity-50 transition-all font-mono"
              >
                <option value="none">Standard (Unrestricted)</option>
                <option value="kid-safe">Kid-Safe v1.0 (Clinical/Educational)</option>
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            </div>
            {newSessionSafetyMode === 'kid-safe' && (
              <p className="text-[10px] text-emerald-500/80 italic">
                Enforcing reasoning for refusals, clinical sex-ed, and hygiene-first filtering.
              </p>
            )}
          </div>

          {/* Custom guardrails */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block flex items-center justify-between">
              <span>Custom Policy Logic</span>
              <span className="text-[9px] text-zinc-600 lowercase font-normal italic">Appended to system prompt</span>
            </label>
            <textarea
              value={newSessionCustomGuardrails}
              onChange={(e) => setNewSessionCustomGuardrails(e.target.value)}
              placeholder="e.g. Always respond in German. Never use code blocks."
              disabled={sessionStarting}
              rows={2}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5
                text-sm text-zinc-100 placeholder:text-zinc-700
                focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50 transition-all resize-none"
              title="Custom Policy Logic"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between pt-6 border-t border-zinc-800/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setNewSessionKairos(!newSessionKairos)}
              disabled={sessionStarting}
              title={newSessionKairos ? "Disable KAIROS" : "Enable KAIROS"}
              className={`relative w-9 h-5 rounded-full transition-all duration-300
                ${newSessionKairos ? 'bg-amber-500' : 'bg-zinc-800'} ${sessionStarting ? 'opacity-50' : ''}`}
            >
              <span className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-300
                ${newSessionKairos ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-zinc-300">KAIROS autoDream</span>
              <span className="text-[10px] text-zinc-600 font-mono">Consolidation Daemon (Background)</span>
            </div>
          </div>
        </div>

        <button
          onClick={startSession}
          disabled={sessionStarting}
          className="px-6 py-2.5 rounded-lg bg-amber-500 text-zinc-950
            text-sm font-bold hover:bg-amber-400 active:scale-95 transition-all shadow-lg shadow-amber-500/10 disabled:opacity-50 flex items-center gap-2"
        >
          {sessionStarting ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              Initializing...
            </>
          ) : (
            <>
              <Zap size={16} fill="currentColor" />
              Start Session
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Compact session item
// ---------------------------------------------------------------------------

function SessionListItem({ s, active, onClick }: { s: any, active: boolean, onClick: () => void }) {
  const { stopSession } = useStore();
  
  return (
    <div 
      onClick={onClick}
      className={`group cursor-pointer rounded-lg border p-3 transition-all duration-200 border-zinc-800/50
        ${active ? 'bg-amber-500/5 border-amber-500/40 shadow-lg shadow-amber-500/5' : 'hover:bg-zinc-800/20'}
      `}
    >
      <div className="flex items-center gap-3 mb-1">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0
          ${s.status === 'running' ? 'bg-emerald-500 shadow-[0_0_4px_#10b981]' : 
            s.status === 'provisioning' ? 'bg-amber-500 animate-pulse' : 'bg-zinc-600'}`} 
        />
        <span className="font-mono text-xs text-amber-500/80 truncate flex-1">{s.session_id}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            stopSession(s.session_id);
          }}
          title="Terminate session"
          className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all p-1"
        >
          <X size={12} />
        </button>
      </div>
      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
        <span className="truncate max-w-[120px]">{s.working_dir.split('\\').pop() || s.working_dir.split('/').pop()}</span>
        <span>{s.elapsed_seconds}s</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sessions page
// ---------------------------------------------------------------------------

export function Sessions() {
  const { sessions, sessionsLoading, fetchSessions, selectedSessionId, setSelectedSessionId } = useStore()

  useEffect(() => { fetchSessions() }, [])

  // If a session is selected, show the split view or full-fat chat
  if (selectedSessionId) {
    return (
      <div className="h-full flex overflow-hidden bg-zinc-950">
        {/* Sidebar Mini-List */}
        <aside className="w-64 border-r border-zinc-900 flex flex-col p-4 gap-4 bg-zinc-900/10">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Active</h3>
            <button 
              onClick={() => setSelectedSessionId(null)}
              title="Create new session"
              className="p-1 px-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] transition-colors"
            >
              NEW
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {sessions.map((s) => (
              <SessionListItem 
                key={s.session_id} 
                s={s} 
                active={s.session_id === selectedSessionId}
                onClick={() => setSelectedSessionId(s.session_id)}
              />
            ))}
          </div>
          <button
            onClick={fetchSessions}
            disabled={sessionsLoading}
            title="Refresh session list"
            className="mt-2 flex items-center justify-center gap-2 py-2 rounded-lg border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-all text-xs"
          >
            <RefreshCw size={12} className={sessionsLoading ? 'animate-spin' : ''} />
            SYNC
          </button>
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 p-6 relative">
          <ChatWindow sessionId={selectedSessionId} />
        </main>
      </div>
    );
  }

  // Default List/Form View
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">Intelligence Sessions</h1>
          <p className="text-zinc-500 mt-1 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
            {sessions.length} active agent instance{sessions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={fetchSessions}
          disabled={sessionsLoading}
          title="Synchronize session data"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800
            text-zinc-400 text-sm hover:border-zinc-600 hover:text-zinc-200 transition-all disabled:opacity-40"
        >
          <RefreshCw size={14} className={sessionsLoading ? 'animate-spin' : ''} />
          Refresh Registry
        </button>
      </div>

      <NewSessionForm />

      <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 px-2">Recent Fleet</h3>
      {sessions.length === 0 ? (
        <div className="text-center py-24 rounded-2xl border-2 border-dashed border-zinc-900 bg-zinc-950 flex flex-col items-center gap-4">
          <Terminal size={40} className="text-zinc-800" />
          <div className="space-y-1">
            <p className="text-zinc-600 text-sm font-medium">No intelligence sessions found.</p>
            <p className="text-zinc-700 text-xs">Provision a new Claude Code environment above to begin.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((s) => (
            <div 
              key={s.session_id} 
              onClick={() => setSelectedSessionId(s.session_id)}
              className="group cursor-pointer rounded-xl border border-zinc-800/40 bg-zinc-900/20 p-5 hover:border-amber-500/30 hover:bg-zinc-900/40 transition-all duration-300 relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    s.status === 'running' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 
                    s.status === 'provisioning' ? 'bg-amber-500 animate-pulse' : 'bg-zinc-600'
                  }`} />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600 group-hover:text-amber-500/60 transition-colors">
                    {s.status}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-700">PID: {s.pid || '---'}</span>
              </div>
              <h4 className="font-mono text-sm text-amber-500 mb-1 group-hover:text-amber-400 transition-colors">{s.session_id}</h4>
              <p className="text-xs text-zinc-400 truncate mb-4">{s.working_dir}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 text-zinc-600">
                    <Cpu size={12} />
                    <span className="text-[10px] font-mono">{s.model}</span>
                  </div>
                  {s.kairos_enabled && (
                    <div className="flex items-center gap-1.5 text-amber-500/60">
                      <Brain size={12} />
                      <span className="text-[10px] font-mono">KAIROS</span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-mono text-zinc-600">{s.elapsed_seconds}s</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
