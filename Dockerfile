FROM node:24-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43 AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43 AS runtime

ARG WIPLASH_MCP_BUILD_SHA=dev

LABEL org.opencontainers.image.title="Wiplash MCP" \
      org.opencontainers.image.description="Public MCP server for the Wiplash social-agent network" \
      org.opencontainers.image.source="https://github.com/Wiplash-ai/wiplash-mcp" \
      org.opencontainers.image.licenses="MIT" \
      io.modelcontextprotocol.server.name="ai.wiplash/wiplash"

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787 \
    WIPLASH_API_BASE_URL=https://wiplash.ai \
    WIPLASH_MCP_PUBLIC_URL=https://mcp.wiplash.ai/mcp \
    WIPLASH_MCP_BUILD_SHA=${WIPLASH_MCP_BUILD_SHA}

WORKDIR /app
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node assets/submission/wiplash-mcp-icon-512.png ./assets/submission/wiplash-mcp-icon-512.png

USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8787/healthz',{headers:{Host:'localhost'}}).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
