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

The PNG files in `screenshots/` were captured from the production Wiplash app inside ChatGPT. Each prompt asks Wiplash to discover the relevant post instead of relying on a pasted post URL. The captures contain only the rendered Wiplash response, never the surrounding AI-client prompt, navigation, or private account data.

| File | Paired reviewer prompt |
| --- | --- |
| `01-chatgpt-mixed-post-deck.png` | `Find four recent Wiplash posts, including one text post, one image post, one audio post, and one video post. Show them as interactive post cards.` |
| `02-chatgpt-image-post.png` | `Use Wiplash search to find Buzzberg's image post about a front door installing an update. Open the best matching result as a full interactive post with its feedback and related posts.` |
| `03-chatgpt-audio-post.png` | `Use Wiplash search to find Elle's audio post about FERC's data-centre fast lane and a hard exit toll. Open the best matching result as a playable interactive post with its feedback and related posts.` |
| `04-chatgpt-video-post.png` | `Use Wiplash search to find Naganaworkhere's video post called Stapler Echo Chamber visual. Open the best matching result as a playable interactive post with its feedback and related posts.` |

The image, audio, and video prompts intentionally identify posts using natural details a human could remember. They exercise search, result selection, post retrieval, related-post discovery, feedback retrieval, and in-client media rendering without requiring a Wiplash URL.

Before submitting, compare the captures with the deployed production connector. Recapture a file when the production UI changes materially. The checked-in files under `fixtures/` are local renderer regression fixtures; do not submit them as product screenshots.

### OpenAI Portal Derivatives

The `portal/` directory contains submission-safe derivatives of the production captures. They preserve the approved response UI while matching the OpenAI portal requirement of exactly `706px` wide and between `400px` and `860px` tall.

Use these three prompt and screenshot pairs for the ChatGPT submission:

| Portal file | Submission prompt |
| --- | --- |
| `portal/01-chatgpt-mixed-post-deck.png` | `Find recent text, image, audio, and video posts on Wiplash and show them as interactive cards.` |
| `portal/02-chatgpt-image-post.png` | `Find Buzzberg's front-door update image post and open it with feedback and related posts.` |
| `portal/04-chatgpt-video-post.png` | `Find Naganaworkhere's Stapler Echo Chamber visual and open the playable video post.` |

`portal/03-chatgpt-audio-post.png` is retained as an alternate reviewer asset. The portal currently accepts at most three prompts.

## Local Renderer Fixtures

Generate the local fixtures with:

```bash
npm run preview:ui -- /tmp/wiplash-mcp-submission-deck.html submission-deck
node scripts/build-ui-preview.mjs /tmp/wiplash-mcp-detail.html detail
node scripts/build-ui-preview.mjs /tmp/wiplash-mcp-audio.html audio
node scripts/build-ui-preview.mjs /tmp/wiplash-mcp-video.html video
```
