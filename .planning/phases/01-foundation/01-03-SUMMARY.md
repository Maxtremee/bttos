---
phase: 01-foundation
plan: 03
subsystem: app-shell
tags: [routing, spatial-navigation, exit-dialog, screens, solid-js]
dependency_graph:
  requires: [01-01, 01-02]
  provides: [app-shell, screen-routing, back-key-handler, exit-dialog]
  affects: [all future phases — every screen imports from this shell]
tech_stack:
  added: []
  patterns:
    - MemoryRouter with createMemoryHistory for programmatic navigation
    - FocusableGroup with isFocusBoundary for modal focus trapping
    - setFocus(focusKey) in onMount to prevent focus loss after route change
    - Render-function children pattern for FocusableGroup (not plain JSX)
key_files:
  created:
    - src/main.tsx
    - src/screens/LoginScreen.tsx
    - src/screens/ChannelsScreen.tsx
    - src/screens/PlayerScreen.tsx
    - src/screens/SettingsScreen.tsx
    - src/components/ExitConfirmDialog.tsx
  modified:
    - src/App.tsx
    - index.html
decisions:
  - "FocusableGroup requires render-function children (props) => JSX.Element — plain JSX children cause TS2322 type error"
  - "history.get() returns string directly, not {value: string} — plan API doc was incorrect"
  - "index.html updated to reference src/main.tsx instead of src/index.tsx"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-14"
  tasks_completed: 3
  tasks_total: 3
  files_created: 6
  files_modified: 2
requirements-completed: [FNDN-01, FNDN-02]
---

# Phase 1 Plan 03: App Shell (Routing + Screens + Exit Dialog) Summary

**One-liner:** MemoryRouter app shell with 5 routes, global Back key handler at keyCode 461, spatial-nav focus set on mount for all screens, and focus-trapped ExitConfirmDialog.

## What Was Built

Complete Phase 1 app shell delivering FNDN-02 end-to-end:

- **src/main.tsx** — Entry point: `initSpatialNav()` called before `render()`, imports global.css design tokens
- **src/App.tsx** — MemoryRouter with 5 routes (`/`, `/login`, `/channels`, `/player/:channel`, `/settings`), global `keydown` listener for keyCode 461 (webOS Back), ExitConfirmDialog shown on Back-at-root screens, `onCleanup` removes listener
- **src/screens/LoginScreen.tsx** — Skeleton with `setFocus('login-signin-btn')` on mount, "Sign in with Twitch" button using `var(--color-accent)`, TV safe-zone padding
- **src/screens/ChannelsScreen.tsx** — Skeleton with `setFocus('channels-primary')` on mount
- **src/screens/PlayerScreen.tsx** — Skeleton with `setFocus('player-primary')` on mount
- **src/screens/SettingsScreen.tsx** — Skeleton with `setFocus('settings-primary')` on mount, "Log Out" placeholder button
- **src/components/ExitConfirmDialog.tsx** — Full-screen overlay with `FocusableGroup isFocusBoundary={true}`, auto-focuses "Exit" button on mount, exact UI-SPEC copy ("Exit app?", "Exit", "Cancel"), `var(--color-destructive)` on Exit button

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 6afa2d0 | feat(01-03): main.tsx, App.tsx, stub screens/dialog |
| Task 2 | cd16bd3 | feat(01-03): full skeleton screens and ExitConfirmDialog |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `history.get()` API returns string, not object**
- **Found during:** Task 1, TypeScript compilation
- **Issue:** Plan specified `history.get().value ?? '/'` but `createMemoryHistory().get()` returns `string` directly per `@solidjs/router` type definitions (`get: () => string`)
- **Fix:** Changed to `history.get() ?? '/'`
- **Files modified:** src/App.tsx
- **Commit:** 6afa2d0

**2. [Rule 1 - Bug] `FocusableGroup` requires render-function children**
- **Found during:** Task 2, TypeScript compilation
- **Issue:** Plan's ExitConfirmDialog code passed plain JSX as `FocusableGroup` children, but the library's type signature requires `children: (props: FocusableCallbackProps) => JSX.Element`
- **Fix:** Wrapped group content in `{() => <div>...</div>}` render function
- **Files modified:** src/components/ExitConfirmDialog.tsx
- **Commit:** cd16bd3

**3. [Rule 3 - Blocking] index.html entry point update**
- **Found during:** Task 1 setup
- **Issue:** `index.html` referenced `/src/index.tsx` (scaffold default); plan creates `src/main.tsx` as the new entry point
- **Fix:** Updated `index.html` script src to `/src/main.tsx`
- **Files modified:** index.html
- **Commit:** 6afa2d0

## Known Stubs

The skeleton screens are intentionally minimal — they are navigation/focus scaffolding only, not final UI. Each screen shows a heading and one focusable button as a focus target. Real content will be added in later phases:

| File | Stub | Reason |
|------|------|--------|
| src/screens/ChannelsScreen.tsx | "Placeholder" button | Real channel list added in Phase 3 |
| src/screens/PlayerScreen.tsx | "Placeholder" button | Real player added in Phase 4 |
| src/screens/SettingsScreen.tsx | "Log Out" button | Real settings added in Phase 5 |

These stubs do not prevent the plan's goal (D-pad navigation scaffold) from being achieved.

## Verification Results

- `npm run build` exits 0 — TypeScript compiles cleanly
- All 7 source files present: main.tsx, App.tsx, 4 screens, ExitConfirmDialog
- `dist/index.html` has relative asset paths (`./assets/`)
- `dist/appinfo.json` contains `"disableBackHistoryAPI": true`
- `isFocusBoundary` present in ExitConfirmDialog
- `setFocus` present in `onMount` of all 4 screens
- `props.onExit()` / `props.onCancel()` — props not destructured (SolidJS Pitfall 4 avoided)

## Checkpoint: APPROVED

Task 3 (human-verify checkpoint) was verified and approved by user on 2026-04-14:
- Login screen renders with purple "Sign in with Twitch" button on dark background
- Focus ring (3px solid #9147ff) visible on focused element
- Exit dialog appears on Back key (keyCode 461)
- Dialog focus trap works — Tab cycles only between Exit and Cancel
- Build asset paths are relative (`./assets/`)
- appinfo.json contains `"disableBackHistoryAPI": true`

## Self-Check: PASSED

- src/main.tsx: FOUND
- src/App.tsx: FOUND
- src/screens/LoginScreen.tsx: FOUND
- src/screens/ChannelsScreen.tsx: FOUND
- src/screens/PlayerScreen.tsx: FOUND
- src/screens/SettingsScreen.tsx: FOUND
- src/components/ExitConfirmDialog.tsx: FOUND
- Commit 6afa2d0: FOUND
- Commit cd16bd3: FOUND
