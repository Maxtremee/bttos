# Phase 3: Channel List - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Authenticated users see a navigable grid of their currently-live followed Twitch channels. This phase replaces the ChannelsScreen skeleton with a working channel grid that fetches data from the Twitch Helix API, displays channel cards with thumbnails and metadata, supports D-pad navigation, and auto-refreshes periodically.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation decisions for this phase are deferred to Claude's discretion based on research findings. The requirements (CHAN-01 through CHAN-03) and project constraints are sufficiently specific:

- **Channel card design:** Thumbnail, stream title, game name, viewer count per card. Layout, sizing, and visual density at Claude's discretion — match the dark theme and design tokens from Phase 1.
- **Grid layout & navigation:** Number of columns, spacing, scroll behavior when grid overflows. Use `@lampa-dev/solidjs-spatial-navigation` for D-pad focus. Ensure focus state is clearly visible per Phase 1 patterns.
- **Loading & empty states:** Loading indicator while fetching, empty state when no followed channels are live. Standard TV app patterns — keep it simple and informative.
- **Auto-refresh behavior:** Polling interval, how new/removed channels update in the grid. No disruptive visual refresh — channels should appear/disappear smoothly without losing focus position.
- **Data fetching:** Use Twitch Helix API (`/helix/channels/followed` + `/helix/streams`) with the auth token from authStore. Handle pagination if user follows many channels.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` — Project vision, constraints (SolidJS, webOS, remote-only navigation)
- `.planning/REQUIREMENTS.md` — CHAN-01 (grid with metadata), CHAN-02 (D-pad navigation), CHAN-03 (auto-refresh)
- `CLAUDE.md` — Tech stack details, Twitch Helix API endpoints, spatial navigation library

### Phase 1 & 2 foundation
- `src/screens/ChannelsScreen.tsx` — Existing skeleton to replace with working channel grid
- `src/App.tsx` — Router with `/channels` route, `/player/:channel` for playback navigation
- `src/services/TwitchAuthService.ts` — Token refresh singleton, CLIENT_ID, auth token management
- `src/stores/authStore.ts` — Reactive auth state (token, userId) for API calls
- `src/navigation/index.ts` — Spatial navigation module (Focusable, useSpatialNavigation)
- `src/styles/global.css` — Design tokens (colors, spacing, typography, focus ring)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Focusable` component + `useSpatialNavigation()` hook — D-pad focus management ready to use
- `authStore` — Reactive `token` and `userId` available for Helix API requests
- `TwitchAuthService` — Token refresh singleton with promise deduplication for API call auth
- CSS custom properties — Full design token system (dark theme, Twitch purple accent, spacing scale, typography)

### Established Patterns
- SolidJS signals/stores for state management (no external state library)
- `onMount` + `setFocus()` pattern for screen focus initialization
- MemoryRouter with `createMemoryHistory` for navigation
- Global keydown handler in App.tsx for Back key

### Integration Points
- `ChannelsScreen.tsx` — Replace skeleton placeholder with channel grid
- `authStore.token` and `authStore.userId` — Required for Helix API calls
- `/player/:channel` route — OK press on a channel card navigates here (Phase 4 will implement playback)
- `TwitchAuthService.refreshTokens()` — Call before/during API requests if token expired

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Key constraints from CLAUDE.md:
- `GET /helix/channels/followed?user_id={id}` (scope: `user:read:follows`) for followed channels
- `GET /helix/streams?user_id={id1}&user_id={id2}...` to filter to live-only
- Twitch thumbnails use `{width}x{height}` template URLs
- Must work on Chromium 68 (webOS 5.x target)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-channel-list*
*Context gathered: 2026-04-14*
