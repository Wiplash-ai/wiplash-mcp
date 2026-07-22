import { randomUUID } from 'node:crypto';
import type { Server as NodeServer } from 'node:http';
import { fileURLToPath } from 'node:url';

import type { OAuthTokenVerifier } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { NextFunction, Request, Response } from 'express';

import type { AppConfig } from './config.js';
import { buildIdentifier } from './config.js';
import {
  authorizationServerMetadata,
  bearerChallenge,
  KeycloakAccessTokenVerifier,
  protectedResourceMetadataUrl,
} from './oauth.js';
import { createWiplashMcpServer } from './server.js';
import { SERVER_ICON_PATH, SERVER_NAME, SERVER_TITLE, SERVER_VERSION } from './version.js';
import { WiplashClient } from './wiplash-client.js';

type AuthenticatedRequest = Request & { auth?: AuthInfo };
const SERVER_ICON_FILE = fileURLToPath(
  new URL('../assets/submission/wiplash-mcp-icon-512.png', import.meta.url),
);

export function createHttpApp(
  config: AppConfig,
  client = new WiplashClient(config.apiBaseUrl, fetch, config.requestTimeoutMs),
  tokenVerifier: OAuthTokenVerifier = new KeycloakAccessTokenVerifier(config),
) {
  const app = createMcpExpressApp({
    host: config.host,
    allowedHosts: config.allowedHosts,
  });
  const resourceMetadataUrl = protectedResourceMetadataUrl(config.publicMcpUrl);

  app.disable('x-powered-by');
  app.use((req, res, next) => {
    const requestId = req.header('x-request-id')?.slice(0, 100) || randomUUID();
    res.setHeader('X-Request-ID', requestId);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.get('/', (_req, res) => {
    res.json({
      name: SERVER_NAME,
      title: SERVER_TITLE,
      version: SERVER_VERSION,
      build: buildIdentifier(config),
      protocol: 'Model Context Protocol',
      transport: 'streamable-http',
      endpoint: config.publicMcpUrl.toString(),
      icon: new URL(SERVER_ICON_PATH, config.publicMcpUrl).toString(),
      source: 'https://github.com/Wiplash-ai/wiplash-mcp',
      documentation: 'https://wiplash.ai/api-docs',
      support: 'https://github.com/Wiplash-ai/wiplash-mcp/issues',
      privacy: 'https://wiplash.ai/legal/privacy',
      terms: 'https://wiplash.ai/legal/terms',
    });
  });

  app.get('/healthz', (_req, res) => {
    res.json({
      status: 'ok',
      name: SERVER_NAME,
      version: SERVER_VERSION,
      build_sha: config.buildSha,
    });
  });

  app.get(SERVER_ICON_PATH, (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.type('png').sendFile(SERVER_ICON_FILE);
  });

  const protectedResourceMetadata = (_req: Request, res: Response) => {
    res.json({
      resource: config.publicMcpUrl.toString(),
      resource_name: SERVER_TITLE,
      authorization_servers: [config.oauthIssuer.toString()],
      scopes_supported: config.oauthScopes,
      bearer_methods_supported: ['header'],
      resource_documentation: 'https://wiplash.ai/api-docs',
    });
  };
  app.get(resourceMetadataUrl.pathname, protectedResourceMetadata);
  app.get('/.well-known/oauth-protected-resource', protectedResourceMetadata);

  const oauthMetadata = (_req: Request, res: Response) => {
    res.json(authorizationServerMetadata(config));
  };
  const oauthMetadataAliases = [
    '/.well-known/oauth-authorization-server/mcp',
    '/mcp/.well-known/oauth-authorization-server',
    '/.well-known/oauth-authorization-server',
    '/mcp/.well-known/openid-configuration',
    '/.well-known/openid-configuration/mcp',
    '/.well-known/openid-configuration',
  ];
  for (const pathname of oauthMetadataAliases) {
    app.get(pathname, oauthMetadata);
  }

  const optionalBearerAuth = async (req: Request, res: Response, next: NextFunction) => {
    const authorization = req.header('authorization');
    if (!authorization) {
      next();
      return;
    }
    const match = authorization.match(/^Bearer ([^\s]+)$/i);
    const token = match?.[1];
    if (!token) {
      res.setHeader(
        'WWW-Authenticate',
        bearerChallenge(resourceMetadataUrl, {
          error: 'invalid_token',
          description: 'Use an Authorization header in the form Bearer TOKEN.',
        }),
      );
      res.status(401).json({ error: 'invalid_token', error_description: 'The bearer token format is invalid.' });
      return;
    }
    try {
      (req as AuthenticatedRequest).auth = await tokenVerifier.verifyAccessToken(token);
      next();
    } catch {
      res.setHeader(
        'WWW-Authenticate',
        bearerChallenge(resourceMetadataUrl, {
          error: 'invalid_token',
          description: 'The bearer token is invalid, expired, or intended for another resource.',
        }),
      );
      res.status(401).json({ error: 'invalid_token', error_description: 'Sign in to Wiplash again.' });
    }
  };

  app.post('/mcp', optionalBearerAuth, async (req: Request, res: Response) => {
    const server = createWiplashMcpServer(client, {
      resourceMetadataUrl,
      scopes: config.oauthScopes,
    });
    const transport = new StreamableHTTPServerTransport();

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('MCP request failed', {
        request_id: res.getHeader('X-Request-ID'),
        error: error instanceof Error ? error.name : 'UnknownError',
      });
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    } finally {
      await transport.close().catch(() => undefined);
      await server.close().catch(() => undefined);
    }
  });

  const methodNotAllowed = (_req: Request, res: Response) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed.' },
      id: null,
    });
  };
  app.get('/mcp', methodNotAllowed);
  app.delete('/mcp', methodNotAllowed);

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'not_found', message: 'Route not found.' } });
  });

  return app;
}

export function startHttpServer(config: AppConfig): NodeServer {
  const app = createHttpApp(config);
  return app.listen(config.port, config.host, () => {
    console.log(`Wiplash MCP ${buildIdentifier(config)} listening on http://${config.host}:${config.port}`);
  });
}
