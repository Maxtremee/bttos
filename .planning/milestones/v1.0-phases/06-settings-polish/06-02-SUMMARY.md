---
phase: 06-settings-polish
plan: "02"
subsystem: settings
tags: [settings, gear-icon, player-overlay, chat-position, green-button, spatial-navigation]
dependency_graph:
  requires: [src/stores/prefsStore.ts, src/router/history.ts, src/screens/SettingsScreen.tsx]
  provides: [src/components/PlayerSettingsOverlay.tsx]
  affects: [src/screens/ChannelsScreen.tsx, src/screens/PlayerScreen.tsx, src/components/ChatSidebar.tsx, src/App.tsx]
tech_stack:
  added: []
  patterns: [solidjs-store, conditional-layout, spatial-navigation-focus, overlay-panel, position-aware-sidebar]
key_files:
  created:
    - src/components/PlayerSettingsOverlay.tsx
  modified:
    - src/screens/ChannelsScreen.tsx
    - src/screens/PlayerScreen.tsx
    - src/components/ChatSidebar.tsx
    - src/App.tsx
decisions:
  - "PlayerSettingsOverlay uses onMount capture-phase keydown listener to intercept Back before App.tsx global handler (matching LogoutConfirmDialog pattern from Plan 01)"
  - "PlayerSettingsOverlay rendered unconditionally inside video area div with open prop, not conditionally mounted, to avoid focus lifecycle issues"
  - "App.tsx Green handler returns early after /channels check — PlayerScreen owns Green on player route"
metrics:
  duration_seconds: 420
  completed_date: "2026-04-15"
  tasks_completed: 1
  files_created: 1
  files_modified: 4
requirements-completed: [SETT-01, SETT-02]
---

# Phase 06 Plan 02: Settings Wiring Summary

**One-liner:** Gear icon in ChannelsScreen header, Green button shortcuts (channels→/settings, player→overlay), PlayerSettingsOverlay with chat toggles over live video, ChatSidebar left/right position switching, and chat default visibility from prefsStore.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Gear icon, Green button handler, PlayerSettingsOverlay, ChatSidebar position, chat prefs integration | e6441a3 | src/components/PlayerSettingsOverlay.tsx (new), src/components/ChatSidebar.tsx, src/screens/PlayerScreen.tsx, src/screens/ChannelsScreen.tsx, src/App.tsx |

## Tasks Pending Human Verification

| # | Task | Status |
|---|------|--------|
| 2 | Verify full settings flow and navigation audit | Awaiting human verification |

## What Was Built

- **ChatSidebar** (`src/components/ChatSidebar.tsx`): Added `position?: 'left' | 'right'` prop. When `position === 'left'`, applies `border-right` instead of `border-left`, visually separating it from the video on the correct side.
- **PlayerSettingsOverlay** (`src/components/PlayerSettingsOverlay.tsx`): New component. 320px overlay at `top/right: var(--space-2xl)`, `rgba(26,26,26,0.92)` background, z-index 50. Shows "Chat Settings" heading with two toggles (chat visibility, chat position). On open, focuses `overlay-pref-chat-visible`. Back key (461) intercepted in capture phase with `stopPropagation` + `preventDefault` to dismiss without navigating away. Dismiss hint: "Press Green or Back to close".
- **PlayerScreen** (`src/screens/PlayerScreen.tsx`): Chat default visibility now reads `prefsStore.chatVisible` (was hardcoded `true`). Added `settingsOverlayVisible` signal. Green button (keyCode 404) toggles overlay. Flex layout restructured to render ChatSidebar before video div when `chatPosition === 'left'`, after when `!== 'left'`. Toggle hint updated to include "Green — settings".
- **ChannelsScreen** (`src/screens/ChannelsScreen.tsx`): Old standalone `<h1>` replaced with flex row containing heading + `Focusable` gear icon (U+2699, focusKey `channels-gear`). OK press navigates to `/settings` via `history.set`.
- **App.tsx** (`src/App.tsx`): Added `KEY_GREEN = 404` constant. Green button handler: when `history.get() === '/channels'`, navigates to `/settings`. No-op on all other routes (PlayerScreen handles its own Green).

## Test Results

All 188 tests passed. No new tests added (UI-only wiring changes, no new business logic).

## Checkpoint: Pending Human Verification

**Task 2 is a `checkpoint:human-verify` gate.**

### What was built
Complete settings infrastructure: preferences store, working SettingsScreen with toggles and logout, gear icon in ChannelsScreen, Green button shortcut, PlayerSettingsOverlay, chat position/visibility integration, and all navigation paths.

### How to verify
1. Start the dev server: `npm run dev`
2. Navigate to channels screen — verify gear icon (cog symbol) is visible in the top-right of the header
3. Press Up from the channel grid — focus should move to the gear icon
4. Press OK on gear icon — should navigate to /settings
5. On Settings screen — verify "Settings" heading, two toggle rows ("Chat visibility" showing "On", "Chat position" showing "Right"), and "Log Out" button
6. Press OK on "Chat visibility" — should toggle to "Off"
7. Press OK on "Chat position" — should toggle to "Left"
8. Press OK on "Log Out" — should show confirmation dialog "Log out of Twitch?"
9. Verify Cancel is focused by default (not Log Out)
10. Press Back key — dialog should dismiss without logging out
11. Press OK on "Log Out" again — this time press Right to focus "Log Out" button in dialog, then press OK
12. Should clear tokens and redirect to /login
13. Log in again, go to channels, select a stream
14. On player screen — press Green button — settings overlay should appear with "Chat Settings" heading and two toggles
15. Video should continue playing underneath the overlay
16. Toggle chat visibility to Off — chat sidebar should disappear
17. Toggle chat position to Left — chat sidebar should move to the left side of the video
18. Press Back key — overlay should dismiss, not navigate away from player
19. Press Green button on channels screen — should navigate to /settings (not show overlay)
20. Navigation audit: verify Back key works on every screen (settings -> channels, player -> channels, login -> exit prompt)

### Resume signal
Type "approved" or describe issues to fix.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all preference integrations read from live `prefsStore` state. ChatSidebar position prop wired to `prefsStore.chatPosition`. Chat default visibility reads from `prefsStore.chatVisible`. PlayerSettingsOverlay writes through `updatePref` to both in-memory store and localStorage.

## Threat Mitigations Applied

| Threat | Mitigation |
|--------|-----------|
| T-06-06: Dual keydown handlers for keyCode 404 | App.tsx checks `history.get() === '/channels'` — only fires on channels route. PlayerScreen's handler only runs when mounted. No conflict. |
| T-06-05: Overlay open during error state | PlayerSettingsOverlay z-index 50 is below error overlay (absolute positioned in DOM flow after error overlay). User can press Back to dismiss. |

## Self-Check: PASSED

Files exist:
- src/components/PlayerSettingsOverlay.tsx: FOUND (created)
- src/screens/ChannelsScreen.tsx: FOUND (modified)
- src/screens/PlayerScreen.tsx: FOUND (modified)
- src/components/ChatSidebar.tsx: FOUND (modified)
- src/App.tsx: FOUND (modified)

Commits exist:
- e6441a3: FOUND
