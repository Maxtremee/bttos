<!-- GSD:project-start source:PROJECT.md -->
## Project

**Twitch webOS Alt**

An alternative Twitch client for LG webOS TVs, replacing the slow and feature-poor official app. A lean, focused stream viewer for users who manage channels and chat from their phone or PC — the TV is purely a display device.

**Core Value:** User can log in, see their followed channels, pick one, and watch the stream with chat — fast and reliably on webOS TV hardware.

### Constraints

- **Tech stack**: SolidJS — chosen for minimal bundle size and fine-grained reactivity on constrained TV hardware
- **Platform**: webOS TV apps are web apps running in a built-in browser engine
- **Input**: Must be fully navigable with a standard TV remote (D-pad + OK + Back)
- **Auth**: No physical keyboard available — must use device code flow or QR code for login
- **Performance**: Must feel responsive on low-end webOS TV hardware
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| solid-js | ^1.9.12 | UI framework | No virtual DOM — compiles to direct DOM operations. ~7.6KB gzipped. On constrained TV hardware (Chromium 68 on older webOS 5.x) this matters. React would cost 3-5x the runtime overhead. SolidJS 2.0 is experimental; stay on 1.x stable. |
| vite-plugin-solid | ^2.11.10 | SolidJS Vite integration | Official plugin, maintained alongside SolidJS. Works with Vite 6. |
### Bundler
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vite | ^6.x | Build + dev server | The webOS target is a static HTML/JS/CSS bundle installed as an .ipk. Vite's Rollup-based production output produces a clean dist/ folder suitable for `ares-package`. Vite 7/8 require Node 20+; stay on Vite 6 unless the build environment is updated. Do NOT use Vite's SSR or server features — the webOS runtime has no Node server. |
### Video Playback
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| hls.js | ^1.6.x | HLS playback via MSE | Twitch streams are delivered as HLS. HLS.js drives MSE/EME directly in Chromium. webOS 5+ has MSE support. The native `<video>` HLS path on webOS is unreliable — limited to HLS spec version 7 (Pantos draft 2014), broken EXT-X-DISCONTINUITY support, and missing key tags. HLS.js overcomes these by managing buffers in JS. |
- HLS.js does not list webOS in its official compatibility matrix. It works but is "expected to work" territory.
- Buffer/freeze issues have been reported on older webOS models during DRM discontinuities (not relevant here — Twitch has no client-side DRM).
- Set `maxBufferLength` conservatively (e.g. 30s) to avoid exhausting limited TV RAM.
### Twitch API Integration
#### Stream Metadata (Helix REST API)
| Technology | Purpose | Why |
|------------|---------|-----|
| Twitch Helix REST API | Get followed channels, live stream info, user data | Official, stable, documented. No unofficial APIs needed for UI data. |
- `GET /helix/channels/followed?user_id={id}` — scope: `user:read:follows` — returns list of followed channels (paginated)
- `GET /helix/streams?user_id={id1}&user_id={id2}...` — no additional scope — filter followed channels to live-only
#### Stream URL Acquisition (Twitch GQL + Usher)
### Authentication
| Technology | Purpose | Why |
|------------|---------|-----|
| Twitch OAuth Device Code Grant Flow | User login without keyboard | Purpose-built for devices with "limited input capabilities" — exactly a TV remote. Returns both access and refresh tokens. |
- `user:read:follows` — get followed channels
### Spatial Navigation (D-pad Focus Management)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @lampa-dev/solidjs-spatial-navigation | latest | TV remote D-pad navigation | Direct SolidJS port of the battle-tested Norigin Spatial Navigation library. Works on LG webOS, Samsung Tizen, Hisense Vidaa. Handles directional focus calculation automatically — no manual "on right press, go to element X" wiring. |
### webOS SDK Tooling
| Tool | Version | Purpose | Why |
|------|---------|---------|-----|
| webOS CLI (`@webosose/ares-cli`) | ^3.2.0 | Package, install, launch app on device | Official LG toolchain. Replaces the deprecated `webos-tv-cli`. Core commands: `ares-package` (produce .ipk), `ares-install` (sideload to TV in developer mode), `ares-launch` (run app). |
| webOS TV Simulator | 1.4.1 | Test without physical device | Bundled with webOS TV SDK v10.0.0. Useful for UI iteration but does NOT accurately replicate real TV hardware performance. Always test on device before finalizing. |
- `id` — reverse-domain app ID (e.g. `com.yourname.twitchalt`)
- `version`
- `title`
- `main` — entry HTML file (e.g. `index.html`)
- `icon`
- `type: "web"`
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
## Installation
# Scaffold
# Core framework (should be pre-installed by scaffold)
# SolidJS Vite plugin (should be pre-installed by scaffold)
# HLS playback
# Spatial navigation for SolidJS
# webOS CLI (global)
## Vite Config Essentials
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
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
