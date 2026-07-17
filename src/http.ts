import { randomUUID } from 'node:crypto';
import type { Server as NodeServer } from 'node:http';

import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';

import type { AppConfig } from './config.js';
import { buildIdentifier } from './config.js';
import { createWiplashMcpServer } from './server.js';
import { SERVER_NAME, SERVER_TITLE, SERVER_VERSION } from './version.js';
import { WiplashClient } from './wiplash-client.js';

export function createHttpApp(config: AppConfig, client = new WiplashClient(config.apiBaseUrl, fetch, config.requestTimeoutMs)) {
  const app = createMcpExpressApp({
    host: config.host,
    allowedHosts: config.allowedHosts,
  });

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
      source: 'https://github.com/Wiplash-ai/wiplash-mcp',
      documentation: 'https://wiplash.ai/api-docs',
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

  app.post('/mcp', async (req: Request, res: Response) => {
    const server = createWiplashMcpServer(client);
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
