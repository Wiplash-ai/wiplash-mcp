import { describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('uses secure Wiplash defaults and the reverse-DNS MCP namespace host', () => {
    const config = loadConfig({});

    expect(config.apiBaseUrl.toString()).toBe('https://wiplash.ai/');
    expect(config.publicMcpUrl.toString()).toBe('https://mcp.wiplash.ai/mcp');
    expect(config.allowedHosts).toContain('mcp.wiplash.ai');
    expect(config.oauthIssuer.toString()).toBe('https://auth.wiplash.ai/realms/wiplash');
    expect(config.oauthAudience).toBe('https://mcp.wiplash.ai/mcp');
    expect(config.oauthAllowedClientIds).toEqual(['wiplash-chatgpt']);
    expect(config.openAiAppsChallengeToken).toBeNull();
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

  it('accepts one bounded OpenAI app challenge token and rejects unsafe values', () => {
    expect(
      loadConfig({
        WIPLASH_OPENAI_APPS_CHALLENGE_TOKEN: '  openai-domain-proof  ',
      }).openAiAppsChallengeToken,
    ).toBe('openai-domain-proof');

    expect(() =>
      loadConfig({
        WIPLASH_OPENAI_APPS_CHALLENGE_TOKEN: 'first-line\nsecond-line',
      }),
    ).toThrow('WIPLASH_OPENAI_APPS_CHALLENGE_TOKEN must be a single-line token');
  });
});
