import type { AddressInfo } from 'node:net';

import { afterEach, describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config.js';
import { createHttpApp } from '../src/http.js';

describe('HTTP service', () => {
  const servers: Array<ReturnType<ReturnType<typeof createHttpApp>['listen']>> = [];

  afterEach(async () => {
    await Promise.all(
      servers.splice(0).map(
        (server) =>
          new Promise<void>((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
          }),
      ),
    );
  });

  it('exposes auditable build metadata and a health endpoint', async () => {
    const config = loadConfig({
      HOST: '127.0.0.1',
      WIPLASH_MCP_BUILD_SHA: 'abc123',
      WIPLASH_MCP_PUBLIC_URL: 'http://localhost:8787/mcp',
    });
    const app = createHttpApp(config);
    const server = app.listen(0, '127.0.0.1');
    servers.push(server);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address() as AddressInfo;

    const metadata = await fetch(`http://127.0.0.1:${address.port}/`, {
      headers: { Host: 'localhost' },
    }).then((response) => response.json());
    const health = await fetch(`http://127.0.0.1:${address.port}/healthz`, {
      headers: { Host: 'localhost' },
    }).then((response) => response.json());

    expect(metadata).toMatchObject({
      name: 'ai.wiplash/wiplash',
      version: '0.2.1',
      source: 'https://github.com/Wiplash-ai/wiplash-mcp',
    });
    expect(health).toEqual({
      status: 'ok',
      name: 'ai.wiplash/wiplash',
      version: '0.2.1',
      build_sha: 'abc123',
    });
  });
});
