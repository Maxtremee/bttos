---
phase: 03-channel-list
plan: "01"
subsystem: data-and-card
tags: [twitch-api, helix, service, component, tdd]
dependency_graph:
  requires:
    - "02-02: TwitchAuthService (token refresh singleton)"
    - "02-02: authStore (token, userId, expiresAt)"
  provides:
    - "TwitchChannelService.fetchLiveFollowedChannels — live stream data for channel grid"
    - "StreamData interface — canonical shape for Helix /streams response"
    - "thumbnailUrl helper — resolves Twitch thumbnail URL templates"
    - "formatViewers helper — formats viewer counts per UI-SPEC copywriting contract"
    - "ChannelCard component — focusable card rendering thumbnail, title, game, viewers"
  affects:
    - "03-02: ChannelGrid consumes TwitchChannelService and renders ChannelCard items"
tech_stack:
  added: []
  patterns:
    - "Two-step Helix API fetch: /helix/channels/followed (paginated) -> /helix/streams (batched)"
    - "URLSearchParams.append for repeated user_id params (not comma-joined)"
    - "Pagination safety cap: MAX_PAGINATION_PAGES = 50"
    - "Token refresh: ensureFreshToken() before fetch + 401 retry once"
    - "SolidJS component with inline CSS custom property tokens, no CSS classes except .focused"
key_files:
  created:
    - src/services/TwitchChannelService.ts
    - src/services/__tests__/TwitchChannelService.test.ts
    - src/components/ChannelCard.tsx
    - src/components/__tests__/ChannelCard.test.tsx
  modified: []
decisions:
  - "Mutable shared mock object pattern for vi.mock + vi.resetModules isolation (avoids vi.mock hoisting issues with per-test overrides)"
  - "Pagination safety cap (MAX_PAGINATION_PAGES=50) added per T-03-04 threat mitigation — not in original plan spec"
metrics:
  duration_minutes: 12
  completed_date: "2026-04-14"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 0
---

# Phase 3 Plan 01: Channel Data Service and ChannelCard Summary

Two-step Helix API service with paginated followed-channel fetch and batched live-stream query, plus a focusable SolidJS card component rendering thumbnail, title, game name, and formatted viewer count.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | TwitchChannelService — Helix API service | 9651300 | src/services/TwitchChannelService.ts, src/services/__tests__/TwitchChannelService.test.ts |
| 2 | ChannelCard component | 0a1d28e | src/components/ChannelCard.tsx, src/components/__tests__/ChannelCard.test.tsx |

## What Was Built

### TwitchChannelService (`src/services/TwitchChannelService.ts`)

- **`fetchLiveFollowedChannels()`** — Two-step fetch: paginates `/helix/channels/followed` collecting all `broadcaster_id` values, then batch-queries `/helix/streams` with up to 100 `user_id` params per request using `URLSearchParams.append` (not comma-joined). Returns `StreamData[]`.
- **`ensureFreshToken()`** — Calls `twitchAuthService.refreshTokens()` when `authStore.expiresAt - Date.now() < 300_000` (5 minute window).
- **401 retry** — On 401 from Helix, refreshes token and retries that single request once.
- **`thumbnailUrl(templateUrl, width, height)`** — Replaces `{width}` and `{height}` tokens in Twitch thumbnail URL templates.
- **`formatViewers(count)`** — Returns `"N viewers"` for counts below 1000, `"N.NK viewers"` for counts at/above 1000 (1 decimal place).
- **Singleton export** — `twitchChannelService = new TwitchChannelService()`.

### ChannelCard (`src/components/ChannelCard.tsx`)

Props: `{ channel: StreamData; focused: boolean }`. Renders:
- `<img>` with `thumbnailUrl(thumbnail_url, 284, 160)`, `loading="lazy"`, `onerror` hides broken image
- Stream title with `-webkit-line-clamp: 2`
- Game name single-line truncated
- Viewer count via `formatViewers(viewer_count)`
- Root `div` gets `class="focused"` when `focused` prop is true

### Tests

- 9 unit tests for TwitchChannelService — all pass
- 6 unit tests for ChannelCard — all pass
- Full suite: 36 tests, 0 failures

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Security/Correctness] Added pagination safety cap**
- **Found during:** Task 1 implementation — threat model T-03-04 specified mitigation
- **Issue:** Unbounded pagination loop possible from malformed API responses
- **Fix:** Added `MAX_PAGINATION_PAGES = 50` constant, loop terminates when `pageCount >= MAX_PAGINATION_PAGES`
- **Files modified:** src/services/TwitchChannelService.ts
- **Commit:** 9651300

**2. [Rule 1 - Test isolation] Switched to mutable shared mock object pattern**
- **Found during:** Task 1 test authoring — `vi.mock()` hoisting + `vi.resetModules()` caused per-test mock state to bleed between tests 8 and 9
- **Issue:** `vi.mock()` calls inside `beforeEach` after `vi.resetModules()` don't reliably update mock factories; static import hoisting means `CLIENT_ID` evaluates before `vi.stubEnv`
- **Fix:** Used top-level `vi.mock()` with mutable `mockAuthStore` object and shared `mockRefreshTokens` fn. Tests mutate `mockAuthStore.expiresAt` directly per-test. `vi.resetModules()` + dynamic import in `beforeEach` picks up the env stub before module evaluation.
- **Files modified:** src/services/__tests__/TwitchChannelService.test.ts

## Known Stubs

None. All fields rendered in ChannelCard come from real `StreamData` passed via props. No placeholder text.

## Threat Flags

No new threat surface beyond what is in the plan's threat model. SolidJS JSX auto-escapes all string interpolation in ChannelCard (T-03-01 mitigated). Token is read from `authStore` and never logged (T-03-02 mitigated). Pagination safety cap added (T-03-04 mitigated).

## Self-Check

Files created:
- src/services/TwitchChannelService.ts — exists
- src/services/__tests__/TwitchChannelService.test.ts — exists
- src/components/ChannelCard.tsx — exists
- src/components/__tests__/ChannelCard.test.tsx — exists

Commits:
- 2d200b5 — test(03-01): add failing tests for TwitchChannelService
- 9651300 — feat(03-01): implement TwitchChannelService
- f88d107 — test(03-01): add failing tests for ChannelCard
- 0a1d28e — feat(03-01): implement ChannelCard component

## Self-Check: PASSED

All 4 created files found on disk. All 4 task commits found in git log. 36 tests pass, 0 failures.
