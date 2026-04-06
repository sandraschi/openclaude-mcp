# Hardening & Security Audit: OpenClaude MCP

This document outlines the security measures and auditing procedures for the `openclaude-mcp` project. Given the proliferation of "poisoned" Claude Code forks and potential supply chain attacks, we implement strict hardening on the host-to-subprocess bridge.

## 1. Subprocess Isolation & Sanitization

The `OpenClaudeSession` launches the `openclaude` Node.js harness as a child process. To minimize risk:

- **Environment Sanitization**: We do NOT pass the full host environment to the child process. We whitelist only essential variables:
    - `PATH`: Required to find `node` and `npm`.
    - `HOME` / `USERPROFILE`: Required by Node.js and some CLI tools for config storage.
    - `LANG` / `LC_ALL`: For character encoding.
    - `TERM`: For interactive terminal support.
    - `OPENCLAUDE_*`: Any specific configuration variables.
- **Strict Working Directory**: The subprocess is restricted to its designated `working_dir`.
- **No Shell Execution**: We use `asyncio.create_subprocess_exec` (spawn) instead of `shell=True` to prevent shell injection.

## 2. Automated Dependency Auditing

We use a multi-layered auditing stack:

- **Bandit**: Scans Python source code for common security issues (e.g., insecure subprocess usage, temp file creation).
- **Semgrep**: Uses `p/security-audit` rulesets to find higher-level vulnerabilities.
- **Safety**: Checks Python dependencies against a database of known CVEs.
- **npm audit**: Checks the frontend and any local Node.js dependencies.

Run these audits via:
```bash
just audit-deps
just check-sec
```

## 3. Auditing the Node.js Harness (OpenClaude)

If you are using a community fork of OpenClaude (e.g., in `external/openclaude`), you MUST perform a manual or automated scan for RAT (Remote Access Trojan) indicators.

### Red Flags to Search For:
- **Obfuscated Code**: `eval(atob(...))` or large base64 strings being decoded and executed.
- **Hidden Network Requests**: `fetch`, `axios`, or `http` requests to unknown domains or IPs.
- **Credential Exfiltration**: Access to `~/.ssh`, `~/.aws`, or env vars like `STRIPE_KEY`, `AWS_SECRET`.
- **Remote Shells**: Spawning `sh`, `bash`, `cmd.exe`, or `powershell.exe` without a clear local purpose.

### Scan Commands:
```powershell
# Search for suspicious network patterns
Get-ChildItem -Path D:\Dev\repos\external\openclaude -Recurse | Select-String -Pattern "fetch|http|axios"

# Search for obfuscation tricks
Get-ChildItem -Path D:\Dev\repos\external\openclaude -Recurse | Select-String -Pattern "eval\(|atob\(|fromCharArray"
```

## 4. GitHub Branch Safety & Force-Push Prevention

As part of the project's **Safety Protocol**, forced pushes are prohibited to prevent history rewriting and data loss.

- **Branch Protection**: You MUST enable branch protection on your GitHub repository (Settings > Branches > Branch Protection Rules):
    - `Require a pull request before merging`
    - `Lock branch` (Restrict force pushes) - **MANDATORY**
    - `Require status checks to pass before merging`
- **Pre-Push Hook**: Local enforcement via a git hook. To install:
    ```powershell
    Copy-Item -Path scripts/pre-push -Destination .git/hooks/pre-push -Force
    ```
    This script verifies that no force pushing (`+` ref) occurs during the push operation.
- **Continuous Security (CI)**: Our `.github/workflows/security.yml` runs `semgrep` and `bandit` on every push to the main branch. Any detected security issue will block the merge if combined with branch protection status checks.

## 5. Supply Chain Safety & Dependency Auditing

Recent compromises in the `axios` ecosystem (March 2026) highlight the risks of supply chain attacks.

- **Security Advisory**: See [06_SECURITY_ADVISORY_AXIOS.md](file:///D:/Dev/repos/openclaude-mcp/docs/06_SECURITY_ADVISORY_AXIOS.md) for details on the `axios@1.14.1` breach.
- **Pinning Versions**: We recommend using exact version numbers in `package.json` for all dependencies in the `external/` folder.
- **Lockfile Enforcement**: Never install dependencies without a verified `package-lock.json` or `yarn.lock`.
- **Scheduled Audits**: Run `just audit-deps` regularly (which executes `npm audit` and `safety check`) to catch vulnerabilities before they are exploited.

## 6. Runtime & Startup Hardening (v2)

To move from "functional prototype" to "industrial control plane," we implemented the v2 Hardening suite on 2026-04-06.

### A. Self-Healing Startup (`start.ps1`)
The startup orchestration now performs a pre-flight audit of all dependencies:
- **Python Check**: Runs `uv sync --check`. If it fails, it attempts a full `uv sync`.
- **Lockfile Recovery**: Detects and clears `.venv` folder locks (often caused by orphaned `uv` processes from previous crashes).
- **Node.js Audit**: Verifies `node_modules` existence and runs `npm install` automatically if missing.

### B. Stable Process Invocation & Dashboards
Directly invoking `npm` or `node` within a PowerShell `Start-Process` block can result in silent failures on Windows due to shell-wrapping issues.
- **Node Fix**: We now use `Start-Process "cmd.exe" -ArgumentList "/c npm run dev"` to ensure a stable shell context.
- **Justfile Fix**: The `default` (help) recipe was updated with escaped dollar signs (`$$`) to prevent PowerShell from prematurely expanding variables during `just` execution, ensuring the dashboard renders correctly on Windows.

### C. Network Interface Binding
Vite's default behavior can sometimes results in "Localhost" resolution hangs on Windows systems with complex IPv6/VPN configurations.
- **Fix**: Configured `webapp/vite.config.ts` with `server: { host: true }`.
- **Result**: Forces binding to `0.0.0.0`, ensuring the webapp is immediately reachable on all local interfaces as soon as the dev server is ready.

---
*Last Updated: 2026-04-06*
*Status: HARDENED + SELF-HEALING (v2)*
