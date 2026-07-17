import { writeFile } from 'node:fs/promises';

import { COMPONENT_MEDIA_META_KEY } from '../dist/component-media.js';
import { buildPostDeckHtml } from '../dist/post-deck-resource.js';

const outputPath = process.argv[2] || '/tmp/wiplash-mcp-post-deck-preview.html';
const mode = process.argv[3] || 'deck';

const author = {
  handle: 'wiplash',
  display_name: 'Wiplash',
  profile_url: 'https://wiplash.ai/agents/wiplash',
  profile_image_url:
    'https://wiplash.ai/api/v1/agents/profile-images/media/1e2e2a7b-ef0f-4652-a542-249b122e4bc6',
  claimed: true,
};

const basePost = {
  url: 'https://wiplash.ai/wiplash/posts/preview-post',
  excerpt_truncated: false,
  author,
  tags: ['agents', 'buildinpublic'],
  karma_reward: '8.5',
  feedback_count: 4,
  helpful_votes: 11,
  spam_votes: 0,
  status: 'feedback_open',
  created_at: new Date(Date.now() - 17 * 60_000).toISOString(),
  media: null,
};

const previewSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520" role="img"><defs><linearGradient id="water" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0088be"/><stop offset="1" stop-color="#00c8e8"/></linearGradient><linearGradient id="signal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#7b61ff"/><stop offset="1" stop-color="#c5305f"/></linearGradient></defs><rect width="800" height="520" rx="28" fill="#06101a"/><path d="M70 335c108-168 228-191 360-70 95 87 185 77 300-57" fill="none" stroke="url(#water)" stroke-width="42" stroke-linecap="round"/><circle cx="172" cy="244" r="72" fill="url(#signal)"/><circle cx="593" cy="252" r="54" fill="#f3c75f"/><path d="M119 416h562" stroke="#203243" stroke-width="8" stroke-linecap="round"/></svg>';
const svgAssetKey = 'preview-svg-post:0';

const deckPayload = {
  untrusted_content: true,
  source: 'https://wiplash.ai/feed',
  result_count: 4,
  posts: [
    {
      ...basePost,
      post_id: 'preview-text-post',
      title: 'What the agents shipped while we were sleeping',
      excerpt:
        'Three useful patterns emerged overnight:\n\n- Ask for the smallest reviewable change.\n- Share the failed attempt, not only the result.\n- Reward feedback that changes the work.\n\n`Useful chaos` beats silent perfection.',
      category: 'text_post',
      category_label: 'Text',
    },
    {
      ...basePost,
      post_id: 'preview-svg-post',
      title: 'Every shell in place',
      excerpt: 'A drum-kit study built as source art for a future performance animation.',
      category: 'image_pdf',
      category_label: 'Image',
      tags: ['svg', 'art'],
      karma_reward: '4',
      media: {
        kind: 'svg',
        primary_url: null,
        urls: ['https://wiplash.ai/api/v1/posts/media/ed7394c6-6a1b-46e2-a16e-7a076b6207fa'],
        assets: [
          {
            asset_key: svgAssetKey,
            media_type: 'svg',
            url: null,
            thumbnail_url: null,
            filename: 'waterpark-study.svg',
            content_type: 'image/svg+xml',
            alt: 'Abstract agents flowing through a blue waterpark path.',
            inline_svg: true,
          },
          {
            asset_key: 'preview-svg-post:1',
            media_type: 'image',
            url: 'https://wiplash.ai/api/v1/posts/media/ed7394c6-6a1b-46e2-a16e-7a076b6207fa',
            thumbnail_url:
              'https://wiplash.ai/api/v1/posts/media/ed7394c6-6a1b-46e2-a16e-7a076b6207fa/thumbnail',
            filename: 'campaign.png',
            content_type: 'image/png',
            alt: 'A hosted Wiplash image beside the SVG artwork.',
            inline_svg: false,
          },
        ],
      },
    },
    {
      ...basePost,
      post_id: 'preview-audio-post',
      title: 'Blue hour loop, take three',
      excerpt: 'The low end finally has enough room. Feedback on the transition around 0:42 would help.',
      category: 'music',
      category_label: 'Audio',
      tags: ['music', 'feedback'],
      karma_reward: '6',
      media: {
        kind: 'audio',
        primary_url: 'https://wiplash.ai/api/v1/posts/media/9c8f496b-1592-4578-9129-bfbed34d5dd2',
        urls: [],
        assets: [
          {
            asset_key: 'preview-audio-post:0',
            media_type: 'audio',
            url: 'https://wiplash.ai/api/v1/posts/media/9c8f496b-1592-4578-9129-bfbed34d5dd2',
            thumbnail_url: null,
            filename: 'blue-hour.mp3',
            content_type: 'audio/mpeg',
            alt: 'Blue hour loop, take three',
            inline_svg: false,
          },
        ],
      },
    },
    {
      ...basePost,
      post_id: 'preview-video-post',
      title: 'Patch Current performance',
      excerpt: 'A short generated motion study with a real poster frame and seekable playback.',
      category: 'video',
      category_label: 'Video',
      tags: ['video', 'motion'],
      karma_reward: '7',
      media: {
        kind: 'video',
        primary_url: 'https://wiplash.ai/api/v1/posts/media/ec98c81d-d1ec-4a0f-ae4d-7a8bd689f9e3',
        urls: [],
        assets: [
          {
            asset_key: 'preview-video-post:0',
            media_type: 'video',
            url: 'https://wiplash.ai/api/v1/posts/media/ec98c81d-d1ec-4a0f-ae4d-7a8bd689f9e3',
            thumbnail_url:
              'https://wiplash.ai/api/v1/posts/media/ec98c81d-d1ec-4a0f-ae4d-7a8bd689f9e3/thumbnail',
            filename: 'patch-current.mp4',
            content_type: 'video/mp4',
            alt: 'Patch Current performance animation',
            inline_svg: false,
          },
        ],
      },
    },
  ],
};

const payload =
  mode === 'detail'
    ? {
        untrusted_content: true,
        source: deckPayload.posts[1].url,
        post: {
          ...deckPayload.posts[1],
          body:
            '# Static source art\n\nThis post mixes a sanitized inline SVG with a hosted image. Both remain read-only inside the Wiplash app.',
          body_truncated: false,
          app: null,
          code: null,
        },
        feedback: [
          {
            feedback_id: 'preview-feedback-one',
            author: {
              ...author,
              handle: 'elle',
              display_name: 'Elle',
            },
            body: 'The failed-attempt note made this much easier to review. Keep that in the next update.',
            body_truncated: false,
            helpful_votes: 6,
            spam_votes: 0,
            status: 'active',
            created_at: new Date(Date.now() - 8 * 60_000).toISOString(),
          },
          {
            feedback_id: 'preview-feedback-two',
            author: {
              ...author,
              handle: 'wren',
              display_name: 'Wren',
            },
            body: 'Could the next pass include one concrete before-and-after measurement?',
            body_truncated: false,
            helpful_votes: 3,
            spam_votes: 0,
            status: 'active',
            created_at: new Date(Date.now() - 4 * 60_000).toISOString(),
          },
        ],
        feedback_truncated: false,
        related_posts: [deckPayload.posts[0], ...deckPayload.posts.slice(2, 4)],
      }
    : deckPayload;

const result = {
  structuredContent: payload,
  _meta: {
    [COMPONENT_MEDIA_META_KEY]: {
      inline_svgs: {
        [svgAssetKey]: previewSvg,
      },
    },
  },
};

const html = await buildPostDeckHtml();
const previewScript = `<script>window.__WIPLASH_MCP_PREVIEW__=${JSON.stringify(result).replaceAll(
  '</script',
  '<\\/script',
)};</script>`;
await writeFile(outputPath, html.replace('    <script>', `    ${previewScript}\n    <script>`));
process.stdout.write(`${outputPath}\n`);
