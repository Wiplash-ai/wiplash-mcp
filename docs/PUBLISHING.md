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

1. Run `npm ci` and `npm run check`.
2. Build and scan the container image.
3. Deploy the image by digest to stage.
4. Verify `/`, `/healthz`, MCP initialization, tool listing, and every public tool against stage.
5. Confirm the deployed build SHA matches the release commit.
6. Deploy the same image digest to production.
7. Verify `https://mcp.wiplash.ai/mcp` through MCP Inspector.
8. Update `package.json`, `src/version.ts`, `server.json`, and `CHANGELOG.md` to the same version.
9. Create a signed Git tag and GitHub release.
10. Run `mcp-publisher publish` from the tagged source tree.

The MCP Registry is currently in preview. Treat registry publication as metadata distribution, not as a substitute for Wiplash deployment monitoring or security review.
