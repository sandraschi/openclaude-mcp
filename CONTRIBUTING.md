# Contributing to OpenClaude MCP

Thank you for your interest in contributing to OpenClaude MCP! We welcome contributions that help harden the local LLM agent harness.

## Development Setup

### Prerequisites
- Python 3.13+ and [uv](https://docs.astral.sh/uv/)
- Node.js (for the React webapp and OpenClaude subprocess)
- [Ollama](https://ollama.ai) installed locally

### Installation
```powershell
# Clone the repository
git clone https://github.com/sandraschi/openclaude-mcp.git
cd openclaude-mcp

# First-time setup (syncs uv and npm deps)
.\setup.ps1
```

## Development Workflow

### 1. Launch Control Plane
Use the provided `just` dashboard to manage the environment:
```powershell
just start      # Launches server + webapp
just stop       # Force-kills the control plane processes
```

### 2. Testing
Ensure you have a local Ollama model (e.g. `gemma4:26b`) before running integration tests:
```powershell
just test-unit         # Fast execution
just test-integration  # Requires local model
```

### 3. Code Quality (SOTA v13.1)
All code must pass Ruff linting and formatting before submission:
```powershell
just fix    # Automated ruff fix and format
just check  # Full quality verification (lint + typecheck + test)
```

## Pull Request Process

1. Fork the repository and create your feature branch.
2. Ensure your changes follow the existing FastMCP 3.2+ patterns.
3. Update `CHANGELOG.md` with your contributions.
4. Verify all tests pass using `just check`.
5. Submit your Pull Request for review.

## License

By contributing to OpenClaude MCP, you agree that your contributions will be licensed under the same MIT License that covers the project.

Thank you for contributing! 🚀
