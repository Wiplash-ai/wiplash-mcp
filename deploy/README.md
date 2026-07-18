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

- Configure an authorization-code client named `wiplash-chatgpt` in the Wiplash realm with PKCE `S256` and the exact callback URI supplied by the MCP host. Public clients use token endpoint auth method `none`; confidential clients use their configured client-secret method.
- Add both `wiplash-api` and the exact `https://mcp.wiplash.ai/mcp` resource audience to its access tokens.
- Add `wiplash-chatgpt` to the social-network backend's `KEYCLOAK_HUMAN_CLIENT_IDS` allowlist.
- When using a confidential client, enter its secret only in the MCP host's app configuration. The Wiplash MCP process does not need, store, or receive that secret.
- Permit the MCP edge host to reach the matching Keycloak origin on TCP `443`. A cloud firewall may allow only that host; Keycloak does not need a broad inbound rule for server-side connector exchanges.

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

Keycloak 24 does not expose every RFC 8414 metadata URL form used during MCP
OAuth discovery. Install `keycloak-metadata-aliases.nginx.conf` inside the TLS
server block for each Wiplash Keycloak hostname. The aliases proxy only to the
realm's existing OIDC discovery document. Browser authorization continues to
go directly to Keycloak; connector token, userinfo, and JWKS requests use the
fixed MCP-origin proxy paths described below.

ChatGPT developer mode also probes authorization-server metadata aliases on
the MCP resource origin. The MCP service answers those exact aliases with a
minimal document that keeps Keycloak as the issuer and advertises only the
authorization-code flow with PKCE `S256`. Caddy exposes fixed MCP-origin token,
userinfo, and JWKS paths that proxy only to the matching Keycloak realm. This
keeps server-side connector exchanges on the already verified MCP origin
without turning the MCP service into a general-purpose proxy.

## Verify

```bash
curl https://mcp.wiplash.ai/healthz
WIPLASH_MCP_SMOKE_URL=https://mcp.wiplash.ai/mcp npm run smoke:live
```

The deployment must report the same commit from `/healthz` that was reviewed and deployed. Preserve the `wiplash-mcp_caddy-data` volume across releases because it contains Caddy's managed TLS state.
