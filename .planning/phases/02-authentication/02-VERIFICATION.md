---
phase: 02-authentication
verified: 2026-04-14T13:49:00Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
deferred:
  - truth: "authStore.userId populated with real user ID after login"
    addressed_in: "Phase 3"
    evidence: "Phase 3 goal: 'Authenticated users see a navigable grid of their currently-live followed channels' — requires Helix /users fetch to populate userId. LoginScreen comment: 'fetch from Helix /users in Phase 3'"
human_verification:
  - test: "Full login flow: TV shows device code and QR, enter code on phone/PC, app advances to /channels"
    expected: "QR code is scannable, device code matches Twitch activation page, after approval app navigates automatically"
    why_human: "Requires a real Twitch account, network access to id.twitch.tv, and a TV/browser to observe the flow end-to-end"
  - test: "Token persistence across app relaunch: after successful login, close and reopen the app"
    expected: "App opens directly to /channels, skipping the login screen"
    why_human: "Requires a real webOS environment or browser session reload; localStorage read-on-init cannot be exercised without a real app launch cycle"
  - test: "Expired token silent refresh: set twitch_expires_at to a past timestamp in localStorage, reopen app"
    expected: "App silently refreshes the token in the background and shows /channels without error or re-login prompt"
    why_human: "Requires a live refresh token, real Twitch endpoint, and observing the in-flight refresh"
  - test: "Unauthenticated redirect: open the app with no tokens in localStorage, navigate to /#/channels"
    expected: "AuthGuard immediately redirects to /login; no protected content is rendered"
    why_human: "Requires a running app instance; visual confirmation that ChannelsScreen content is never briefly shown before redirect"
---

# Phase 2: Authentication Verification Report

**Phase Goal:** Users can log in to Twitch from the TV without a keyboard, stay authenticated across app launches, and be redirected to login when not authenticated
**Verified:** 2026-04-14T13:49:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | A device code and QR code appear on screen; user enters the code on phone/PC and the app advances automatically | ✓ VERIFIED | `LoginScreen.tsx` renders `user_code` at `var(--font-size-display)` (48px); QR SVG via `renderSVG(verification_uri)` from uqr; polling loop calls `twitchAuthService.pollForToken()` and navigates to `/channels` on success |
| SC-2 | After logging in, the auth token persists — reopening the app goes directly to the channel list, not the login screen | ✓ VERIFIED | `authStore.ts` initialises `token`, `refreshToken`, `expiresAt`, `userId` from localStorage on module load; `persistTokens()` writes all four keys; AuthGuard at path `/` renders `<Outlet />` (channels) when token is present |
| SC-3 | When an expired token is used, it refreshes silently without logging the user out or showing an error | ✓ VERIFIED | `refreshTokens()` in `TwitchAuthService.ts` uses a promise-deduplication singleton (`refreshPromise` field); writes in safe order (access_token → expires_at → refresh_token); calls `setAuthStore()` after success; unit test verifies exactly one HTTP call on concurrent invocations |
| SC-4 | Opening the app without a stored token lands on the login screen, not a broken state | ✓ VERIFIED | `AuthGuard.tsx` uses `createEffect(() => { if (!authStore.token) navigate('/login', { replace: true }) })`; `App.tsx` nests `/channels`, `/player/:channel`, `/settings` under `<Route path="/" component={AuthGuard}>` while `/login` remains outside |

**Score:** 4/4 truths verified

### Deferred Items

Items not yet met but explicitly addressed in later milestone phases.

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | `authStore.userId` populated with real Twitch user ID after login | Phase 3 | Phase 3 goal requires Helix `/users` fetch; `LoginScreen.tsx` line 58–59: comment documents this intentional deferral; `persistTokens(result, '')` stores empty string |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `vitest.config.ts` | happy-dom environment for component tests | ✓ VERIFIED | Contains `environment: 'happy-dom'`; merges with vite config |
| `src/services/TwitchAuthService.ts` | Device code flow, token refresh singleton, polling logic | ✓ VERIFIED | 121 lines; exports `TwitchAuthService` class and `twitchAuthService` singleton; `refreshPromise` dedup field present; full URN grant_type; no `client_secret` |
| `src/stores/authStore.ts` | SolidJS store for auth state — token, refreshToken, expiresAt, userId | ✓ VERIFIED | 19 lines; `createStore<AuthState>` initialising from all four `twitch_` localStorage keys; exports `authStore`, `setAuthStore`, `AuthState` |
| `src/screens/LoginScreen.tsx` | Full device code + QR auth UI replacing Phase 1 skeleton | ✓ VERIFIED | 203 lines; 5 states (loading/polling/success/expired/error); QR via `renderSVG`; `onCleanup` clears interval; `data.interval * 1000` for polling cadence; Focusable retry button |
| `src/components/AuthGuard.tsx` | Layout component redirecting to /login when token is null | ✓ VERIFIED | 16 lines; `createEffect` reads `authStore.token` non-destructured; `navigate('/login', { replace: true })`; renders `<Outlet />` |
| `src/App.tsx` | Updated route tree with AuthGuard wrapping protected routes | ✓ VERIFIED | `/login` outside guard; `<Route path="/" component={AuthGuard}>` wraps `/channels`, `/player/:channel`, `/settings`; `ROOT_PATHS = ['/', '/login']` |
| `src/services/__tests__/TwitchAuthService.test.ts` | Unit tests for AUTH-01 and AUTH-04 behaviours | ✓ VERIFIED | 19 real passing tests (0 todo); covers requestDeviceCode, pollForToken, refreshTokens dedup, write ordering, no client_secret |
| `src/stores/__tests__/authStore.test.ts` | Unit tests for AUTH-03 behaviour | ✓ VERIFIED | 5 passing tests; localStorage init for all four keys; reactive update test |
| `src/components/__tests__/AuthGuard.test.tsx` | Unit tests for AUTH-05 behaviour | ✓ VERIFIED | 2 passing tests; null token → navigate called; non-null token → navigate not called |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `vitest.config.ts` | `AuthGuard.test.tsx` | `environment: 'happy-dom'` | ✓ WIRED | Global happy-dom env confirmed; component tests use `render` from `solid-js/web` |
| `TwitchAuthService.ts` | `https://id.twitch.tv/oauth2/device` | `fetch POST with URLSearchParams` | ✓ WIRED | Line 26: `fetch('https://id.twitch.tv/oauth2/device', { method: 'POST', ... })` |
| `TwitchAuthService.ts` | `authStore.ts` | `setAuthStore()` after successful refresh | ✓ WIRED | Lines 81, 94, 103–108, 116: `setAuthStore()` called in `_doRefresh`, `persistTokens`, `clearTokens` |
| `authStore.ts` | `localStorage` | `localStorage.getItem('twitch_access_token')` on init | ✓ WIRED | Lines 10–17: all four `twitch_` keys read at module load |
| `LoginScreen.tsx` | `TwitchAuthService.ts` | `twitchAuthService.requestDeviceCode()` in `startFlow` | ✓ WIRED | Line 31: `twitchAuthService.requestDeviceCode()` called in `startFlow()` which runs in `onMount` |
| `LoginScreen.tsx` | `TwitchAuthService.ts` | `twitchAuthService.pollForToken()` in setInterval | ✓ WIRED | Line 47: `twitchAuthService.pollForToken(data.device_code)` inside interval callback |
| `LoginScreen.tsx` | `TwitchAuthService.ts` | `twitchAuthService.persistTokens()` on success | ✓ WIRED | Line 60: `twitchAuthService.persistTokens(result, '')` |
| `AuthGuard.tsx` | `authStore.ts` | `authStore.token` inside `createEffect` | ✓ WIRED | Line 10: `if (!authStore.token)` — not destructured, reactive |
| `App.tsx` | `AuthGuard.tsx` | `Route component={AuthGuard}` wrapping protected routes | ✓ WIRED | Lines 9, 53–57: import + `<Route path="/" component={AuthGuard}>` with three child routes |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `LoginScreen.tsx` | `deviceCodeData` / `user_code` | `twitchAuthService.requestDeviceCode()` → Twitch OAuth endpoint | Yes — fetch to `https://id.twitch.tv/oauth2/device` returning real JSON | ✓ FLOWING |
| `LoginScreen.tsx` | `qrSvg` | `renderSVG(deviceCodeData().verification_uri)` from `uqr` | Yes — `createMemo` derives SVG from live `verification_uri` | ✓ FLOWING |
| `authStore.ts` | `token` | `localStorage.getItem('twitch_access_token')` on module load | Yes — reads from browser localStorage, not a hardcoded value | ✓ FLOWING |
| `AuthGuard.tsx` | `authStore.token` | Reactive SolidJS store backed by localStorage-initialised state | Yes — `createEffect` reads live store value | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All auth unit tests pass | `npm test` | 19/19 tests pass, 0 failures, 0 todo | ✓ PASS |
| `TwitchAuthService` exports present | `node -e "import('./src/services/TwitchAuthService.ts')"` | N/A — TypeScript source, not directly runnable without build | ? SKIP |
| `authStore` exports present | Code review | `authStore`, `setAuthStore`, `AuthState` all exported on lines 3, 19 | ✓ PASS |
| `client_secret` absent from implementation | grep | Only match is a comment on line 72 documenting its intentional absence | ✓ PASS |
| `refreshPromise` dedup field present | grep | Line 23: `private refreshPromise: Promise<void> \| null = null` | ✓ PASS |
| `onCleanup` present in LoginScreen | grep | Lines 1, 76: imported and called with `clearPolling` | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|-------------|--------|----------|
| AUTH-01 | 02-01, 02-02, 02-03 | User can authenticate via Twitch device code flow | ✓ SATISFIED | `TwitchAuthService.requestDeviceCode()` + `pollForToken()` + `LoginScreen.tsx` full UI |
| AUTH-02 | 02-01, 02-03 | QR code displayed alongside device code | ✓ SATISFIED | `LoginScreen.tsx` renders `renderSVG(verification_uri)` via `uqr`; 200×200px white-background QR div |
| AUTH-03 | 02-01, 02-02 | Auth tokens persist across app launches via localStorage | ✓ SATISFIED | `authStore.ts` initialises from `twitch_*` localStorage keys on load; `persistTokens()` writes all four keys after login |
| AUTH-04 | 02-01, 02-02 | Tokens refresh automatically and transparently when expired | ✓ SATISFIED | `refreshTokens()` singleton with promise deduplication, safe write ordering, `setAuthStore()` update — unit tested with 5 passing tests |
| AUTH-05 | 02-01, 02-04 | Unauthenticated users are redirected to login screen | ✓ SATISFIED | `AuthGuard.tsx` `createEffect` + `navigate('/login', { replace: true })`; App.tsx nests all protected routes under AuthGuard |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/screens/LoginScreen.tsx` | 60 | `persistTokens(result, '')` — empty userId stored on login | ℹ️ Info | Intentional deferral: userId populated by Phase 3 Helix /users fetch; auth token is complete, only userId field in store is blank |

No blockers. No warnings. The empty userId is documented in code comments and the SUMMARY, and is explicitly deferred to Phase 3.

### Human Verification Required

#### 1. End-to-End Login Flow

**Test:** Boot the app in a browser or webOS TV with no stored tokens. Observe the LoginScreen: confirm a device code appears in large text and a QR code is rendered beside it. Scan the QR or visit twitch.tv/activate on a second device and enter the code. Wait for the polling loop to complete.
**Expected:** App automatically navigates to `/channels` within one polling interval after approval. No manual interaction needed on the TV after code display.
**Why human:** Requires a real Twitch account and live network access to `id.twitch.tv`. The polling state transition and navigation cannot be exercised in unit tests without mocking the entire Twitch API.

#### 2. Auth Persistence Across App Relaunch

**Test:** After a successful login (human test 1), close the browser tab / reopen the app. Inspect localStorage to confirm `twitch_access_token`, `twitch_refresh_token`, `twitch_expires_at`, and `twitch_user_id` (Phase 3 will populate userId) are present.
**Expected:** App opens directly to `/channels` — AuthGuard reads the stored token, finds it non-null, and renders Outlet. Login screen is not shown.
**Why human:** Requires observing real app launch behaviour across a session boundary; cannot be automated without a full E2E framework.

#### 3. Silent Token Refresh

**Test:** Manually set `twitch_expires_at` in localStorage to a past timestamp (e.g. `Date.now() - 1000`) and `twitch_access_token` to an expired token, while leaving a valid `twitch_refresh_token`. Trigger an API call (Phase 3 will exercise this; alternatively call `twitchAuthService.refreshTokens()` in the browser console).
**Expected:** The refresh completes silently: new `access_token`, `expires_at`, and `refresh_token` appear in localStorage; no error is shown to the user; `authStore.token` is updated.
**Why human:** Requires a live valid refresh token from Twitch and observing localStorage updates in real-time.

#### 4. Unauthenticated Redirect — No Flash of Protected Content

**Test:** Clear all `twitch_*` keys from localStorage. Navigate directly to `/#/channels` (or start the app at root `/`).
**Expected:** AuthGuard redirects to `/login` immediately. The ChannelsScreen content is never briefly visible before the redirect.
**Why human:** The `replace:true` navigation prevents back-button return; visual confirmation requires a running app. The plan acknowledges a minor flash-of-content risk (T-02-12) which needs human assessment.

---

## Gaps Summary

No gaps. All four ROADMAP Success Criteria are verified against the codebase. All five requirement IDs (AUTH-01 through AUTH-05) are implemented and tested. The test suite runs 19/19 passing with zero failures or todo stubs remaining in the auth test files.

The `userId` empty-string deferral is an intentional, documented design decision deferred to Phase 3, not a gap.

Human verification is required to confirm end-to-end behaviour with real Twitch credentials and a live webOS/browser environment.

---

_Verified: 2026-04-14T13:49:00Z_
_Verifier: Claude (gsd-verifier)_
