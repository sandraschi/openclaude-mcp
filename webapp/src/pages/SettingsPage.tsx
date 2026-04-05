import { Settings } from 'lucide-react'

export function SettingsPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <Settings size={18} className="text-zinc-400" />
          Settings
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">MCP backend and inference configuration</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Backend */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-sm font-medium text-zinc-200 mb-3">Launch</div>
          <div className="flex flex-col gap-2 text-xs">
            <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800">
              <div className="text-zinc-500 mb-1">From repo (recommended)</div>
              <code className="text-amber-300 font-mono">D:\Dev\repos\openclaude-mcp\start.bat</code>
            </div>
            <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800">
              <div className="text-zinc-500 mb-1">From fleet starts/ folder</div>
              <code className="text-amber-300 font-mono">D:\Dev\repos\mcp-central-docs\starts\openclaude-mcp-start.bat</code>
            </div>
          </div>

          <div className="text-sm font-medium text-zinc-200 mt-4 mb-3">Backend endpoints</div>
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            {[
              { label: 'MCP SSE', value: 'http://localhost:10932/sse' },
              { label: 'Webapp', value: 'http://localhost:10933' },
              { label: 'Ollama', value: 'http://localhost:11434' },
              { label: 'LM Studio', value: 'http://localhost:1234/v1' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-zinc-950 rounded-lg p-2.5">
                <div className="text-zinc-600 mb-0.5">{label}</div>
                <div className="text-zinc-400">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Claude Desktop config snippet */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-sm font-medium text-zinc-200 mb-2">Claude Desktop config</div>
          <div className="text-xs text-zinc-500 mb-3">
            Add to <code className="text-zinc-400">claude_desktop_config.json</code> to use
            this MCP server from Claude Desktop:
          </div>
          <pre className="text-xs font-mono text-zinc-300 bg-zinc-950 rounded-lg p-3 overflow-auto">{`{
  "mcpServers": {
    "openclaude-mcp": {
      "command": "C:\\\\Users\\\\sandr\\\\.local\\\\bin\\\\uv.exe",
      "args": [
        "--directory",
        "D:\\\\Dev\\\\repos\\\\openclaude-mcp",
        "run",
        "python",
        "server.py"
      ],
      "env": {
        "OPENCLAUDE_MCP_PORT": "10932"
      }
    }
  }
}`}</pre>
        </div>

        {/* ULTRAPLAN */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-sm font-medium text-zinc-200 mb-2">ULTRAPLAN (optional)</div>
          <div className="text-xs text-zinc-500 mb-3">
            Offloads complex planning to cloud Opus. Set{' '}
            <code className="text-zinc-400">ANTHROPIC_API_KEY</code> in your environment
            to enable. Planning runs remotely; execution stays local.
          </div>
          <div className="text-xs text-amber-500/80 border border-amber-500/20 bg-amber-500/5
            rounded-lg px-3 py-2">
            not_implemented — Anthropic API call scaffolded, wiring pending.
          </div>
        </div>

        {/* Legal */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/20 p-4">
          <div className="text-sm font-medium text-zinc-400 mb-2">Legal</div>
          <div className="text-xs text-zinc-600 space-y-1">
            <div>OpenClaude is derived from the Anthropic Claude Code source (March 31 2026 npm leak).</div>
            <div>Anthropic has issued DMCA notices against direct mirrors. Clean-room forks not targeted as of April 2026.</div>
            <div>This MCP server (openclaude-mcp) is original code — MIT license.</div>
            <div>Personal/research use is low-risk. Corporate deployment warrants legal review.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
