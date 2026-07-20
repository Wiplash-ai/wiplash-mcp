# Publishing

## Why the Namespace Is `ai.wiplash`

The official MCP Registry uses reverse-DNS names for domain-authenticated publishers. Reversing `wiplash.ai` produces `ai.wiplash`, so this server is published as `ai.wiplash/wiplash`.

## DNS Ownership Verification

Generate a dedicated Ed25519 registry signing key outside the repository:

```bash
umask 077
openssl genpkey -algorithm Ed25519 -out ~/.config/wiplash/mcp-registry-key.pem
PUBLIC_KEY="$(openssl pkey -in ~/.config/wiplash/mcp-registry-key.pem -pubout -outform DER | tail -c 32 | base64 -w0)"
printf 'wiplash.ai. IN TXT "v=MCPv1; k=ed25519; p=%s"\n' "$PUBLIC_KEY"
```

Add the resulting TXT record to the `wiplash.ai` DNS zone. Never commit the private key or place it on the application server.

After DNS propagation:

```bash
PRIVATE_KEY="$(openssl pkey -in ~/.config/wiplash/mcp-registry-key.pem -noout -text | grep -A3 'priv:' | tail -n +2 | tr -d ' :\n')"
mcp-publisher login dns --domain wiplash.ai --private-key "$PRIVATE_KEY"
```

## Release Checklist

1. Choose the next immutable semantic version. Never move or republish an existing tag or registry version.
2. Update `package.json`, `package-lock.json`, `src/version.ts`, `server.json`, `gemini-extension.json`, `README.md`, and `CHANGELOG.md` together.
3. Run `npm ci`, `npm run check`, and `mcp-publisher validate server.json`.
4. Build and scan one container image labeled with the release commit SHA.
5. Deploy that image to stage and verify `/`, `/healthz`, OAuth metadata, MCP initialization, tool listing, every read tool, and representative confirmed writes.
6. Confirm the stage build SHA and version match the release commit, then deploy the same image digest to production.
7. Verify production with MCP Inspector and `WIPLASH_MCP_SMOKE_URL=https://mcp.wiplash.ai/mcp npm run smoke:live`.
8. Create an annotated or cryptographically signed Git tag, push it, and publish a GitHub release with the matching changelog section.
9. Authenticate with the DNS-owned namespace and run `mcp-publisher publish server.json` from the tagged source tree.
10. Query the registry API and confirm the returned version, repository, icon, and remote endpoint.

`npm run check:release` is intentionally part of the normal CI check. It fails when any checked-in release manifest drifts from `package.json`.

## Client Directory Releases

The open MCP Registry and product-specific directories are independent. Registry publication does not automatically publish Wiplash in ChatGPT or Claude.

Before any directory submission:

1. Complete the canonical listing data and reviewer cases in [DIRECTORY_SUBMISSIONS.md](DIRECTORY_SUBMISSIONS.md).
2. Exercise every tool through MCP Inspector and the target client.
3. Provision a dedicated OAuth client with only the target's documented redirect URIs.
4. Add that client ID to both the MCP verifier and Wiplash API allowlists.
5. Confirm anonymous reads, sign-in, refresh, logout, confirmation, ownership rejection, and reconnect behavior.
6. Provide a dedicated populated reviewer account through the private submission form; never commit credentials.
7. Capture current MCP App screenshots from the production build and submit exact privacy, terms, support, and allowed-link origins.

ChatGPT's existing `wiplash-chatgpt` client does not make other hosts authorized automatically. Claude and CLI/editor clients require their own reviewed OAuth registration before protected tools can be advertised as supported.

The MCP Registry is currently in preview. Treat registry publication as metadata distribution, not as a substitute for Wiplash deployment monitoring or security review.
