FROM node:26-alpine@sha256:e88a35be04478413b7c71c455cd9865de9b9360e1f43456be5951032d7ac1a66 AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:26-alpine@sha256:e88a35be04478413b7c71c455cd9865de9b9360e1f43456be5951032d7ac1a66 AS runtime

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

USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8787/healthz',{headers:{Host:'localhost'}}).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
