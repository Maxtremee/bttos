# Phase 6: Settings & Polish - Research

**Researched:** 2026-04-15
**Domain:** SolidJS settings screen, preferences persistence, TV remote key handling, D-pad navigation audit
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Gear icon in the Channels screen header (top-right area) as the primary navigation path to settings. D-pad up from the channel grid reaches it.
- **D-02:** Green remote button as a global shortcut to open settings from any screen.
- **D-03:** On the Channels screen, Green button navigates to the full `/settings` route.
- **D-04:** On the Player screen, Green button opens a settings overlay on top of the video — stream keeps playing underneath. User is NOT redirected away from playback.
- **D-05:** Two preferences for v1: chat default visibility (on/off toggle) and chat position (left/right side of the video).
- **D-06:** Preferences persist via localStorage across app restarts — consistent with existing auth token persistence pattern.
- **D-07:** Chat position is configurable only from settings, not via a live toggle during playback.
- **D-08:** The player settings overlay shows only chat-related preferences (visibility, position). Full settings (all preferences + logout) are only available on the full settings screen.
- **D-09:** Logout requires a confirmation dialog ("Are you sure?") before clearing tokens.
- **D-10:** On confirm, clear all tokens from localStorage only (no Twitch API token revocation call). Redirect to `/login` after clearing.

### Claude's Discretion

- Confirmation dialog visual design and button labels
- Gear icon visual style (icon choice, size, color)
- Settings screen layout (list of options, toggle controls styling)
- Player settings overlay visual design (position, background opacity, animation)
- Preferences store implementation details (SolidJS store pattern)
- Navigation polish — ensuring all remote navigation paths have no dead ends across all screens (success criteria #3)
- Green button keyCode mapping for webOS remote

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SETT-01 | User can log out from settings screen | `twitchAuthService.clearTokens()` already clears all 4 localStorage keys and resets authStore. `history.set({ value: '/login' })` handles redirect. Confirmation dialog pattern verified from existing overlay patterns in PlayerScreen. |
| SETT-02 | User can access basic preferences from settings | `createStore` from `solid-js/store` is the established pattern (authStore uses it). `localStorage` key `twitch_prefs` with JSON `{ chatVisible: boolean, chatPosition: 'left' \| 'right' }`. PlayerScreen already has `chatVisible` signal and `chatWidth`; preferences store initialises these on mount. |

</phase_requirements>

---

## Summary

Phase 6 is a pure SolidJS composition and state management task. All underlying services are already built: `twitchAuthService.clearTokens()` exists and handles full logout, `createStore` from `solid-js/store` is the established store pattern, the spatial navigation `Focusable` component handles D-pad focus for every interactive element, and the design token system in `global.css` covers every visual element without new tokens needed.

The main work is: (1) replace the `SettingsScreen` skeleton with a working screen containing toggles and a logout button, (2) add a `prefsStore` for the two preferences, (3) add a gear icon to `ChannelsScreen` header, (4) add a `PlayerSettingsOverlay` component with a Green button handler in `PlayerScreen`, (5) wire the Green button (keyCode 404) in `App.tsx` global handler, and (6) integrate preferences into `ChatSidebar` rendering order and default visibility in `PlayerScreen`.

The navigation audit (success criteria #3) is a verification task: the UI-SPEC already contains the full D-pad matrix for every screen. The executor verifies no dead ends remain after wiring the gear icon.

**Primary recommendation:** Build `prefsStore.ts` first (it is a dependency of both SettingsScreen and PlayerScreen), then replace SettingsScreen, then add PlayerSettingsOverlay, then wire gear icon + Green button in App.tsx and ChannelsScreen.

---

## Standard Stack

### Core (already installed — no new packages required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| solid-js | ^1.9.12 | `createStore`, `createSignal`, `Show`, component model | Project standard. All screens already use it. |
| solid-js/store | (bundled with solid-js) | Structured reactive state for `prefsStore` | Same pattern as `authStore` — `createStore` gives object-level reactivity without re-renders of unchanged fields. |
| @solidjs/router | (already installed) | `useNavigate` / `history.set()` for post-logout redirect | Already used in App.tsx; `history` instance is module-level so SettingsScreen can import and call `history.set({ value: '/login' })`. |
| @lampa-dev/solidjs-spatial-navigation | ^1.0.0 | `Focusable`, `useSpatialNavigation`, `setFocus` | All interactive elements in settings use this for D-pad focus. Re-export from `src/navigation/index.ts`. |

**No new npm packages are needed for this phase.** [VERIFIED: codebase grep]

### Supporting (already installed)

| Library | Purpose | When to Use |
|---------|---------|-------------|
| `src/services/TwitchAuthService.ts` → `clearTokens()` | Complete logout (clears localStorage + resets authStore) | Called from LogoutConfirmDialog on confirm. Already handles all 4 keys. |
| `localStorage` | Preference persistence (key: `twitch_prefs`) | Same pattern as auth tokens — consistent with D-06. |

---

## Architecture Patterns

### Recommended Project Structure (new files for Phase 6)

```
src/
├── stores/
│   ├── authStore.ts          (existing — unchanged)
│   └── prefsStore.ts         (NEW — preferences reactive store)
├── screens/
│   ├── SettingsScreen.tsx    (REPLACE skeleton with working screen)
│   ├── ChannelsScreen.tsx    (MODIFY — add gear icon to header)
│   └── PlayerScreen.tsx      (MODIFY — add PlayerSettingsOverlay + prefs integration)
├── components/
│   ├── LogoutConfirmDialog.tsx   (NEW — modal confirmation dialog)
│   ├── PlayerSettingsOverlay.tsx (NEW — in-player settings panel)
│   └── ChatSidebar.tsx       (MODIFY — accept `position` prop for left/right)
└── App.tsx                   (MODIFY — add Green button handler)
```

### Pattern 1: Preferences Store (createStore with localStorage bootstrap)

**What:** A module-level SolidJS store that reads from localStorage on module load and writes back on every change. Mirrors the `authStore` pattern exactly.

**When to use:** For all persistent preferences that must survive app restarts.

```typescript
// Source: mirrors src/stores/authStore.ts [VERIFIED: codebase read]
// src/stores/prefsStore.ts

import { createStore } from 'solid-js/store'

export interface PrefsState {
  chatVisible: boolean
  chatPosition: 'left' | 'right'
}

const PREFS_KEY = 'twitch_prefs'
const DEFAULTS: PrefsState = { chatVisible: true, chatPosition: 'right' }

function loadPrefs(): PrefsState {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    localStorage.removeItem(PREFS_KEY)
    return DEFAULTS
  }
}

const [prefsStore, setPrefsStore] = createStore<PrefsState>(loadPrefs())

export function updatePref<K extends keyof PrefsState>(key: K, value: PrefsState[K]): void {
  setPrefsStore(key, value)
  localStorage.setItem(PREFS_KEY, JSON.stringify({ ...prefsStore }))
}

export { prefsStore }
```

**Key insight:** The `...DEFAULTS, ...JSON.parse(raw)` spread handles future-proofing — if new pref keys are added later, stored JSON without those keys will still get the defaults.

### Pattern 2: ToggleControl (Focusable wrapper with OK handler)

**What:** A reusable component that wraps a preference row — label + current value display + Focusable for D-pad interaction.

**When to use:** For each preference row in SettingsScreen and PlayerSettingsOverlay.

```typescript
// Source: Focusable pattern from src/screens/ChannelsScreen.tsx [VERIFIED: codebase read]
// Inline toggle row — no separate file needed; can be defined inside SettingsScreen

interface ToggleRowProps<T extends string | boolean> {
  label: string
  value: T
  options: [T, string][]  // [value, display label] pairs
  onToggle: () => void
  focusKey: string
}
```

**Pattern note:** Chat visibility is boolean (on/off). Chat position is `'left' | 'right'`. Both can use the same "cycle through options" pattern: pressing OK on the toggle cycles to the next option. This is simpler than a two-state switch and works correctly with D-pad (no need to navigate left/right within the toggle).

### Pattern 3: Logout Flow

**What:** LogoutButton triggers modal dialog. Dialog has Cancel (default focus) and Log Out buttons. Confirm calls `twitchAuthService.clearTokens()` then navigates to `/login`.

**When to use:** Required by D-09/D-10.

```typescript
// Source: twitchAuthService.clearTokens() verified in src/services/TwitchAuthService.ts [VERIFIED]
// Navigation via module-level history instance from App.tsx [VERIFIED: codebase read]

function handleLogout() {
  twitchAuthService.clearTokens()
  history.set({ value: '/login' })
}
```

**Critical:** The `history` object is declared at the module level in `App.tsx` (`const history = createMemoryHistory()`). To use it from SettingsScreen, either: (a) export it from App.tsx and import in SettingsScreen, or (b) pass it as a prop/context. Option (a) is simpler and consistent — export `history` from `App.tsx`.

### Pattern 4: Green Button Global Handler (App.tsx)

**What:** Extend the existing `handleKeyDown` in `App.tsx` to intercept keyCode 404 (Green button) and act based on current route.

**When to use:** Required by D-02/D-03/D-04.

```typescript
// Source: App.tsx handleKeyDown pattern [VERIFIED: codebase read]
const KEY_GREEN = 404  // webOS Green remote button — confirmed by UI-SPEC [CITED: 06-UI-SPEC.md]

function handleKeyDown(e: KeyboardEvent) {
  if (e.keyCode === KEY_BACK) { /* existing logic */ }
  if (e.keyCode === KEY_GREEN) {
    e.preventDefault()
    const currentPath = history.get() ?? '/'
    if (currentPath === '/channels') {
      history.set({ value: '/settings' })
    }
    // For PlayerScreen: dispatch a custom event or use a store signal
    // that PlayerScreen listens to for toggling its overlay
  }
}
```

**PlayerScreen overlay trigger:** The Green button from App.tsx cannot directly call a signal inside PlayerScreen. Two clean options:
- **Option A (recommended):** A module-level signal `createSignal(false)` exported from a small `playerOverlayStore.ts`, set by App.tsx handler, read by PlayerScreen. Clean and consistent with the store pattern.
- **Option B:** PlayerScreen registers its own `keydown` listener for keyCode 404 (same as existing color button handlers in `handleKeyDown` in PlayerScreen). This is simpler — PlayerScreen already intercepts 403/405/406 in its own `handleKeyDown`. Add 404 there; App.tsx only handles it for Channels route.

**Option B is simpler** — no new store file needed. App.tsx handles `KEY_GREEN` for the `/channels` → `/settings` navigation. PlayerScreen handles `KEY_GREEN` for overlay toggle in its existing `handleKeyDown`. Both can coexist without conflict since each check is guarded by context.

### Pattern 5: PlayerSettingsOverlay (overlay above video, video keeps playing)

**What:** A fixed-position panel rendered conditionally inside PlayerScreen. Uses `Show` from solid-js. Video element is always rendered regardless of overlay visibility (already the pattern for loading/error overlays).

**When to use:** Required by D-04/D-08.

```typescript
// Source: info bar + scope error overlay patterns in src/screens/PlayerScreen.tsx [VERIFIED]
<Show when={settingsOverlayVisible()}>
  <div style={{
    position: 'absolute',
    top: 'var(--space-2xl)',
    right: 'var(--space-2xl)',
    width: '320px',
    background: 'rgba(26, 26, 26, 0.92)',
    padding: 'var(--space-lg)',
    'z-index': 50,
  }}>
    {/* ToggleRow for chatVisible */}
    {/* ToggleRow for chatPosition */}
    {/* Dismiss hint */}
  </div>
</Show>
```

### Pattern 6: Chat Position Integration in PlayerScreen

**What:** ChatSidebar renders on the right by default (after video div in flex row). For `chatPosition: 'left'`, it must render before the video div.

**When to use:** Required by D-05 / SETT-02.

```typescript
// Source: PlayerScreen.tsx flex layout [VERIFIED: codebase read]
// Two render approaches for left vs right position:

<div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
  <Show when={chatVisible() && prefsStore.chatPosition === 'left'}>
    <ChatSidebar ... />
  </Show>
  <div style={{ flex: 1, position: 'relative' }}>
    {/* video + overlays */}
  </div>
  <Show when={chatVisible() && prefsStore.chatPosition === 'right'}>
    <ChatSidebar ... />
  </Show>
</div>
```

**Note:** `ChatSidebar` currently has `border-left: 1px solid rgba(255,255,255,0.1)`. When position is `left`, this border should become `border-right`. Add a `position` prop to `ChatSidebar` and use it to conditionally apply the correct border.

**Also note:** The current `chatVisible` signal in PlayerScreen is initialised as `createSignal(true)`. Phase 6 must initialise it from `prefsStore.chatVisible` instead.

### Anti-Patterns to Avoid

- **Importing `history` before it is instantiated:** The `history` constant in App.tsx is initialised synchronously at module load. Circular import risk is low — `SettingsScreen` does not import `App.tsx` at startup. Export `history` from `App.tsx` directly.
- **Two listeners on the same keyCode:** If both App.tsx and PlayerScreen register `keydown` for key 404, the event fires on both. Use `e.stopPropagation()` in PlayerScreen's handler, or use the "only one place handles each screen's keys" pattern — App.tsx handles channels, PlayerScreen handles player.
- **Writing preferences on every render vs on toggle:** Write to localStorage only inside the `updatePref` function on OK press, not inside `createEffect`. Avoids unnecessary writes.
- **Setting focus to a key that doesn't exist yet:** `setFocus('settings-pref-chat-visible')` will silently fail if called before the Focusable mounts. Use `onMount(() => setFocus(...))` pattern, consistent with all existing screens.
- **Hardcoding chat position border on ChatSidebar:** The current `border-left` is hardcoded in the component. Add a `position?: 'left' | 'right'` prop and choose border side accordingly.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Logout token clearing | Custom localStorage cleanup logic | `twitchAuthService.clearTokens()` | Already handles all 4 keys atomically and resets authStore. Adding a custom implementation risks missing a key. |
| D-pad focus management | Manual `onFocus`/`onBlur` handlers | `Focusable` + `useSpatialNavigation()` from `@lampa-dev/solidjs-spatial-navigation` | Directional focus calculation is non-trivial. Library is already wired and tested. |
| JSON parse safety for localStorage | Try/catch-less `JSON.parse` | `try { JSON.parse } catch { clearItem; useDefaults }` | webOS localStorage is persistent across power cycles — corrupted JSON from a failed write will break the app on every subsequent boot. |
| Modal backdrop | CSS `position:fixed` overlay with custom click-outside | Standard pattern already used for scope error overlay in PlayerScreen | Consistent implementation; no new mechanism needed. |

---

## Common Pitfalls

### Pitfall 1: Green button keyCode not 404 on all webOS versions
**What goes wrong:** keyCode 404 is the Green button per LG documentation and the UI-SPEC, but older webOS versions or some remote models may use a different code.
**Why it happens:** webOS TV remotes have different keycodes across hardware generations.
**How to avoid:** Log `e.keyCode` on any unknown keypress during development. The UI-SPEC documents 404 as confirmed. [CITED: 06-UI-SPEC.md]
**Warning signs:** Green button does nothing during testing.

### Pitfall 2: `history.set()` does not trigger route re-render if path unchanged
**What goes wrong:** If the user is already on `/settings` and presses Green, `history.set({ value: '/settings' })` is a no-op — no navigation occurs. This is fine for this phase since the gear icon from Channels always navigates to `/settings`, but worth knowing.
**Why it happens:** `@solidjs/router` with `createMemoryHistory` only re-renders on path change.
**How to avoid:** Non-issue for this phase. Document for future reference.

### Pitfall 3: `chatVisible` signal initialised as `true` instead of from prefs
**What goes wrong:** PlayerScreen currently has `const [chatVisible, setChatVisible] = createSignal(true)`. If not changed to read from `prefsStore.chatVisible`, the preference has no effect on first load.
**Why it happens:** Signal initialises before the store is consulted.
**How to avoid:** Change the initializer: `createSignal(prefsStore.chatVisible)`. Since `prefsStore` is a module-level store imported at the top of PlayerScreen, it is available synchronously at signal creation time. [VERIFIED: prefsStore uses createStore which is synchronous]

### Pitfall 4: Focus trapped in overlay — Back key must dismiss
**What goes wrong:** If the PlayerSettingsOverlay is open and the user presses Back, the App.tsx Back handler navigates to `/channels` instead of dismissing the overlay.
**Why it happens:** App.tsx Back handler checks `currentPath` but has no awareness of overlay state.
**How to avoid:** PlayerScreen's `handleKeyDown` must intercept Back (keyCode 461) when the overlay is open, dismiss the overlay, and call `e.stopPropagation()` before App.tsx sees it. Same pattern as how PlayerScreen currently intercepts color buttons before the global handler.

### Pitfall 5: LogoutConfirmDialog Back key behavior
**What goes wrong:** Dialog is open, user presses Back — App.tsx Back handler fires and navigates to `/channels` rather than dismissing the dialog.
**Why it happens:** Same root cause as Pitfall 4 — global handler fires before the dialog can intercept.
**How to avoid:** SettingsScreen (which owns the dialog's visibility signal) must add its own `keydown` listener for Back when the dialog is open, or the dialog itself must add/remove a listener on mount/unmount. Use `onMount`/`onCleanup` inside the dialog component.

### Pitfall 6: ChatSidebar border wrong side after position change
**What goes wrong:** ChatSidebar has `border-left` hardcoded. When moved to the left of the video, the divider line appears on the wrong side (left edge of the sidebar faces the screen edge, not the video).
**Why it happens:** Position-agnostic hardcoded style.
**How to avoid:** Add `position?: 'left' | 'right'` prop to ChatSidebar. Use `border-right` when `position === 'left'` and `border-left` when `position === 'right'` (the current default). [VERIFIED: ChatSidebar.tsx codebase read]

### Pitfall 7: Exporting `history` from App.tsx may cause circular imports
**What goes wrong:** If `SettingsScreen` imports `history` from `App.tsx`, and `App.tsx` imports `SettingsScreen`, the circular dependency may cause `history` to be `undefined` at the time `SettingsScreen` uses it.
**Why it happens:** ES module circular import order is unpredictable when both modules depend on each other at load time.
**How to avoid:** Extract `history` to its own module `src/router/history.ts` — a tiny file that creates and exports the `createMemoryHistory()` instance. Both `App.tsx` and `SettingsScreen` (and any future screen) import from this shared module. No circular dependency. [ASSUMED — architectural recommendation based on standard SolidJS routing patterns]

---

## Code Examples

### Preferences Store (full implementation pattern)
```typescript
// Source: mirrors src/stores/authStore.ts [VERIFIED: codebase read]
import { createStore } from 'solid-js/store'

export interface PrefsState {
  chatVisible: boolean
  chatPosition: 'left' | 'right'
}

const PREFS_KEY = 'twitch_prefs'
const DEFAULTS: PrefsState = { chatVisible: true, chatPosition: 'right' }

function loadPrefs(): PrefsState {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    localStorage.removeItem(PREFS_KEY)
    return { ...DEFAULTS }
  }
}

const [prefsStore, setPrefsStore] = createStore<PrefsState>(loadPrefs())

export function updatePref<K extends keyof PrefsState>(key: K, value: PrefsState[K]): void {
  setPrefsStore(key, value)
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...prefsStore }))
  } catch {
    // localStorage write failure (storage quota) — silently ignore; in-memory state still updated
  }
}

export { prefsStore }
```

### Focusable Toggle Row
```typescript
// Source: Focusable pattern from src/screens/ChannelsScreen.tsx [VERIFIED: codebase read]
<Focusable
  focusKey="settings-pref-chat-visible"
  as="div"
  onEnterPress={() => updatePref('chatVisible', !prefsStore.chatVisible)}
>
  {({ focused }) => (
    <div
      class={focused() ? 'focused' : ''}
      style={{
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
        'min-height': 'var(--min-target-height)',
        padding: 'var(--space-md) var(--space-xl)',
        background: 'var(--color-surface)',
      }}
    >
      <span style={{ 'font-size': 'var(--font-size-body)', color: 'var(--color-text-primary)' }}>
        Chat visibility
      </span>
      <span style={{
        'font-size': 'var(--font-size-label)',
        'font-weight': 'var(--font-weight-semibold)',
        color: prefsStore.chatVisible ? 'var(--color-accent)' : 'var(--color-text-disabled)',
      }}>
        {prefsStore.chatVisible ? 'On' : 'Off'}
      </span>
    </div>
  )}
</Focusable>
```

### Logout Handler (inside LogoutConfirmDialog)
```typescript
// Source: twitchAuthService.clearTokens() [VERIFIED: src/services/TwitchAuthService.ts]
// history navigation [VERIFIED: App.tsx pattern]
import { twitchAuthService } from '../services/TwitchAuthService'
import { history } from '../router/history'  // extracted module (see Pitfall 7)

function handleConfirmLogout() {
  twitchAuthService.clearTokens()
  history.set({ value: '/login' })
}
```

### PlayerScreen chatVisible initialisation from prefs
```typescript
// Source: PlayerScreen.tsx [VERIFIED: codebase read]
import { prefsStore } from '../stores/prefsStore'

// Change from:
// const [chatVisible, setChatVisible] = createSignal(true)
// To:
const [chatVisible, setChatVisible] = createSignal(prefsStore.chatVisible)
```

---

## Runtime State Inventory

> Phase 6 does not involve renaming or migrations. This section is included only to confirm there is no runtime state concern.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `twitch_access_token`, `twitch_refresh_token`, `twitch_expires_at`, `twitch_user_id` in localStorage — unchanged by this phase | None |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | `VITE_TWITCH_CLIENT_ID` — unchanged | None |
| Build artifacts | None | None |

New localStorage key introduced this phase: `twitch_prefs` — created on first preference write.

---

## Environment Availability

> Phase 6 is pure code/configuration changes with no new external dependencies. No new packages are required.

Step 2.6: SKIPPED (no external dependencies introduced — all libraries already installed).

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| solid-js | prefsStore, all components | Yes | ^1.9.12 | — |
| @lampa-dev/solidjs-spatial-navigation | all Focusable elements | Yes | ^1.0.0 | — |
| @solidjs/router | navigation post-logout | Yes | (installed) | — |

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + happy-dom |
| Config file | `vitest.config.ts` (merges `vite.config.ts`) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SETT-01 | `twitchAuthService.clearTokens()` clears all localStorage keys + resets authStore | unit | `npm test -- src/services/__tests__/TwitchAuthService.test.ts` | Yes (existing) |
| SETT-01 | After logout, authStore fields are all null | unit | `npm test -- src/stores/__tests__/authStore.test.ts` | Yes (existing) |
| SETT-01 | LogoutConfirmDialog: confirm triggers clearTokens + navigation | unit | `npm test -- src/components/__tests__/LogoutConfirmDialog.test.tsx` | No — Wave 0 |
| SETT-01 | LogoutConfirmDialog: cancel dismisses without clearing | unit | `npm test -- src/components/__tests__/LogoutConfirmDialog.test.tsx` | No — Wave 0 |
| SETT-02 | prefsStore: loads defaults when localStorage key absent | unit | `npm test -- src/stores/__tests__/prefsStore.test.ts` | No — Wave 0 |
| SETT-02 | prefsStore: loads persisted values from localStorage | unit | `npm test -- src/stores/__tests__/prefsStore.test.ts` | No — Wave 0 |
| SETT-02 | prefsStore: updatePref writes to localStorage immediately | unit | `npm test -- src/stores/__tests__/prefsStore.test.ts` | No — Wave 0 |
| SETT-02 | prefsStore: corrupted JSON falls back to defaults | unit | `npm test -- src/stores/__tests__/prefsStore.test.ts` | No — Wave 0 |
| SETT-02 | SettingsScreen: toggle rows render and respond to Enter | unit | `npm test -- src/screens/__tests__/SettingsScreen.test.tsx` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/stores/__tests__/prefsStore.test.ts` — covers SETT-02 preference persistence
- [ ] `src/components/__tests__/LogoutConfirmDialog.test.tsx` — covers SETT-01 dialog flow
- [ ] `src/screens/__tests__/SettingsScreen.test.tsx` — covers SETT-02 toggle interaction

*(Existing `TwitchAuthService.test.ts` and `authStore.test.ts` already cover the clearTokens behavior — no gaps there.)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes — logout path | `twitchAuthService.clearTokens()` clears all tokens from memory and localStorage |
| V3 Session Management | Yes — token clearing | All 4 localStorage keys removed on logout; no server-side session to invalidate (OAuth bearer tokens with no revocation per D-10) |
| V4 Access Control | No | No new access-controlled routes added |
| V5 Input Validation | No | Preferences are boolean/string enum — no user-supplied strings |
| V6 Cryptography | No | No cryptographic operations |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Accidental logout via remote button mis-press | Tampering (session termination) | Confirmation dialog with Cancel as default focus (D-09) |
| Corrupted localStorage prefs crashing app | Denial of service | try/catch around JSON.parse with fallback to defaults and `removeItem` |
| Stale token in memory after localStorage clear | Information disclosure | `setAuthStore({ token: null, ... })` in `clearTokens()` clears in-memory state atomically — already implemented |

---

## Project Constraints (from CLAUDE.md)

All of the following CLAUDE.md directives apply to this phase:

- **SolidJS only** — no React, no Vue. All components are SolidJS functional components.
- **No virtual DOM patterns** — use fine-grained reactivity (`createStore`, `createSignal`) not derived state wrappers.
- **Full TV remote navigability** — every new interactive element must be wrapped in `Focusable` from `src/navigation/index.ts`.
- **Spatial navigation library** — import `Focusable`, `useSpatialNavigation` from `src/navigation/index.ts` (the re-export shim), never directly from `@lampa-dev/solidjs-spatial-navigation`.
- **No IndexedDB** — `localStorage` only for persistence.
- **No SolidJS 2.0 experimental APIs** — stay on 1.9.x stable.
- **No new bundler changes** — Vite 6 config is final; this phase adds no new Vite plugins or config.
- **webOS Chromium 68 target** — no ES2020+ syntax without polyfill verification. Optional chaining (`?.`) and nullish coalescing (`??`) are safe (Chromium 68 = V8 6.7, supports these). No top-level `await`.
- **CSS custom properties only** — no new color values; use only tokens already in `src/styles/global.css`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Green button is keyCode 404 on webOS | Architecture Patterns (Pattern 4), Pitfall 1 | Key does nothing or wrong action fires; confirmed by UI-SPEC which cites webOS standard — risk LOW |
| A2 | Extracting `history` to a shared module avoids circular import | Architecture Patterns (Pattern 3), Pitfall 7 | If left in App.tsx, `history` may be `undefined` when SettingsScreen first imports it — medium risk if not extracted |
| A3 | `createStore` from `solid-js/store` spreads values correctly when used as `{ ...prefsStore }` for JSON serialization | Code Examples | If SolidJS store proxy does not spread correctly, `JSON.stringify` produces `{}` — test will catch this |

---

## Open Questions

1. **Green button keyCode on real webOS hardware**
   - What we know: UI-SPEC documents keyCode 404 as the standard webOS Green button. [CITED: 06-UI-SPEC.md]
   - What's unclear: Physical hardware testing has not been done for the Green key specifically.
   - Recommendation: Log all unknown keyCodes on first boot during development; add a comment in App.tsx with the confirmed value.

2. **`history` export approach (App.tsx vs shared module)**
   - What we know: `history` is currently a module-level const in `App.tsx`. SettingsScreen needs to trigger navigation.
   - What's unclear: Whether a circular import would occur in practice given SolidJS/Vite module resolution order.
   - Recommendation: Extract to `src/router/history.ts` (one-liner file). Zero risk, clean pattern.

---

## Sources

### Primary (HIGH confidence)
- `src/stores/authStore.ts` [VERIFIED: codebase read] — prefsStore pattern source
- `src/services/TwitchAuthService.ts` [VERIFIED: codebase read] — clearTokens() implementation confirmed
- `src/screens/PlayerScreen.tsx` [VERIFIED: codebase read] — overlay pattern, keydown handler pattern, chatVisible signal location
- `src/screens/ChannelsScreen.tsx` [VERIFIED: codebase read] — header structure, Focusable pattern
- `src/screens/SettingsScreen.tsx` [VERIFIED: codebase read] — existing skeleton to replace
- `src/App.tsx` [VERIFIED: codebase read] — handleKeyDown pattern, history instance, ROOT_PATHS
- `src/components/ChatSidebar.tsx` [VERIFIED: codebase read] — border-left hardcoding, props interface
- `src/navigation/index.ts` [VERIFIED: codebase read] — Focusable/useSpatialNavigation re-export
- `src/styles/global.css` [VERIFIED: codebase read] — all design tokens
- `.planning/phases/06-settings-polish/06-UI-SPEC.md` [VERIFIED: codebase read] — keyCode 404, component specs, D-pad matrix
- `.planning/phases/06-settings-polish/06-CONTEXT.md` [VERIFIED: codebase read] — all locked decisions
- `vitest.config.ts` + `package.json` [VERIFIED: codebase read] — test framework confirmed as Vitest + happy-dom

### Secondary (MEDIUM confidence)
- None required — all claims verified from codebase directly.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified present in codebase
- Architecture: HIGH — all patterns verified against existing codebase implementations
- Pitfalls: HIGH — derived directly from reading the actual code that will be modified
- Test infrastructure: HIGH — vitest config and existing test files verified

**Research date:** 2026-04-15
**Valid until:** 2026-05-15 (stable — no external API changes, all internal codebase)
