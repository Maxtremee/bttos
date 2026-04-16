---
phase: quick-260416-g3l
plan: 01
subsystem: player/auto-claim
tags: [player, channel-points, twitch-gql, composable, silent-feature]
requires:
  - authStore (for Bearer token)
  - TwitchStreamService (pattern mirrored, not imported)
provides:
  - TwitchChannelPointsService (singleton service)
  - useChannelPointsClaimer (SolidJS composable)
affects:
  - src/screens/PlayerScreen.tsx (one new import, one new call)
tech-stack:
  added: []
  patterns:
    - "GQL service class + exported singleton (mirrors TwitchStreamService)"
    - "SolidJS composable with onCleanup teardown (mirrors useHlsPlayer / useChatSession)"
    - "Tri-state return (claimed/nothing/stop) — caller interprets without throwing on expected stop conditions"
key-files:
  created:
    - src/services/TwitchChannelPointsService.ts
    - src/services/__tests__/TwitchChannelPointsService.test.ts
    - src/hooks/useChannelPointsClaimer.ts
  modified:
    - src/screens/PlayerScreen.tsx
decisions:
  - "Duplicate GQL_ENDPOINT / GQL_CLIENT_ID constants across services instead of extracting a shared module — explicit plan guardrail to avoid premature abstraction at N=2"
  - "No preference toggle — feature always runs while PlayerScreen is mounted and user is authenticated (matches reference implementation and user intent)"
  - "60s fixed interval with no backoff — transient failures log and continue; hard-stop signals (401, PersistedQueryNotFound) halt cleanly via the tri-state return"
  - "Fire-and-forget composable (void return) — no signals, no reactive surface needed; cleanup via onCleanup"
metrics:
  duration: "~10 minutes"
  completed-date: "2026-04-16"
  tasks: 2
  tests-added: 8
  files-created: 3
  files-modified: 1
---

# Quick Task 260416-g3l: Auto Channel Points Claiming Summary

## One-liner

Silent background polling that auto-claims Twitch community point bonuses every 60s while the user watches a stream, using the private GQL `ChannelPointsContext` query + `ClaimCommunityPoints` mutation with Bearer auth.

## Objective Recap

Add silent, automatic Twitch Channel Points claiming while the user watches a stream — passive reward farming with no UI, no preference, always on when logged in. Mirrors standard browser-extension behavior.

## What Was Built

### 1. `TwitchChannelPointsService` (src/services/TwitchChannelPointsService.ts)

- Class + exported singleton (`twitchChannelPointsService`) following the `TwitchStreamService` pattern
- `pollAndClaim(channelLogin): Promise<'claimed' | 'nothing' | 'stop'>` — the single public method
- Private helpers: `fetchContext` (the poll) and `claim` (the mutation)
- Uses `Bearer ${authStore.token}` for Authorization (per project memory `feedback_twitch_gql_auth.md`)
- Attribution header block crediting `adamff-dev/twitch-adfree-webos` at the top of the file
- Early-return `'stop'` when `authStore.token` is null — no point polling unauthenticated
- Duplicates `GQL_ENDPOINT` / `GQL_CLIENT_ID` constants on purpose (no shared constants module)
- Both persisted-query hashes (`374314de…` for context, `46aaeebe…` for claim) appear verbatim in source for grep-ability on future Twitch API drift
- Log prefix `[TwitchChannelPointsService]` matches `TwitchChatService` house style

### 2. Unit tests (src/services/__tests__/TwitchChannelPointsService.test.ts)

Eight tests mirroring `TwitchStreamService.test.ts` structure (vi.mock of authStore, `resetModules()` in `beforeEach`, happy-dom env):

1. POST to `gql.twitch.tv/gql` with correct headers (Client-ID + `Bearer` token + Content-Type)
2. ChannelPointsContext body has right operationName, persistedQuery hash, `variables.channelLogin`
3. `availableClaim === null` → returns `'nothing'`, single fetch call (no mutation fired)
4. `availableClaim` present → second fetch fires `ClaimCommunityPoints` with the correct claim hash and `variables.input = { channelID, claimID }`; returns `'claimed'`
5. 401 response → returns `'stop'` without throwing
6. `PersistedQueryNotFound` error → returns `'stop'` without throwing
7. 500 status → throws so caller can log + continue
8. Claim mutation returning errors → returns `'nothing'` (poll continues next tick)

### 3. `useChannelPointsClaimer` composable (src/hooks/useChannelPointsClaimer.ts)

- Fire-and-forget `useChannelPointsClaimer(channelLogin: string): void`
- Kicks off an immediate first tick, then `setInterval(tick, 60_000)`
- `tick` catches transient errors and logs; receiving `'stop'` from the service sets a local `stopped` flag and clears the interval so the channel will never poll again this mount
- `onCleanup` tears down the interval on unmount — SolidJS Router remounts `PlayerScreen` per channel route, so channel switching is handled naturally

### 4. PlayerScreen integration (src/screens/PlayerScreen.tsx)

- One new import: `import { useChannelPointsClaimer } from '../hooks/useChannelPointsClaimer'`
- One new call: `useChannelPointsClaimer(params.channel)` immediately after `const chat = useChatSession()`
- Imports reorganised alphabetically (`useChannelPointsClaimer`, `useChatSession`, `useHlsPlayer`) — three-way consistent ordering
- Zero other changes — no new JSX, no new state, no UI

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Imports sorted alphabetically in PlayerScreen.tsx**

- **Found during:** Task 2
- **Issue:** The plan showed `useChannelPointsClaimer` slotted above `useChatSession`/`useHlsPlayer`, but the existing hook imports in `PlayerScreen.tsx` were ordered `useHlsPlayer` then `useChatSession` (not alphabetical). Inserting the new import alphabetically required nudging the other two into alpha order so the three-line block stays consistent.
- **Fix:** Sorted the three `../hooks/*` imports alphabetically: `useChannelPointsClaimer`, `useChatSession`, `useHlsPlayer`. Purely cosmetic; no behavior change. Matches the plan's intent of "alphabetically ordered with the other `../hooks/*` imports".
- **Files modified:** `src/screens/PlayerScreen.tsx`
- **Commit:** `a8bf493`

No Rule 4 architectural decisions needed; no auth gates encountered.

## Authentication Gates

None — the service uses the already-present Bearer token from `authStore` and degrades silently to `'stop'` when absent.

## Commits

| Task | Name                                                          | Commit    | Files                                                                             |
| ---- | ------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------- |
| 1    | Create TwitchChannelPointsService with unit tests             | `9cd9232` | `src/services/TwitchChannelPointsService.ts`, `…/__tests__/…Service.test.ts`      |
| 2    | Create useChannelPointsClaimer composable + wire PlayerScreen | `a8bf493` | `src/hooks/useChannelPointsClaimer.ts`, `src/screens/PlayerScreen.tsx`            |

## Verification Results

- [x] `npx vitest run src/services/__tests__/TwitchChannelPointsService.test.ts` → 8/8 passed
- [x] `npx vitest run` (full suite) → 206/206 passed across 31 files, zero regressions
- [x] `npx tsc --noEmit` → clean, no type errors
- [x] `rg "TwitchChannelPointsService" src` → 3 files (service, test, composable) — no leakage
- [x] `rg "useChannelPointsClaimer" src` → 2 files (composable export + PlayerScreen invocation)
- [x] `rg "OAuth \$\{" src` → zero matches (Bearer rule preserved project-wide)
- [x] Attribution comment to `adamff-dev` present at top of service file
- [x] Both persisted-query hashes appear verbatim in source for future grep-ability

## Key Decisions Made

1. **No shared GQL constants module** — Plan explicitly called this out; at N=2 services duplicating two literals is the correct call. Keep the rule until N=3+ starts to hurt.
2. **No preference toggle** — Plan specified "always on when logged in and on the player screen". Matches the reference browser-extension behavior.
3. **Tri-state return type, not exceptions, for expected stop conditions** — 401 and `PersistedQueryNotFound` are not failures; they're "we should stop polling this channel cleanly". Only genuinely transient errors throw (network/5xx/JSON parse) so the composable can log + continue the loop.
4. **Fire-and-forget composable** — No returned signal, no reactive surface. The hook just installs the interval and wires `onCleanup`. Anything reactive would be API surface nobody uses.
5. **Immediate first tick + 60s interval** — Catches any already-available claim on channel entry without waiting a full minute.

## Known Stubs

None. All wiring is live — the composable calls the real service which hits the real Twitch GQL endpoint with the real user token.

## Manual Smoke Test (optional)

The user can verify on-device by logging in, opening a live channel, and watching the console for:
- Either no channel-points logs (nothing to claim yet), or
- `[TwitchChannelPointsService] claimed community points { channelId, claimId }` every few minutes as the random chest becomes available.
- Switching channels tears down the previous poll and starts a new one cleanly.
- No visible UI changes — the feature is invisible by design.

## Self-Check: PASSED

Verified presence:
- `src/services/TwitchChannelPointsService.ts` — FOUND
- `src/services/__tests__/TwitchChannelPointsService.test.ts` — FOUND
- `src/hooks/useChannelPointsClaimer.ts` — FOUND
- Commit `9cd9232` — FOUND in git log
- Commit `a8bf493` — FOUND in git log
