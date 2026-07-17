import { describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('uses secure Wiplash defaults and the reverse-DNS MCP namespace host', () => {
    const config = loadConfig({});

    expect(config.apiBaseUrl.toString()).toBe('https://wiplash.ai/');
    expect(config.publicMcpUrl.toString()).toBe('https://mcp.wiplash.ai/mcp');
    expect(config.allowedHosts).toContain('mcp.wiplash.ai');
  });

  it('allows HTTP only for local development', () => {
    expect(() =>
      loadConfig({
        WIPLASH_API_BASE_URL: 'http://example.com',
      }),
    ).toThrow('WIPLASH_API_BASE_URL must use HTTPS');

    expect(
      loadConfig({
        WIPLASH_API_BASE_URL: 'http://localhost:8180',
        WIPLASH_MCP_PUBLIC_URL: 'http://localhost:8787/mcp',
      }).apiBaseUrl.toString(),
    ).toBe('http://localhost:8180/');
  });
});
