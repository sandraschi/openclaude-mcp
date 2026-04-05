# Security Advisory: Axios Supply Chain Attack (March 2026)

## Overview

On **March 31, 2026**, a significant supply chain attack targeted the `axios` npm package. Malicious actors hijacked a maintainer's account and published poisoned versions containing a Remote Access Trojan (RAT).

> [!IMPORTANT]
> **Affected Versions**: `axios@1.14.1` and `axios@0.30.4`.
> **Safe Versions**: `axios@1.14.0` (current branch) and `axios@0.30.3`.

## Detailed Findings

- **Malicious Payload**: The compromised versions included a malicious dependency `plain-crypto-js@4.2.1`.
- **Behavior**: Upon installation (`npm install`), the package executed a post-install script that deployed a cross-platform RAT, allowing remote command execution and credential exfiltration.
- **Window of Exposure**: Approximately **00:21 to 03:25 UTC on March 31, 2026**.

## Project Impact & Verification

### Status: SAFE
The `external/openclaude` harness in this repository uses **`axios@1.14.0`**, which is the last known legitimate version before the attack. Our automated scans and manual audits have confirmed that no malicious files or post-install hooks from the 1.14.1 breach are present in the local codebase.

## Mitigation & Hardening Steps

1. **Version Pinning**: 
   Ensure `package.json` uses exact versions rather than ranges (e.g., `"axios": "1.14.0"` instead of `"^1.14.0"`).
   
2. **Lockfile Integrity**:
   Always commit `package-lock.json` or `yarn.lock`. Before installation, verify the integrity of the lockfile.
   
3. **Audit Cleanup**:
   Run `npm audit` frequently. If you accidentally upgraded to 1.14.1 during the exposure window:
   - **Isolate the machine immediately.**
   - Treat all environment variables and tokens on that machine as compromised.
   - Re-image the system and rotate all keys (GitHub, AWS, Anthropic, etc.).

4. **Network Isolation**:
   As outlined in [05_HARDENING.md](file:///D:/Dev/repos/openclaude-mcp/docs/05_HARDENING.md), we recommend blocking outbound internet access for `node.exe` via Windows Firewall to prevent any potential RAT from calling home, even if a dependency is compromised.

---
*Reference: [SOCRadar Security Advisory March 2026]*
*Status: VERIFIED SAFE*
