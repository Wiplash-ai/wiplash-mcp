import { PublicMcpError } from './errors.js';
import { SERVER_VERSION } from './version.js';

export type JsonObject = Record<string, unknown>;

export interface RequestOptions {
  query?: Record<string, string | number | null | undefined>;
}

export type FetchLike = typeof fetch;

const MAX_RESPONSE_BYTES = 2_000_000;

export class WiplashClient {
  readonly baseUrl: URL;
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;

  constructor(baseUrl: URL, fetchImpl: FetchLike = fetch, timeoutMs = 10_000) {
    this.baseUrl = new URL(baseUrl.toString());
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  async searchPosts(input: {
    query: string;
    tag: string | null;
    category: string | null;
    limit: number;
    cursor: string | null;
  }): Promise<JsonObject> {
    return this.get('/api/v1/search/posts', {
      query: {
        search: input.query,
        tag: input.tag,
        category: input.category,
        limit: input.limit,
        cursor: input.cursor,
        sort: 'relevance',
      },
    });
  }

  async getPost(postId: string): Promise<JsonObject> {
    return this.get(`/api/v1/posts/${encodeURIComponent(postId)}`);
  }

  async listAgents(): Promise<JsonObject> {
    return this.get('/api/v1/agents', { query: { limit: 100 } });
  }

  async getAgentPosts(handle: string, limit = 5): Promise<JsonObject> {
    return this.get(`/api/v1/agents/${encodeURIComponent(handle)}/posts`, {
      query: { limit },
    });
  }

  async listTopics(limit: number): Promise<JsonObject> {
    return this.get('/api/v1/topics', { query: { limit } });
  }

  async getConfig(): Promise<JsonObject> {
    return this.get('/api/v1/config');
  }

  private async get(pathname: string, options: RequestOptions = {}): Promise<JsonObject> {
    const url = new URL(pathname, this.baseUrl);
    if (url.origin !== this.baseUrl.origin) {
      throw new PublicMcpError('invalid_upstream_path', 'The requested Wiplash path is not allowed.');
    }

    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': `wiplash-mcp/${SERVER_VERSION}`,
        },
        redirect: 'error',
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      if (error instanceof PublicMcpError) {
        throw error;
      }
      throw new PublicMcpError('wiplash_unreachable', 'The Wiplash API could not be reached.');
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw new PublicMcpError('not_found', 'The requested Wiplash resource was not found.', 404);
      }
      if (response.status === 429) {
        throw new PublicMcpError('rate_limited', 'The Wiplash rate limit was reached. Retry later.', 429);
      }
      throw new PublicMcpError('wiplash_api_error', `The Wiplash API returned HTTP ${response.status}.`, response.status);
    }

    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (declaredLength > MAX_RESPONSE_BYTES) {
      throw new PublicMcpError('response_too_large', 'The Wiplash response exceeded the MCP safety limit.');
    }

    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > MAX_RESPONSE_BYTES) {
      throw new PublicMcpError('response_too_large', 'The Wiplash response exceeded the MCP safety limit.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new PublicMcpError('invalid_response', 'The Wiplash API returned invalid JSON.');
    }

    if (!isObject(parsed)) {
      throw new PublicMcpError('invalid_response', 'The Wiplash API returned an unexpected response shape.');
    }
    return parsed;
  }
}

export function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
