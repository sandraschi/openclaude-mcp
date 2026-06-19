# openclaude-mcp (MCPB Bundle)

MCP control plane for OpenClaude — run Claude Code harness against local Ollama models. Zero cloud token cost. KAIROS autoDream. ULTRAPLAN relay.

## Usage

Add to \claude_desktop_config.json\:
\\\json
{
  "mcpServers": {
    "openclaude-mcp": {
      "command": "uv",
      "args": ["run", "--directory", "\D:\Dev\repos", "python", "-m", "openclaude_mcp"],
      "env": { "PYTHONPATH": "\D:\Dev\repos/src" }
    }
  }
}
\\\

## Tools

- **openclaude-mcp**: MCP control plane for OpenClaude — run Claude Code harness against local Ollama models. Zero cloud token cost. KAIROS autoDream. ULTRAPLAN relay.

## Requirements

- Python 3.12+
- uv
