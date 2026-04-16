---
quick_id: 260416-fjq
description: "Atomic design refactor: extract ActionButton atom, PrefRow molecule, PlayerScreen organisms"
date: 2026-04-16
status: completed
commits:
  - ffd7aaa
  - 48ed968
  - 97db01b
---

# Quick Task 260416-fjq — Summary

## Objective

Follow-up to 260415-m2b. The first pass enforced the atomic-design skill's
**token discipline** rule. This pass enforces the other two pillars:
**"compose, do not duplicate"** and **"build bottom-up through four
levels."** Decompose the three largest files (PlayerScreen, PlayerSettings-
Overlay, LogoutConfirmDialog) by extracting reusable atoms, molecules,
and organisms.

## Hierarchy Introduced

```
src/components/
├── atoms/
│   ├── ActionButton.tsx         ← indivisible focusable button
│   └── ActionButton.module.css
├── molecules/
│   ├── PrefRow.tsx              ← label atom + value atom + shared pref-row
│   └── PrefRow.module.css
├── organisms/
│   ├── VideoInfoBar.tsx         ← stream metadata overlay
│   ├── PlayerErrorOverlay.tsx   ← error + retry
│   ├── ScopeErrorOverlay.tsx    ← scope-missing full screen
│   └── *.module.css
└── (existing components untouched: ChannelCard, ChannelGrid, ChatSidebar,
   ChatMessage, AuthGuard, LogoutConfirmDialog, PlayerSettingsOverlay)
```

## What Was Done

### Task 1 — ActionButton atom (commit `ffd7aaa`)

Every actionable button on TV needs the same Focusable wrapper + focus-ring
wiring. This was inlined 7 times across 5 files with ~8 lines each.

Now a single atom:

```tsx
<ActionButton focusKey="settings-logout" variant="destructive" onPress={...}>
  Log Out
</ActionButton>
```

**Variants:** `primary` (accent bg), `destructive` (destructive bg).
**Styles:** `composes: button-base from shared.css`; variants add only
the background color.

**Migrations:** LoginScreen retry, ChannelsScreen retry, PlayerScreen
scope-reauth, PlayerScreen retry, SettingsScreen logout, LogoutConfirm-
Dialog cancel + confirm.

Net change: **+75 / −110** (−35 lines).

### Task 2 — PrefRow molecule (commit `48ed968`)

The preference toggle row (label + on/off value with conditional color
+ focus-ring) was inlined 4 times — twice in SettingsScreen, twice in
PlayerSettingsOverlay. Each instance ~24 lines.

Now a single molecule:

```tsx
<PrefRow
  focusKey="settings-pref-chat-visible"
  label="Chat visibility"
  value={prefsStore.chatVisible ? 'On' : 'Off'}
  active={prefsStore.chatVisible}
  onToggle={() => updatePref('chatVisible', !prefsStore.chatVisible)}
/>
```

**Styles:** `composes: pref-row from shared.css`; color swap via
`active` boolean (accent vs disabled).

**LOC reductions:**
- `SettingsScreen.tsx`: 94 → 54 (−40)
- `PlayerSettingsOverlay.tsx`: 103 → 71 (−32)

Net change: **+80 / −123** (−43 lines).

### Task 3 — PlayerScreen organisms (commit `97db01b`)

PlayerScreen was a 434-LOC god component combining HLS init, chat
lifecycle, message batching, 4 keyboard handlers, 3 inline JSX overlays,
and the info bar. Extracted three **presentational** organisms:

| Organism | Props | Replaces |
|----------|-------|----------|
| `VideoInfoBar` | `stream: StreamData` | ~20 lines of inline JSX + `formatWatching()` helper |
| `PlayerErrorOverlay` | `kind: PlayerErrorKind`, `onRetry` | ~28 lines of inline nested ternaries |
| `ScopeErrorOverlay` | `onReauth` | ~12 lines of inline overlay |

Each organism is strictly presentational: data via props, events via
callbacks, no direct access to services or stores. Each composes
`ActionButton` (bottom-up hierarchy per the atomic-design skill).

**LOC reductions:**
- `PlayerScreen.tsx`: 434 → 365 (−69)
- `PlayerScreen.module.css`: 145 → 50 (−95)

Net change: **+196 / −159** across 8 files (organism CSS moved out).

## Cumulative Impact

| Metric | Before | After | Δ |
|--------|--------|-------|---|
| PlayerScreen.tsx | 434 | 365 | −69 |
| PlayerScreen.module.css | 145 | 50 | −95 |
| PlayerSettingsOverlay.tsx | 103 | 71 | −32 |
| SettingsScreen.tsx | 94 | 54 | −40 |
| LogoutConfirmDialog.tsx | 80 | 56 | −24 |
| ChannelsScreen.tsx | 101 | 90 | −11 |
| LoginScreen.tsx | 167 | 158 | −9 |
| **Inlined-button duplicates** | 7 | 0 | **−7** |
| **Inlined pref-row duplicates** | 4 | 0 | **−4** |
| **Inline overlay duplicates in PlayerScreen** | 3 | 0 | **−3** |

Reused components created: **1 atom + 1 molecule + 3 organisms = 5 new
presentational components**.

## Verification

- `npx vitest run` — **99/99 tests pass** (15 test files) across all three commits
- `npx vite build` — succeeds, 238 modules transformed
- `grep -l "ActionButton" src/` — 5 consumer files
- `grep -l "PrefRow" src/` — 2 consumer files
- No local `.button` rules remain in LoginScreen, ChannelsScreen,
  PlayerScreen, SettingsScreen, LogoutConfirmDialog
- No local `.prefRow/.prefLabel/.prefValue` rules remain in
  SettingsScreen or PlayerSettingsOverlay

## Skill Alignment (atomic-design)

| Rule | Before | After |
|------|--------|-------|
| Bottom-up composition (never skip levels) | Screens composed raw markup + stores inline | Screens compose organisms; organisms compose molecules/atoms; atoms reference shared tokens |
| Compose, do not duplicate | 7 button + 4 pref-row + 3 overlay duplicates | All consolidated into reusable components |
| Presentational boundary | Mixed (PlayerSettingsOverlay read prefsStore directly) | New organisms take data via props, emit events via callbacks |
| Single responsibility per level | PlayerScreen did 6+ jobs | Screen now orchestrates organisms; each organism owns one job |
| Hierarchy self-evident | Flat `components/` dir | `atoms/ → molecules/ → organisms/` subfolders |

## Files Added

```
src/components/atoms/ActionButton.tsx
src/components/atoms/ActionButton.module.css
src/components/molecules/PrefRow.tsx
src/components/molecules/PrefRow.module.css
src/components/organisms/VideoInfoBar.tsx
src/components/organisms/VideoInfoBar.module.css
src/components/organisms/PlayerErrorOverlay.tsx
src/components/organisms/PlayerErrorOverlay.module.css
src/components/organisms/ScopeErrorOverlay.tsx
src/components/organisms/ScopeErrorOverlay.module.css
```

## Notes / Deferred Work

- **Existing components not moved.** `ChannelCard` (molecule), `ChannelGrid`
  (organism), `ChatSidebar` (organism), `ChatMessage` (molecule),
  `LogoutConfirmDialog` (organism), `PlayerSettingsOverlay` (organism),
  and `AuthGuard` (non-presentational route guard) were left in their
  current locations to avoid a large import-churn refactor. Their
  classification is documented here and could be made self-evident in a
  follow-up move. The skill accepts either approach ("The hierarchy is
  documented or self-evident from directory structure").
- **PlayerScreen is still 365 LOC.** Further reductions are possible by
  extracting `useHlsPlayer()` and `useChatLifecycle()` composables (Solid
  hooks), which would drop the screen to ~150 LOC. Deferred — it's a
  larger refactor and the atomic-design skill is primarily concerned with
  the component hierarchy, which is now well-structured.
- **Linear gradient and toggle-hint text** in PlayerScreen remain inline;
  they're single-use pieces of copy, not worth extracting.
