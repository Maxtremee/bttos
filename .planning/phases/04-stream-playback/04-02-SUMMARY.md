---
phase: 04-stream-playback
plan: 02
subsystem: ui
tags: [hls.js, solidjs, video, player, twitch-gql]

requires:
  - phase: 04-stream-playback/01
    provides: TwitchStreamService with fetchStreamM3u8Url
  - phase: 03-channel-list
    provides: ChannelGrid with navigation to /player/:channel
provides:
  - Full PlayerScreen with hls.js video playback
  - Loading, error, and info bar overlays
  - Auto-retry with exponential backoff on transient errors
  - Auto-hiding info bar with stream metadata
affects: [chat, settings]

tech-stack:
  added: []
  patterns: [signal-based state machine for player lifecycle, hls.js onMount/onCleanup pattern]

key-files:
  created:
    - src/screens/PlayerScreen.tsx
    - src/screens/__tests__/PlayerScreen.test.tsx
  modified:
    - src/services/TwitchStreamService.ts
    - src/services/__tests__/TwitchStreamService.test.ts
    - src/screens/ChannelsScreen.tsx
    - vite.config.ts

key-decisions:
  - "GQL auth uses Bearer prefix (not OAuth) — device code flow tokens require Bearer"
  - "GQL PlaybackAccessToken query requires platform: 'web' variable"
  - "Usher requests proxied through Vite dev server to bypass CORS in browser development"
  - "Channel list sorted by viewer count descending"

patterns-established:
  - "Player state machine: createSignal<'loading' | 'playing' | 'error'> with classifyError helper"
  - "Info bar auto-hide: setTimeout 4s, reset on keydown, cleanup on unmount"
  - "Vite proxy pattern for CORS-restricted external APIs in dev"

requirements-completed: [PLAY-01, PLAY-02, PLAY-03, PLAY-04]

duration: 15min
completed: 2026-04-14
---

# Phase 4 Plan 02: PlayerScreen Summary

**Full video player with hls.js, loading/error/info overlays, and CORS proxy for dev**

## Performance

- **Duration:** ~15 min (including human verification and fixes)
- **Tasks:** 2 (1 automated + 1 human-verify checkpoint)
- **Files modified:** 6

## Accomplishments
- PlayerScreen replaced skeleton with full hls.js video player (321 lines)
- Error overlay with classified messages (offline/network/unknown) and focusable Retry button
- Info bar shows channel name, title, game, viewer count — auto-hides after 4s
- Fixed GQL auth (Bearer prefix, added platform variable) during human verification
- Added Vite proxy for Usher to bypass CORS in browser dev
- Channel list sorted by viewer count descending

## Task Commits

1. **Task 1 (RED): Failing tests** - `570a181` (test)
2. **Task 1 (GREEN): PlayerScreen implementation** - `0832603` (feat)
3. **Task 2: Verification fixes** - `1cf1a6c` (fix)

## Files Created/Modified
- `src/screens/PlayerScreen.tsx` - Full video player with hls.js, state machine, overlays
- `src/screens/__tests__/PlayerScreen.test.tsx` - 12 tests covering all player states
- `src/services/TwitchStreamService.ts` - Fixed GQL auth (Bearer), added platform var, dev proxy
- `src/services/__tests__/TwitchStreamService.test.ts` - Updated assertions for auth fixes
- `src/screens/ChannelsScreen.tsx` - Sort channels by viewer count descending
- `vite.config.ts` - Added Vite proxy for Usher endpoint

## Decisions Made
- Bearer prefix needed for device code flow tokens (OAuth prefix only works for first-party implicit grant)
- Twitch GQL now requires `platform: 'web'` variable (not in original research — discovered during testing)
- Vite dev proxy avoids CORS issues that won't exist on actual webOS device

## Deviations from Plan

### Auto-fixed Issues

**1. GQL Authorization prefix**
- **Found during:** Human verification (Task 2)
- **Issue:** `OAuth` prefix caused 401 — device code flow tokens need `Bearer`
- **Fix:** Changed to `Bearer ${authStore.token}`
- **Verification:** GQL call succeeds, returns valid PlaybackAccessToken

**2. Missing `platform` variable**
- **Found during:** Human verification (Task 2)
- **Issue:** GQL query requires `platform: 'web'` variable (not documented in research)
- **Fix:** Added `platform: 'web'` to GQL variables
- **Verification:** GQL returns valid token without errors

**3. CORS blocking Usher in browser**
- **Found during:** Human verification (Task 2)
- **Issue:** `usher.ttvnw.net` has no CORS headers, browser blocks XHR from localhost
- **Fix:** Added Vite dev server proxy at `/proxy/usher`, conditional URL in dev mode
- **Verification:** Stream plays in browser via proxy

---

**Total deviations:** 3 auto-fixed during verification
**Impact on plan:** All fixes necessary for working playback. No scope creep.

## Issues Encountered
- GQL auth and missing variable discovered only during live testing — unit tests with mocked fetch couldn't catch these

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Stream playback fully functional — ready for chat integration (Phase 5)
- All 66 tests passing, no regressions

---
*Phase: 04-stream-playback*
*Completed: 2026-04-14*
