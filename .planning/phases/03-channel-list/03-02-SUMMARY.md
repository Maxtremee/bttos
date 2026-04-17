---
phase: 03-channel-list
plan: "02"
subsystem: channel-list
tags: [channel-grid, channels-screen, spatial-navigation, createResource, auto-refresh, tdd]
dependency_graph:
  requires:
    - "03-01"  # TwitchChannelService, ChannelCard
  provides:
    - "ChannelGrid component with FocusableGroup and D-pad navigation"
    - "ChannelsScreen with full data fetching, auto-refresh, loading/empty/error states"
  affects:
    - "src/App.tsx (ChannelsScreen route is now fully wired)"
tech_stack:
  added: []
  patterns:
    - "SolidJS createResource with state-based Show conditions (not channels.latest to avoid throw in error state)"
    - "setInterval + onCleanup clearInterval for auto-refresh"
    - "FocusableGroup + Focusable for D-pad grid navigation"
    - "channels.state enum (unresolved/pending/ready/refreshing/errored) for explicit state machine rendering"
key_files:
  created:
    - src/components/ChannelGrid.tsx
    - src/components/__tests__/ChannelGrid.test.tsx
    - src/screens/__tests__/ChannelsScreen.test.tsx
  modified:
    - src/screens/ChannelsScreen.tsx
decisions:
  - "Used channels.state enum instead of channels.loading/channels.latest for Show conditions — channels.latest throws in error state when no initialValue is set (SolidJS createResource behavior)"
  - "Stale-while-revalidate preserved via channels.state === 'refreshing' — grid stays visible during background refresh"
metrics:
  duration: "~15 minutes"
  completed_date: "2026-04-14"
  tasks_completed: 2
  files_changed: 4
requirements-completed: [CHAN-01, CHAN-02, CHAN-03]
---

# Phase 03 Plan 02: ChannelGrid and ChannelsScreen Summary

**One-liner:** CSS grid of Focusable ChannelCards inside FocusableGroup, wired to createResource with 60s auto-refresh and loading/empty/error states using channels.state enum.

## What Was Built

**Task 1: ChannelGrid component**
- `src/components/ChannelGrid.tsx` — FocusableGroup with `focusKey="channels-grid"` wrapping a CSS grid (`repeat(4, 1fr)`)
- Each channel rendered as `<Focusable focusKey={'channel-' + user_login} onEnterPress={() => navigate('/player/' + user_login)}>`
- Focus auto-set to first card on mount via `useSpatialNavigation().setFocus`
- 4 unit tests: card rendering per item, empty array, CSS grid template, count match

**Task 2: ChannelsScreen**
- Replaced Phase 1 skeleton with full implementation
- `createResource(() => twitchChannelService.fetchLiveFollowedChannels())` for data fetching
- `setInterval(() => refetch(), 60_000)` in `onMount` with `onCleanup(() => clearInterval(timer))`
- State machine via `channels.state`: `pending/unresolved` → Loading, `errored` → Error + Retry, `ready/refreshing` → Grid or Empty
- Retry button is `<Focusable focusKey="retry-btn">` with `setFocus('retry-btn')` on error mount
- 6 unit tests: setInterval called, clearInterval on unmount, refetch triggered by interval, loading/empty/error states

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed channels.latest throwing in error state**
- **Found during:** Task 2 GREEN phase
- **Issue:** Plan specified `<Show when={channels.error && !channels.latest}>` and `<Show when={!channels.loading || channels.latest}>`. In SolidJS `createResource`, `channels.latest` calls `read()` internally when `!resolved`, and `read()` re-throws the error signal. This caused the error state Show condition to throw instead of rendering.
- **Fix:** Replaced `channels.loading/channels.latest` with `channels.state` enum checks (`pending`, `unresolved`, `errored`, `ready`, `refreshing`). Stale-while-revalidate preserved via `state === 'refreshing'`.
- **Files modified:** `src/screens/ChannelsScreen.tsx`
- **Commit:** 8fd0ae9

**2. [Rule 3 - Blocking] Restored Plan 01 files after worktree base reset**
- **Found during:** Worktree setup
- **Issue:** `git reset --soft` to target base commit caused Plan 01 files (ChannelCard.tsx, TwitchChannelService.ts, tests, planning docs) to be included in the first commit as deletions.
- **Fix:** Restored all Plan 01 output files from git history and committed them to restore correct working state.
- **Files modified:** All Plan 01 outputs + planning docs
- **Commit:** c6a97f2

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. `user_login` is used in `navigate('/player/' + user_login)` — the router treats it as a single path segment, no injection possible.

## Known Stubs

None. ChannelGrid and ChannelsScreen are fully wired to real service and navigation.

## Self-Check

- [x] `src/components/ChannelGrid.tsx` — exists, contains `export default`, `FocusableGroup`, `Focusable`, `navigate('/player/'`, `onEnterPress`, `repeat(4, 1fr)`
- [x] `src/screens/ChannelsScreen.tsx` — contains `createResource`, `fetchLiveFollowedChannels`, `setInterval`, `onCleanup.*clearInterval`, `Live Channels`, `Loading channels...`, `No channels live right now`, `Could not load channels`, `Retry`, `ChannelGrid`
- [x] `src/components/__tests__/ChannelGrid.test.tsx` — 4 `it(` calls
- [x] `src/screens/__tests__/ChannelsScreen.test.tsx` — 6 `it(` calls
- [x] `npm test` — 46/46 tests pass, 8 test files
- [x] No skeleton placeholder text in ChannelsScreen.tsx

## Self-Check: PASSED
