---
phase: 04-stream-playback
plan: 01
subsystem: api
tags: [twitch-gql, usher, hls, stream-url, playback-access-token]

# Dependency graph
requires:
  - phase: 02-authentication
    provides: OAuth token via authStore, token refresh via TwitchAuthService
provides:
  - TwitchStreamService with fetchStreamM3u8Url for stream URL acquisition
  - PlaybackAccessToken type for GQL response
  - validateChannelLogin input validation function
  - hls.js dependency installed
affects: [04-stream-playback plan 02, player-screen, stream-playback-ui]

# Tech tracking
tech-stack:
  added: [hls.js ^1.6.16]
  patterns: [GQL persisted query with OAuth auth, Usher URL construction, channel login validation]

key-files:
  created:
    - src/services/TwitchStreamService.ts
    - src/services/__tests__/TwitchStreamService.test.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Used OAuth prefix (not Bearer) for GQL Authorization header per Twitch GQL requirements"
  - "Used Twitch internal Client-ID (kimne78kx3ncx6brgo4mv6wki5h1ko) for GQL endpoint"
  - "Channel login validated with /^[a-zA-Z0-9_]{1,25}$/ before use in fetch body and URL path"

patterns-established:
  - "GQL persisted query pattern: operationName + sha256Hash extension, not full query text"
  - "Usher URL construction with signature, token, and cache-bust params"
  - "Input validation on route-derived params before use in external API calls"

requirements-completed: [PLAY-01, PLAY-02]

# Metrics
duration: 2min
completed: 2026-04-14
---

# Phase 4 Plan 1: Stream URL Acquisition Summary

**TwitchStreamService with GQL PlaybackAccessToken + Usher m3u8 URL construction, hls.js installed**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-14T20:54:15Z
- **Completed:** 2026-04-14T20:56:49Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 4

## Accomplishments
- Created TwitchStreamService with full GQL PlaybackAccessToken + Usher flow for stream URL acquisition
- Installed hls.js ^1.6.16 for HLS playback (used in plan 02)
- 8 unit tests covering GQL request format, Usher URL construction, error cases, and input validation
- All 54 tests in suite passing with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Failing tests for TwitchStreamService** - `95c542b` (test)
2. **Task 1 (GREEN): Implement TwitchStreamService + install hls.js** - `c9cec70` (feat)

_TDD task: test commit followed by implementation commit_

## Files Created/Modified
- `src/services/TwitchStreamService.ts` - GQL PlaybackAccessToken fetch + Usher URL builder + channel login validation
- `src/services/__tests__/TwitchStreamService.test.ts` - 8 unit tests for stream URL acquisition
- `package.json` - Added hls.js ^1.6.16 dependency
- `package-lock.json` - Lock file updated

## Decisions Made
- Used OAuth prefix (not Bearer) for GQL Authorization header -- Twitch GQL uses different auth scheme than Helix
- Used Twitch internal Client-ID (kimne78kx3ncx6brgo4mv6wki5h1ko) -- only this ID works with gql.twitch.tv
- Validated channel login with regex before use in fetch body and URL path -- prevents injection (ASVS V5)
- Exposed buildUsherUrl as separate method for testability

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- TwitchStreamService ready for use in PlayerScreen (plan 02)
- hls.js installed and available for import
- fetchStreamM3u8Url provides m3u8 URL for hls.js loadSource

---
*Phase: 04-stream-playback*
*Completed: 2026-04-14*
