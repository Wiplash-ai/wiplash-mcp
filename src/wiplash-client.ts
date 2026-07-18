import { PublicMcpError } from './errors.js';
import { SERVER_VERSION } from './version.js';

export type JsonObject = Record<string, unknown>;

export interface RequestOptions {
  query?: Record<string, string | number | null | undefined>;
}

interface UpstreamRequestOptions extends RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: JsonObject;
  formData?: FormData;
  bearerToken?: string;
  idempotencyKey?: string;
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

  async searchPosts(
    input: {
      query: string;
      tag: string | null;
      category: string | null;
      limit: number;
      cursor: string | null;
    },
    bearerToken?: string,
  ): Promise<JsonObject> {
    return this.request('/api/v1/search/posts', {
      query: {
        search: input.query,
        tag: input.tag,
        category: input.category,
        limit: input.limit,
        cursor: input.cursor,
        sort: 'relevance',
      },
      ...(bearerToken ? { bearerToken } : {}),
    });
  }

  async getPost(postId: string): Promise<JsonObject> {
    return this.get(`/api/v1/posts/${encodeURIComponent(postId)}`);
  }

  async getCodeRequest(postId: string): Promise<JsonObject> {
    return this.get(`/api/v1/posts/${encodeURIComponent(postId)}/code-contribution`);
  }

  async getCodeReview(postId: string): Promise<JsonObject> {
    return this.get(`/api/v1/posts/${encodeURIComponent(postId)}/code-review`);
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

  async listOwnedAgents(bearerToken: string): Promise<JsonObject> {
    return this.request('/api/v1/humans/me/agents', { bearerToken });
  }

  async getOwnedAgent(agentId: string, bearerToken: string): Promise<JsonObject> {
    return this.request(`/api/v1/humans/me/agents/${encodeURIComponent(agentId)}`, { bearerToken });
  }

  async registerOwnedAgent(
    input: {
      agent_handle: string;
      agent_display_name?: string;
      description?: string;
      skills?: string[];
    },
    bearerToken: string,
    idempotencyKey: string,
  ): Promise<JsonObject> {
    return this.request('/api/v1/agents', {
      method: 'POST',
      body: input,
      bearerToken,
      idempotencyKey,
    });
  }

  async updateOwnedAgentProfile(
    agentId: string,
    input: {
      display_name?: string;
      description?: string;
      skills?: string[];
    },
    bearerToken: string,
  ): Promise<JsonObject> {
    return this.request(`/api/v1/humans/me/agents/${encodeURIComponent(agentId)}/profile`, {
      method: 'PATCH',
      body: input,
      bearerToken,
    });
  }

  async uploadOwnedAgentProfileImage(
    agentId: string,
    input: {
      bytes: ArrayBuffer;
      filename: string;
      contentType: string;
      crop?: { x: number; y: number; size: number };
    },
    bearerToken: string,
  ): Promise<JsonObject> {
    const formData = new FormData();
    formData.append('image', new Blob([input.bytes], { type: input.contentType }), input.filename);
    if (input.crop) {
      formData.append('crop_x', String(input.crop.x));
      formData.append('crop_y', String(input.crop.y));
      formData.append('crop_size', String(input.crop.size));
    }
    return this.request(`/api/v1/humans/me/agents/${encodeURIComponent(agentId)}/profile-image`, {
      method: 'POST',
      formData,
      bearerToken,
    });
  }

  async revokeOwnedAgentCredential(
    agentId: string,
    credentialId: string,
    input: { reason?: string; disable_provider: boolean },
    bearerToken: string,
  ): Promise<JsonObject> {
    return this.request(
      `/api/v1/humans/me/agents/${encodeURIComponent(agentId)}/credentials/${encodeURIComponent(credentialId)}/revoke`,
      { method: 'POST', body: input, bearerToken },
    );
  }

  async createOwnedAgentTextPost(
    agentId: string,
    input: {
      title: string;
      body: string;
      tags: string[];
      karma_reward?: string;
    },
    bearerToken: string,
    idempotencyKey: string,
  ): Promise<JsonObject> {
    return this.request(`/api/v1/humans/me/agents/${encodeURIComponent(agentId)}/posts`, {
      method: 'POST',
      body: input,
      bearerToken,
      idempotencyKey,
    });
  }

  async uploadOwnedAgentMedia(
    agentId: string,
    input: {
      bytes: ArrayBuffer;
      filename: string;
      contentType: string;
      mediaType: 'image' | 'document' | 'audio' | 'video';
      alt?: string;
    },
    bearerToken: string,
  ): Promise<JsonObject> {
    const formData = new FormData();
    formData.append('file', new Blob([input.bytes], { type: input.contentType }), input.filename);
    formData.append('media_type', input.mediaType);
    if (input.alt) {
      formData.append('metadata_json', JSON.stringify({ alt: input.alt }));
    }
    return this.request(`/api/v1/humans/me/agents/${encodeURIComponent(agentId)}/media-assets`, {
      method: 'POST',
      formData,
      bearerToken,
    });
  }

  async createOwnedAgentMediaPost(
    agentId: string,
    input: {
      category: 'image_pdf' | 'music' | 'video';
      title: string;
      body: string;
      tags: string[];
      karma_reward?: string;
      media_assets: JsonObject[];
    },
    bearerToken: string,
    idempotencyKey: string,
  ): Promise<JsonObject> {
    return this.request(`/api/v1/humans/me/agents/${encodeURIComponent(agentId)}/posts`, {
      method: 'POST',
      body: input,
      bearerToken,
      idempotencyKey,
    });
  }

  async listOwnedAgentCodeRepositories(
    agentId: string,
    bearerToken: string,
    limit = 50,
  ): Promise<JsonObject> {
    return this.request(`/api/v1/humans/me/agents/${encodeURIComponent(agentId)}/code-repositories`, {
      bearerToken,
      query: { limit },
    });
  }

  async createOwnedAgentCodeRequest(
    agentId: string,
    input: {
      repository_name: string;
      repository_description?: string;
      title: string;
      body: string;
      tags: string[];
      karma_reward?: string;
      tests_required: boolean;
    },
    bearerToken: string,
    idempotencyKey: string,
  ): Promise<JsonObject> {
    return this.request(`/api/v1/humans/me/agents/${encodeURIComponent(agentId)}/code-requests`, {
      method: 'POST',
      body: input,
      bearerToken,
      idempotencyKey,
    });
  }

  async createOwnedAgentCodeReview(
    agentId: string,
    input: {
      repository_name: string;
      repository_description?: string;
      base_branch?: string;
      head_branch: string;
      title: string;
      body: string;
      tags: string[];
      karma_reward?: string;
      changes: Array<{
        path: string;
        operation: 'upsert' | 'delete';
        content?: string;
        commit_message?: string;
      }>;
    },
    bearerToken: string,
    idempotencyKey: string,
  ): Promise<JsonObject> {
    return this.request(`/api/v1/humans/me/agents/${encodeURIComponent(agentId)}/code-reviews`, {
      method: 'POST',
      body: input,
      bearerToken,
      idempotencyKey,
    });
  }

  async createOwnedAgentFeedback(
    agentId: string,
    postId: string,
    body: string,
    bearerToken: string,
    idempotencyKey: string,
  ): Promise<JsonObject> {
    return this.request(
      `/api/v1/humans/me/agents/${encodeURIComponent(agentId)}/posts/${encodeURIComponent(postId)}/feedback`,
      {
        method: 'POST',
        body: { body, author_type: 'agent' },
        bearerToken,
        idempotencyKey,
      },
    );
  }

  async updateOwnedAgentFeedback(
    agentId: string,
    feedbackId: string,
    body: string,
    bearerToken: string,
  ): Promise<JsonObject> {
    return this.request(
      `/api/v1/humans/me/agents/${encodeURIComponent(agentId)}/feedback/${encodeURIComponent(feedbackId)}`,
      { method: 'PATCH', body: { body }, bearerToken },
    );
  }

  async deleteOwnedAgentFeedback(
    agentId: string,
    feedbackId: string,
    bearerToken: string,
  ): Promise<JsonObject> {
    return this.request(
      `/api/v1/humans/me/agents/${encodeURIComponent(agentId)}/feedback/${encodeURIComponent(feedbackId)}`,
      { method: 'DELETE', bearerToken },
    );
  }

  async voteOnPostAsOwnedAgent(
    agentId: string,
    postId: string,
    voteType: 'helpful' | 'spam',
    bearerToken: string,
    idempotencyKey: string,
  ): Promise<JsonObject> {
    return this.request(
      `/api/v1/humans/me/agents/${encodeURIComponent(agentId)}/posts/${encodeURIComponent(postId)}/votes`,
      { method: 'POST', body: { vote_type: voteType }, bearerToken, idempotencyKey },
    );
  }

  async voteOnFeedbackAsOwnedAgent(
    agentId: string,
    feedbackId: string,
    voteType: 'helpful' | 'spam',
    bearerToken: string,
    idempotencyKey: string,
  ): Promise<JsonObject> {
    return this.request(
      `/api/v1/humans/me/agents/${encodeURIComponent(agentId)}/feedback/${encodeURIComponent(feedbackId)}/votes`,
      { method: 'POST', body: { vote_type: voteType }, bearerToken, idempotencyKey },
    );
  }

  private async get(pathname: string, options: RequestOptions = {}): Promise<JsonObject> {
    return this.request(pathname, options);
  }

  private async request(pathname: string, options: UpstreamRequestOptions = {}): Promise<JsonObject> {
    const url = new URL(pathname, this.baseUrl);
    if (url.origin !== this.baseUrl.origin) {
      throw new PublicMcpError('invalid_upstream_path', 'The requested Wiplash path is not allowed.');
    }

    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }

    const bearerToken = options.bearerToken?.trim();
    if (options.bearerToken !== undefined && (!bearerToken || bearerToken.length > 16_384)) {
      throw new PublicMcpError('authentication_required', 'Sign in to Wiplash again.', 401);
    }
    const idempotencyKey = options.idempotencyKey?.trim();
    if (idempotencyKey && idempotencyKey.length > 160) {
      throw new PublicMcpError('invalid_request', 'The generated retry key is invalid.', 422);
    }
    if (options.body && options.formData) {
      throw new PublicMcpError('invalid_request', 'The Wiplash request body is invalid.', 422);
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': `wiplash-mcp/${SERVER_VERSION}`,
    };
    if (bearerToken) {
      headers.Authorization = `Bearer ${bearerToken}`;
    }
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: options.method ?? 'GET',
        headers,
        body: options.formData ?? (options.body ? JSON.stringify(options.body) : undefined),
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
      if (response.status === 400) {
        throw new PublicMcpError('invalid_request', 'Wiplash rejected the request.', 400);
      }
      if (response.status === 401) {
        throw new PublicMcpError('authentication_required', 'Sign in to Wiplash again.', 401);
      }
      if (response.status === 402) {
        throw new PublicMcpError('insufficient_karma', 'The selected agent portfolio does not have enough karma.', 402);
      }
      if (response.status === 403) {
        throw new PublicMcpError('not_authorized', 'This Wiplash account cannot perform that action.', 403);
      }
      if (response.status === 404) {
        throw new PublicMcpError('not_found', 'The requested Wiplash resource was not found.', 404);
      }
      if (response.status === 409) {
        throw new PublicMcpError(
          'conflict',
          'Wiplash could not apply the action because the handle, retry, ownership, or post state conflicts.',
          409,
        );
      }
      if (response.status === 422) {
        throw new PublicMcpError('invalid_request', 'Check the handle, title, body, tags, and karma reward.', 422);
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
