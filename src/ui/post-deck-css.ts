export const POST_DECK_CSS = String.raw`
:root {
  color-scheme: dark;
  --wp-bg: #0a0f16;
  --wp-surface: #101721;
  --wp-surface-raised: #151e2a;
  --wp-line: #2a3442;
  --wp-line-soft: #202a36;
  --wp-text: #f4f7fb;
  --wp-muted: #9ca8b8;
  --wp-faint: #758194;
  --wp-blue: #168fc7;
  --wp-blue-bright: #58c8f4;
  --wp-purple: #9b7bf5;
  --wp-crimson: #d9526f;
  --wp-gold: #e0aa35;
  --wp-success: #45b990;
  --wp-danger: #d86975;
  --wp-shadow: 0 12px 34px rgb(0 0 0 / 22%);
}

:root[data-theme='light'] {
  color-scheme: light;
  --wp-bg: #f5f7fa;
  --wp-surface: #ffffff;
  --wp-surface-raised: #f1f4f8;
  --wp-line: #cfd7e2;
  --wp-line-soft: #e4e9f0;
  --wp-text: #111925;
  --wp-muted: #596779;
  --wp-faint: #718095;
  --wp-blue: #087dac;
  --wp-blue-bright: #087dac;
  --wp-purple: #7157c6;
  --wp-crimson: #bd3e5b;
  --wp-gold: #9a6d0b;
  --wp-success: #197c5d;
  --wp-danger: #b93f4e;
  --wp-shadow: 0 12px 34px rgb(31 45 61 / 12%);
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-width: 0;
  background: transparent;
  color: var(--color-text-primary, var(--wp-text));
  font-family: var(--font-sans, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
  letter-spacing: 0;
}

button,
audio,
video {
  font: inherit;
}

button {
  color: inherit;
}

.wiplash-app {
  width: 100%;
  max-width: 780px;
  margin: 0 auto;
  padding: 2px;
}

.post-deck-loading,
.post-deck-error,
.post-deck-empty {
  min-height: 156px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid var(--color-border-secondary, var(--wp-line));
  border-radius: 8px;
  background: var(--color-background-secondary, var(--wp-surface));
  color: var(--color-text-secondary, var(--wp-muted));
  font-size: 14px;
}

.post-deck-loading__mark {
  width: 18px;
  height: 18px;
  border: 2px solid var(--wp-line);
  border-top-color: var(--wp-blue-bright);
  border-radius: 50%;
  animation: wp-spin 600ms linear infinite;
}

@keyframes wp-spin {
  to { transform: rotate(360deg); }
}

.post-deck-shell {
  overflow: hidden;
  border: 1px solid var(--color-border-secondary, var(--wp-line));
  border-radius: 8px;
  background: var(--color-background-primary, var(--wp-bg));
  box-shadow: var(--wp-shadow);
}

.post-deck-bar {
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--color-border-secondary, var(--wp-line));
  background: var(--color-background-secondary, var(--wp-surface));
}

.post-deck-brand {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 9px;
}

.post-deck-brand__mark {
  width: 10px;
  height: 26px;
  flex: 0 0 auto;
  border-radius: 3px;
  background: linear-gradient(180deg, var(--wp-blue-bright), var(--wp-purple) 55%, var(--wp-crimson));
}

.post-deck-brand__name {
  color: var(--color-text-primary, var(--wp-text));
  font-size: 15px;
  font-weight: 750;
  line-height: 1.1;
}

.post-deck-brand__view {
  margin-top: 2px;
  color: var(--color-text-secondary, var(--wp-muted));
  font-size: 11px;
  line-height: 1.2;
}

.post-deck-count {
  flex: 0 0 auto;
  color: var(--color-text-secondary, var(--wp-muted));
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.post-deck-list {
  display: block;
}

.post-card {
  position: relative;
  padding: 15px 16px 13px;
  background: var(--color-background-primary, var(--wp-bg));
}

.post-card + .post-card {
  border-top: 1px solid var(--color-border-secondary, var(--wp-line));
}

.post-card:hover {
  background: color-mix(in srgb, var(--color-background-secondary, var(--wp-surface)) 64%, transparent);
}

.post-card__header {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: start;
  gap: 10px;
}

.agent-avatar {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--wp-line);
  border-radius: 50%;
  background: var(--wp-surface-raised);
  color: var(--wp-muted);
}

.agent-avatar img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.agent-avatar svg {
  width: 20px;
  height: 20px;
}

.post-author {
  min-width: 0;
  padding-top: 1px;
}

.post-author__line {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 5px;
}

.post-author__name {
  overflow: hidden;
  color: var(--color-text-primary, var(--wp-text));
  font-size: 13px;
  font-weight: 700;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-author__verified {
  width: 15px;
  height: 15px;
  flex: 0 0 auto;
  color: var(--wp-blue-bright);
}

.post-author__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 3px;
  color: var(--color-text-secondary, var(--wp-muted));
  font-size: 11px;
  line-height: 1.3;
}

.post-type {
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border: 1px solid var(--wp-line);
  border-radius: 999px;
  background: var(--wp-surface-raised);
  color: var(--wp-muted);
  font-size: 10px;
  font-weight: 650;
  line-height: 1;
  white-space: nowrap;
}

.post-type svg {
  width: 13px;
  height: 13px;
  color: var(--wp-blue-bright);
}

.post-card__content {
  margin-left: 52px;
  padding-top: 8px;
}

.post-card__title {
  margin: 0 0 6px;
  color: var(--color-text-primary, var(--wp-text));
  font-size: 17px;
  font-weight: 760;
  line-height: 1.28;
  overflow-wrap: anywhere;
}

.post-copy {
  color: color-mix(in srgb, var(--color-text-primary, var(--wp-text)) 90%, var(--wp-muted));
  font-size: 14px;
  line-height: 1.58;
  overflow-wrap: anywhere;
}

.post-copy--excerpt {
  position: relative;
  max-height: 132px;
  overflow: hidden;
}

.post-copy--excerpt::after {
  content: '';
  position: absolute;
  inset: auto 0 0;
  height: 28px;
  pointer-events: none;
  background: linear-gradient(transparent, var(--color-background-primary, var(--wp-bg)));
}

.post-card:hover .post-copy--excerpt::after {
  background: linear-gradient(transparent, color-mix(in srgb, var(--color-background-secondary, var(--wp-surface)) 64%, var(--wp-bg)));
}

.post-copy > :first-child {
  margin-top: 0;
}

.post-copy > :last-child {
  margin-bottom: 0;
}

.post-copy p,
.post-copy ul,
.post-copy ol,
.post-copy blockquote,
.post-copy pre {
  margin: 0 0 9px;
}

.post-copy h1,
.post-copy h2,
.post-copy h3 {
  margin: 12px 0 6px;
  color: var(--color-text-primary, var(--wp-text));
  font-size: 1em;
  line-height: 1.35;
}

.post-copy ul,
.post-copy ol {
  padding-left: 20px;
}

.post-copy li + li {
  margin-top: 3px;
}

.post-copy blockquote {
  padding-left: 11px;
  border-left: 2px solid var(--wp-purple);
  color: var(--wp-muted);
}

.post-copy code {
  border-radius: 4px;
  background: var(--wp-surface-raised);
  color: var(--wp-blue-bright);
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.88em;
}

.post-copy :not(pre) > code {
  padding: 1px 4px;
}

.post-copy pre {
  overflow-x: auto;
  padding: 10px;
  border: 1px solid var(--wp-line-soft);
  border-radius: 6px;
  background: var(--wp-surface-raised);
}

.post-copy pre code {
  padding: 0;
  background: transparent;
  color: inherit;
}

.post-copy a {
  color: var(--wp-blue-bright);
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, var(--wp-blue-bright) 42%, transparent);
  text-underline-offset: 2px;
  cursor: pointer;
}

.post-copy img {
  width: auto;
  max-width: 100%;
  max-height: 300px;
  display: block;
  margin: 10px auto;
  border: 1px solid var(--wp-line);
  border-radius: 6px;
  object-fit: contain;
  background: #070b10;
}

.post-media {
  margin-top: 12px;
}

.post-media__gallery {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(82%, 1fr);
  gap: 7px;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scroll-snap-type: inline mandatory;
  scrollbar-width: thin;
}

.post-media__image {
  min-height: 150px;
  max-height: 330px;
  display: grid;
  place-items: center;
  overflow: hidden;
  scroll-snap-align: start;
  border: 1px solid var(--wp-line);
  border-radius: 7px;
  background: #070b10;
}

.post-media__image img {
  width: 100%;
  max-height: 330px;
  display: block;
  object-fit: contain;
}

.post-media__count {
  margin-top: 5px;
  color: var(--wp-faint);
  font-size: 10px;
  text-align: right;
}

.post-media audio,
.post-media video {
  width: 100%;
  display: block;
  accent-color: var(--wp-blue);
}

.post-media audio {
  height: 40px;
}

.post-media video {
  max-height: 360px;
  border: 1px solid var(--wp-line);
  border-radius: 7px;
  background: #05080c;
}

.post-topics {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 10px;
}

.post-topic {
  color: var(--wp-blue-bright);
  font-size: 11px;
  line-height: 1.3;
}

.post-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--wp-line-soft);
}

.post-metrics,
.post-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}

.post-metric {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--wp-muted);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.post-metric svg {
  width: 14px;
  height: 14px;
}

.post-metric--karma svg {
  color: var(--wp-purple);
  fill: color-mix(in srgb, var(--wp-purple) 18%, transparent);
}

.post-action {
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 5px 9px;
  border: 1px solid var(--wp-line);
  border-radius: 999px;
  background: transparent;
  color: var(--color-text-secondary, var(--wp-muted));
  font-size: 10px;
  font-weight: 650;
  line-height: 1;
  cursor: pointer;
  transition: border-color 100ms ease, color 100ms ease, background-color 100ms ease;
}

.post-action:hover,
.post-action:focus-visible {
  border-color: var(--wp-blue);
  background: color-mix(in srgb, var(--wp-blue) 10%, transparent);
  color: var(--wp-blue-bright);
}

.post-action:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--wp-blue-bright) 48%, transparent);
  outline-offset: 2px;
}

.post-action svg {
  width: 14px;
  height: 14px;
}

.post-feedback {
  margin: 14px 0 0 52px;
  padding-top: 13px;
  border-top: 1px solid var(--wp-line-soft);
}

.post-feedback__title,
.related-posts__title {
  margin: 0 0 8px;
  color: var(--color-text-primary, var(--wp-text));
  font-size: 12px;
  font-weight: 720;
}

.feedback-row {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 8px;
  padding: 8px 0;
}

.feedback-row + .feedback-row {
  border-top: 1px solid var(--wp-line-soft);
}

.feedback-row .agent-avatar {
  width: 30px;
  height: 30px;
}

.feedback-row .agent-avatar svg {
  width: 15px;
  height: 15px;
}

.feedback-row__author {
  color: var(--color-text-primary, var(--wp-text));
  font-size: 11px;
  font-weight: 700;
}

.feedback-row__body {
  margin-top: 3px;
  color: color-mix(in srgb, var(--color-text-primary, var(--wp-text)) 88%, var(--wp-muted));
  font-size: 12px;
  line-height: 1.48;
  overflow-wrap: anywhere;
}

.feedback-row__meta {
  display: flex;
  gap: 8px;
  margin-top: 5px;
  color: var(--wp-faint);
  font-size: 9px;
}

.post-feedback details > summary {
  margin-top: 6px;
  color: var(--wp-blue-bright);
  font-size: 11px;
  cursor: pointer;
}

.related-posts {
  margin: 14px 0 0 52px;
  padding-top: 13px;
  border-top: 1px solid var(--wp-line-soft);
}

.related-posts__list {
  display: grid;
  gap: 6px;
}

.related-post {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--wp-line-soft);
  border-radius: 6px;
  background: var(--wp-surface-raised);
  color: var(--color-text-primary, var(--wp-text));
  text-align: left;
  cursor: pointer;
}

.related-post:hover,
.related-post:focus-visible {
  border-color: var(--wp-blue);
}

.related-post__copy {
  min-width: 0;
}

.related-post__title {
  overflow: hidden;
  font-size: 11px;
  font-weight: 680;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.related-post__author {
  margin-top: 2px;
  color: var(--wp-muted);
  font-size: 9px;
}

.related-post svg {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
  color: var(--wp-blue-bright);
}

@media (max-width: 520px) {
  .wiplash-app {
    padding: 0;
  }

  .post-deck-shell {
    border-radius: 7px;
  }

  .post-deck-bar {
    padding-inline: 12px;
  }

  .post-card {
    padding: 13px 12px 12px;
  }

  .post-card__header {
    grid-template-columns: 38px minmax(0, 1fr);
  }

  .agent-avatar {
    width: 38px;
    height: 38px;
  }

  .post-type {
    grid-column: 2;
    width: max-content;
    margin-top: 2px;
  }

  .post-card__content,
  .post-feedback,
  .related-posts {
    margin-left: 48px;
  }

  .post-card__title {
    font-size: 16px;
  }

  .post-copy {
    font-size: 13px;
  }

  .post-card__footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .post-actions {
    width: 100%;
  }

  .post-action {
    flex: 1 1 auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
  }
}
`;
