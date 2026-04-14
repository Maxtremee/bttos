# Phase 3: Channel List - Research

**Researched:** 2026-04-14
**Domain:** Twitch Helix API data fetching, SolidJS reactive patterns, spatial navigation grid layout, webOS TV UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None — all implementation decisions deferred to Claude's discretion.

### Claude's Discretion
- **Channel card design:** Thumbnail, stream title, game name, viewer count per card. Layout, sizing, and visual density at Claude's discretion — match the dark theme and design tokens from Phase 1.
- **Grid layout & navigation:** Number of columns, spacing, scroll behavior when grid overflows. Use `@lampa-dev/solidjs-spatial-navigation` for D-pad focus. Ensure focus state is clearly visible per Phase 1 patterns.
- **Loading & empty states:** Loading indicator while fetching, empty state when no followed channels are live. Standard TV app patterns — keep it simple and informative.
- **Auto-refresh behavior:** Polling interval, how new/removed channels update in the grid. No disruptive visual refresh — channels should appear/disappear smoothly without losing focus position.
- **Data fetching:** Use Twitch Helix API (`/helix/channels/followed` + `/helix/streams`) with the auth token from authStore. Handle pagination if user follows many channels.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHAN-01 | User sees a grid of followed channels that are currently live (thumbnail, title, game, viewer count) | Helix API endpoints, thumbnail URL template, SolidJS `createResource` pattern |
| CHAN-02 | User can navigate the channel grid with D-pad remote | `@lampa-dev/solidjs-spatial-navigation` `FocusableGroup` + `Focusable` API, `onEnterPress`, `setFocus` |
| CHAN-03 | Channel list auto-refreshes periodically to show newly live channels | `createResource` + `refetch()` via `setInterval`/`onCleanup` pattern |
</phase_requirements>

---

## Summary

Phase 3 replaces the `ChannelsScreen.tsx` skeleton with a working channel grid. The implementation has two distinct data layers: (1) `GET /helix/channels/followed` returns all followed channels (paginated, up to 100 per page), and (2) `GET /helix/streams` filters those down to only live channels. Both calls require the auth token and client ID. The two calls must be chained: collect all followed broadcaster IDs first, then batch-query streams in groups of up to 100 user IDs per request.

The UI uses CSS Grid (`repeat(4, 1fr)`) with `FocusableGroup` wrapping all cards and individual `Focusable` per card. SolidJS `createResource` provides reactive loading/error/data states. Auto-refresh uses `setInterval` with `refetch()` called every 60 seconds, cleared via `onCleanup`. The UI-SPEC is fully approved and defines exact copy, colors, typography, card anatomy, and interaction contract — the planner should treat it as ground truth for visual decisions.

All Phase 1 design tokens, Phase 2 auth infrastructure, and the spatial navigation module are ready. No new libraries are needed; no new design tokens are introduced in this phase.

**Primary recommendation:** Implement a `TwitchChannelService` class (parallel to `TwitchAuthService`) for Helix API calls, wire it into a `createResource` in `ChannelsScreen`, and use `FocusableGroup` + `Focusable` with `onEnterPress` for grid navigation.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| solid-js | ^1.9.12 | UI + reactivity | Already installed. `createResource`, `createSignal`, `For`, `Show`, `onMount`, `onCleanup` are all needed. |
| @lampa-dev/solidjs-spatial-navigation | ^1.0.0 | D-pad grid navigation | Already installed and initialized. `FocusableGroup` + `Focusable` + `useSpatialNavigation` cover the full grid nav requirement. |
| @solidjs/router | ^0.16.1 | Navigate to player on OK press | Already installed. `useNavigate()` used in card's `onEnterPress` callback. |

[VERIFIED: package.json — all dependencies already installed]

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Twitch Helix REST API | — | Followed channels + live stream metadata | Always — no alternative for channel data |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `createResource` + `refetch()` | Manual `createSignal` + `fetch` in interval | `createResource` gives loading/error states for free; no reason to hand-roll |
| `FocusableGroup` wrapping grid | One `Focusable` per card without group | Group enables `saveLastFocusedChild` (focus memory), `autoRestoreFocus` (card disappears on refresh), and `preferredChildFocusKey` — essential for the refresh behavior in CHAN-03 |

**Installation:** No new installations needed — all dependencies are present.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── services/
│   └── TwitchChannelService.ts    # New — Helix API calls for followed + live channels
├── screens/
│   └── ChannelsScreen.tsx         # Replace skeleton — main grid screen
├── components/
│   ├── ChannelCard.tsx            # New — focusable card component
│   ├── ChannelGrid.tsx            # New — FocusableGroup + grid layout
│   ├── LoadingState.tsx           # New — shared loading text component
│   └── EmptyState.tsx             # New (or inline) — empty/error states
```

The `LoadingState` and `EmptyState` can be inlined in `ChannelsScreen.tsx` rather than extracted to separate files — the planner should decide based on line-count. The service layer MUST be separate from the screen component.

### Pattern 1: Two-Step Live Channel Fetch

Twitch does not have a single endpoint for "followed channels that are live." Two calls are required:

**Step 1:** Paginate through `/helix/channels/followed?user_id={id}&first=100` to collect all followed broadcaster IDs.
**Step 2:** Batch those IDs into groups of 100, then call `/helix/streams?user_id={id1}&user_id={id2}...&first=100` per batch.

The `streams` response contains only live streams — any followed broadcaster not in the response is offline.

```typescript
// Source: Twitch Helix API reference docs (dev.twitch.tv/docs/api/reference)
// [VERIFIED: WebFetch of official Twitch API docs]

async function fetchLiveFollowedChannels(userId: string, token: string, clientId: string): Promise<StreamData[]> {
  // Step 1: collect all followed broadcaster IDs (paginate)
  const followerIds: string[] = []
  let cursor: string | undefined
  do {
    const params = new URLSearchParams({ user_id: userId, first: '100' })
    if (cursor) params.set('after', cursor)
    const res = await fetch(`https://api.twitch.tv/helix/channels/followed?${params}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Client-Id': clientId },
    })
    if (!res.ok) throw new Error(`followed fetch failed: ${res.status}`)
    const data = await res.json()
    for (const ch of data.data) followerIds.push(ch.broadcaster_id)
    cursor = data.pagination?.cursor
  } while (cursor)

  if (followerIds.length === 0) return []

  // Step 2: batch-check which are live (100 user_ids per request)
  const live: StreamData[] = []
  for (let i = 0; i < followerIds.length; i += 100) {
    const batch = followerIds.slice(i, i + 100)
    const params = new URLSearchParams({ first: '100' })
    batch.forEach(id => params.append('user_id', id))
    const res = await fetch(`https://api.twitch.tv/helix/streams?${params}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Client-Id': clientId },
    })
    if (!res.ok) throw new Error(`streams fetch failed: ${res.status}`)
    const data = await res.json()
    live.push(...data.data)
  }
  return live
}
```

[VERIFIED: Official Twitch Helix API docs — WebFetch confirmed response shapes, pagination cursor, and `first=100` max]

### Pattern 2: SolidJS `createResource` + Auto-Refresh

```typescript
// Source: SolidJS official docs — createResource + WebSearch verified pattern
// [VERIFIED: docs.solidjs.com/reference/basic-reactivity/create-resource]

import { createResource, onMount, onCleanup } from 'solid-js'

const [channels, { refetch }] = createResource(fetchLiveFollowedChannels)

// Auto-refresh every 60 seconds — onMount ensures no SSR issues
// (webOS has no SSR, but the pattern is still correct)
onMount(() => {
  const timer = setInterval(() => refetch(), 60_000)
  onCleanup(() => clearInterval(timer))
})
```

`channels.loading` — true during initial and refetch loads.
`channels.error` — truthy when fetch threw.
`channels()` — the data array (undefined while loading).
`channels.latest` — last-known data even while refetching (prevents flicker on auto-refresh; use this to render stale data during background refresh instead of showing loading state again).

### Pattern 3: `FocusableGroup` Grid with `autoRestoreFocus`

```typescript
// Source: @lampa-dev/solidjs-spatial-navigation README (locally verified)
// [VERIFIED: node_modules/@lampa-dev/solidjs-spatial-navigation/README.md]

import { FocusableGroup, Focusable, useSpatialNavigation } from '../navigation'
import { useNavigate } from '@solidjs/router'

function ChannelGrid(props: { channels: StreamData[] }) {
  const { setFocus } = useSpatialNavigation()
  const navigate = useNavigate()

  // Set focus to first card on mount
  onMount(() => {
    if (props.channels.length > 0) {
      setFocus(`channel-${props.channels[0].user_login}`)
    }
  })

  return (
    <FocusableGroup
      as="div"
      focusKey="channels-grid"
      // autoRestoreFocus=true (default): if focused card disappears on refresh,
      // spatial nav automatically moves focus to nearest available sibling
    >
      {() => (
        <div style={{ display: 'grid', 'grid-template-columns': 'repeat(4, 1fr)', gap: 'var(--space-lg)' }}>
          <For each={props.channels}>
            {(channel) => (
              <Focusable
                as="div"
                focusKey={`channel-${channel.user_login}`}
                onEnterPress={() => navigate(`/player/${channel.user_login}`)}
              >
                {({ focused }) => (
                  <ChannelCard channel={channel} focused={focused()} />
                )}
              </Focusable>
            )}
          </For>
        </div>
      )}
    </FocusableGroup>
  )
}
```

Key: `autoRestoreFocus` is **true by default** in the library — no explicit prop needed. When a focused card disappears (channel goes offline during auto-refresh), focus moves to the nearest available card automatically. [VERIFIED: README line 285-290]

### Pattern 4: Thumbnail URL Substitution

Twitch thumbnail URLs use literal `{width}` and `{height}` template tokens, NOT URL parameters.

```typescript
// Source: Official Twitch API docs — [VERIFIED: WebFetch]
function thumbnailUrl(templateUrl: string, width: number, height: number): string {
  return templateUrl.replace('{width}', String(width)).replace('{height}', String(height))
}

// Per UI-SPEC: resolve to 284x160 (16:9, grid-friendly)
const src = thumbnailUrl(channel.thumbnail_url, 284, 160)
```

### Pattern 5: Viewer Count Formatting

Per UI-SPEC copywriting contract:

```typescript
function formatViewers(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K viewers`
  }
  return `${count} viewers`
}
```

### Anti-Patterns to Avoid

- **Fetching streams without collecting followed IDs first:** `/helix/streams` has no "for my followed channels" filter. You must supply explicit `user_id` params.
- **Calling `setFocus` outside `onMount`:** Spatial nav may not have measured the DOM yet. Always defer to `onMount`.
- **Resetting `createResource` source on refetch to trigger load:** Use `refetch()` directly instead of changing the resource source — changing the source unmounts and remounts, which causes full loading flicker.
- **Using `channels()` (current value) instead of `channels.latest` during refetch:** `channels()` returns `undefined` while refetching, causing an empty grid flash every 60 seconds. Use `channels.latest` for rendering stale data during background refresh.
- **Not clamping batch size at 100:** `/helix/streams` accepts at most 100 `user_id` params per request. Exceeding this causes a 400 error.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| D-pad grid navigation | Manual `keydown` listener computing next element | `FocusableGroup` + `Focusable` | Spatial nav library handles coordinate-based focus math, scroll-into-view, focus memory, auto-restore — edge cases are numerous |
| Focus memory on screen return | `createSignal` tracking last focused key | `saveLastFocusedChild` (default: true on `FocusableGroup`) | Already built in — no code needed |
| Auto-restore when card disappears | Effect watching grid content, manually calling setFocus | `autoRestoreFocus` (default: true on `Focusable`) | Already built in — no code needed |
| Reactive loading/error states | Manual signals for `loading`, `error`, `data` | `createResource` | Handles concurrent refetches, error boundary integration, and `.latest` for stale-while-revalidate |

**Key insight:** The spatial navigation library's `autoRestoreFocus` and `saveLastFocusedChild` defaults solve the CHAN-03 refresh focus requirement with zero additional code.

---

## Common Pitfalls

### Pitfall 1: Stale Grid Flash During Auto-Refresh
**What goes wrong:** Using `channels()` instead of `channels.latest` renders `undefined` while refetch is in-flight, briefly showing an empty/loading grid every 60 seconds.
**Why it happens:** `createResource` current value is undefined during a refetch by design.
**How to avoid:** Render with `channels.latest ?? []` during refetch, show loading only on first load (`channels.loading && !channels.latest`).
**Warning signs:** Grid flickers empty for ~1 second every polling interval.

### Pitfall 2: Focus Lost After Refresh
**What goes wrong:** If the focused channel goes offline, `autoRestoreFocus` should recover focus — but only if the `Focusable` is inside a `FocusableGroup`. Flat `Focusable` elements without a group wrapper lose the spatial nav tree context.
**Why it happens:** Focus restoration requires the parent container to find the nearest sibling.
**How to avoid:** Always wrap the `For` loop in a `FocusableGroup`. Never put individual cards at the root focusable level.
**Warning signs:** After an offline channel disappears from the grid, focus is lost entirely (no card has the focus ring).

### Pitfall 3: Thumbnail URL Template Not Substituted
**What goes wrong:** Rendering the raw `thumbnail_url` from the API (`https://static-cdn.jtvnw.net/previews-ttv/live_user_x-{width}x{height}.jpg`) results in a broken image.
**Why it happens:** The Helix API returns a literal `{width}x{height}` placeholder, not a ready-to-use URL.
**How to avoid:** Always pass through `thumbnailUrl(channel.thumbnail_url, 284, 160)` before setting `<img src>`.
**Warning signs:** All thumbnails are broken images; URL contains literal `{width}` in the network tab.

### Pitfall 4: Pagination Not Exhausted for Large Follow Lists
**What goes wrong:** Users who follow more than 100 channels only see a subset of live channels because only the first page of `/helix/channels/followed` was fetched.
**Why it happens:** The endpoint returns max 100 per page; heavy Twitch users may follow 200-1000 channels.
**How to avoid:** Paginate via `pagination.cursor` until `cursor` is absent or pagination object is empty.
**Warning signs:** Known live channels don't appear in the grid for users with many followed channels.

### Pitfall 5: Token Expiry During Fetch
**What goes wrong:** API returns 401 mid-session; screen shows error state permanently.
**Why it happens:** Access token expires; refresh not triggered before API call.
**How to avoid:** Check `authStore.expiresAt` before each fetch; call `twitchAuthService.refreshTokens()` if within expiry window (or if 401 received). The `TwitchAuthService` singleton already deduplicates concurrent refresh calls.
**Warning signs:** 401 errors in network tab without subsequent token refresh request.

### Pitfall 6: Multiple `user_id` Params in `URLSearchParams`
**What goes wrong:** `new URLSearchParams({ user_id: ids.join(',') })` sends a comma-separated string instead of repeated params — Helix rejects this.
**Why it happens:** URLSearchParams `set` overwrites rather than appends.
**How to avoid:** Use `params.append('user_id', id)` in a loop, NOT `params.set('user_id', ids.join(','))`.
**Warning signs:** Stream batch request returns no results despite valid broadcaster IDs.

---

## Code Examples

### Helix API Response Shapes

```typescript
// /helix/channels/followed response
// [VERIFIED: WebFetch of Twitch API docs]
interface FollowedChannel {
  broadcaster_id: string
  broadcaster_login: string
  broadcaster_name: string
  followed_at: string   // RFC3339
}

// /helix/streams response
// [VERIFIED: WebFetch of Twitch API docs]
interface StreamData {
  user_id: string
  user_login: string
  user_name: string
  game_name: string
  title: string
  viewer_count: number
  thumbnail_url: string  // template: replace {width} and {height}
  type: string           // 'live' when streaming
  started_at: string     // RFC3339
}
```

### ChannelCard Skeleton (per UI-SPEC)

```typescript
// Source: .planning/phases/03-channel-list/03-UI-SPEC.md (approved)
// [VERIFIED: file read]
function ChannelCard(props: { channel: StreamData; focused: boolean }) {
  return (
    <div class={props.focused ? 'focused' : ''} style={{ background: 'var(--color-surface)' }}>
      <img
        src={thumbnailUrl(props.channel.thumbnail_url, 284, 160)}
        width={284}
        height={160}
        loading="lazy"
        alt={props.channel.user_name}
        // onerror: replace with --color-surface placeholder div
      />
      <div style={{ padding: 'var(--space-md)' }}>
        {/* Stream title — body size, 2-line clamp */}
        <div style={{
          'font-size': 'var(--font-size-body)',
          color: 'var(--color-text-primary)',
          display: '-webkit-box',
          '-webkit-line-clamp': '2',
          '-webkit-box-orient': 'vertical',
          overflow: 'hidden',
        }}>
          {props.channel.title}
        </div>
        {/* Game name — label size, secondary color */}
        <div style={{ 'font-size': 'var(--font-size-label)', color: 'var(--color-text-secondary)' }}>
          {props.channel.game_name}
        </div>
        {/* Viewer count */}
        <div style={{ 'font-size': 'var(--font-size-label)', color: 'var(--color-text-secondary)' }}>
          {formatViewers(props.channel.viewer_count)}
        </div>
      </div>
    </div>
  )
}
```

### createResource Integration in ChannelsScreen

```typescript
// Source: SolidJS docs + established project patterns
// [VERIFIED: docs.solidjs.com/reference/basic-reactivity/create-resource]
import { createResource, onMount, onCleanup, Show, For } from 'solid-js'

export default function ChannelsScreen() {
  const [channels, { refetch }] = createResource(fetchLiveFollowedChannels)

  onMount(() => {
    const timer = setInterval(() => refetch(), 60_000)
    onCleanup(() => clearInterval(timer))
  })

  return (
    <main>
      <Show when={channels.loading && !channels.latest}>
        <LoadingState />
      </Show>
      <Show when={channels.error}>
        <ErrorState onRetry={refetch} />
      </Show>
      <Show when={!channels.loading || channels.latest}>
        <Show
          when={(channels.latest ?? []).length > 0}
          fallback={<EmptyState />}
        >
          <ChannelGrid channels={channels.latest ?? []} />
        </Show>
      </Show>
    </main>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `onMount` + manual `fetch` signal | `createResource` + `refetch()` | SolidJS 1.x stable | Loading/error/stale states handled automatically |
| Direct library import | Re-export from `src/navigation/index.ts` | Phase 1 decision | Single swap point if library needs replacement |
| `@webos/ares-cli` v2 (deprecated) | `@webosose/ares-cli` v3 | 2022 | Already in CLAUDE.md; no action for Phase 3 |

**Deprecated/outdated:**
- `channels()` for rendering during refetch: Use `channels.latest` instead to avoid blank-grid flicker.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `authStore.userId` is always non-null when ChannelsScreen mounts (AuthGuard enforces this) | Architecture Patterns | If userId is null, Helix calls will fail; need null check and redirect to login |
| A2 | `/helix/channels/followed` total count is accessible from the first response page — exhausting pagination is safe within a 60s poll interval for users following up to ~1000 channels | Common Pitfalls | Very large follow lists (>1000) may cause slow initial loads; deferred concern for v1 |
| A3 | `autoRestoreFocus=true` (the library default) works correctly on Chromium 68 — the DOM measurement and nearest-sibling calculation runs on layout engine present in webOS 5.x | Common Pitfalls | If broken on webOS, manual focus fallback needed after refresh |

---

## Open Questions

1. **How many pages does a typical Twitch user's followed list span?**
   - What we know: First page returns up to 100 channels; total is in response. A casual user follows 20-100 channels (1 page). A heavy user may follow 500-1000+ channels (5-10 pages).
   - What's unclear: Whether paginating 10 pages sequentially within the 60s poll interval causes visible lag.
   - Recommendation: For v1, paginate eagerly on initial load; accept the latency. If too slow, cap at 5 pages (~500 channels) with a comment explaining the tradeoff.

2. **Does `channels.latest` suppress the ErrorState on a failed refetch?**
   - What we know: `createResource` sets `.error` and `.latest` independently.
   - What's unclear: Whether a failed background refetch should show the error state or silently retain stale data.
   - Recommendation: Show error only when `!channels.latest` (no stale data to show). Silently swallow refetch errors — the grid stays visible with possibly stale data.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is code-only changes against already-running external services (Twitch Helix HTTPS API). No local services, CLIs, or runtimes beyond Node.js (already confirmed working) are required.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.1.2 with happy-dom |
| Config file | vite.config.ts (vitest inferred) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

[VERIFIED: package.json, existing test files]

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHAN-01 | `fetchLiveFollowedChannels` calls `/helix/channels/followed` then `/helix/streams` and returns live-only channel data | unit | `npm test -- src/services/__tests__/TwitchChannelService.test.ts` | ❌ Wave 0 |
| CHAN-01 | Thumbnail URL template is correctly substituted (`{width}` and `{height}` replaced) | unit | `npm test -- src/services/__tests__/TwitchChannelService.test.ts` | ❌ Wave 0 |
| CHAN-01 | Viewer count formatted correctly (below 1000: "{N} viewers"; at/above 1000: "{N.N}K viewers") | unit | `npm test -- src/components/__tests__/ChannelCard.test.tsx` | ❌ Wave 0 |
| CHAN-01 | Pagination exhausted for followed channels (loop continues while cursor present) | unit | `npm test -- src/services/__tests__/TwitchChannelService.test.ts` | ❌ Wave 0 |
| CHAN-02 | `ChannelGrid` renders `Focusable` per channel with correct `focusKey` (`channel-{user_login}`) | unit | `npm test -- src/components/__tests__/ChannelGrid.test.tsx` | ❌ Wave 0 |
| CHAN-02 | `onEnterPress` on a card calls `navigate('/player/{user_login}')` | unit | `npm test -- src/components/__tests__/ChannelGrid.test.tsx` | ❌ Wave 0 |
| CHAN-03 | `setInterval` is set up in `onMount` and cleared in `onCleanup` | unit | `npm test -- src/screens/__tests__/ChannelsScreen.test.tsx` | ❌ Wave 0 |
| CHAN-03 | `refetch` is called after each interval tick | unit | `npm test -- src/screens/__tests__/ChannelsScreen.test.tsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/services/__tests__/TwitchChannelService.test.ts` — covers CHAN-01 fetch logic and pagination
- [ ] `src/components/__tests__/ChannelCard.test.tsx` — covers CHAN-01 thumbnail substitution and viewer count formatting
- [ ] `src/components/__tests__/ChannelGrid.test.tsx` — covers CHAN-02 focus key assignment and navigation
- [ ] `src/screens/__tests__/ChannelsScreen.test.tsx` — covers CHAN-03 polling setup and teardown

Note: Existing test pattern uses `vi.mock` + `solid-js/web` `render()` with happy-dom. New tests should follow the same convention as `AuthGuard.test.tsx`.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Auth already established in Phase 2 |
| V3 Session Management | no | Token lifecycle handled by TwitchAuthService |
| V4 Access Control | no | Screen behind AuthGuard |
| V5 Input Validation | yes | Twitch API response data used in DOM — sanitize string interpolation (SolidJS JSX escapes by default) |
| V6 Cryptography | no | No crypto in this phase |

### Known Threat Patterns for Helix API + DOM

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via stream title or game name | Tampering | SolidJS JSX auto-escapes string interpolation — no `innerHTML` usage, no `dangerouslySetInnerHTML` equivalent |
| Auth token logged to console | Information Disclosure | No `console.log(token)` in service code; debug logging disabled in production build |
| CORS-blocked API calls | Tampering | Twitch Helix uses CORS with `Authorization` header — standard fetch from browser origin is supported |

---

## Sources

### Primary (HIGH confidence)
- Twitch Helix API reference — `dev.twitch.tv/docs/api/reference` — GET /helix/channels/followed response shape, pagination cursor, first=100 max [VERIFIED: WebFetch]
- Twitch Helix API reference — `dev.twitch.tv/docs/api/reference` — GET /helix/streams response shape, thumbnail_url template, user_id repeated params [VERIFIED: WebFetch]
- `@lampa-dev/solidjs-spatial-navigation` README — locally installed package — full API: `Focusable`, `FocusableGroup`, `useSpatialNavigation`, `autoRestoreFocus`, `saveLastFocusedChild`, `onEnterPress`, `focusKey` [VERIFIED: file read]
- `src/` codebase — existing patterns: `createStore`, `onMount`/`onCleanup`, `Focusable`/`useSpatialNavigation`, CSS token usage [VERIFIED: file read]
- `.planning/phases/03-channel-list/03-UI-SPEC.md` — approved design contract: card anatomy, grid layout, copy, colors, typography [VERIFIED: file read]

### Secondary (MEDIUM confidence)
- SolidJS docs — `docs.solidjs.com/reference/basic-reactivity/create-resource` — `createResource`, `refetch()`, `.latest` property [CITED: WebSearch verified with official source]
- WebSearch result — `setInterval` + `onMount` + `onCleanup` + `refetch()` polling pattern — confirmed against SolidJS issue tracker [MEDIUM]

### Tertiary (LOW confidence)
- WebSearch — `autoRestoreFocus` behavior on Chromium 68 / webOS 5.x — no direct confirmation, assumed to work [A3 in Assumptions Log]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies verified in package.json; library API verified from installed README
- Architecture: HIGH — Helix endpoint shapes verified from official docs; SolidJS patterns verified from official docs
- Pitfalls: HIGH for API pitfalls (verified from docs); MEDIUM for webOS-specific behavior (A3)

**Research date:** 2026-04-14
**Valid until:** 2026-07-14 (stable APIs — Twitch Helix and SolidJS 1.x are slow-moving)
