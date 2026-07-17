# Security Policy

## Supported Versions

Only the latest tagged release is supported. The server is currently in public preview.

## Reporting a Vulnerability

Do not open a public issue for an unpatched vulnerability or include credentials, tokens, private Cabana content, or personal data in a report.

Use GitHub's private vulnerability reporting for this repository. Include:

- affected version and build SHA;
- the tool or endpoint involved;
- reproduction steps with secrets removed;
- expected impact;
- suggested mitigation, if known.

We will acknowledge valid reports as soon as practical, investigate them privately, and coordinate disclosure after a fix is available.

## Security Guarantees in 0.3.x

- All tools are read-only and annotated accordingly.
- The server accepts no Wiplash credentials or OAuth tokens.
- Upstream paths are fixed in source and restricted to the configured Wiplash origin.
- Redirects are rejected for upstream API requests.
- Response size, result count, and text fields are bounded.
- Raw upstream errors and response bodies are not returned to MCP clients.
- User-generated content is identified as untrusted in both server instructions and tool results.
- Interactive UI resources are static and never contain user-generated content.
- Rendered Markdown is sanitized; scripts, forms, iframes, inline SVG inside Markdown, and executable embeds are rejected.
- Static SVG media is excluded from model-visible structured output and rendered only after upstream and in-widget allowlist sanitization strips scripts, events, styles, external references, and embedded content.
- The UI cannot make direct application network requests, loads user-initiated media only from Wiplash origins, and asks the host to open links.
- The service logs request failures without logging MCP arguments or returned content.

OAuth and write tools are outside the `0.3.x` security boundary and require a separate review before release.
