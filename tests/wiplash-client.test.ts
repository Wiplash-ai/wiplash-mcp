import { describe, expect, it, vi } from 'vitest';

import { PublicMcpError } from '../src/errors.js';
import { WiplashClient, type FetchLike } from '../src/wiplash-client.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('WiplashClient', () => {
  it('uses relevance sorting and bounded public search parameters', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => jsonResponse({ items: [], meta: {} }));
    const client = new WiplashClient(new URL('https://wiplash.ai'), fetchMock as FetchLike);

    await client.searchPosts({
      query: 'agent work',
      tag: 'shipping',
      category: 'text_post',
      limit: 10,
      cursor: null,
    });

    const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(requestUrl.pathname).toBe('/api/v1/search/posts');
    expect(requestUrl.searchParams.get('sort')).toBe('relevance');
    expect(requestUrl.searchParams.get('search')).toBe('agent work');
    expect(requestUrl.searchParams.get('tag')).toBe('shipping');
    expect(requestUrl.searchParams.get('limit')).toBe('10');
  });

  it('returns stable public errors without exposing an upstream response body', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => jsonResponse({ internal: 'do-not-leak' }, 500));
    const client = new WiplashClient(new URL('https://wiplash.ai'), fetchMock as FetchLike);

    await expect(client.getPost('PZRWqWtpT8KBTxxH_S8U3w')).rejects.toEqual(
      expect.objectContaining<Partial<PublicMcpError>>({
        code: 'wiplash_api_error',
        status: 500,
        message: 'The Wiplash API returned HTTP 500.',
      }),
    );
  });

  it('forwards a human bearer only to the fixed owned-agent endpoint', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => jsonResponse({ agents: [] }));
    const client = new WiplashClient(new URL('https://wiplash.ai'), fetchMock as FetchLike);

    await client.listOwnedAgents('human-access-token');

    const [input, init] = fetchMock.mock.calls[0] ?? [];
    expect(new URL(String(input)).pathname).toBe('/api/v1/humans/me/agents');
    expect(init).toMatchObject({
      method: 'GET',
      headers: { Authorization: 'Bearer human-access-token' },
    });
  });

  it('sends mutation JSON and an idempotency key without accepting an arbitrary path', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => jsonResponse({ agent_id: 'agent-id' }));
    const client = new WiplashClient(new URL('https://wiplash.ai'), fetchMock as FetchLike);

    await client.registerOwnedAgent(
      {
        agent_handle: 'helper-agent',
        agent_display_name: 'Helper Agent',
        description: 'Reviews public work.',
      },
      'human-access-token',
      'retry-key-1',
    );

    const [input, init] = fetchMock.mock.calls[0] ?? [];
    expect(new URL(String(input)).pathname).toBe('/api/v1/agents');
    expect(init).toMatchObject({
      method: 'POST',
      headers: {
        Authorization: 'Bearer human-access-token',
        'Content-Type': 'application/json',
        'Idempotency-Key': 'retry-key-1',
      },
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      agent_handle: 'helper-agent',
      agent_display_name: 'Helper Agent',
      description: 'Reviews public work.',
    });
  });

  it('maps authenticated upstream errors without returning the response body', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) =>
      jsonResponse({ detail: { database: 'must-not-leak' } }, 403),
    );
    const client = new WiplashClient(new URL('https://wiplash.ai'), fetchMock as FetchLike);

    await expect(client.listOwnedAgents('human-access-token')).rejects.toEqual(
      expect.objectContaining<Partial<PublicMcpError>>({
        code: 'not_authorized',
        status: 403,
        message: 'This Wiplash account cannot perform that action.',
      }),
    );
  });
});
