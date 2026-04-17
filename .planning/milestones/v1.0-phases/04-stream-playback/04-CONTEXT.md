# Phase 4: Stream Playback - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Selecting a channel from the grid starts the live stream at the best available quality. The player shows a stream info bar, handles errors gracefully (offline, network drops), and uses HLS.js for adaptive bitrate playback via the Twitch GQL + Usher token flow. This phase replaces the PlayerScreen skeleton with a working video player.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation decisions for this phase are deferred to Claude's discretion based on research findings. The requirements (PLAY-01 through PLAY-04) and project constraints are sufficiently specific:

- **Stream URL acquisition:** Use Twitch GQL `PlaybackAccessToken` query + Usher HLS URL construction (per CLAUDE.md — no official Helix endpoint exists for stream URLs). Use the authenticated user's OAuth token in GQL calls to avoid integrity-check failures.
- **HLS playback:** Use hls.js with MSE. Set `maxBufferLength` conservatively (e.g. 30s) per CLAUDE.md to avoid exhausting limited TV RAM. ABR enabled by default for automatic quality selection.
- **Info bar behavior:** Show stream info bar (channel name, title, game, viewer count) on playback start, auto-hide after a few seconds of inactivity. Show again on any remote button press. Standard TV streaming app pattern.
- **Remote controls during playback:** OK or directional press shows/hides info bar. Back button returns to channel list. No play/pause toggle needed for live streams (live is always playing). Volume handled by TV OS natively.
- **Error & offline UX:** If stream goes offline or network drops, show an informative error message overlay on the player screen with a retry option (focusable button). Back returns to channel list. Auto-retry on transient network errors with exponential backoff.
- **Loading transition:** Show a loading indicator (spinner or text) on the player screen while the stream URL is being acquired and HLS is buffering. Transition to video as soon as first frame is available.
- **Chromium 68 compatibility:** hls.js works with MSE on webOS 5+ Chromium 68. No DRM concerns for Twitch.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` — Project vision, constraints (SolidJS, webOS, remote-only navigation)
- `.planning/REQUIREMENTS.md` — PLAY-01 (select and watch), PLAY-02 (ABR quality), PLAY-03 (error recovery), PLAY-04 (info bar)
- `CLAUDE.md` — Tech stack: hls.js v1.6.x, Twitch GQL + Usher flow, maxBufferLength guidance, Chromium 68 target

### Phase 1-3 foundation
- `src/screens/PlayerScreen.tsx` — Existing skeleton to replace with working video player
- `src/App.tsx` — Router with `/player/:channel` route, Back key handler (returns to /channels)
- `src/services/TwitchAuthService.ts` — Token refresh singleton, CLIENT_ID, OAuth token for GQL calls
- `src/stores/authStore.ts` — Reactive auth state (token, userId) for API authorization
- `src/services/TwitchChannelService.ts` — StreamData interface (user_login, user_name, game_name, title, viewer_count)
- `src/navigation/index.ts` — Spatial navigation module (Focusable, useSpatialNavigation) for info bar controls
- `src/styles/global.css` — Design tokens (colors, spacing, typography, focus ring)

### External references
- [Streamlink Twitch plugin — GQL + Usher flow](https://github.com/streamlink/streamlink/blob/master/src/streamlink/plugins/twitch.py) — Reference implementation for PlaybackAccessToken GQL query and Usher URL construction
- [hls.js GitHub](https://github.com/video-dev/hls.js/) — HLS.js configuration, MSE usage, buffer management

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TwitchAuthService` — Token refresh singleton with CLIENT_ID; reuse for GQL authorization headers
- `authStore` — Reactive token for API calls
- `StreamData` interface — Has `user_login`, `user_name`, `game_name`, `title`, `viewer_count` already defined in TwitchChannelService
- `Focusable` component + `useSpatialNavigation()` — For focusable retry buttons and info bar interactions
- CSS custom properties — Full dark theme design token system

### Established Patterns
- SolidJS signals/stores for state management (no external state library)
- `onMount` + `setFocus()` pattern for screen focus initialization
- `createResource` for async data fetching (used in ChannelsScreen)
- Error state pattern with focusable Retry button (used in ChannelsScreen)
- MemoryRouter navigation via `history.set()`

### Integration Points
- `PlayerScreen.tsx` — Replace skeleton placeholder with video player + info bar + error overlay
- `/player/:channel` route param — Channel login name passed from ChannelGrid navigation
- Back key in App.tsx — Already routes from /player to /channels
- `TwitchChannelService.StreamData` — May need to pass full stream data or re-fetch on player screen

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Key constraints from CLAUDE.md and STATE.md:
- Twitch stream URL acquisition requires GQL `PlaybackAccessToken` + Usher token (highest-risk part of the project per STATE.md)
- hls.js needs conservative `maxBufferLength` (~30s) for limited TV RAM
- No official Helix API endpoint for HLS stream URLs — must use GQL
- ABR (adaptive bitrate) via hls.js is the standard approach for automatic quality selection

</specifics>

<deferred>
## Deferred Ideas

- **PLAY-05:** Manual quality selection (360p, 720p, 1080p) — deferred to v2
- **PLAY-06:** Low-latency mode for competitive viewing — deferred to v2

</deferred>

---

*Phase: 04-stream-playback*
*Context gathered: 2026-04-14*
