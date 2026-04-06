import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useStore } from '../../store';

interface XTermWindowProps {
  sessionId: string;
}

export const XTermWindow: React.FC<XTermWindowProps> = ({ sessionId }) => {
  const { sessions } = useStore();
  const session = sessions.find(s => s.session_id === sessionId);
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js
    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      theme: {
        background: '#09090b', // zinc-950
        foreground: '#e4e4e7', // zinc-200
        cursor: '#f59e0b',     // amber-500
        selectionBackground: 'rgba(245, 158, 11, 0.3)',
        black: '#18181b',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#8b5cf6',
        cyan: '#06b6d4',
        white: '#fafafa',
      },
      allowProposedApi: true,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Handle window resize
    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
    };
  }, []);

  // Update terminal when output changes
  useEffect(() => {
    if (xtermRef.current && session?.last_output) {
      // Clear and rewrite to avoid duplication if we're just re-rendering
      // Note: In a real "Full Fat" implementation, we'd want a incremental stream
      // but for now we wipe and write the buffer to catch all ANSI codes.
      xtermRef.current.clear();
      xtermRef.current.write(session.last_output);
    }
  }, [session?.last_output]);

  return (
    <div className="flex-1 w-full h-full bg-zinc-950 rounded-lg border border-zinc-900 overflow-hidden relative group">
      <div 
        ref={terminalRef} 
        className="absolute inset-0 p-4"
      />
      <div className="absolute top-2 right-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <span className="text-[10px] font-mono text-zinc-600 bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-800">
          RAW XTERM.JS
        </span>
      </div>
    </div>
  );
};
