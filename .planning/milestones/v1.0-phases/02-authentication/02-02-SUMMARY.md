---
phase: 02-authentication
plan: 02
subsystem: auth
tags: [auth, solidjs-store, localStorage, twitch-oauth, device-code, token-refresh]
dependency_graph:
  requires:
    - 02-01-PLAN.md
  provides:
    - src/stores/authStore.ts
    - src/services/TwitchAuthService.ts
  affects:
    - src/components/AuthGuard.tsx (depends on authStore.token)
    - src/screens/LoginScreen.tsx (depends on TwitchAuthService and authStore)
tech_stack:
  added: []
  patterns:
    - solid-js/store createStore for reactive auth state
    - Promise deduplication singleton for token refresh (refreshPromise field)
    - localStorage twitch_ prefix key schema for token persistence
    - TDD red-green cycle for both modules
key_files:
  created:
    - src/stores/authStore.ts
    - src/services/TwitchAuthService.ts
  modified:
    - src/stores/__tests__/authStore.test.ts
    - src/services/__tests__/TwitchAuthService.test.ts
decisions:
  - "Exported TwitchAuthService class (not just singleton) so tests can instantiate fresh instances per test, avoiding shared state bleed"
  - "refreshTokens() deduplication via refreshPromise field — two concurrent calls share one in-flight Promise, protecting the single-use refresh token"
  - "localStorage write order: access_token first, expires_at second, refresh_token last — ensures old refresh token remains valid if process dies mid-write (T-02-06)"
  - "No client_secret in any request body — public client flow as required by Twitch device code grant"
metrics:
  duration: ~8 minutes
  completed_date: "2026-04-14T11:44:02Z"
  tasks_completed: 2
  files_created: 2
  files_modified: 2
---

# Phase 2 Plan 02: Auth Service Layer Summary

**One-liner:** SolidJS authStore + TwitchAuthService implementing device-code OAuth, poll-for-token, and refresh-singleton with promise deduplication and safe localStorage write ordering.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Implement authStore | a5d179e | src/stores/authStore.ts, src/stores/__tests__/authStore.test.ts |
| 2 | Implement TwitchAuthService | 9a7f03f | src/services/TwitchAuthService.ts, src/services/__tests__/TwitchAuthService.test.ts |

## What Was Built

### authStore (`src/stores/authStore.ts`)

SolidJS `createStore<AuthState>` that initialises from `localStorage` on module load using the `twitch_` key prefix:

- `token` ← `twitch_access_token`
- `refreshToken` ← `twitch_refresh_token`
- `expiresAt` ← `Number(twitch_expires_at)` or `null`
- `userId` ← `twitch_user_id`

Exports: `authStore`, `setAuthStore`, `AuthState` interface.

### TwitchAuthService (`src/services/TwitchAuthService.ts`)

Class with three core methods:

- `requestDeviceCode()` — POSTs to `https://id.twitch.tv/oauth2/device` with `client_id` and `scope`, throws on non-OK response
- `pollForToken(deviceCode)` — POSTs to `https://id.twitch.tv/oauth2/token` with full URN `grant_type`; returns `TokenResponse | 'pending' | 'expired'`
- `refreshTokens()` — Promise deduplication singleton; writes localStorage in safe order (access_token → expires_at → refresh_token); clears all tokens and throws on non-200; calls `setAuthStore()` after success

Helper methods: `persistTokens()` (used post-login), `clearTokens()` (used on logout).

Exports: `TwitchAuthService` class, `twitchAuthService` singleton, `DeviceCodeResponse`, `TokenResponse` interfaces.

## Test Results

```
Test Files  2 passed | 1 skipped (3)
     Tests  17 passed | 3 todo (20)
```

- authStore suite: 5/5 passing
- TwitchAuthService suite: 12/12 passing
- AuthGuard suite: 3 todo (out of scope for this plan — Plan 04)

## Deviations from Plan

### Auto-additions

**1. [Rule 2 - Missing Functionality] Added `throws when response is not OK` test for requestDeviceCode()**
- **Found during:** Task 2 test authoring
- **Issue:** The plan's behavior spec listed "throws when response is not OK" but the original stub did not include this test case
- **Fix:** Added the test; the implementation already covered it per the plan's action section
- **Files modified:** src/services/__tests__/TwitchAuthService.test.ts

**2. [Rule 2 - Missing Functionality] Added `sends POST with correct grant_type` test for pollForToken()**
- **Found during:** Task 2 test authoring
- **Issue:** Plan behavior spec included "pollForToken() sends POST with grant_type=urn:..." but the original stub only had 3 poll tests — the URL/grant_type verification was missing
- **Fix:** Added explicit test asserting the full URN grant_type is sent
- **Files modified:** src/services/__tests__/TwitchAuthService.test.ts

None of these additions changed the implementation — the plan's action section already specified the correct behavior. Tests were augmented to provide complete coverage of the stated behaviors.

## Threat Model Coverage

| Threat ID | Mitigation | Status |
|-----------|-----------|--------|
| T-02-04 | `refreshPromise` field prevents concurrent refresh consuming single-use token | Implemented + tested |
| T-02-06 | Write order: access_token → expires_at → refresh_token last | Implemented + tested (write ordering test) |
| T-02-03 | No `client_secret` in any request body | Implemented + verified (`grep client_secret` returns only comment) |

## Known Stubs

None. Both modules are fully wired: authStore reads real localStorage on init; TwitchAuthService calls real Twitch endpoints (mocked only in tests).

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/stores/authStore.ts | FOUND |
| src/services/TwitchAuthService.ts | FOUND |
| 02-02-SUMMARY.md | FOUND |
| commit a5d179e (authStore) | FOUND |
| commit 9a7f03f (TwitchAuthService) | FOUND |
