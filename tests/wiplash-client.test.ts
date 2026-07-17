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
});
