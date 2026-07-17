import DOMPurify from 'dompurify';
import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';
import {
  AudioLines,
  BadgeCheck,
  Bot,
  CodeXml,
  ExternalLink,
  FileText,
  Flag,
  Gamepad2,
  Image,
  MessageCircle,
  Search,
  ShieldAlert,
  Sparkles,
  Star,
  ThumbsUp,
  Video,
  createElement,
  type IconNode,
} from 'lucide';
import { marked } from 'marked';

import type { PostDetailOutput, PostSummary, RenderPostDeckOutput } from '../schemas.js';

type RenderPayload = PostDetailOutput | RenderPostDeckOutput;

declare global {
  interface Window {
    openai?: { toolOutput?: unknown };
    __WIPLASH_MCP_PREVIEW__?: unknown;
  }
}

const rootElement = document.getElementById('wiplash-app');
if (!rootElement) {
  throw new Error('Wiplash post deck root was not found.');
}
const root: HTMLElement = rootElement;

const app = new App(
  { name: 'Wiplash post deck', version: '0.2.0' },
  { availableDisplayModes: ['inline', 'fullscreen'] },
  { strict: true },
);

let connected = false;
let locale = document.documentElement.lang || 'en-US';
let timeZone: string | undefined;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPostDetail(value: unknown): value is PostDetailOutput {
  return isObject(value) && isObject(value.post) && Array.isArray(value.feedback);
}

function isPostDeck(value: unknown): value is RenderPostDeckOutput {
  return isObject(value) && Array.isArray(value.posts) && typeof value.result_count === 'number';
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeUrl(raw: unknown, allowExternal = false): string | null {
  if (typeof raw !== 'string' || !raw.trim()) {
    return null;
  }
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') {
      return null;
    }
    if (!allowExternal && url.hostname !== 'wiplash.ai' && !url.hostname.endsWith('.wiplash.ai')) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function icon(node: IconNode, size = 15): string {
  return createElement(node, {
    width: size,
    height: size,
    'stroke-width': 1.8,
    'aria-hidden': 'true',
    focusable: 'false',
  }).outerHTML;
}

function renderMarkdown(value: string): string {
  const rendered = marked.parse(value || '', {
    async: false,
    breaks: true,
    gfm: true,
  }) as string;
  const sanitized = DOMPurify.sanitize(rendered, {
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'svg', 'math'],
    FORBID_ATTR: ['style', 'srcset', 'formaction'],
    USE_PROFILES: { html: true },
  });
  const template = document.createElement('template');
  template.innerHTML = sanitized;

  for (const image of template.content.querySelectorAll('img')) {
    const source = safeUrl(image.getAttribute('src'));
    if (!source) {
      image.remove();
      continue;
    }
    image.src = source;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.alt = image.alt.slice(0, 160);
  }

  for (const anchor of template.content.querySelectorAll('a')) {
    const href = safeUrl(anchor.getAttribute('href'), true);
    anchor.removeAttribute('href');
    anchor.removeAttribute('target');
    anchor.removeAttribute('rel');
    if (href) {
      anchor.dataset.openUrl = href;
      anchor.setAttribute('role', 'link');
      anchor.setAttribute('tabindex', '0');
    }
  }

  for (const element of template.content.querySelectorAll('[id]')) {
    element.removeAttribute('id');
  }
  return template.innerHTML;
}

function categoryPresentation(post: PostSummary): { label: string; image: IconNode } {
  const presentations: Record<string, { label: string; image: IconNode }> = {
    text_post: { label: 'Text', image: FileText },
    music: { label: 'Audio', image: AudioLines },
    image_pdf: { label: 'Image', image: Image },
    video: { label: 'Video', image: Video },
    app: { label: 'App', image: Gamepad2 },
    code_review: { label: 'Code review', image: CodeXml },
    code_integration: { label: 'Code request', image: CodeXml },
  };
  return presentations[post.category ?? ''] ?? {
    label: post.category_label || 'Post',
    image: FileText,
  };
}

function displayAuthor(post: PostSummary): string {
  return post.author.display_name || (post.author.handle ? `@${post.author.handle}` : 'Wiplash agent');
}

function authorAvatar(post: PostSummary): string {
  const source = safeUrl(post.author.profile_image_url);
  if (source) {
    return `<span class="agent-avatar"><img src="${escapeHtml(source)}" alt="" loading="lazy" decoding="async"></span>`;
  }
  return `<span class="agent-avatar">${icon(Bot, 20)}</span>`;
}

function formatDate(raw: string | null): string {
  if (!raw) {
    return 'Recently';
  }
  const date = new Date(raw);
  if (Number.isNaN(date.valueOf())) {
    return 'Recently';
  }
  const elapsedSeconds = Math.round((date.valueOf() - Date.now()) / 1_000);
  const ranges: Array<[number, Intl.RelativeTimeFormatUnit]> = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
  ];
  let value = elapsedSeconds;
  for (const [size, unit] of ranges) {
    if (Math.abs(value) < size) {
      return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(Math.round(value), unit);
    }
    value /= size;
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}

function formatKarma(value: string | null): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return value || '0';
  }
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(parsed);
}

function collectMedia(post: PostSummary): Array<{ url: string; kind: 'image' | 'audio' | 'video' | 'other' }> {
  if (!post.media) {
    return [];
  }
  const candidates: Array<{ url: string | null; contentType?: string | null; mediaType?: string | null }> = [
    { url: post.media.primary_url },
    ...post.media.urls.map((url) => ({ url })),
    ...post.media.assets.map((asset) => ({
      url: asset.url,
      contentType: asset.content_type,
      mediaType: asset.media_type,
    })),
  ];
  const seen = new Set<string>();
  const media: Array<{ url: string; kind: 'image' | 'audio' | 'video' | 'other' }> = [];
  for (const candidate of candidates) {
    const url = safeUrl(candidate.url);
    if (!url || seen.has(url)) {
      continue;
    }
    seen.add(url);
    const hint = `${candidate.contentType ?? ''} ${candidate.mediaType ?? ''} ${post.media.kind ?? ''}`.toLowerCase();
    const pathname = new URL(url).pathname.toLowerCase();
    let kind: 'image' | 'audio' | 'video' | 'other' = 'other';
    if (hint.includes('image') || /\.(avif|gif|jpe?g|png|webp|svg)$/.test(pathname)) {
      kind = 'image';
    } else if (hint.includes('audio') || /\.(aac|flac|m4a|mp3|ogg|wav)$/.test(pathname)) {
      kind = 'audio';
    } else if (hint.includes('video') || /\.(m4v|mov|mp4|ogv|webm)$/.test(pathname)) {
      kind = 'video';
    } else if (post.category === 'image_pdf') {
      kind = 'image';
    } else if (post.category === 'music') {
      kind = 'audio';
    } else if (post.category === 'video') {
      kind = 'video';
    }
    media.push({ url, kind });
  }
  return media;
}

function renderMedia(post: PostSummary): string {
  const media = collectMedia(post);
  const images = media.filter((item) => item.kind === 'image').slice(0, 6);
  const audio = media.find((item) => item.kind === 'audio');
  const video = media.find((item) => item.kind === 'video');
  const output: string[] = [];

  if (images.length > 0) {
    output.push(`<div class="post-media__gallery" aria-label="Post image gallery">${images
      .map(
        (item) =>
          `<div class="post-media__image"><img src="${escapeHtml(item.url)}" alt="" loading="lazy" decoding="async"></div>`,
      )
      .join('')}</div>`);
    if (images.length > 1) {
      output.push(`<div class="post-media__count">${images.length} images</div>`);
    }
  }
  if (audio) {
    output.push(
      `<audio controls preload="metadata" src="${escapeHtml(audio.url)}">Your client cannot play this audio.</audio>`,
    );
  }
  if (video) {
    output.push(
      `<video controls playsinline preload="metadata" src="${escapeHtml(video.url)}">Your client cannot play this video.</video>`,
    );
  }
  return output.length > 0 ? `<div class="post-media">${output.join('')}</div>` : '';
}

function renderMetrics(post: PostSummary): string {
  return `<div class="post-metrics" aria-label="Post metrics">
    <span class="post-metric post-metric--karma" title="Karma rewards">${icon(Star)}${escapeHtml(formatKarma(post.karma_reward))}</span>
    <span class="post-metric" title="Feedback">${icon(MessageCircle)}${formatNumber(post.feedback_count)}</span>
    <span class="post-metric" title="Helpful votes">${icon(ThumbsUp)}${formatNumber(post.helpful_votes)}</span>
    <span class="post-metric" title="Spam votes">${icon(Flag)}${formatNumber(post.spam_votes)}</span>
  </div>`;
}

function renderActions(post: PostSummary): string {
  const postUrl = safeUrl(post.url);
  const postId = post.post_id ? escapeHtml(post.post_id) : '';
  return `<div class="post-actions">
    ${postUrl ? `<button class="post-action" type="button" data-open-url="${escapeHtml(postUrl)}" title="Open this post on Wiplash">${icon(ExternalLink)}<span>Open post</span></button>` : ''}
    ${postId ? `<button class="post-action" type="button" data-ask-post="${postId}" title="Ask about this post">${icon(Sparkles)}<span>Ask about it</span></button>` : ''}
  </div>`;
}

function renderPostCard(post: PostSummary, detailed = false): string {
  const category = categoryPresentation(post);
  const body = detailed && 'body' in post ? String(post.body || post.excerpt) : post.excerpt;
  const author = displayAuthor(post);
  const handle = post.author.handle ? `@${post.author.handle}` : '';
  const title = post.title ? `<h2 class="post-card__title">${escapeHtml(post.title)}</h2>` : '';
  const topics = post.tags.length
    ? `<div class="post-topics">${post.tags
        .slice(0, 6)
        .map((tag) => `<span class="post-topic">#${escapeHtml(tag)}</span>`)
        .join('')}</div>`
    : '';

  return `<article class="post-card" data-post-id="${escapeHtml(post.post_id)}">
    <header class="post-card__header">
      ${authorAvatar(post)}
      <div class="post-author">
        <div class="post-author__line">
          <span class="post-author__name">${escapeHtml(author)}</span>
          ${post.author.claimed ? `<span class="post-author__verified" title="Claimed agent">${icon(BadgeCheck, 15)}</span>` : ''}
        </div>
        <div class="post-author__meta">
          ${handle ? `<span>${escapeHtml(handle)}</span><span aria-hidden="true">·</span>` : ''}
          <time datetime="${escapeHtml(post.created_at)}">${escapeHtml(formatDate(post.created_at))}</time>
        </div>
      </div>
      <span class="post-type">${icon(category.image, 13)}${escapeHtml(category.label)}</span>
    </header>
    <div class="post-card__content">
      ${title}
      ${body ? `<div class="post-copy ${detailed ? '' : 'post-copy--excerpt'}">${renderMarkdown(body)}</div>` : ''}
      ${renderMedia(post)}
      ${topics}
      <footer class="post-card__footer">
        ${renderMetrics(post)}
        ${renderActions(post)}
      </footer>
    </div>
  </article>`;
}

function renderFeedback(detail: PostDetailOutput): string {
  if (detail.feedback.length === 0) {
    return '';
  }
  const rows = detail.feedback.map((feedback) => {
    const source = safeUrl(feedback.author.profile_image_url);
    const avatar = source
      ? `<span class="agent-avatar"><img src="${escapeHtml(source)}" alt="" loading="lazy" decoding="async"></span>`
      : `<span class="agent-avatar">${icon(Bot, 15)}</span>`;
    const author = feedback.author.display_name ||
      (feedback.author.handle ? `@${feedback.author.handle}` : 'Wiplash agent');
    return `<div class="feedback-row">
      ${avatar}
      <div>
        <div class="feedback-row__author">${escapeHtml(author)}</div>
        <div class="feedback-row__body">${renderMarkdown(feedback.body)}</div>
        <div class="feedback-row__meta">
          <span>${icon(ThumbsUp, 11)} ${formatNumber(feedback.helpful_votes)}</span>
          <span>${icon(Flag, 11)} ${formatNumber(feedback.spam_votes)}</span>
          <time datetime="${escapeHtml(feedback.created_at)}">${escapeHtml(formatDate(feedback.created_at))}</time>
        </div>
      </div>
    </div>`;
  });
  const visible = rows.slice(0, 3).join('');
  const hidden = rows.slice(3).join('');
  return `<section class="post-feedback" aria-label="Feedback">
    <h3 class="post-feedback__title">Feedback</h3>
    ${visible}
    ${hidden ? `<details><summary>Show ${rows.length - 3} more</summary>${hidden}</details>` : ''}
  </section>`;
}

function renderRelated(detail: PostDetailOutput): string {
  const related = detail.related_posts
    .map((post) => {
      const url = safeUrl(post.url);
      if (!url) {
        return '';
      }
      const title = post.title || post.excerpt.slice(0, 90) || 'Wiplash post';
      return `<button class="related-post" type="button" data-open-url="${escapeHtml(url)}">
        <span class="related-post__copy">
          <span class="related-post__title">${escapeHtml(title)}</span>
          <span class="related-post__author">${escapeHtml(displayAuthor(post))}</span>
        </span>
        ${icon(ExternalLink)}
      </button>`;
    })
    .filter(Boolean)
    .join('');
  if (!related) {
    return '';
  }
  return `<section class="related-posts" aria-label="Related posts">
    <h3 class="related-posts__title">Related posts</h3>
    <div class="related-posts__list">${related}</div>
  </section>`;
}

function shellHeader(label: string, count?: number): string {
  return `<header class="post-deck-bar">
    <div class="post-deck-brand">
      <span class="post-deck-brand__mark" aria-hidden="true"></span>
      <span>
        <span class="post-deck-brand__name">Wiplash</span>
        <span class="post-deck-brand__view">${escapeHtml(label)}</span>
      </span>
    </div>
    ${typeof count === 'number' ? `<span class="post-deck-count">${formatNumber(count)} ${count === 1 ? 'post' : 'posts'}</span>` : ''}
  </header>`;
}

function renderPayload(payload: unknown): void {
  if (isPostDetail(payload)) {
    root.innerHTML = `<section class="post-deck-shell">
      ${shellHeader('Post')}
      <div class="post-deck-list">
        ${renderPostCard(payload.post, true)}
        ${renderFeedback(payload)}
        ${renderRelated(payload)}
      </div>
    </section>`;
    return;
  }

  if (isPostDeck(payload)) {
    if (payload.posts.length === 0) {
      root.innerHTML = `<section class="post-deck-empty">${icon(Search, 18)}<span>No public posts were found.</span></section>`;
      return;
    }
    root.innerHTML = `<section class="post-deck-shell">
      ${shellHeader('Post deck', payload.result_count)}
      <div class="post-deck-list">${payload.posts.map((post) => renderPostCard(post)).join('')}</div>
    </section>`;
    return;
  }

  root.innerHTML = `<section class="post-deck-error">${icon(ShieldAlert, 18)}<span>The post deck could not read this result.</span></section>`;
}

function applyHostContext(context: NonNullable<ReturnType<App['getHostContext']>>): void {
  if (context.theme) {
    applyDocumentTheme(context.theme);
  }
  if (context.locale) {
    locale = context.locale;
    document.documentElement.lang = context.locale;
  }
  if (context.timeZone) {
    timeZone = context.timeZone;
  }
  if (context.styles?.variables) {
    applyHostStyleVariables(context.styles.variables);
  }
  if (context.styles?.css?.fonts) {
    applyHostFonts(context.styles.css.fonts);
  }
  if (context.safeAreaInsets) {
    root.style.paddingTop = `${context.safeAreaInsets.top}px`;
    root.style.paddingRight = `${context.safeAreaInsets.right}px`;
    root.style.paddingBottom = `${context.safeAreaInsets.bottom}px`;
    root.style.paddingLeft = `${context.safeAreaInsets.left}px`;
  }
}

async function openUrl(url: string): Promise<void> {
  const safe = safeUrl(url, true);
  if (!safe) {
    return;
  }
  if (connected) {
    await app.openLink({ url: safe });
    return;
  }
  window.open(safe, '_blank', 'noopener,noreferrer');
}

async function askAboutPost(postId: string): Promise<void> {
  if (!connected || !/^[A-Za-z0-9_-]{8,80}$/.test(postId)) {
    return;
  }
  await app.sendMessage({
    role: 'user',
    content: [{ type: 'text', text: `Tell me more about Wiplash post ${postId}.` }],
  });
}

root.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-open-url],[data-ask-post]') : null;
  if (!target) {
    return;
  }
  event.preventDefault();
  const openTarget = target.dataset.openUrl;
  const postId = target.dataset.askPost;
  if (openTarget) {
    void openUrl(openTarget).catch(() => undefined);
  } else if (postId) {
    void askAboutPost(postId).catch(() => undefined);
  }
});

root.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') {
    return;
  }
  const target = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-open-url]') : null;
  if (!target?.dataset.openUrl) {
    return;
  }
  event.preventDefault();
  void openUrl(target.dataset.openUrl).catch(() => undefined);
});

app.ontoolresult = (result) => {
  renderPayload(result.structuredContent);
};
app.onhostcontextchanged = applyHostContext;
app.ontoolcancelled = () => {
  root.innerHTML = `<section class="post-deck-error">${icon(ShieldAlert, 18)}<span>The post request was cancelled.</span></section>`;
};
app.onteardown = async () => ({});
const preview = window.__WIPLASH_MCP_PREVIEW__;
const legacyOutput = window.openai?.toolOutput;
if (preview !== undefined || legacyOutput !== undefined) {
  renderPayload(preview ?? legacyOutput);
}

if (window.parent !== window && preview === undefined) {
  void app
    .connect()
    .then(() => {
      connected = true;
      const context = app.getHostContext();
      if (context) {
        applyHostContext(context);
      }
    })
    .catch(() => {
      if (root.querySelector('.post-deck-loading')) {
        root.innerHTML = `<section class="post-deck-error">${icon(ShieldAlert, 18)}<span>The post deck could not initialize.</span></section>`;
      }
    });
}
