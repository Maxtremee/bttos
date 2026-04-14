# Technology Stack

**Project:** Twitch webOS Alt
**Researched:** 2026-04-14

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| solid-js | ^1.9.12 | UI framework | No virtual DOM — compiles to direct DOM operations. ~7.6KB gzipped. On constrained TV hardware (Chromium 68 on older webOS 5.x) this matters. React would cost 3-5x the runtime overhead. SolidJS 2.0 is experimental; stay on 1.x stable. |
| vite-plugin-solid | ^2.11.10 | SolidJS Vite integration | Official plugin, maintained alongside SolidJS. Works with Vite 6. |

**Confidence: HIGH** — verified via npm, official GitHub.

---

### Bundler

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vite | ^6.x | Build + dev server | The webOS target is a static HTML/JS/CSS bundle installed as an .ipk. Vite's Rollup-based production output produces a clean dist/ folder suitable for `ares-package`. Vite 7/8 require Node 20+; stay on Vite 6 unless the build environment is updated. Do NOT use Vite's SSR or server features — the webOS runtime has no Node server. |

**Build target note:** webOS 5.x uses Chromium 68 (ES2015+ with some gaps); webOS 6+ likely uses Chromium 79+. Configure `build.target` in vite.config.ts to `['chrome68']` for broadest compat. Avoid using `@vitejs/plugin-legacy` (transforms to ES5) — webOS's Chromium supports ES2015 and legacy transforms add dead weight.

**Confidence: MEDIUM** — Chromium 68 for webOS 5.x confirmed via signageOS docs and community; exact newer versions not confirmed from official source.

---

### Video Playback

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| hls.js | ^1.6.x | HLS playback via MSE | Twitch streams are delivered as HLS. HLS.js drives MSE/EME directly in Chromium. webOS 5+ has MSE support. The native `<video>` HLS path on webOS is unreliable — limited to HLS spec version 7 (Pantos draft 2014), broken EXT-X-DISCONTINUITY support, and missing key tags. HLS.js overcomes these by managing buffers in JS. |

**Why not native `<video src=".m3u8">`:** Native HLS on webOS does not handle Twitch's variant playlists reliably, freezes on discontinuities, and gives no control over adaptive quality selection.

**Why not Shaka Player:** Designed primarily for DASH + Widevine DRM flows. Shaka explicitly marks webOS as "not officially supported, expected to work." Heavier than HLS.js for an HLS-only use case. Twitch does not use DASH for live streaming.

**Why not dash.js:** Twitch live streaming does not use MPEG-DASH. dash.js is irrelevant to this project.

**Why not THEOplayer/Dolby OptiView:** Commercial SDK. Overkill for a personal open-source alternative client. License cost not justified.

**Known HLS.js + webOS caveats:**
- HLS.js does not list webOS in its official compatibility matrix. It works but is "expected to work" territory.
- Buffer/freeze issues have been reported on older webOS models during DRM discontinuities (not relevant here — Twitch has no client-side DRM).
- Set `maxBufferLength` conservatively (e.g. 30s) to avoid exhausting limited TV RAM.

**Confidence: MEDIUM** — HLS.js on webOS works in practice per community reports; not officially supported.

---

### Twitch API Integration

#### Stream Metadata (Helix REST API)

| Technology | Purpose | Why |
|------------|---------|-----|
| Twitch Helix REST API | Get followed channels, live stream info, user data | Official, stable, documented. No unofficial APIs needed for UI data. |

**Key endpoints:**
- `GET /helix/channels/followed?user_id={id}` — scope: `user:read:follows` — returns list of followed channels (paginated)
- `GET /helix/streams?user_id={id1}&user_id={id2}...` — no additional scope — filter followed channels to live-only

**Pagination note:** There is no single "Get Followed Live Streams" endpoint in Helix. The two-step approach (get followed channels, then batch-query streams) is the official pattern. For typical users following 100-300 channels, this requires 2-6 API requests. Cache the followed channel list; poll streams every 30-60 seconds.

**Confidence: HIGH** — official Twitch developer docs verified.

---

#### Stream URL Acquisition (Twitch GQL + Usher)

This is the technically complex part. Twitch does NOT expose HLS stream URLs through the official Helix API.

**The actual flow (reverse-engineered, used by Streamlink and all alternative clients):**

1. POST to `https://gql.twitch.tv/gql` with the `PlaybackAccessToken` persisted query to get a `{value, signature}` pair. This requires a Twitch Client-ID and an OAuth token in the request headers.
2. GET `https://usher.ttvnw.net/api/v2/channel/hls/{channel}.m3u8?sig={signature}&token={value}&...` — returns the master HLS playlist with quality variants.
3. Pick the best quality variant URL (or first entry for auto-quality) and feed it to HLS.js.

**Client-Integrity Token risk:** Since mid-2023, Twitch intermittently requires a "client integrity token" when calling PlaybackAccessToken. This token is generated by Twitch's anti-bot JavaScript running in a real browser. For a webOS app running inside an actual Chromium browser, this is less of a problem — the app IS a browser context. However, making raw GQL calls from an app context (not the Twitch website) may trigger rejection. This is the single biggest technical risk in the stack.

**Mitigation approaches (in order of preference):**
1. Use the user's real OAuth token from device-code flow in GQL headers. Authenticated requests are less aggressively integrity-checked.
2. If integrity tokens are required, investigate whether the webOS Chromium environment allows injecting Twitch's own integrity scripts. This is uncertain.
3. Monitor community implementations (e.g., streamlink-twitch-gui, Xtra for Android) for patterns that bypass this.

**What NOT to do:** Do not use the official Helix API for stream URLs — there is no endpoint for it. Do not attempt to scrape the Twitch web page DOM. Do not build a proxy server unless self-hosted (complexity out of scope for v1).

**Confidence: MEDIUM** — GQL + Usher is a well-documented reverse-engineered flow, actively used by Streamlink 8.3.0, but Twitch could break it without notice. Client-integrity requirement is intermittent and risk is LOW to MEDIUM for authenticated OAuth requests from a browser context.

---

### Authentication

| Technology | Purpose | Why |
|------------|---------|-----|
| Twitch OAuth Device Code Grant Flow | User login without keyboard | Purpose-built for devices with "limited input capabilities" — exactly a TV remote. Returns both access and refresh tokens. |

**Flow:**
1. POST `https://id.twitch.tv/oauth2/device` with `client_id` and `scope=user:read:follows`
2. Display `user_code` on screen (large, readable from the couch) with `verification_uri` (twitch.tv/activate)
3. Poll `https://id.twitch.tv/oauth2/token` with `device_code` and `grant_type=urn:ietf:params:oauth:grant-type:device_code`
4. On success, store `access_token` and `refresh_token` in `localStorage`

**App registration:** Register a "Public" client type application in Twitch dev console. Public client = no client_secret needed, appropriate for an open-source app running on user hardware.

**Token storage:** `localStorage` on webOS persists across app launches (same as browser localStorage). Acceptable for a personal-use app. Do not use sessionStorage (lost on app close).

**Scopes needed (minimum):**
- `user:read:follows` — get followed channels

**Confidence: HIGH** — official Twitch docs confirm device code grant flow is explicitly supported for TV/limited-input apps.

---

### Spatial Navigation (D-pad Focus Management)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @lampa-dev/solidjs-spatial-navigation | latest | TV remote D-pad navigation | Direct SolidJS port of the battle-tested Norigin Spatial Navigation library. Works on LG webOS, Samsung Tizen, Hisense Vidaa. Handles directional focus calculation automatically — no manual "on right press, go to element X" wiring. |

**Why not implement focus management manually:** Spatial navigation on complex grid layouts (channel list, settings) with a D-pad is a solved problem. Rolling your own means handling edge cases across different focus states indefinitely.

**Why not Norigin's React version:** It uses React hooks (useRef, useFocusable) which don't map to SolidJS primitives. The lampa-dev fork re-implements with SolidJS signals.

**Fallback:** If `@lampa-dev/solidjs-spatial-navigation` proves insufficiently maintained, the underlying engine from `@noriginmedia/norigin-spatial-navigation` can be used headlessly (the core algorithm is framework-agnostic) with manual SolidJS bindings.

**Confidence: MEDIUM** — package exists, confirmed on npm, described as webOS-compatible, but it's a community fork with lower maintenance guarantees than the React original.

---

### webOS SDK Tooling

| Tool | Version | Purpose | Why |
|------|---------|---------|-----|
| webOS CLI (`@webosose/ares-cli`) | ^3.2.0 | Package, install, launch app on device | Official LG toolchain. Replaces the deprecated `webos-tv-cli`. Core commands: `ares-package` (produce .ipk), `ares-install` (sideload to TV in developer mode), `ares-launch` (run app). |
| webOS TV Simulator | 1.4.1 | Test without physical device | Bundled with webOS TV SDK v10.0.0. Useful for UI iteration but does NOT accurately replicate real TV hardware performance. Always test on device before finalizing. |

**Developer mode setup on TV:** LG TVs require enabling Developer Mode via the webOS TV Dev Manager app. `ares-setup-device` registers the device with the CLI.

**appinfo.json requirements (must include):**
- `id` — reverse-domain app ID (e.g. `com.yourname.twitchalt`)
- `version`
- `title`
- `main` — entry HTML file (e.g. `index.html`)
- `icon`
- `type: "web"`

**Confidence: HIGH** — verified against official LG developer documentation; SDK v10.0.0 / CLI v3.2.0 released March 2025.

---

## What NOT to Use

| Option | Reason to Avoid |
|--------|----------------|
| React | Virtual DOM overhead is the exact problem we're avoiding on constrained TV hardware. No justification over SolidJS given the project constraints already chose SolidJS. |
| LightningJS | WebGL-based renderer — powerful for animation-heavy apps. This app is mostly static list + video. Adds significant complexity and a non-standard component model for no benefit here. |
| webpack | Slower DX, larger config surface than Vite. No advantage for this project. |
| dash.js | Twitch live streams are HLS, not DASH. |
| Shaka Player | DASH-primary, not officially webOS-supported, heavier than HLS.js for this use case. |
| Official Twitch Helix API for stream URLs | Does not provide HLS stream URLs. There is no official endpoint. |
| Twitch GQL unauthenticated | Integrity-check failures are more likely without a valid OAuth token. Always use the user's auth token in GQL calls. |
| IndexedDB for token storage | Overkill. `localStorage` is sufficient and simpler for a single user token. |
| SolidJS 2.0-experimental | API unstable. Stick to 1.9.x stable. |
| Vite 7/8 | Require Node 20+. Avoid unless Node environment is confirmed modern. Vite 6 is stable and sufficient. |

---

## Installation

```bash
# Scaffold
npm create vite@6 . -- --template solid-ts

# Core framework (should be pre-installed by scaffold)
npm install solid-js

# SolidJS Vite plugin (should be pre-installed by scaffold)
npm install -D vite-plugin-solid

# HLS playback
npm install hls.js

# Spatial navigation for SolidJS
npm install @lampa-dev/solidjs-spatial-navigation

# webOS CLI (global)
npm install -g @webosose/ares-cli
```

**TypeScript:** Use TypeScript. solid-ts template includes it. `solid-js` ships its own types. HLS.js ships its own types. This is a small app — type safety catches integration errors with the Helix API response shapes early.

---

## Vite Config Essentials

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid()],
  build: {
    target: ['chrome68'],   // webOS 5.x baseline (Chromium 68)
    outDir: 'dist',
    assetsInlineLimit: 0,   // webOS file:// origin — avoid inlined base64 for large assets
  },
  base: './',               // CRITICAL: webOS apps run from file:// — must use relative paths
})
```

The `base: './'` setting is non-negotiable. Without it, Vite outputs absolute paths (`/assets/...`) which break under the webOS `file://` origin.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | SolidJS | React | Project constraint + performance rationale: no VDOM on TV hardware |
| Framework | SolidJS | Vue 3 | Less performant on low-end hardware; no compelling advantage |
| Renderer | SolidJS DOM | LightningJS + SolidJS | WebGL renderer overkill for a list+video app |
| HLS Player | hls.js | Shaka Player | DASH-primary, heavier, not officially webOS-supported |
| HLS Player | hls.js | Native `<video>` | Unreliable on webOS; no adaptive quality control |
| HLS Player | hls.js | THEOplayer | Commercial license |
| Navigation | @lampa-dev/solidjs-spatial-navigation | Manual D-pad handlers | Known-hard problem; use the solved library |
| Bundler | Vite 6 | webpack | No advantage; slower DX |
| Auth | Device code flow | QR code (custom) | Device code is natively supported by Twitch; simpler to implement |

---

## Sources

- [Twitch Authentication Docs — Device Code Grant Flow](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#device-code-grant-flow) — HIGH confidence
- [Twitch Helix API Reference](https://dev.twitch.tv/docs/api/reference/) — HIGH confidence
- [webOS TV SDK Introduction](https://webostv.developer.lge.com/develop/tools/sdk-introduction) — HIGH confidence
- [HLS.js GitHub](https://github.com/video-dev/hls.js/) — HIGH confidence
- [HLS.js npm (v1.6.15)](https://www.npmjs.com/package/hls.js) — HIGH confidence
- [solid-js npm (v1.9.12)](https://www.npmjs.com/package/solid-js) — HIGH confidence
- [vite-plugin-solid npm (v2.11.10)](https://www.npmjs.com/package/vite-plugin-solid) — HIGH confidence
- [Dolby OptiView — Choosing a webOS Video Player](https://optiview.dolby.com/resources/blog/playback/how-to-build-a-webos-tv-streaming-app-for-lg-choosing-a-video-player/) — MEDIUM confidence
- [Dolby OptiView — webOS Native Player Limitations](https://optiview.dolby.com/resources/blog/playback/limitations-to-bringing-media-to-lgs-webos/) — MEDIUM confidence
- [Streamlink Twitch Plugin (GQL + Usher flow)](https://streamlink.github.io/cli/plugins/twitch.html) — MEDIUM confidence (reverse-engineered)
- [Norigin Spatial Navigation — 2025 Award Nomination](https://noriginmedia.com/norigin-spatial-navigation-open-source-library-for-smart-tvs-nominated-for-streaming-innovation-award-2025/) — MEDIUM confidence
- [@lampa-dev/solidjs-spatial-navigation](https://www.npmjs.com/package/@lampa-dev/solidjs-spatial-navigation) — MEDIUM confidence
- [webOS TV CLI Developer Guide](https://webostv.developer.lge.com/develop/tools/webos-tv-cli-dev-guide) — HIGH confidence
- [webOS Chromium versions by platform — signageOS](https://docs.signageos.io/hc/en-us/articles/4405381554578-Browser-WebKit-and-Chromium-versions-by-each-Platform) — MEDIUM confidence
- [Streamlink Twitch plugin source — GQL PlaybackAccessToken](https://github.com/streamlink/streamlink/blob/master/src/streamlink/plugins/twitch.py) — MEDIUM confidence (community reverse-engineering)
