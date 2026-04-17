---
phase: 02-authentication
plan: 03
subsystem: auth
tags: [auth, solidjs, qr-code, device-code, polling, spatial-navigation, uqr]
dependency_graph:
  requires:
    - 02-02-PLAN.md
  provides:
    - src/screens/LoginScreen.tsx
  affects:
    - src/App.tsx (routes to LoginScreen at /login)
tech_stack:
  added: []
  patterns:
    - uqr renderSVG for QR code generation (server-sent verification_uri)
    - SolidJS createSignal + Show for state-driven conditional rendering
    - createMemo for derived QR SVG and URL hostname values
    - setInterval + onCleanup for polling loop with memory-leak prevention
    - Focusable wrapper from @lampa-dev/solidjs-spatial-navigation for retry button
key_files:
  created: []
  modified:
    - src/screens/LoginScreen.tsx
decisions:
  - "QR code uses innerHTML binding with uqr renderSVG — safe per T-02-07 (Twitch's own URI, single-origin packaged app)"
  - "White QR background (#ffffff) hardcoded — required for QR scanner contrast, not a design token deviation"
  - "userId passed as empty string to persistTokens() — Helix /users fetch deferred to Phase 3 as specified in plan"
  - "expiresAt tracked client-side (Date.now() + expires_in * 1000) plus server expired signal as belt-and-suspenders expiry detection"
metrics:
  duration: ~5 minutes
  completed_date: "2026-04-14T11:47:00Z"
  tasks_completed: 1
  files_created: 0
  files_modified: 1
---

# Phase 2 Plan 03: Login Screen UI Summary

**One-liner:** Full Twitch Device Code Grant UI in SolidJS — device code display at 48px, QR code via uqr, server-paced polling loop with onCleanup, expiry and error states with focusable Retry button.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Implement LoginScreen with device code flow, QR code, and polling | e434ed0 | src/screens/LoginScreen.tsx |

## What Was Built

### LoginScreen (`src/screens/LoginScreen.tsx`)

Full replacement of the Phase 1 skeleton. Implements the complete Twitch Device Code Grant user interface:

**Screen states:**
- `loading` — shown on mount and on retry; calls `twitchAuthService.requestDeviceCode()` and transitions to `polling`
- `polling` — displays QR code (via `uqr` `renderSVG`) and `user_code` at 48px; polls `twitchAuthService.pollForToken()` on `data.interval` cadence
- `success` — token received, shows confirmation message, navigates to `/channels` after 500ms
- `expired` — code expired (client-side timer or server signal); shows focusable Retry button
- `error` — network failure on device code request; shows focusable Retry button

**Key implementation details:**
- `data.interval * 1000` used for `setInterval` — respects server-sent polling interval, not hardcoded
- `onCleanup(() => clearPolling())` clears the interval on component unmount, preventing memory leaks (T-02-08 mitigation)
- `renderSVG(data.verification_uri)` from `uqr` generates the QR SVG; bound via `innerHTML` to a white-background div
- `user_code` displayed with `var(--font-size-display)` (48px) and `var(--font-weight-semibold)` as specified
- Retry button wrapped in `<Focusable focusKey="login-retry-btn">` for D-pad spatial navigation
- `useSpatialNavigation().setFocus()` drives focus to status region on polling start and to retry button on expiry

## Test Results

```
Test Files  7 passed | 2 skipped (9)
     Tests  53 passed | 6 todo (59)
```

All pre-existing tests continue to pass. No new tests added for this plan — the plan specifies `tdd="false"` and verification is by `npm test` (no regressions) + grep acceptance checks.

## Acceptance Criteria Verification

| Criterion | Result |
|-----------|--------|
| `grep twitchAuthService.requestDeviceCode` — 1 match | PASS (1) |
| `grep twitchAuthService.pollForToken` — 1 match | PASS (1) |
| `grep twitchAuthService.persistTokens` — 1 match | PASS (1) |
| `grep renderSVG` — at least 1 match | PASS (2: import + usage) |
| `grep font-size-display` — at least 1 match | PASS (1) |
| `grep onCleanup` — at least 1 match | PASS (2: import + call) |
| `grep clearInterval\|clearPolling` — at least 2 matches | PASS (7) |
| `grep data.interval` — 1 match | PASS (1) |
| `grep client_secret` — 0 matches | PASS (0) |
| `npm test` exits 0 | PASS |

## Deviations from Plan

None — plan executed exactly as written.

## Threat Model Coverage

| Threat ID | Mitigation | Status |
|-----------|-----------|--------|
| T-02-07 | QR SVG innerHTML from uqr using Twitch's own verification_uri — accepted risk, single-origin packaged app | Implemented per plan |
| T-02-08 | `onCleanup(() => clearPolling())` prevents runaway setInterval on unmount; client-side expiresAt check stops poll before server expiry signal | Implemented |
| T-02-09 | HTTPS to id.twitch.tv; Twitch-managed verification — accepted | N/A (no client-side change needed) |

## Known Stubs

- `twitchAuthService.persistTokens(result, '')` — empty string for `userId`. This is intentional per plan: Helix `/users` fetch to populate `userId` is deferred to Phase 3. The auth token is fully stored; only the userId field in authStore is blank until Phase 3 wires it.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/screens/LoginScreen.tsx | FOUND |
| 02-03-SUMMARY.md | FOUND |
| commit e434ed0 (LoginScreen implementation) | FOUND |
