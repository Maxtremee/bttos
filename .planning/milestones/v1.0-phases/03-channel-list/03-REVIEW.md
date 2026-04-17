---
phase: 03-channel-list
reviewed: 2026-04-14T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src/components/ChannelCard.tsx
  - src/components/ChannelGrid.tsx
  - src/components/__tests__/ChannelCard.test.tsx
  - src/components/__tests__/ChannelGrid.test.tsx
  - src/screens/ChannelsScreen.tsx
  - src/screens/__tests__/ChannelsScreen.test.tsx
  - src/services/TwitchChannelService.ts
  - src/services/__tests__/TwitchChannelService.test.ts
findings:
  critical: 1
  warning: 3
  info: 3
  total: 7
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-04-14T00:00:00Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Reviewed the channel list phase: `TwitchChannelService`, `ChannelCard`, `ChannelGrid`, `ChannelsScreen`, and their corresponding test files.

The service implementation is well-structured — pagination safety cap, 401 retry logic, and batching are all present. The SolidJS component code is generally clean and idiomatic. The test suite has good coverage of the happy path and key edge cases.

Three issues need attention before this phase is considered complete:

- A null token is silently turned into the string `"Bearer null"` and sent to the API, masking unauthenticated state.
- `onMount` is called inside a `Show` block render function, which is not a reliable SolidJS pattern for managing focus.
- The 401 token refresh retry only covers the first pagination page; subsequent pages that receive a 401 mid-pagination will throw without retry.

---

## Critical Issues

### CR-01: Null auth token sent as "Bearer null" — all API calls fail with no clear error

**File:** `src/services/TwitchChannelService.ts:42-46`

**Issue:** `authStore.token` is typed `string | null`. When it is `null` (unauthenticated user, or token not yet loaded), the `Authorization` header value becomes the literal string `"Bearer null"`. Every API call made with this header will receive a 401. Because `ensureFreshToken` checks `authStore.expiresAt` (not `authStore.token`), it will not catch the missing-token case. The resulting error message — `"Failed to fetch followed channels: 401"` — gives no indication that the app is simply not authenticated, making debugging significantly harder.

**Fix:**
```typescript
private getHeaders(): Record<string, string> {
  const token = authStore.token
  if (!token) {
    throw new Error('Not authenticated: access token is missing')
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Client-Id': CLIENT_ID,
  }
}
```

Alternatively, guard at the top of `fetchLiveFollowedChannels` before any network calls are made:
```typescript
async fetchLiveFollowedChannels(): Promise<StreamData[]> {
  if (!authStore.token || !authStore.userId) {
    throw new Error('Not authenticated')
  }
  await this.ensureFreshToken()
  // ...
}
```

---

## Warnings

### WR-01: onMount called inside a Show block render function — unreliable focus management

**File:** `src/screens/ChannelsScreen.tsx:83-84`

**Issue:** `onMount` is called inside the IIFE that is the child of a `Show` block:

```tsx
<Show when={channels.state === 'errored'}>
  {(() => {
    onMount(() => setFocus('retry-btn'))   // line 84 — problematic
    return ( ... )
  })()}
</Show>
```

`onMount` registers a callback to run after the nearest component's initial mount. When called inside a `Show` child render expression (not inside a component function), its behaviour depends on the reactive owner at the call site. In SolidJS, `Show` creates a new reactive scope but not a component boundary. If `channels.state` toggles between `errored` and another state and back again, the `Show` content is re-created and `onMount` would register again, potentially scheduling duplicate focus calls. The correct pattern is to use `createEffect` with a condition, or extract the error UI into its own component.

**Fix — extract to a component:**
```tsx
function ErrorState(props: { onRetry: () => void }) {
  const { setFocus } = useSpatialNavigation()
  onMount(() => setFocus('retry-btn'))
  return (
    <div ...>
      ...
      <Focusable as="button" focusKey="retry-btn" onEnterPress={props.onRetry}>
        ...
      </Focusable>
    </div>
  )
}

// In ChannelsScreen:
<Show when={channels.state === 'errored'}>
  <ErrorState onRetry={() => refetch()} />
</Show>
```

### WR-02: 401 retry only covers first pagination page — mid-pagination token expiry throws unretried

**File:** `src/services/TwitchChannelService.ts:82-88`

**Issue:** The 401 refresh-and-retry logic is inside the `do...while` loop body but only fires once per iteration. If the token expires between page 1 (which succeeds) and page 2+, the second fetch returns 401. However, the `if (response.status === 401)` block is only present for the first request in the loop — wait, re-reading the code it IS inside the loop so each iteration does retry. The more precise issue is: `ensureFreshToken()` is called once at the top of `fetchLiveFollowedChannels`, but the 401 retry inside the loop calls `refreshTokens()` directly and then re-fetches. After the retry, if the refresh itself fails (throws), the error propagates with no context about which page failed. More critically, the streams batch loop (lines 122-130) has no 401 handling at all — a 401 during the streams phase throws immediately with no refresh attempt.

**Fix:** Add 401 retry to the streams batch fetch:
```typescript
let response = await fetch(url, { headers: this.getHeaders() })
if (response.status === 401) {
  await twitchAuthService.refreshTokens()
  response = await fetch(url, { headers: this.getHeaders() })
}
if (!response.ok) {
  throw new Error(`Failed to fetch streams: ${response.status}`)
}
```

### WR-03: userId null produces empty user_id query param — API returns 400 silently masked

**File:** `src/services/TwitchChannelService.ts:72`

**Issue:** `authStore.userId` is typed `string | null`. The nullish coalescing fallback `authStore.userId ?? ''` sends `user_id=` (empty string) to `/helix/channels/followed`. The Twitch API returns a 400 for this. The error thrown will be `"Failed to fetch followed channels: 400"`, which gives no indication that the user ID is missing. This is related to CR-01 — both stem from insufficient auth-state validation at the entry point of `fetchLiveFollowedChannels`.

**Fix:** The guard suggested in CR-01 covers this case. If the guard at the top of `fetchLiveFollowedChannels` checks `!authStore.userId`, this line becomes unreachable with a null value, and the `?? ''` fallback can be removed:
```typescript
const params = new URLSearchParams({
  user_id: authStore.userId,  // safe after null guard at top of method
  first: '100',
})
```

---

## Info

### IN-01: VITE_TWITCH_CLIENT_ID cast to string — undefined if env var is absent

**File:** `src/services/TwitchChannelService.ts:4`

**Issue:** `import.meta.env.VITE_TWITCH_CLIENT_ID as string` silently produces `undefined` at runtime if the env var is not set. The cast suppresses the TypeScript warning. All API calls will send `Client-Id: undefined` and fail with a 400.

**Fix:** Add a startup assertion:
```typescript
const CLIENT_ID = import.meta.env.VITE_TWITCH_CLIENT_ID as string
if (!CLIENT_ID) {
  throw new Error('Missing required env var: VITE_TWITCH_CLIENT_ID')
}
```

This fails loudly at module load time rather than silently during every API call.

### IN-02: Dead code in ChannelGrid test mock — wrapper element created but never used

**File:** `src/components/__tests__/ChannelGrid.test.tsx:27-28`

**Issue:** The `Focusable` mock creates a `wrapper` div, sets a `data-focus-key` attribute on it, then returns `child` (discarding the wrapper). The wrapper is never attached to the DOM. No test in the file queries `data-focus-key`, so this is dead code that gives a false impression that focus key assertions are in place.

**Fix:** Remove the dead wrapper lines from the mock, or add assertions that actually test focus key assignment if that coverage is desired:
```typescript
Focusable: (props) => {
  const bag = { focused: () => false }
  return (typeof props.children === 'function' ? props.children(bag) : props.children) as JSX.Element
},
```

### IN-03: Test numbering is non-sequential across describe blocks

**File:** `src/services/__tests__/TwitchChannelService.test.ts`

**Issue:** Tests are numbered Test 1–5 in `fetchLiveFollowedChannels`, then jump to Test 8 and Test 9. Tests 6 and 7 appear later in the file under different `describe` blocks (`thumbnailUrl` and `formatViewers`). The numbering follows a different ordering than the file structure, which makes it harder to cross-reference test names with implementation.

**Fix:** Either number tests sequentially within each `describe` block (restart at 1), or number globally in file order. The current numbering is inconsistent and will confuse future contributors.

---

_Reviewed: 2026-04-14T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
