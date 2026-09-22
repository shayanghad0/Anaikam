# Security Policy

## Supported versions

This is a local, single-owner application. Security fixes are applied to the latest code on the default branch only.

| Version | Supported |
|---------|-----------|
| latest (main) | ✅ |
| older copies / forks | ❌ (pull latest changes) |

## Reporting a vulnerability

**Do not open a public GitHub issue for security problems.**

Please report vulnerabilities privately:

- **Preferred:** open a private security advisory / report on the repository’s Security tab (if hosted on GitHub)
- **Or email / contact the maintainer** listed in the repository profile

Include as much of the following as you can:

1. Description of the issue and impact
2. Steps to reproduce (PoC)
3. Affected version / commit
4. Suggested fix (optional)

You should receive an acknowledgment within a few days. Please allow reasonable time for a fix before public disclosure.

## Scope notes

In scope (examples):

- Auth bypass, session fixation/weakness, password change flaws
- Path traversal or arbitrary file read/write under `database/`
- Command injection, SSRF from server-side features (including web search)
- XSS via chat/markdown/attachment rendering that executes in another user’s session (single-owner: primarily self-XSS unless it escalates or leaks keys)
- API key or password leakage (browser, logs, `GET /api/config`, exports)

Out of scope (examples):

- Denial of service against your own machine
- Issues that require already-compromised local filesystem access
- Social engineering of the account owner
- Vulnerabilities in third-party providers (OpenAI, etc.) you configure
- Missing rate limits on localhost-only deployments (unless exposed beyond loopback)

## Deployment hardening

This app is designed for **local / single-user** use:

- Default credentials are `admin` / `admin123` — **change them on first login**
- The API binds to `127.0.0.1` by default — do not expose port 3001 to the public internet without additional reverse-proxy auth, TLS, and network controls
- API keys and the password are stored in `database/config.json` — keep that directory private (filesystem permissions)
- Sessions live in `database/sessions.json` (30-day expiry) — clear sessions if a machine is shared or compromised
- Uploaded attachments are stored under `database/attachments/` — treat as untrusted content
- Prefer HTTPS only if you put the app behind a reverse proxy on a network

## Known design tradeoffs

- Single-owner auth is intentional; there is no multi-user isolation or registration
- AI requests are proxied server-side so keys stay out of the browser; the server still needs outbound network access to your provider and (optionally) DuckDuckGo for web search
- Markdown is rendered with sanitization via the markdown pipeline; if you extend rendering, re-check XSS

## Contact

For private reports, use the repository’s security contact or maintainer channel. Thank you for helping keep Local-ChatBot safe.
