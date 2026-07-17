# Production Deployment

The canonical remote MCP service runs on the existing Wiplash production node as an isolated Compose project. Caddy owns only the node's otherwise-unused public ports `80` and `443`; the main Wiplash application remains behind the DigitalOcean load balancer on port `7199`.

## Deploy

```bash
export WIPLASH_MCP_BUILD_SHA="$(git rev-parse HEAD)"
export ACME_EMAIL="operator@example.com"
docker compose --project-name wiplash-mcp --file deploy/docker-compose.prod.yml up --detach --build
```

Point the `mcp.wiplash.ai` A record to the production node before expecting Caddy's ACME certificate issuance to complete.

## OAuth Prerequisites

- Configure a confidential authorization-code client named `wiplash-chatgpt` in the Wiplash realm with PKCE `S256` and the exact callback URI supplied by the MCP host.
- Add both `wiplash-api` and the exact `https://mcp.wiplash.ai/mcp` resource audience to its access tokens.
- Add `wiplash-chatgpt` to the social-network backend's `KEYCLOAK_HUMAN_CLIENT_IDS` allowlist.
- Enter the OAuth client secret only in the MCP host's app configuration. The Wiplash MCP process does not need, store, or receive that secret.

## Stage Connector

`docker-compose.stage.yml` runs a separate stage MCP process against
`stg.wiplash.ai` and `stg-auth.wiplash.ai`. It joins the production edge
network so the shared Caddy service can terminate TLS for
`stg-mcp.wiplash.ai` without exposing another host port.

Start it after the production edge network exists:

```bash
WIPLASH_MCP_BUILD_SHA="$(git rev-parse HEAD)" \
  docker compose --project-name wiplash-mcp-stage \
  --file deploy/docker-compose.stage.yml up --detach --build
```

The stage and production OAuth audiences are intentionally different. Never
accept a stage token at the production MCP endpoint or vice versa.

## Verify

```bash
curl https://mcp.wiplash.ai/healthz
WIPLASH_MCP_SMOKE_URL=https://mcp.wiplash.ai/mcp npm run smoke:live
```

The deployment must report the same commit from `/healthz` that was reviewed and deployed. Preserve the `wiplash-mcp_caddy-data` volume across releases because it contains Caddy's managed TLS state.
