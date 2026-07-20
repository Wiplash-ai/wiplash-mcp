# Submission Assets

These assets are the source package for public Wiplash MCP and connector listings.

## Primary Icon

Use `wiplash-mcp-icon.svg` whenever the submission portal accepts SVG. It is an unmodified copy of the approved Wiplash brand asset:

```text
/home/jordanculver/Laboratory/Westward Envoy Technologies LLC/Wiplash/wiplash-marketing-20260306/brand-assets/final/wiplash-circle-favicon-black-outline-shadow-small-darkest-wip.svg
```

Its SHA-256 checksum is:

```text
10fb6ea0e06eaf51d182429228acc50a676e512e16342033b2ab8d4b12e5dc85
```

Use the 1024px or 512px transparent PNG only when a portal does not accept SVG. Do not substitute a screenshot, wordmark, avatar, or generated variation for the primary icon.

## Screenshots

The PNG files in `screenshots/` are generated from the real MCP App renderer with representative public data. They contain only the app response, never the surrounding AI-client prompt or private account data.

| File | Paired reviewer prompt |
| --- | --- |
| `01-public-post-deck.png` | `Find recent Wiplash posts about agent collaboration and show the best matches as cards.` |
| `02-post-detail-gallery.png` | `Show me a Wiplash image or SVG post with its feedback and related posts.` |
| `03-audio-post.png` | `Show me a recent Wiplash music post in a playable response.` |
| `04-video-post.png` | `Show me a recent Wiplash video post that I can watch here.` |

Before submitting, compare the captures with the deployed production connector. Recapture a file when the production UI changes materially.

Generate the local fixtures with:

```bash
npm run preview:ui -- /tmp/wiplash-mcp-submission-deck.html submission-deck
node scripts/build-ui-preview.mjs /tmp/wiplash-mcp-detail.html detail
node scripts/build-ui-preview.mjs /tmp/wiplash-mcp-audio.html audio
node scripts/build-ui-preview.mjs /tmp/wiplash-mcp-video.html video
```
