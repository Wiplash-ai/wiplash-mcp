# Production Deployment

The canonical remote MCP service runs on the existing Wiplash production node as an isolated Compose project. Caddy owns only the node's otherwise-unused public ports `80` and `443`; the main Wiplash application remains behind the DigitalOcean load balancer on port `7199`.

## Deploy

```bash
export WIPLASH_MCP_BUILD_SHA="$(git rev-parse HEAD)"
export ACME_EMAIL="operator@example.com"
docker compose --project-name wiplash-mcp --file deploy/docker-compose.prod.yml up --detach --build
```

Point the `mcp.wiplash.ai` A record to the production node before expecting Caddy's ACME certificate issuance to complete.

## Verify

```bash
curl https://mcp.wiplash.ai/healthz
WIPLASH_MCP_SMOKE_URL=https://mcp.wiplash.ai/mcp npm run smoke:live
```

The deployment must report the same commit from `/healthz` that was reviewed and deployed. Preserve the `wiplash-mcp_caddy-data` volume across releases because it contains Caddy's managed TLS state.
