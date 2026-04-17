---
phase: 04-stream-playback
reviewed: 2026-04-14T12:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/services/TwitchStreamService.ts
  - src/services/__tests__/TwitchStreamService.test.ts
  - src/screens/PlayerScreen.tsx
  - src/screens/__tests__/PlayerScreen.test.tsx
  - src/screens/ChannelsScreen.tsx
  - vite.config.ts
findings:
  critical: 0
  warning: 3
  info: 1
  total: 4
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-04-14T12:00:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

The stream playback implementation is well-structured overall. The GQL + Usher flow in TwitchStreamService is clean with good input validation and error handling. PlayerScreen correctly manages HLS lifecycle with proper cleanup. Two bugs were found: an infinite media error recovery loop in the HLS error handler, and a missing null guard on the auth token before making API calls. One additional minor concern in ChannelsScreen.

## Warnings

### WR-01: Unbounded media error recovery loop in HLS error handler

**File:** `src/screens/PlayerScreen.tsx:121-124`
**Issue:** Every fatal `MEDIA_ERROR` calls `hls.recoverMediaError()` and returns, without any retry counter. If the media error persists (e.g., corrupted segment that keeps re-triggering), this will loop indefinitely -- the code path that destroys HLS and shows the error overlay (lines 126-140) is never reached for media errors.
**Fix:** Add a media error retry counter similar to the network error pattern:
```typescript
let mediaRetryCount = 0

// Inside the error handler:
if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRetryCount < 2) {
  mediaRetryCount++
  hls?.recoverMediaError()
  return
}
```

### WR-02: Auth token used without null check -- sends "Bearer null" when unauthenticated

**File:** `src/services/TwitchStreamService.ts:55-56`
**Issue:** `authStore.token` is typed as `string | null`. The `ensureFreshToken` method (line 34-37) checks `expiresAt` for staleness but does not verify that `token` is non-null. If token is null, the Authorization header becomes `Bearer null`, which will likely fail with an opaque 401 rather than a clear error message. The same issue exists in `src/screens/PlayerScreen.tsx:12-16` where `helixHeaders()` also uses `authStore.token` without a null check.
**Fix:** Guard against null token before making authenticated requests:
```typescript
private async ensureFreshToken(): Promise<void> {
  if (!authStore.token) {
    throw new Error('Not authenticated — no access token available')
  }
  if (authStore.expiresAt !== null && authStore.expiresAt - Date.now() < 300_000) {
    await twitchAuthService.refreshTokens()
  }
}
```

### WR-03: Missing VITE_TWITCH_CLIENT_ID env var guard in PlayerScreen

**File:** `src/screens/PlayerScreen.tsx:9`
**Issue:** `CLIENT_ID` is cast as `string` via `import.meta.env.VITE_TWITCH_CLIENT_ID as string`, but if the env var is not set, it will be `undefined` cast to `string`. This silently produces an invalid `Client-Id: undefined` header in the Helix API call on line 15, causing 401 errors that are hard to diagnose.
**Fix:** Add a runtime guard or use a centralized config that validates env vars at startup:
```typescript
const CLIENT_ID = import.meta.env.VITE_TWITCH_CLIENT_ID
if (!CLIENT_ID) {
  throw new Error('VITE_TWITCH_CLIENT_ID environment variable is required')
}
```

## Info

### IN-01: onMount called inside IIFE render context in ChannelsScreen

**File:** `src/screens/ChannelsScreen.tsx:84`
**Issue:** `onMount(() => setFocus('retry-btn'))` is called inside an IIFE within a `<Show>` block's render callback. While SolidJS does track ownership through `Show`, this pattern is unusual and fragile -- if the rendering context changes, the lifecycle hook may not fire as expected. A `createEffect` watching `channels.state` would be more idiomatic.
**Fix:** Replace with a reactive effect outside the JSX:
```typescript
createEffect(() => {
  if (channels.state === 'errored') {
    setFocus('retry-btn')
  }
})
```

---

_Reviewed: 2026-04-14T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
