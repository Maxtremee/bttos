---
phase: 06-settings-polish
reviewed: 2026-04-15T13:10:48Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - src/App.tsx
  - src/components/ChatSidebar.tsx
  - src/components/LogoutConfirmDialog.tsx
  - src/components/PlayerSettingsOverlay.tsx
  - src/components/__tests__/LogoutConfirmDialog.test.tsx
  - src/router/history.ts
  - src/screens/ChannelsScreen.tsx
  - src/screens/PlayerScreen.tsx
  - src/screens/SettingsScreen.tsx
  - src/screens/LoginScreen.tsx
  - src/stores/__tests__/prefsStore.test.ts
  - src/stores/prefsStore.ts
  - src/services/TwitchChatService.ts
  - src/styles/global.css
findings:
  critical: 0
  warning: 5
  info: 5
  total: 10
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-04-15T13:10:48Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Phase 06 delivers a preferences store with localStorage persistence, a settings screen, a logout confirmation dialog with Back-key interception, a player settings overlay, and chat service WebSocket lifecycle management with stale-socket guards.

The overall code quality is solid. The stale-socket guard pattern in `TwitchChatService` is well-executed. The `prefsStore` loading logic (merge with defaults, remove corrupted keys) is correct. CSS gap polyfill classes are appropriate for the Chromium 68 target.

Five warnings and five info items are noted. No critical security or data-loss issues were found. The most important warning is a listener leak in `PlayerSettingsOverlay` (event listener registered without `onMount`, so it fires on every reactive re-render). The second most important is a double-reconnect bug in the keepalive monitor that fires `scheduleReconnect` after already forcefully closing the socket, which can cause two concurrent reconnect paths.

---

## Warnings

### WR-01: `PlayerSettingsOverlay` registers global keydown listener outside `onMount` — leaks on reactive re-renders

**File:** `src/components/PlayerSettingsOverlay.tsx:29`
**Issue:** `window.addEventListener('keydown', handleKeyDown, true)` is called at the top level of the component function body, not inside `onMount`. In SolidJS, a component function body runs once during creation, so in practice this currently only fires once. However it bypasses the conventional pairing with `onCleanup`, and if the component is ever placed inside a reactive boundary that remounts it (e.g., a `<Show>` with `keyed`, a dynamic route re-render), each mount adds another listener while `onCleanup` removes only the last one. The existing `onCleanup` correctly removes it on destruction, but the registration should be inside `onMount` for symmetry, clarity, and future safety.

`LogoutConfirmDialog` handles the same pattern correctly via `onMount`/`onCleanup` (line 24–25).

**Fix:**
```tsx
// Replace the bare call at line 29 with:
onMount(() => {
  window.addEventListener('keydown', handleKeyDown, true)
})
onCleanup(() => window.removeEventListener('keydown', handleKeyDown, true))
// Remove the standalone onCleanup on line 30
```

---

### WR-02: Keepalive monitor triggers `scheduleReconnect` immediately after forcefully closing the socket, producing two concurrent reconnect paths

**File:** `src/services/TwitchChatService.ts:225-230`
**Issue:** When the keepalive threshold is exceeded, the monitor calls `this.ws.close(1006)` then immediately calls `this.scheduleReconnect()`. The `ws.onclose` handler (line 68–75) also fires when the socket closes and — because the close code is `1006` (abnormal) — it calls `this.scheduleReconnect()` a second time. This results in two pending `reconnectTimer` setTimeout calls. The second `scheduleReconnect` call increments `reconnectAttempt` again, so the next reconnect uses the wrong (accelerated) delay, and if both timers fire they both call `openWebSocket`, creating two simultaneous WebSocket connections.

**Fix:**
```ts
// Option A: null out this.ws before closing so onclose sees a stale socket
private _startKeepaliveMonitor(): void {
  if (this.keepaliveInterval !== null) {
    clearInterval(this.keepaliveInterval)
  }
  this.keepaliveInterval = setInterval(() => {
    const elapsed = Date.now() - this.lastMessageAt
    const threshold = this.keepaliveTimeout * 1500
    if (elapsed > threshold && this.keepaliveTimeout > 0) {
      console.warn('[TwitchChatService] Keepalive timeout — reconnecting')
      const ws = this.ws
      this.ws = null          // mark stale before closing so onclose guard fires
      ws?.close(1006)
      this.scheduleReconnect()
    }
  }, KEEPALIVE_CHECK_INTERVAL)
}

// Option B (simpler): remove the explicit ws.close() call and let scheduleReconnect
// call openWebSocket which will replace this.ws, causing onclose to see a stale socket.
```

---

### WR-03: `_handleReconnect` new socket's `onclose` does not guard against stale-socket scenario

**File:** `src/services/TwitchChatService.ts:149-152`
**Issue:** The `onclose` handler set on `newWs` inside `_handleReconnect` calls `scheduleReconnect()` unconditionally without checking `if (this.ws !== newWs) return`. If a second `session_reconnect` message arrives (or `disconnect()` is called) while the new socket is still connecting, `this.ws` will have been replaced again, but `newWs.onclose` will still fire and schedule a spurious reconnect. All other `onclose` handlers check the stale-socket guard.

**Fix:**
```ts
newWs.onclose = (event: CloseEvent) => {
  if (this.ws !== newWs) return  // stale socket guard
  if (event.code !== 1000) {
    this.scheduleReconnect()
  }
}
```

---

### WR-04: `history.ts` reads `localStorage` at module evaluation time — throws in environments without `localStorage`

**File:** `src/router/history.ts:3`
**Issue:** `localStorage.getItem('twitch_access_token')` is evaluated synchronously when the module is first imported. The webOS Chromium runtime has `localStorage`, so this works in production. However it makes the module impossible to import in Vitest / Node environments without a DOM shim, causing any future test that imports `history.ts` directly (or transitively) to throw `ReferenceError: localStorage is not defined`. The existing tests avoid this by mocking the module, but it is a fragile dependency.

**Fix:**
```ts
function getInitialRoute(): string {
  try {
    return localStorage.getItem('twitch_access_token') ? '/channels' : '/login'
  } catch {
    return '/login'
  }
}

export const history = createMemoryHistory()
history.set({ value: getInitialRoute() })
```

---

### WR-05: `LoginScreen` does not cancel the in-flight polling interval when `startFlow` is called while already polling (rapid retry scenario)

**File:** `src/screens/LoginScreen.tsx:26-29`
**Issue:** `startFlow` calls `clearPolling()` at line 29 before setting a new interval. This is correct for the normal flow. However, if `startFlow` is called while `twitchAuthService.requestDeviceCode()` is still awaiting (the `await` on line 31), the `intervalId` variable is `undefined` at call time so `clearPolling()` is a no-op. If the async call resolves later and sets `intervalId`, and then `startFlow` is called again before the first `setInterval` fires, the second call's `clearPolling()` will still see `undefined` because `intervalId` was not yet assigned. In practice this requires two very fast retries but it is a correctness issue. The `state` signal could be used to guard against concurrent flows.

**Fix:**
```ts
// Add an abort flag or check state before setting the new interval
async function startFlow() {
  // If a poll is already running from a previous startFlow that is still
  // awaiting requestDeviceCode, we cannot clear it yet — guard with a generation counter
  const generation = ++flowGeneration  // module-level let flowGeneration = 0
  setState('loading')
  setStatusMessage('Requesting code...')
  clearPolling()
  try {
    const data = await twitchAuthService.requestDeviceCode()
    if (generation !== flowGeneration) return  // superseded
    // ... rest of function
  }
}
```

---

## Info

### IN-01: Magic number `461` duplicated across `App.tsx`, `LogoutConfirmDialog.tsx`, and `PlayerSettingsOverlay.tsx` — should be a shared constant

**File:** `src/App.tsx:13`, `src/components/LogoutConfirmDialog.tsx:6`, `src/components/PlayerSettingsOverlay.tsx:22`
**Issue:** `KEY_BACK = 461` is defined independently in three files. Similarly, `KEY_GREEN = 404` in `App.tsx` and `keyCode === 404` inline in `PlayerScreen.tsx:266`. A shared constants module would prevent silent divergence if key codes ever need updating.
**Fix:** Create `src/constants/keyCodes.ts` and export `KEY_BACK`, `KEY_GREEN`, `KEY_RED`, `KEY_YELLOW`, `KEY_BLUE`. Import from there in all consumers.

---

### IN-02: `LogoutConfirmDialog` test for `onCancel` does not exercise the actual wiring — it only calls the mock directly

**File:** `src/components/__tests__/LogoutConfirmDialog.test.tsx:58-64`
**Issue:** The test named `'onCancel prop is callable'` does not simulate a Back key press or click the Cancel button. It simply calls `mockCancel()` directly and asserts it was called once. This test does not verify that the dialog's internal wiring (Back key handler, Cancel button `onEnterPress`) actually invokes `props.onCancel`. The test passes regardless of whether `LogoutConfirmDialog` is wired correctly.
**Fix:** Add a test that dispatches a `keydown` event with `keyCode: 461` to `window` while the dialog is open and asserts `mockCancel` was called.

---

### IN-03: `ChannelsScreen` calls `onMount` inside a `<Show>` render function — fragile reactive scope

**File:** `src/screens/ChannelsScreen.tsx:112`
**Issue:** `onMount(() => setFocus('retry-btn'))` is called inside the inline IIFE render function of `<Show when={channels.state === 'errored'}>`. While this works because SolidJS's `onMount` registers against the nearest owner context, calling lifecycle hooks inside reactive Show branches is an unusual pattern that can silently break if the reactive owner context changes. The recommended approach is to use `createEffect` or move the focus call to a `createEffect` that watches the error state.
**Fix:**
```tsx
// Replace the onMount inside Show with a top-level createEffect
createEffect(() => {
  if (channels.state === 'errored') {
    setFocus('retry-btn')
  }
})
```

---

### IN-04: `prefsStore` does not validate the shape of parsed JSON — accepts any value for `chatPosition`

**File:** `src/stores/prefsStore.ts:15`
**Issue:** `{ ...DEFAULTS, ...JSON.parse(raw) }` spreads the entire parsed object into the store without validating field types. If `localStorage` contains `{ "chatPosition": "center", "chatVisible": 42 }` (e.g., from a future schema migration or manual edit), the store will hold invalid values that downstream `=== 'right'` checks will silently treat as the else branch. For a TV app with no keyboard, invalid persisted state is hard for users to recover from.
**Fix:**
```ts
function validatePrefs(raw: unknown): PrefsState {
  const obj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  return {
    chatVisible: typeof obj.chatVisible === 'boolean' ? obj.chatVisible : DEFAULTS.chatVisible,
    chatPosition: obj.chatPosition === 'left' || obj.chatPosition === 'right'
      ? obj.chatPosition
      : DEFAULTS.chatPosition,
  }
}

function loadPrefs(): PrefsState {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { ...DEFAULTS }
    return validatePrefs(JSON.parse(raw))
  } catch {
    localStorage.removeItem(PREFS_KEY)
    return { ...DEFAULTS }
  }
}
```

---

### IN-05: `ChatSidebar` reverses the messages array on every render — allocates a new array each time

**File:** `src/components/ChatSidebar.tsx:55`
**Issue:** `[...props.messages].reverse()` creates a new array copy and mutates it on every render pass. With a cap of 150 messages and batched updates this is a minor allocation concern, but since `messages` is a SolidJS store array, the `<For>` can track individual items reactively. The reverse is needed because `flex-direction: column-reverse` is used, meaning the array is already rendered bottom-first by the flex layout. Reversing the data array while also using `column-reverse` effectively double-reverses, showing items newest-at-bottom only because both reversals cancel out. This is correct but fragile — removing either the CSS or the array reverse alone would break the display order.
**Fix:** Pick one strategy and document it clearly. Either use `flex-direction: column` with the messages in natural order, or use `flex-direction: column-reverse` with the messages in natural (non-reversed) order and remove the `[...props.messages].reverse()` call. The latter is the more common live-chat pattern and avoids the allocation:
```tsx
// Remove the spread+reverse; rely on column-reverse to show newest at bottom
<For each={props.messages}>
```

---

_Reviewed: 2026-04-15T13:10:48Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
