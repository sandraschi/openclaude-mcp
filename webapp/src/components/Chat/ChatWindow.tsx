import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Terminal as TerminalIcon, Loader2, Info, AlertCircle, CheckCircle2, Layout, Square } from 'lucide-react';
import { useStore } from '../../store';
import { XTermWindow } from './XTermWindow';

interface ChatWindowProps {
  sessionId: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ sessionId }) => {
  const { sessions, sendPrompt, sessionStarting } = useStore();
  const session = sessions.find(s => s.session_id === sessionId);
  const [viewMode, setViewMode] = React.useState<'chat' | 'terminal'>('chat');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session?.messages.length]);

  if (!session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
        <TerminalIcon size={48} className="opacity-20" />
        <p>No active session selected</p>
      </div>
    );
  }

  const handleSend = () => {
    if (!inputRef.current || !inputRef.current.value.trim()) return;
    sendPrompt(sessionId, inputRef.current.value);
    inputRef.current.value = '';
  };

  const isProvisioning = session.status === 'provisioning';
  const isRunning = session.status === 'running';

  return (
    <div className="flex-1 flex flex-col bg-zinc-950/50 backdrop-blur-xl border border-zinc-900 overflow-hidden rounded-xl shadow-2xl">
      {/* Header */}
      <header className="px-6 py-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/30">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${
            isRunning ? 'bg-emerald-500 animate-pulse' : 
            isProvisioning ? 'bg-amber-500 animate-pulse' : 'bg-zinc-600'
          }`} />
          <h2 className="font-mono text-sm text-zinc-100">{session.session_id}</h2>
          <span className="text-zinc-600 font-mono text-[10px] uppercase tracking-widest border border-zinc-800 px-2 py-0.5 rounded">
            {session.status}
          </span>
          <div className="flex bg-zinc-950/50 rounded-md p-0.5 border border-zinc-800 ml-4 h-7">
            <button
              onClick={() => setViewMode('chat')}
              className={`px-2 flex items-center gap-1.5 rounded transition-all ${
                viewMode === 'chat' ? 'bg-amber-500/20 text-amber-500 shadow-inner' : 'text-zinc-600 hover:text-zinc-400'
              }`}
              title="Simplified View"
            >
              <Layout size={10} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Console</span>
            </button>
            <button
              onClick={() => setViewMode('terminal')}
              className={`px-2 flex items-center gap-1.5 rounded transition-all ${
                viewMode === 'terminal' ? 'bg-amber-500/20 text-amber-500 shadow-inner' : 'text-zinc-600 hover:text-zinc-400'
              }`}
              title="Raw XTerm.js View"
            >
              <TerminalIcon size={10} />
              <span className="text-[10px] font-bold uppercase tracking-wider">XTerm</span>
            </button>
          </div>
        </div>
        <div className="text-zinc-500 text-xs font-mono">
          {session.working_dir}
        </div>
      </header>

      {/* Output Area */}
      {viewMode === 'terminal' ? (
        <div className="flex-1 overflow-hidden p-6">
          <XTermWindow sessionId={sessionId} />
        </div>
      ) : (
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 font-mono text-sm leading-relaxed space-y-2 selection:bg-amber-500/30"
        >
          <AnimatePresence mode="popLayout">
            {session.messages.map((msg, i) => (
              <motion.div 
                key={`${sessionId}-msg-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'} mb-4`}
              >
                <div className={`text-[10px] uppercase tracking-wider font-bold ${msg.role === 'user' ? 'text-amber-500/50' : 'text-zinc-500'}`}>
                  {msg.role}
                </div>
                <div className={`max-w-[90%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-amber-500/10 border border-amber-500/20 text-amber-100' 
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-300'
                }`}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isProvisioning && (
            <div className="mt-8 p-6 rounded-lg bg-amber-500/5 border border-amber-500/20 flex flex-col items-center text-center gap-4">
              <Loader2 className="text-amber-500 animate-spin" size={32} />
              <div className="space-y-1">
                <h3 className="text-amber-400 font-medium">Provisioning Session...</h3>
                <p className="text-zinc-500 text-xs max-w-xs">
                  Installing dependencies and building OpenClaude. This may take a few minutes. 
                  <span className="block mt-1 italic italic text-amber-500/60 text-[10px]">"Go for a walk, I'll be here when you get back."</span>
                </p>
              </div>
            </div>
          )}

          {isRunning && session.messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-600 gap-4">
              <TerminalIcon size={32} className="opacity-20" />
              <p className="text-sm">Session ready. Type your first prompt below.</p>
            </div>
          )}
        </div>
      )}

      {/* Input Tray */}
      <footer className="p-4 bg-zinc-900/50 border-t border-zinc-900 group">
        <div className={`relative flex items-center transition-all duration-300 ${
          isProvisioning ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'
        }`}>
          <div className="absolute left-4 text-amber-500/50 group-focus-within:text-amber-400 transition-colors">
            <span className="font-mono text-xs font-bold mr-2">&gt;</span>
          </div>
          <input
            ref={inputRef}
            type="text"
            disabled={isProvisioning || sessionStarting}
            placeholder={isProvisioning ? "Waiting for provisioning..." : "Message Claude Code..."}
            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg py-3 pl-10 pr-12 text-sm font-mono focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all placeholder:text-zinc-700"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
          />
          <button
            onClick={handleSend}
            disabled={isProvisioning || sessionStarting}
            className="absolute right-2 p-2 text-zinc-500 hover:text-amber-400 transition-colors disabled:opacity-0"
            title="Send (Enter)"
          >
            <Send size={18} />
          </button>
        </div>
        <div className="mt-2 flex justify-between items-center px-1">
          <div className="flex gap-4">
            <span className="text-[10px] text-zinc-600 font-mono">ID: {sessionId.slice(0, 8)}...</span>
            <span className="text-[10px] text-zinc-600 font-mono">DIR: {session.working_dir || 'Default'}</span>
          </div>
          <div className="text-[10px] text-zinc-600 font-mono flex items-center gap-1">
            <Info size={10} /> Press Enter to execute
          </div>
        </div>
      </footer>
    </div>
  );
};
