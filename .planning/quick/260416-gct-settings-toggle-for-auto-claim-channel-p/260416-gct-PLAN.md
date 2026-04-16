---
phase: quick-260416-gct
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/stores/prefsStore.ts
  - src/stores/__tests__/prefsStore.test.ts
  - src/hooks/useChannelPointsClaimer.ts
  - src/screens/SettingsScreen.tsx
autonomous: true
requirements:
  - QT-260416-gct

must_haves:
  truths:
    - "User sees an 'Auto-claim channel points' row in Settings between 'Chat position' and the 'Log Out' section."
    - "The row shows 'On' by default (pref defaults to true, preserving current behavior)."
    - "Pressing OK on the row flips the value between 'On' and 'Off' and persists it to localStorage via the existing prefs plumbing."
    - "When the pref is 'Off', the useChannelPointsClaimer tick no-ops (no GQL request fires on the 60s interval or on the immediate first tick) while PlayerScreen is mounted."
    - "When the pref is 'On', the existing auto-claim behavior is unchanged."
    - "Toggling the pref while a stream is playing takes effect on the next tick without requiring a remount — the Solid store read inside tick() observes the new value."
    - "Full test suite (`npx vitest run`) and `npx tsc --noEmit` both pass cleanly."
  artifacts:
    - path: "src/stores/prefsStore.ts"
      provides: "autoClaimChannelPoints: boolean added to PrefsState interface and DEFAULTS (default true)"
      contains: "autoClaimChannelPoints"
    - path: "src/stores/__tests__/prefsStore.test.ts"
      provides: "Coverage for the new default, including at least one assertion that autoClaimChannelPoints defaults to true"
      contains: "autoClaimChannelPoints"
    - path: "src/hooks/useChannelPointsClaimer.ts"
      provides: "Gate at the top of tick() that returns early when prefsStore.autoClaimChannelPoints is false"
      contains: "prefsStore.autoClaimChannelPoints"
    - path: "src/screens/SettingsScreen.tsx"
      provides: "New PrefRow for the auto-claim toggle inserted between 'Chat position' and the Log Out section"
      contains: "settings-pref-auto-claim-points"
  key_links:
    - from: "src/screens/SettingsScreen.tsx"
      to: "src/stores/prefsStore.ts"
      via: "prefsStore.autoClaimChannelPoints read + updatePref('autoClaimChannelPoints', ...) write in the new PrefRow"
      pattern: "updatePref\\('autoClaimChannelPoints'"
    - from: "src/hooks/useChannelPointsClaimer.ts"
      to: "src/stores/prefsStore.ts"
      via: "Early-return gate at the top of tick() reading prefsStore.autoClaimChannelPoints"
      pattern: "prefsStore\\.autoClaimChannelPoints"
---

<objective>
Add a user-controlled On/Off toggle for the auto channel-points claiming feature that was shipped in quick task 260416-g3l. Default stays On (preserves current behavior), and flipping it Off makes the existing 60s poll inside `useChannelPointsClaimer` a silent no-op.

Purpose: The feature is currently unconditional. Give the user a simple, remote-navigable control in Settings to disable it, without restructuring the composable or adding any reactive plumbing.

Output:
- `autoClaimChannelPoints: boolean` pref (default `true`) added to `prefsStore` and covered by tests.
- One-line gate inside `useChannelPointsClaimer.tick()` that short-circuits when the pref is `false`.
- One new `PrefRow` in `SettingsScreen`, inserted between "Chat position" and the Log Out section, mirroring the existing "Chat visibility" row's structure.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@.planning/quick/260416-g3l-add-auto-channel-points-claiming/260416-g3l-SUMMARY.md
@src/stores/prefsStore.ts
@src/stores/__tests__/prefsStore.test.ts
@src/screens/SettingsScreen.tsx
@src/components/molecules/PrefRow.tsx
@src/hooks/useChannelPointsClaimer.ts

<interfaces>
<!-- Existing contracts executor needs. Extracted from the codebase. -->

From src/stores/prefsStore.ts:
```typescript
export interface PrefsState {
  chatVisible: boolean
  chatPosition: 'left' | 'right'
}
// Needs a new boolean key: autoClaimChannelPoints (default true)

export function updatePref<K extends keyof PrefsState>(key: K, value: PrefsState[K]): void
export { prefsStore }
```

From src/components/molecules/PrefRow.tsx:
```typescript
interface PrefRowProps {
  focusKey: string
  label: string
  value: string      // rendered string, e.g. 'On' / 'Off'
  active: boolean    // drives accent vs. disabled color
  onToggle: () => void
}
```

From src/hooks/useChannelPointsClaimer.ts (current tick shape — gate goes at the VERY TOP):
```typescript
async function tick() {
  if (stopped) return
  // NEW GATE GOES HERE: if (!prefsStore.autoClaimChannelPoints) return
  try {
    const result = await twitchChannelPointsService.pollAndClaim(channelLogin)
    // ...
  } catch (err) {
    console.warn('[useChannelPointsClaimer] poll failed:', err)
  }
}
```

Existing "Chat visibility" row in SettingsScreen.tsx — pattern to mirror exactly:
```tsx
<PrefRow
  focusKey="settings-pref-chat-visible"
  label="Chat visibility"
  value={prefsStore.chatVisible ? 'On' : 'Off'}
  active={prefsStore.chatVisible}
  onToggle={() => updatePref('chatVisible', !prefsStore.chatVisible)}
/>
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add autoClaimChannelPoints pref (default true) with test coverage, and gate the claimer tick</name>
  <files>src/stores/prefsStore.ts, src/stores/__tests__/prefsStore.test.ts, src/hooks/useChannelPointsClaimer.ts</files>
  <behavior>
    - `prefsStore.autoClaimChannelPoints` exists, typed `boolean`, and equals `true` when no localStorage entry is present.
    - `updatePref('autoClaimChannelPoints', false)` persists to localStorage alongside existing keys (full state persists — existing pattern).
    - The existing "merges missing keys with defaults" test behavior must still hold for the new key: a stored object that omits `autoClaimChannelPoints` still yields `true` at read time.
    - Inside `useChannelPointsClaimer.tick()`, when `prefsStore.autoClaimChannelPoints` is `false`, the function returns before calling `twitchChannelPointsService.pollAndClaim` (no GQL request).
    - When the pref is `true`, `tick()` behaves exactly as before (no regressions in the 206 existing tests).

    Test updates in `src/stores/__tests__/prefsStore.test.ts`:
    - Extend the "loads defaults when no localStorage key exists" test to also assert `prefsStore.autoClaimChannelPoints` is `true`.
    - Add at least one new test specifically asserting the `autoClaimChannelPoints` default is `true` (can be a dedicated `it('defaults autoClaimChannelPoints to true', ...)` block for clarity).
    - Optional but recommended: extend an existing test (e.g. the "merges missing keys with defaults" case or the full-state-persistence case) to also cover the new key, so a future regression surfaces.
    - Do NOT add a composable test for `useChannelPointsClaimer` — no such test exists today and none should be added for this task.
  </behavior>
  <action>
    Step 1 — `src/stores/prefsStore.ts`:
    - Add `autoClaimChannelPoints: boolean` to the `PrefsState` interface (place after `chatPosition` for readability).
    - Add `autoClaimChannelPoints: true` to the `DEFAULTS` constant.
    - Do NOT touch `loadPrefs`, `updatePref`, or the `localStorage` key — they work generically across the interface and will persist the new key for free.

    Step 2 — `src/stores/__tests__/prefsStore.test.ts`:
    - In the "loads defaults when no localStorage key exists" test, add `expect(prefsStore.autoClaimChannelPoints).toBe(true)` alongside the existing `chatVisible` / `chatPosition` assertions.
    - Add a dedicated test: `it('defaults autoClaimChannelPoints to true', async () => { ... })` that imports the store fresh and asserts `prefsStore.autoClaimChannelPoints` is `true`. Satisfies the non-negotiable constraint explicitly.
    - In the "merges missing keys with defaults" test, either extend it or add a small parallel case asserting that a stored `{ chatPosition: 'left' }` still yields `prefsStore.autoClaimChannelPoints === true`. This protects against a future PrefsState migration quietly dropping the default.
    - Keep the `beforeEach` reset logic (`localStorage.clear()` + `vi.resetModules()`) — do not change the test harness.

    Step 3 — `src/hooks/useChannelPointsClaimer.ts`:
    - Add `import { prefsStore } from '../stores/prefsStore'` near the existing service import (alphabetical if the file already orders imports; otherwise grouped with other `../stores/*` or `../services/*` style imports — match surrounding style).
    - Inside `tick()`, immediately after `if (stopped) return`, add:
      ```ts
      if (!prefsStore.autoClaimChannelPoints) return
      ```
    - Do NOT wrap `setInterval` setup or `onCleanup` with a condition. The interval always runs; the tick becomes a 60s no-op when the pref is off. Scope guardrail: keep the diff minimal.
    - Do NOT convert the composable to a `createEffect`-driven start/stop shape — explicit constraint from the brief.
    - Do NOT touch `TwitchChannelPointsService.ts` — explicit scope guardrail.

    Because `prefsStore` is a SolidJS store, reading `prefsStore.autoClaimChannelPoints` inside `tick()` always observes the latest value after `updatePref` — no reactivity bridging or signal subscription is needed for the gate.
  </action>
  <verify>
    <automated>npx vitest run src/stores/__tests__/prefsStore.test.ts</automated>
  </verify>
  <done>
    - `PrefsState` includes `autoClaimChannelPoints: boolean`; `DEFAULTS.autoClaimChannelPoints === true`.
    - `prefsStore` test file has the extended assertion in the existing "loads defaults…" test AND at least one new test explicitly asserting the default is `true`. All prefsStore tests pass.
    - `useChannelPointsClaimer.tick()` has a one-line early-return gate reading `prefsStore.autoClaimChannelPoints`, placed immediately after the `stopped` check and before any service call.
    - `TwitchChannelPointsService.ts` is untouched.
    - No new composable test was introduced.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add the Settings PrefRow, run full suite + typecheck</name>
  <files>src/screens/SettingsScreen.tsx</files>
  <action>
    In `src/screens/SettingsScreen.tsx`, add one new `PrefRow` inside the existing `<div class={`${styles.prefList} gap-col-lg`}>` block. Insert it AFTER the "Chat position" row and BEFORE the `{/* Log Out button — visually separated from prefs */}` comment / `logoutSection` div. This places it in the natural focus sequence between the last pref and the Log Out button — do not change focus keys on existing rows or the `onMount(() => setFocus('settings-pref-chat-visible'))` initial focus.

    Mirror the "Chat visibility" row's structure exactly:

    ```tsx
    <PrefRow
      focusKey="settings-pref-auto-claim-points"
      label="Auto-claim channel points"
      value={prefsStore.autoClaimChannelPoints ? 'On' : 'Off'}
      active={prefsStore.autoClaimChannelPoints}
      onToggle={() => updatePref('autoClaimChannelPoints', !prefsStore.autoClaimChannelPoints)}
    />
    ```

    No other changes to this file — no copy tweaks to existing rows, no focus-order rewiring, no style changes, no animation/flourish additions (scope guardrails).

    After the edit, run the full test suite and typecheck together:
    ```
    npx vitest run
    npx tsc --noEmit
    ```
    Both must pass. If `npx vitest run` surfaces a regression anywhere (not just in the prefsStore tests), fix it before committing — the expected outcome is a green suite with the existing tests plus the new prefsStore assertions added in Task 1.

    Smoke expectations (manual — not a required verification step, but useful sanity):
    - Settings shows three rows now: Chat visibility, Chat position, Auto-claim channel points.
    - D-pad Down from "Chat position" lands on the new row; D-pad Down from the new row lands on "Log Out".
  </action>
  <verify>
    <automated>npx vitest run &amp;&amp; npx tsc --noEmit</automated>
  </verify>
  <done>
    - `SettingsScreen.tsx` renders a third `PrefRow` with `focusKey="settings-pref-auto-claim-points"`, label `Auto-claim channel points`, and toggle logic wired to `prefsStore.autoClaimChannelPoints` via `updatePref`.
    - The new row is positioned between "Chat position" and the `logoutSection` `<div>`.
    - No other changes to `SettingsScreen.tsx` beyond the one inserted `<PrefRow>` (and any necessary whitespace).
    - `npx vitest run` passes the full suite with zero regressions.
    - `npx tsc --noEmit` passes clean.
  </done>
</task>

</tasks>

<verification>
Phase-level checks (run after both tasks complete):
- `npx vitest run` — full suite green, including the extended/new `prefsStore` tests.
- `npx tsc --noEmit` — no type errors.
- `grep -n "autoClaimChannelPoints" src/stores/prefsStore.ts src/hooks/useChannelPointsClaimer.ts src/screens/SettingsScreen.tsx` — the key appears in all three files (interface/defaults, gate, PrefRow wiring).
- `grep -n "autoClaimChannelPoints" src/services/TwitchChannelPointsService.ts` — zero matches (service stays untouched).
- Visual / manual (optional): load the Settings screen in dev, confirm three rows render, confirm OK on the new row flips "On"/"Off" and persists across reload.
</verification>

<success_criteria>
- `PrefsState` has `autoClaimChannelPoints: boolean` with default `true`; persisted round-trip works through the existing localStorage path.
- At least one explicit test asserts `autoClaimChannelPoints` defaults to `true`; existing prefsStore tests updated where relevant.
- `useChannelPointsClaimer.tick()` short-circuits when the pref is `false` — no GQL requests fire from that tick under the off state.
- Settings screen shows the new toggle row in the correct position, mirroring the Chat visibility pattern exactly.
- Full test suite and TypeScript compile both pass cleanly.
- `TwitchChannelPointsService.ts` and the focus-order/initial-focus behavior of `SettingsScreen` are unchanged beyond the single inserted row.
</success_criteria>

<output>
After completion, create `.planning/quick/260416-gct-settings-toggle-for-auto-claim-channel-p/260416-gct-SUMMARY.md`
</output>
