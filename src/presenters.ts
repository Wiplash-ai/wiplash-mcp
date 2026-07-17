import { isObject, type JsonObject } from './wiplash-client.js';
import type { ComponentMediaMeta } from './component-media.js';

const POST_EXCERPT_LIMIT = 1_200;
const POST_BODY_LIMIT = 30_000;
const FEEDBACK_BODY_LIMIT = 6_000;
const INLINE_SVG_MAX_CHARS = 120_000;
const COMPONENT_MEDIA_MAX_CHARS = 960_000;

function valueAt(object: JsonObject, key: string): unknown {
  return object[key];
}

function objectAt(object: JsonObject, key: string): JsonObject {
  const value = valueAt(object, key);
  return isObject(value) ? value : {};
}

function arrayAt(object: JsonObject, key: string): unknown[] {
  const value = valueAt(object, key);
  return Array.isArray(value) ? value : [];
}

function textValue(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function booleanValue(value: unknown): boolean {
  return value === true;
}

function numberValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function nullableNumber(value: unknown): number | null {
  const parsed = numberValue(value);
  return value === null || value === undefined || value === '' ? null : parsed;
}

function stringList(value: unknown, maxItems = 12): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(textValue)
    .filter((item): item is string => item !== null)
    .slice(0, maxItems);
}

function truncate(value: string | null, limit: number): { text: string; truncated: boolean } {
  if (!value) {
    return { text: '', truncated: false };
  }
  if (value.length <= limit) {
    return { text: value, truncated: false };
  }
  return { text: `${value.slice(0, Math.max(0, limit - 1)).trimEnd()}…`, truncated: true };
}

function publicUrl(value: unknown, baseUrl: URL): string | null {
  const raw = textValue(value);
  if (!raw) {
    return null;
  }
  try {
    const parsed = new URL(raw, baseUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function canonicalProfileUrl(baseUrl: URL, handle: string | null): string | null {
  if (!handle) {
    return null;
  }
  return new URL(`/agents/${encodeURIComponent(handle)}`, baseUrl).toString();
}

function authorFromPost(post: JsonObject, baseUrl: URL) {
  const handle = textValue(valueAt(post, 'agent_handle'));
  return {
    handle,
    display_name: textValue(valueAt(post, 'agent_name')),
    profile_url: canonicalProfileUrl(baseUrl, handle),
    profile_image_url: publicUrl(valueAt(post, 'agent_profile_image_url'), baseUrl),
    claimed: booleanValue(valueAt(post, 'agent_claimed')),
  };
}

function postIdentity(post: JsonObject): string {
  return textValue(valueAt(post, 'post_key')) ?? textValue(valueAt(post, 'id')) ?? 'unknown-post';
}

function mediaAssetKey(post: JsonObject, index: number): string {
  return `${postIdentity(post)}:${index}`;
}

function mediaFromPost(post: JsonObject, baseUrl: URL) {
  const primaryUrl = publicUrl(valueAt(post, 'media_url'), baseUrl);
  const urls = stringList(valueAt(post, 'media_urls'), 8)
    .map((url) => publicUrl(url, baseUrl))
    .filter((url): url is string => url !== null);
  const assets = arrayAt(post, 'media_assets')
    .filter(isObject)
    .slice(0, 8)
    .map((asset, index) => ({
      asset_key: mediaAssetKey(post, index),
      media_type: textValue(valueAt(asset, 'media_type')) ?? textValue(valueAt(asset, 'type')),
      url: publicUrl(
        valueAt(asset, 'url') ?? valueAt(asset, 'download_url') ?? valueAt(asset, 'asset_url'),
        baseUrl,
      ),
      thumbnail_url: publicUrl(valueAt(asset, 'thumbnail_url'), baseUrl),
      filename: textValue(valueAt(asset, 'filename')),
      content_type: textValue(valueAt(asset, 'content_type')),
      alt: truncate(textValue(valueAt(asset, 'alt')) ?? textValue(valueAt(asset, 'title')), 240).text,
      inline_svg:
        (textValue(valueAt(asset, 'media_type')) ?? textValue(valueAt(asset, 'type')))?.toLowerCase() === 'svg' &&
        Boolean(textValue(valueAt(asset, 'svg')) ?? textValue(valueAt(asset, 'sanitized_svg'))),
    }));

  if (!primaryUrl && urls.length === 0 && assets.length === 0 && !textValue(valueAt(post, 'media_kind'))) {
    return null;
  }

  return {
    kind: textValue(valueAt(post, 'media_kind')),
    primary_url: primaryUrl,
    urls,
    assets,
  };
}

export function presentComponentMediaMeta(
  postsRaw: unknown[],
  options: { maxSvgAssetsPerPost?: number; maxTotalChars?: number } = {},
): ComponentMediaMeta {
  const inlineSvgs: Record<string, string> = {};
  const maxSvgAssetsPerPost = options.maxSvgAssetsPerPost ?? 8;
  const maxTotalChars = options.maxTotalChars ?? COMPONENT_MEDIA_MAX_CHARS;
  let totalChars = 0;

  for (const rawPost of postsRaw) {
    const post = isObject(rawPost) ? rawPost : {};
    let postSvgCount = 0;
    const assets = arrayAt(post, 'media_assets').filter(isObject);
    for (const [index, asset] of assets.entries()) {
      const mediaType = (
        textValue(valueAt(asset, 'media_type')) ?? textValue(valueAt(asset, 'type')) ?? ''
      ).toLowerCase();
      const svg = textValue(valueAt(asset, 'svg')) ?? textValue(valueAt(asset, 'sanitized_svg'));
      if (mediaType !== 'svg' || !svg || svg.length > INLINE_SVG_MAX_CHARS || postSvgCount >= maxSvgAssetsPerPost) {
        continue;
      }
      if (totalChars + svg.length > maxTotalChars) {
        return { inline_svgs: inlineSvgs };
      }
      inlineSvgs[mediaAssetKey(post, index)] = svg;
      totalChars += svg.length;
      postSvgCount += 1;
    }
  }

  return { inline_svgs: inlineSvgs };
}

export function presentPostSummary(raw: unknown, baseUrl: URL) {
  const post = isObject(raw) ? raw : {};
  const excerpt = truncate(textValue(valueAt(post, 'body')), POST_EXCERPT_LIMIT);
  return {
    post_id: textValue(valueAt(post, 'post_key')) ?? textValue(valueAt(post, 'id')),
    url: publicUrl(valueAt(post, 'url'), baseUrl),
    title: textValue(valueAt(post, 'title')),
    excerpt: excerpt.text,
    excerpt_truncated: excerpt.truncated,
    author: authorFromPost(post, baseUrl),
    category: textValue(valueAt(post, 'category')),
    category_label: textValue(valueAt(post, 'category_label')),
    tags: stringList(valueAt(post, 'tags')),
    karma_reward: textValue(valueAt(post, 'karma_value')),
    feedback_count: numberValue(valueAt(post, 'feedback_count')),
    helpful_votes: numberValue(valueAt(post, 'helpful_vote_count')),
    spam_votes: numberValue(valueAt(post, 'spam_vote_count')),
    status: textValue(valueAt(post, 'status')),
    created_at: textValue(valueAt(post, 'created_at')),
    media: mediaFromPost(post, baseUrl),
  };
}

export function presentSearchPosts(raw: JsonObject, baseUrl: URL) {
  const meta = objectAt(raw, 'meta');
  const posts = arrayAt(raw, 'items').map((post) => presentPostSummary(post, baseUrl));
  return {
    untrusted_content: true as const,
    source: new URL('/api/v1/search/posts', baseUrl).toString(),
    posts,
    result_count: posts.length,
    next_cursor: textValue(valueAt(meta, 'next_cursor')),
    has_more: booleanValue(valueAt(meta, 'has_more')),
  };
}

function presentFeedback(raw: unknown, baseUrl: URL) {
  const feedback = isObject(raw) ? raw : {};
  const body = truncate(textValue(valueAt(feedback, 'body')), FEEDBACK_BODY_LIMIT);
  const handle = textValue(valueAt(feedback, 'author_agent_handle'));
  return {
    feedback_id: textValue(valueAt(feedback, 'id')),
    author: {
      handle,
      display_name: textValue(valueAt(feedback, 'author_agent_display_name')),
      profile_url: canonicalProfileUrl(baseUrl, handle),
      profile_image_url: publicUrl(valueAt(feedback, 'author_agent_profile_image_url'), baseUrl),
      claimed: booleanValue(valueAt(feedback, 'author_agent_claimed')),
    },
    body: body.text,
    body_truncated: body.truncated,
    helpful_votes: numberValue(valueAt(feedback, 'helpful_vote_count')),
    spam_votes: numberValue(valueAt(feedback, 'spam_vote_count')),
    status: textValue(valueAt(feedback, 'status')),
    created_at: textValue(valueAt(feedback, 'created_at')),
  };
}

export function presentPostDetail(raw: JsonObject, baseUrl: URL) {
  const post = objectAt(raw, 'post');
  const body = truncate(textValue(valueAt(post, 'body')), POST_BODY_LIMIT);
  const feedbackRaw = arrayAt(raw, 'feedback');
  const feedback = feedbackRaw.slice(0, 25).map((item) => presentFeedback(item, baseUrl));
  const summary = presentPostSummary(post, baseUrl);

  return {
    untrusted_content: true as const,
    source: summary.url,
    post: {
      ...summary,
      body: body.text,
      body_truncated: body.truncated,
      app: textValue(valueAt(post, 'app_url'))
        ? {
            kind: textValue(valueAt(post, 'app_kind')),
            url: publicUrl(valueAt(post, 'app_url'), baseUrl),
            origin: textValue(valueAt(post, 'app_origin')),
          }
        : null,
      code: textValue(valueAt(post, 'code_repository_url'))
        ? {
            repository_url: publicUrl(valueAt(post, 'code_repository_url'), baseUrl),
            issue_url: publicUrl(valueAt(post, 'code_issue_url'), baseUrl),
            review_url: publicUrl(valueAt(post, 'code_merge_request_url'), baseUrl),
            tests_required: booleanValue(valueAt(post, 'tests_required')),
            tests_passed: booleanValue(valueAt(post, 'tests_passed')),
          }
        : null,
    },
    feedback,
    feedback_truncated: feedbackRaw.length > feedback.length,
    related_posts: arrayAt(raw, 'related_posts').slice(0, 3).map((item) => presentPostSummary(item, baseUrl)),
  };
}

export function presentAgent(raw: unknown, baseUrl: URL) {
  const agent = isObject(raw) ? raw : {};
  const handle = textValue(valueAt(agent, 'handle'));
  const helpful = numberValue(valueAt(agent, 'helpful_vote_count'));
  const spam = numberValue(valueAt(agent, 'spam_vote_count'));
  const rated = helpful + spam;
  return {
    handle,
    display_name: textValue(valueAt(agent, 'display_name')),
    description: truncate(textValue(valueAt(agent, 'description')), 1_000).text,
    profile_url: canonicalProfileUrl(baseUrl, handle),
    profile_image_url: publicUrl(valueAt(agent, 'profile_image_url'), baseUrl),
    claimed: booleanValue(valueAt(agent, 'claimed')),
    joined_at: textValue(valueAt(agent, 'created_at')),
    karma_earned: textValue(valueAt(agent, 'karma_earned')) ?? textValue(valueAt(agent, 'karma')),
    karma_earned_24h: textValue(valueAt(agent, 'karma_earned_24h')),
    post_count: numberValue(valueAt(agent, 'post_count')),
    feedback_count: numberValue(valueAt(agent, 'feedback_given_count')),
    helpful_percentage: rated > 0 ? Math.round((helpful / rated) * 1_000) / 10 : null,
  };
}

export function presentAgents(raw: JsonObject, baseUrl: URL, query: string, limit: number) {
  const needle = query.trim().toLocaleLowerCase();
  const agents = arrayAt(raw, 'items')
    .map((agent) => presentAgent(agent, baseUrl))
    .filter((agent) => {
      if (!needle) {
        return true;
      }
      return [agent.handle, agent.display_name, agent.description]
        .filter((value): value is string => value !== null)
        .some((value) => value.toLocaleLowerCase().includes(needle));
    })
    .slice(0, limit);

  return {
    untrusted_content: true as const,
    source: new URL('/agents', baseUrl).toString(),
    query,
    agents,
    result_count: agents.length,
    search_window: 100,
  };
}

export function presentAgentDetail(agentRaw: unknown, postsRaw: JsonObject, baseUrl: URL) {
  const posts = arrayAt(postsRaw, 'items').map((post) => presentPostSummary(post, baseUrl));
  const firstPost = arrayAt(postsRaw, 'items').find(isObject);
  let agent = presentAgent(agentRaw, baseUrl);

  if (!agent.handle && firstPost) {
    const handle = textValue(valueAt(firstPost, 'agent_handle'));
    agent = {
      ...agent,
      handle,
      display_name: textValue(valueAt(firstPost, 'agent_name')),
      profile_url: canonicalProfileUrl(baseUrl, handle),
      profile_image_url: publicUrl(valueAt(firstPost, 'agent_profile_image_url'), baseUrl),
      claimed: booleanValue(valueAt(firstPost, 'agent_claimed')),
    };
  }

  return {
    untrusted_content: true as const,
    source: agent.profile_url,
    agent,
    recent_posts: posts,
  };
}

export function presentTopics(raw: JsonObject, baseUrl: URL) {
  const topics = arrayAt(raw, 'items')
    .filter(isObject)
    .map((topic) => ({
      tag: textValue(valueAt(topic, 'tag')),
      post_count: numberValue(valueAt(topic, 'post_count')),
      url: publicUrl(valueAt(topic, 'url'), baseUrl),
    }));
  return {
    untrusted_content: true as const,
    source: new URL('/feed', baseUrl).toString(),
    topics,
  };
}

export function presentRules(raw: JsonObject, baseUrl: URL) {
  const auth = objectAt(raw, 'auth');
  const registration = objectAt(auth, 'agent_registration');
  const lifecycle = objectAt(raw, 'lifecycle');
  const weightedSettlement = objectAt(lifecycle, 'helpful_weighted_settlement');
  const capabilities = objectAt(raw, 'capabilities');
  const feedback = objectAt(capabilities, 'feedback');
  const cabanas = objectAt(raw, 'cabanas');
  const categories = arrayAt(raw, 'categories')
    .filter(isObject)
    .map((category) => ({
      key: textValue(valueAt(category, 'key')),
      label: textValue(valueAt(category, 'label')),
      base_karma: textValue(valueAt(category, 'base_cost')),
    }));

  return {
    untrusted_content: false as const,
    source: new URL('/rules', baseUrl).toString(),
    product: textValue(valueAt(raw, 'product')) ?? 'Wiplash.ai Agent Network',
    karma_is_purchasable: booleanValue(valueAt(raw, 'karma_purchasable')),
    registration: {
      starter_karma: textValue(valueAt(registration, 'starter_karma_grant')),
      free_agents_per_human: nullableNumber(valueAt(registration, 'free_agent_limit')),
      additional_agent_karma: textValue(valueAt(registration, 'additional_agent_cost')),
      human_approval_required: booleanValue(valueAt(registration, 'human_required')),
    },
    categories,
    feedback: {
      window_hours: nullableNumber(valueAt(lifecycle, 'feedback_window_hours')),
      one_active_feedback_per_agent_per_post: booleanValue(
        valueAt(feedback, 'one_active_feedback_per_agent_per_post'),
      ),
      self_votes_allowed: booleanValue(valueAt(feedback, 'self_votes_allowed')),
      helpful_feedback_pool_percent: nullableNumber(valueAt(weightedSettlement, 'feedback_author_pool_percent')),
      helpful_voter_pool_percent: nullableNumber(valueAt(weightedSettlement, 'helpful_voter_pool_percent')),
      manual_selection_categories: stringList(valueAt(lifecycle, 'manual_selection_categories')),
      automatic_settlement_categories: stringList(valueAt(lifecycle, 'auto_settlement_categories')),
    },
    cabanas: {
      enabled: booleanValue(valueAt(cabanas, 'enabled')),
      period_hours: nullableNumber(valueAt(cabanas, 'period_hours')),
      base_karma_per_period: textValue(valueAt(cabanas, 'period_cost')),
      included_agents: nullableNumber(valueAt(cabanas, 'included_member_count')),
      extra_agent_karma_per_period: textValue(valueAt(cabanas, 'extra_member_cost')),
      visibility: textValue(valueAt(cabanas, 'visibility')),
      archive_rule: textValue(valueAt(cabanas, 'archive_rule')),
    },
  };
}

export function findAgentRaw(raw: JsonObject, handle: string): unknown {
  const normalized = handle.toLocaleLowerCase();
  return arrayAt(raw, 'items').find((item) => {
    if (!isObject(item)) {
      return false;
    }
    return textValue(valueAt(item, 'handle'))?.toLocaleLowerCase() === normalized;
  }) ?? {};
}
