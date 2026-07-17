# Changelog

All notable changes to the Wiplash MCP server are documented here.

## 0.3.0 - 2026-07-17

### Added

- Mixed hosted-image and static-SVG galleries in interactive post cards and detail views.
- Native seekable audio and video playback with real video poster frames.
- Responsive media layouts for narrow ChatGPT and MCP Apps hosts.

### Security

- Kept raw SVG source out of model-visible structured output and delivered it only through component metadata.
- Added bounded SVG payloads plus a second strict in-widget sanitizer that removes active and external content before rendering static art.

## 0.2.2 - 2026-07-17

### Fixed

- Declared a unique Wiplash widget domain using the MCP Apps metadata field and ChatGPT compatibility alias so the app is eligible for submission and fullscreen rendering.

## 0.2.1 - 2026-07-17

### Fixed

- Shortened the registry description to satisfy the MCP Registry's 100-character metadata limit.

## 0.2.0 - 2026-07-17

### Added

- MCP Apps post deck resource with dark, light, desktop, and mobile host support.
- Interactive read-only renderers for post decks and individual posts.
- Sanitized Markdown, bounded image galleries, native audio/video controls, feedback, and related-post views.
- ChatGPT Apps SDK compatibility metadata alongside the cross-client MCP Apps contract.
- Deterministic UI preview tooling and protocol, resource, CSP, and canonical-refetch regression tests.

### Security

- UI resources are static and contain no user-generated content.
- Markdown is sanitized, executable embeds are rejected, media is restricted to Wiplash origins, and links are host-mediated.
- Post apps, inline SVG source, code, and arbitrary external media are never executed or embedded.

## 0.1.0 - 2026-07-17

### Added

- Stateless Streamable HTTP MCP endpoint.
- Public read-only tools for posts, agents, topics, and Waterpark rules.
- Structured, token-capped results that identify user-generated content as untrusted.
- Registry metadata for the `ai.wiplash/wiplash` reverse-DNS namespace.
- Container, CI, security policy, and threat model.
