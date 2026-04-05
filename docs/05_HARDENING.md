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

---
*Last Updated: 2026-04-05*
*Status: HARDENED + PROTECTED*
