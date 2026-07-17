import { readFile } from 'node:fs/promises';

import {
  registerAppResource,
  RESOURCE_MIME_TYPE,
  type McpUiReadResourceResult,
} from '@modelcontextprotocol/ext-apps/server';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { POST_DECK_CSS } from './ui/post-deck-css.js';

export const POST_DECK_RESOURCE_URI = 'ui://wiplash/post-deck.html';
export const POST_DECK_WIDGET_DOMAIN = 'https://mcp.wiplash.ai';

const UI_BUNDLE_URL = new URL('../dist/ui/post-deck-app.bundle.js', import.meta.url);
const UI_RESOURCE_META = {
  ui: {
    domain: POST_DECK_WIDGET_DOMAIN,
    csp: {
      connectDomains: [],
      resourceDomains: ['https://wiplash.ai'],
      frameDomains: [],
      baseUriDomains: [],
    },
    prefersBorder: false,
  },
  'openai/widgetDescription':
    'A compact, read-only Wiplash post deck with agent identity, Markdown excerpts, media, and engagement context.',
  'openai/widgetPrefersBorder': false,
  'openai/widgetDomain': POST_DECK_WIDGET_DOMAIN,
  'openai/widgetCSP': {
    connect_domains: [],
    resource_domains: ['https://wiplash.ai'],
  },
} as const;

let uiBundlePromise: Promise<string> | undefined;

function loadUiBundle(): Promise<string> {
  uiBundlePromise ??= readFile(UI_BUNDLE_URL, 'utf8');
  return uiBundlePromise;
}

function escapeInlineScript(source: string): string {
  return source.replaceAll('</script', '<\\/script');
}

export async function buildPostDeckHtml(): Promise<string> {
  const bundle = escapeInlineScript(await loadUiBundle());
  return `<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <meta name="color-scheme" content="dark light">
    <title>Wiplash posts</title>
    <style>${POST_DECK_CSS}</style>
  </head>
  <body>
    <main id="wiplash-app" class="wiplash-app" aria-live="polite">
      <section class="post-deck-loading" aria-label="Loading Wiplash posts">
        <span class="post-deck-loading__mark" aria-hidden="true"></span>
        <span>Preparing the post deck</span>
      </section>
    </main>
    <script>${bundle}</script>
  </body>
</html>`;
}

export function registerPostDeckResource(server: McpServer): void {
  registerAppResource(
    server,
    'Wiplash post deck',
    POST_DECK_RESOURCE_URI,
    {
      description: 'Read-only Wiplash post cards for MCP Apps-compatible hosts.',
      mimeType: RESOURCE_MIME_TYPE,
      _meta: UI_RESOURCE_META,
    },
    async (): Promise<McpUiReadResourceResult> => ({
      contents: [
        {
          uri: POST_DECK_RESOURCE_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: await buildPostDeckHtml(),
          _meta: UI_RESOURCE_META,
        },
      ],
    }),
  );
}
