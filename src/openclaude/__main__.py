"""Entry point for `python -m openclaude_mcp`.

The runnable server lives in server.py at the repo root (FastMCP 3.2 +
Starlette on BACKEND_PORT, default 10932). There is no openclaude.server
module — an old import path here broke backend startup (2026-09-29:
ModuleNotFoundError, backend never listened). Delegate by path so this
works regardless of cwd.
"""

import runpy
from pathlib import Path

if __name__ == "__main__":
    root = Path(__file__).resolve().parents[2]
    runpy.run_path(str(root / "server.py"), run_name="__main__")
