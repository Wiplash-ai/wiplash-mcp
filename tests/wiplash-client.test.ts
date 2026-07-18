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

  it('uploads media as multipart without setting an invalid content-type boundary', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ media_asset: { provider_asset_id: 'asset-1' } }),
    );
    const client = new WiplashClient(new URL('https://wiplash.ai'), fetchMock as FetchLike);

    await client.uploadOwnedAgentMedia(
      '9cc2f5d2-7573-43b2-a2bd-2511a33cebd2',
      {
        bytes: new Uint8Array([1, 2, 3]).buffer,
        filename: 'sample.png',
        contentType: 'image/png',
        mediaType: 'image',
        alt: 'A sample image.',
      },
      'human-access-token',
    );

    const [input, init] = fetchMock.mock.calls[0] ?? [];
    expect(new URL(String(input)).pathname).toBe(
      '/api/v1/humans/me/agents/9cc2f5d2-7573-43b2-a2bd-2511a33cebd2/media-assets',
    );
    expect(init?.body).toBeInstanceOf(FormData);
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer human-access-token' });
    expect(init?.headers).not.toHaveProperty('Content-Type');
  });

  it('uses only fixed selected-agent feedback and vote paths', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ vote_id: 'vote-1' }),
    );
    const client = new WiplashClient(new URL('https://wiplash.ai'), fetchMock as FetchLike);
    const agentId = '9cc2f5d2-7573-43b2-a2bd-2511a33cebd2';

    await client.createOwnedAgentFeedback(agentId, 'post-key-1', 'Useful feedback.', 'human-token', 'idem-1');
    await client.updateOwnedAgentFeedback(agentId, 'feedback-id-1', 'Updated feedback.', 'human-token');
    await client.deleteOwnedAgentFeedback(agentId, 'feedback-id-1', 'human-token');
    await client.voteOnPostAsOwnedAgent(agentId, 'post-key-1', 'helpful', 'human-token', 'idem-2');
    await client.voteOnFeedbackAsOwnedAgent(agentId, 'feedback-id-1', 'spam', 'human-token', 'idem-3');

    expect(fetchMock.mock.calls.map(([input]) => new URL(String(input)).pathname)).toEqual([
      `/api/v1/humans/me/agents/${agentId}/posts/post-key-1/feedback`,
      `/api/v1/humans/me/agents/${agentId}/feedback/feedback-id-1`,
      `/api/v1/humans/me/agents/${agentId}/feedback/feedback-id-1`,
      `/api/v1/humans/me/agents/${agentId}/posts/post-key-1/votes`,
      `/api/v1/humans/me/agents/${agentId}/feedback/feedback-id-1/votes`,
    ]);
    expect(fetchMock.mock.calls.map(([, init]) => init?.method)).toEqual(['POST', 'PATCH', 'DELETE', 'POST', 'POST']);
  });
});
