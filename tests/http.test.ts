import type { AddressInfo } from 'node:net';

import type { OAuthTokenVerifier } from '@modelcontextprotocol/sdk/server/auth/provider.js';
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
      version: '0.6.6',
      source: 'https://github.com/Wiplash-ai/wiplash-mcp',
    });
    expect(health).toEqual({
      status: 'ok',
      name: 'ai.wiplash/wiplash',
      version: '0.6.6',
      build_sha: 'abc123',
    });
  });

  it('publishes OAuth protected-resource metadata for the exact MCP resource', async () => {
    const config = loadConfig({
      HOST: '127.0.0.1',
      WIPLASH_MCP_PUBLIC_URL: 'http://localhost:8787/mcp',
      WIPLASH_OAUTH_ISSUER: 'https://stg-auth.wiplash.ai/realms/wiplash',
      WIPLASH_OAUTH_SCOPES: 'openid,profile,email',
    });
    const app = createHttpApp(config);
    const server = app.listen(0, '127.0.0.1');
    servers.push(server);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address() as AddressInfo;

    const response = await fetch(
      `http://127.0.0.1:${address.port}/.well-known/oauth-protected-resource/mcp`,
      { headers: { Host: 'localhost' } },
    );
    const metadata = await response.json();

    expect(response.status).toBe(200);
    expect(metadata).toEqual({
      resource: 'http://localhost:8787/mcp',
      resource_name: 'Wiplash',
      authorization_servers: ['https://stg-auth.wiplash.ai/realms/wiplash'],
      scopes_supported: ['openid', 'profile', 'email'],
      bearer_methods_supported: ['header'],
      resource_documentation: 'https://wiplash.ai/api-docs',
    });
  });

  it('publishes authorization-server compatibility metadata with S256 on every probed MCP alias', async () => {
    const config = loadConfig({
      HOST: '127.0.0.1',
      WIPLASH_MCP_PUBLIC_URL: 'http://localhost:8787/mcp',
      WIPLASH_OAUTH_ISSUER: 'https://stg-auth.wiplash.ai/realms/wiplash',
      WIPLASH_OAUTH_JWKS_URL: 'https://stg-auth.wiplash.ai/realms/wiplash/protocol/openid-connect/certs',
      WIPLASH_OAUTH_SCOPES: 'openid,profile,email,roles',
    });
    const app = createHttpApp(config);
    const server = app.listen(0, '127.0.0.1');
    servers.push(server);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address() as AddressInfo;
    const aliases = [
      '/.well-known/oauth-authorization-server/mcp',
      '/mcp/.well-known/oauth-authorization-server',
      '/.well-known/oauth-authorization-server',
      '/mcp/.well-known/openid-configuration',
      '/.well-known/openid-configuration/mcp',
      '/.well-known/openid-configuration',
    ];

    for (const pathname of aliases) {
      const response = await fetch(`http://127.0.0.1:${address.port}${pathname}`, {
        headers: { Host: 'localhost' },
      });
      const metadata = await response.json();

      expect(response.status).toBe(200);
      expect(metadata).toMatchObject({
        issuer: 'https://stg-auth.wiplash.ai/realms/wiplash',
        authorization_endpoint:
          'https://stg-auth.wiplash.ai/realms/wiplash/protocol/openid-connect/auth',
        token_endpoint: 'http://localhost:8787/oauth/token',
        userinfo_endpoint: 'http://localhost:8787/oauth/userinfo',
        jwks_uri: 'http://localhost:8787/oauth/jwks',
        code_challenge_methods_supported: ['S256'],
        scopes_supported: ['openid', 'profile', 'email', 'roles'],
      });
    }
  });

  it('rejects an invalid optional bearer before MCP dispatch without logging or echoing it', async () => {
    const config = loadConfig({
      HOST: '127.0.0.1',
      WIPLASH_MCP_PUBLIC_URL: 'http://localhost:8787/mcp',
    });
    const verifier: OAuthTokenVerifier = {
      verifyAccessToken: async () => {
        throw new Error('invalid');
      },
    };
    const app = createHttpApp(config, undefined, verifier);
    const server = app.listen(0, '127.0.0.1');
    servers.push(server);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${address.port}/mcp`, {
      method: 'POST',
      headers: {
        Host: 'localhost',
        Authorization: 'Bearer private-invalid-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    const body = await response.text();

    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toContain(
      'resource_metadata="http://localhost:8787/.well-known/oauth-protected-resource/mcp"',
    );
    expect(body).not.toContain('private-invalid-token');
  });
});
