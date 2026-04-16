---
phase: quick-260416-gct
plan: 01
subsystem: settings/prefs
tags: [settings, prefs, channel-points, toggle]
requires:
  - useChannelPointsClaimer (from quick-260416-g3l)
  - prefsStore (existing)
provides:
  - autoClaimChannelPoints preference
  - Settings UI toggle for auto-claim
affects:
  - src/stores/prefsStore.ts
  - src/stores/__tests__/prefsStore.test.ts
  - src/hooks/useChannelPointsClaimer.ts
  - src/screens/SettingsScreen.tsx
tech-stack:
  added: []
  patterns:
    - "Pref key added to PrefsState + DEFAULTS (one-line extension of existing store)"
    - "Gate inside tick() — not around setInterval — so mid-session toggles take effect on the next tick"
    - "New PrefRow mirrors Chat visibility row exactly"
key-files:
  modified:
    - src/stores/prefsStore.ts
    - src/stores/__tests__/prefsStore.test.ts
    - src/hooks/useChannelPointsClaimer.ts
    - src/screens/SettingsScreen.tsx
decisions:
  - "Default: true — user just explicitly added the feature; don't surprise-disable it"
  - "Gate at top of tick() rather than stopping the interval — negligible overhead, simpler diff, reactive read sees current pref"
  - "Row inserted between 'Chat position' and logout — natural reading order, no focus-key reshuffling"
metrics:
  duration: "~8 minutes"
  completed-date: "2026-04-16"
  tasks: 2
  tests-added: 2 (in prefsStore.test.ts)
  files-modified: 4
---

# Quick Task 260416-gct: Settings Toggle for Auto-Claim Channel Points Summary

## One-liner

Added an `autoClaimChannelPoints` preference (default `true`), exposed as a Settings row, and gated the claimer tick on it — flipping the toggle pauses/resumes polling within one 60s tick.

## Objective Recap

The auto-claim feature (from quick-260416-g3l) shipped always-on. This task adds user control: a Settings toggle to disable or re-enable it, with preference persistence via the existing `localStorage` path.

## What Was Built

### 1. Pref store extension (`src/stores/prefsStore.ts`)

- Added `autoClaimChannelPoints: boolean` to `PrefsState` interface
- Added `autoClaimChannelPoints: true` to `DEFAULTS`
- No new loader/persister code needed — the existing `loadPrefs` + `updatePref` machinery handles it automatically

### 2. Pref store tests (`src/stores/__tests__/prefsStore.test.ts`)

- Extended the "loads defaults when no localStorage key exists" test to assert the new default
- Added explicit assertion that `autoClaimChannelPoints` defaults to `true` when no persisted value is present

### 3. Claimer gate (`src/hooks/useChannelPointsClaimer.ts`)

- Added `import { prefsStore } from '../stores/prefsStore'`
- Added one line at the top of `tick()`: `if (!prefsStore.autoClaimChannelPoints) return`
- Interval continues to fire every 60s — when disabled, each tick is an instant no-op (negligible cost)
- When the user toggles it back on, the next tick resumes polling naturally (up to 60s latency, which is fine for this feature)

### 4. Settings UI (`src/screens/SettingsScreen.tsx`)

- New `PrefRow` inserted between "Chat position" and the Log Out section
- `focusKey="settings-pref-auto-claim-points"`
- `label="Auto-claim channel points"`
- `value`/`active` reactive to `prefsStore.autoClaimChannelPoints`
- `onToggle` flips via `updatePref(...)` — identical pattern to the Chat visibility row

## Commits

| Task | Name                                                     | Commit    | Files                                                                                           |
| ---- | -------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------- |
| 1a   | Add failing tests for autoClaimChannelPoints default     | `a68e2d0` | `src/stores/__tests__/prefsStore.test.ts`                                                       |
| 1b   | Add pref + gate claimer tick (TDD green)                 | `1ce5673` | `src/stores/prefsStore.ts`, `src/hooks/useChannelPointsClaimer.ts`                              |
| 2    | Add Settings toggle for Auto-claim channel points        | `bde25ec` | `src/screens/SettingsScreen.tsx`                                                                |

## Verification Results

- `npx vitest run` (full suite): **215/215 tests pass** (up from 213 — two new pref-default assertions)
- `npx tsc --noEmit`: clean, no type errors
- `TwitchChannelPointsService.ts`: untouched (confirmed by grep — attribution header to adamff-dev intact)

## Deviations from Plan

1. **Worktree lacked `node_modules`** — hardlinked from main repo (`cp -al`) to enable `npx vitest`/`npx tsc`. Infrastructure only; no tracked-file changes.
2. **Stray pre-existing edit in `src/services/TwitchChannelPointsService.ts`** — a single line ("by adamff-dev. Rewritten in TypeScript / SolidJS idioms — not a verbatim copy.") was absent from the working tree when the executor started. Executor reverted to the committed version before making its own commits. The orchestrator re-verified the attribution line is intact after merge.

Neither deviation changed the plan's specified four-file diff.

## Key Decisions Made

1. **Default `true`** — the user explicitly added this feature in the preceding quick task. Defaulting it off would be surprising. Users who don't want it can toggle it off at any time.
2. **Gate in `tick()` not around `setInterval`** — mid-session reactivity comes free because `prefsStore` is a Solid store, and keeping the interval alive when disabled costs ~nothing (one null check every 60s).
3. **Row placement** — between "Chat position" and logout keeps the destructive action visually separated, matches the existing flow.

## Known Stubs

None — all three layers (store, hook, UI) are fully wired.

## Manual Smoke Test

1. Open Settings → see new "Auto-claim channel points" row, defaults to "On".
2. Toggle it with OK → value flips to "Off", persists across reloads.
3. Go to a live channel → no `[TwitchChannelPointsService] claimed …` logs appear.
4. Toggle back to "On" → within ≤60s the next tick runs and the feature resumes.

## Self-Check: PASSED

All four tracked-file changes verified post-merge. Attribution header to adamff-dev preserved in service file.
