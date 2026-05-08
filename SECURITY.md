# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 1.2.x | Yes |
| < 1.2 | No |

## Reporting a vulnerability

Do **not** open a public issue for security vulnerabilities.

Use GitHub's [private security advisory](https://github.com/ChloeVPin/notebloom/security/advisories/new) feature. Include:

- A clear description of the vulnerability
- NoteBloom version affected
- Steps to reproduce
- Potential impact
- A proof-of-concept if available

You can expect a response within 5 business days.

---

## What is in scope

- Path traversal or unsafe file writes via Tauri IPC commands
- Privilege escalation through the Rust backend
- Arbitrary code execution triggered by note content
- Tauri capability over-permission (commands exposed beyond what is needed)

## What is not in scope

- Vulnerabilities in the OS, WebView2, or system WebKit
- Issues that require physical access to the machine
- User-caused data loss (e.g., manually deleting app data)
- Theoretical attacks with no practical path to exploitation

---

## Current design notes

NoteBloom is intentionally local-only:

- No network requests are made at runtime
- No remote fonts, analytics, or telemetry
- No user accounts or credentials
- No external APIs
- CSP is set to `null` — the app does not load external resources, so this is acceptable for a local-only app

The attack surface is limited to the Tauri IPC boundary and local file system operations.

---

## Future changes

If network features are added in a future version, the CSP will be reviewed and tightened before release.
