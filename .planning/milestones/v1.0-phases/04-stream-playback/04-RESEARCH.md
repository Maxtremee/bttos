# Phase 4: Stream Playback - Research

**Researched:** 2026-04-14
**Domain:** HLS video playback (hls.js), Twitch GQL stream URL acquisition, SolidJS lifecycle integration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Stream URL acquisition:** Use Twitch GQL `PlaybackAccessToken` query + Usher HLS URL construction (per CLAUDE.md — no official Helix endpoint exists for stream URLs). Use the authenticated user's OAuth token in GQL calls to avoid integrity-check failures.
- **HLS playback:** Use hls.js with MSE. Set `maxBufferLength` conservatively (e.g. 30s) per CLAUDE.md to avoid exhausting limited TV RAM. ABR enabled by default for automatic quality selection.
- **Info bar behavior:** Show stream info bar (channel name, title, game, viewer count) on playback start, auto-hide after a few seconds of inactivity. Show again on any remote button press. Standard TV streaming app pattern.
- **Remote controls during playback:** OK or directional press shows/hides info bar. Back button returns to channel list. No play/pause toggle needed for live streams (live is always playing). Volume handled by TV OS natively.
- **Error & offline UX:** If stream goes offline or network drops, show an informative error message overlay on the player screen with a retry option (focusable button). Back returns to channel list. Auto-retry on transient network errors with exponential backoff.
- **Loading transition:** Show a loading indicator (spinner or text) on the player screen while the stream URL is being acquired and HLS is buffering. Transition to video as soon as first frame is available.
- **Chromium 68 compatibility:** hls.js works with MSE on webOS 5+ Chromium 68. No DRM concerns for Twitch.

### Claude's Discretion
All implementation decisions for this phase are deferred to Claude's discretion based on research findings.

### Deferred Ideas (OUT OF SCOPE)
- **PLAY-05:** Manual quality selection (360p, 720p, 1080p) — deferred to v2
- **PLAY-06:** Low-latency mode for competitive viewing — deferred to v2
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLAY-01 | User can select a channel and watch the live stream | GQL `PlaybackAccessToken` → Usher m3u8 → hls.js `loadSource` |
| PLAY-02 | Stream plays at automatically selected best quality (ABR) | hls.js ABR is on by default; no manual level selection needed |
| PLAY-03 | Playback recovers gracefully from errors (stream offline, network drops) | hls.js ERROR event, fatal flag, `recoverMediaError()` / `startLoad()`, exponential backoff |
| PLAY-04 | Stream info bar shows title, game, and viewer count during playback | `StreamData` already has all fields; re-fetch on PlayerScreen mount via channel login param |
</phase_requirements>

---

## Summary

Phase 4 replaces the `PlayerScreen.tsx` skeleton with a working stream player. The implementation has two distinct parts: (1) a new `TwitchStreamService` that calls Twitch's internal GQL endpoint to acquire a signed access token, then constructs a Usher m3u8 URL from it, and (2) an updated `PlayerScreen` component that uses hls.js to play that URL inside a `<video>` element while managing loading/playing/error state, an auto-hiding info bar, and graceful error recovery.

The GQL + Usher path is the only viable stream URL acquisition method — Twitch has no official Helix endpoint for HLS URLs. This approach is widely used by community tools (Streamlink, TwitchReplay, etc.) and has remained structurally stable for several years, though it relies on Twitch's internal Client-ID (`kimne78kx3ncx6brgo4mv6wki5h1ko`) and a persisted-query SHA256 hash rather than a public API. This is the highest-risk integration point in the project; both identifiers could theoretically change, but have been stable since at least 2018.

The hls.js integration with SolidJS is straightforward: create the `Hls` instance in `onMount`, destroy it in `onCleanup`. Buffer configuration must be conservative (`maxBufferLength: 30`, `backBufferLength: 0`) for Chromium 68 and constrained TV RAM. ABR is on by default — no additional configuration needed for PLAY-02.

**Primary recommendation:** Build `TwitchStreamService` as a dedicated service (parallel to `TwitchChannelService`), keep the GQL call isolated and unit-testable. In `PlayerScreen`, use a SolidJS signal-based state machine (LOADING → PLAYING → ERROR) rather than ad-hoc flags.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| hls.js | 1.6.16 | HLS playback via MSE | Manages HLS segments, ABR, and buffer in JS — avoids unreliable native HLS on webOS. Not in package.json yet; must be installed. |
| solid-js | 1.9.12 (already installed) | Reactive state machine for player | Signal-based LOADING/PLAYING/ERROR state, `onMount`/`onCleanup` for hls instance lifecycle |
| Twitch GQL + Usher | n/a | Stream URL acquisition | Only viable path to Twitch HLS URLs |

**Installation:**
```bash
npm install hls.js@^1.6.16
```

**Version verification:** `npm view hls.js version` returns `1.6.16` as of 2026-04-14. [VERIFIED: npm registry]

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @lampa-dev/solidjs-spatial-navigation | already installed | Focus management for Retry button | Already in use; `Focusable` + `setFocus('player-retry')` on error state mount |

---

## Architecture Patterns

### Recommended Project Structure

New files to create:

```
src/
├── services/
│   └── TwitchStreamService.ts    # GQL PlaybackAccessToken + Usher URL builder
├── screens/
│   └── PlayerScreen.tsx          # Replace skeleton — video, loading, error, info bar
└── services/__tests__/
    └── TwitchStreamService.test.ts
    src/screens/__tests__/
    └── PlayerScreen.test.tsx
```

No new directories required. Follows existing service/screen separation.

### Pattern 1: GQL PlaybackAccessToken (Twitch Stream URL Acquisition)

**What:** POST to `https://gql.twitch.tv/gql` with a persisted query (SHA256 hash, not full query text) and variables. Returns `value` (JWT token) and `signature`. These are appended as query params to the Usher m3u8 URL.

**When to use:** Once per `PlayerScreen` mount, before hls.js `loadSource`.

**Example:**
```typescript
// Source: Streamlink twitch.py (community reverse-engineering) + ShufflePerson/Twitch Frontend & Video API.md
const GQL_ENDPOINT = 'https://gql.twitch.tv/gql'
const TWITCH_INTERNAL_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko'

interface PlaybackAccessToken {
  value: string
  signature: string
}

async function fetchPlaybackAccessToken(
  channelLogin: string,
  oauthToken: string
): Promise<PlaybackAccessToken> {
  const res = await fetch(GQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Client-ID': TWITCH_INTERNAL_CLIENT_ID,
      'Authorization': `OAuth ${oauthToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      operationName: 'PlaybackAccessToken',
      extensions: {
        persistedQuery: {
          version: 1,
          sha256Hash: 'ed230aa1e33e07eebb8928504583da78a5173989fadfb1ac94be06a04f3cdbe9',
        },
      },
      variables: {
        isLive: true,
        login: channelLogin,
        isVod: false,
        vodID: '',
        playerType: 'site',
      },
    }),
  })
  if (!res.ok) throw new Error(`GQL request failed: ${res.status}`)
  const data = await res.json()
  return data.data.streamPlaybackAccessToken
}
```

**Critical notes:**
- `Authorization` header uses `OAuth <token>` prefix, NOT `Bearer`. Twitch GQL uses a different auth scheme than Helix. [VERIFIED: multiple community implementations]
- `TWITCH_INTERNAL_CLIENT_ID` (`kimne78kx3ncx6brgo4mv6wki5h1ko`) is Twitch's own web player Client-ID, baked into their HTML. Only this ID works with `gql.twitch.tv`. [CITED: discuss.dev.twitch.com/t/the-client-id-header-is-invalid-for-gql-twitch-tv/21845]
- The persisted query hash (`ed230aa1e33e07eebb8928504583da78a5173989fadfb1ac94be06a04f3cdbe9`) is sent as an extension — the full query string is NOT sent. [CITED: Streamlink twitch.py]
- `playerType: 'site'` matches the regular Twitch web player. `'embed'` is also valid but `'site'` avoids some ad-injection paths.

### Pattern 2: Usher URL Construction

**What:** Assemble the m3u8 master playlist URL from the token + sig + channel name.

```typescript
// Source: Streamlink twitch.py + ShufflePerson/Twitch Frontend & Video API.md
function buildUsherUrl(channelLogin: string, token: PlaybackAccessToken): string {
  const params = new URLSearchParams({
    sig: token.signature,
    token: token.value,
    allow_source: 'true',
    allow_audio_only: 'true',
    allow_spectre: 'false',
    fast_bread: 'true',
    playlist_include_framerate: 'true',
    p: String(Math.floor(Math.random() * 999999)),
  })
  return `https://usher.ttvnw.net/api/channel/hls/${channelLogin}.m3u8?${params.toString()}`
}
```

**Notes:**
- `fast_bread=true` is used by Streamlink for low-latency live streams. [CITED: Streamlink twitch.py]
- `p` is a random 6-digit integer included to bust CDN caches and avoid stale responses.
- `allow_source=true` ensures the highest quality level (source) is included in the master playlist. Without it the source quality may be absent.

### Pattern 3: hls.js SolidJS Integration

**What:** Create and destroy hls instance in component lifecycle. Attach to `<video>` ref. Handle fatal errors.

```typescript
// Source: hls.js GitHub docs/API.md
import Hls from 'hls.js'
import { onMount, onCleanup } from 'solid-js'

// Inside PlayerScreen:
let videoRef!: HTMLVideoElement
let hls: Hls | undefined

onMount(() => {
  if (!Hls.isSupported()) {
    // Chromium 68 on webOS 5+ does support MSE — this path should not occur
    setPlayerState('error')
    return
  }

  hls = new Hls({
    maxBufferLength: 30,          // seconds — conservative for limited TV RAM
    maxBufferSize: 30 * 1000 * 1000, // 30 MB cap (default 60 MB is too high)
    backBufferLength: 0,          // Do not keep played buffer — saves RAM
    liveSyncDurationCount: 3,     // Default; stay 3 target durations behind live edge
  })

  hls.attachMedia(videoRef)
  hls.loadSource(m3u8Url)

  hls.on(Hls.Events.MANIFEST_PARSED, () => {
    videoRef.play().catch(() => {})
  })

  hls.on(Hls.Events.ERROR, (_event, data) => {
    if (data.fatal) {
      handleFatalError(data)
    }
    // Non-fatal errors: hls.js auto-recovers, no action needed
  })
})

onCleanup(() => {
  hls?.destroy()
  hls = undefined
})
```

**Fatal error recovery pattern:**
```typescript
// Source: hls.js docs/API.md — standard two-path recovery
function handleFatalError(data: Hls.errorData) {
  switch (data.type) {
    case Hls.ErrorTypes.NETWORK_ERROR:
      // Transient: attempt reload
      hls?.startLoad()
      break
    case Hls.ErrorTypes.MEDIA_ERROR:
      // Buffer/decode error: attempt media recovery
      hls?.recoverMediaError()
      break
    default:
      // Unrecoverable: destroy and surface error to user
      hls?.destroy()
      setPlayerState('error')
  }
}
```

**Exponential backoff for repeated network errors:** Track retry count in a signal; after 3 attempts, transition to ERROR state rather than continuing to call `startLoad()`.

### Pattern 4: SolidJS Player State Machine

**What:** A single signal drives all conditional rendering. Avoids boolean flag proliferation.

```typescript
// Pattern consistent with existing ChannelsScreen error state approach
type PlayerState = 'loading' | 'playing' | 'error'
type ErrorKind = 'offline' | 'network' | 'unknown'

const [playerState, setPlayerState] = createSignal<PlayerState>('loading')
const [errorKind, setErrorKind] = createSignal<ErrorKind>('unknown')
```

State transitions:
- Mount → `loading`
- `MANIFEST_PARSED` → `playing`
- Fatal unrecoverable error → `error`
- Retry button pressed → `loading` (destroy old hls instance, re-acquire token, re-init hls)

### Pattern 5: Info Bar Auto-Hide

**What:** Show info bar for 4 seconds, hide on timeout, re-show on any keydown.

```typescript
// Source: UI-SPEC.md — standard TV streaming pattern
const [infoVisible, setInfoVisible] = createSignal(true)
let hideTimer: ReturnType<typeof setTimeout> | undefined

function showInfoBar() {
  setInfoVisible(true)
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => setInfoVisible(false), 4000)
}

onMount(() => {
  showInfoBar() // auto-hide after 4s on mount
  window.addEventListener('keydown', showInfoBar)
})

onCleanup(() => {
  window.removeEventListener('keydown', showInfoBar)
  clearTimeout(hideTimer)
})
```

The keydown listener for info bar reuse does NOT conflict with App.tsx's Back key handler because App.tsx uses a separate `handleKeydown` that calls `e.preventDefault()` only for keyCode 461. Remote D-pad keys (37/38/39/40) and OK (13) will bubble to the info bar listener.

### Pattern 6: Stream Data for Info Bar

**What:** `PlayerScreen` receives the channel login via route param (`/player/:channel`). It needs `StreamData` (title, game, viewer count). Two options:

1. **Re-fetch from Helix:** Call `GET /helix/streams?user_login={channel}` on mount using `TwitchChannelService` or a direct fetch. Simple, accurate.
2. **Pass via navigation state:** Store the selected `StreamData` in a SolidJS store before navigating. Avoids a fetch but adds cross-screen coupling.

**Recommendation:** Re-fetch from Helix on `PlayerScreen` mount. The channel was just selected from the live grid — it will almost certainly be live. Add a single `GET /helix/streams?user_login={channel}` call. This keeps `PlayerScreen` self-contained and avoids navigation state coupling. [ASSUMED — either approach is valid; re-fetch is simpler]

### Anti-Patterns to Avoid

- **Adding `src` attribute to `<video>` element directly:** hls.js manages the media source internally via MSE. Setting `src` directly will conflict with hls.js MSE attachment. Leave `<video>` with no `src` attribute.
- **Calling `hls.destroy()` without checking for existence:** Always guard with `hls?.destroy()` — destroy can throw if called on an already-destroyed instance.
- **Keeping `backBufferLength` at default (Infinity):** On constrained TV RAM this causes memory growth until the TV kills the app. Set `backBufferLength: 0`.
- **Using `Bearer` prefix for GQL auth:** Twitch GQL requires `OAuth <token>` not `Bearer <token>`. Using `Bearer` will return 401 or integrity check failures.
- **Forgetting to call `videoRef.play()` after MANIFEST_PARSED:** hls.js does not auto-play. The host app must call `video.play()` in response to `MANIFEST_PARSED` (or `MEDIA_ATTACHED`).
- **Not listening for hls.js Hls.Events.ERROR at all:** Without the error listener, fatal errors are silent — the video just stops with no feedback to the user.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HLS adaptive bitrate | Custom segment fetcher | hls.js ABR (default on) | ABR involves bandwidth estimation, level selection heuristics, and discontinuity handling — thousands of lines of battle-tested code |
| MSE buffer management | Direct MediaSource API | hls.js | Buffer append timing, codec compatibility, fMP4 transcoding from TS — all handled |
| HLS error recovery | Custom retry logic for segments | hls.js non-fatal auto-recovery | hls.js already retries non-fatal segment and playlist errors automatically |
| Stream URL from channel name | Reverse-engineer Usher manually | Pattern 2 above (well-documented) | Documented by Streamlink, stable for years — no invention needed |

**Key insight:** hls.js handles the hard parts of live HLS (segment loading, ABR, buffer management, discontinuities, codec negotiation). The only custom logic needed is: get the URL, initialize the instance, handle fatal errors, and destroy on unmount.

---

## Common Pitfalls

### Pitfall 1: GQL Authorization Header Format

**What goes wrong:** `Authorization: Bearer <token>` returns a 401 or triggers Twitch's integrity check (returns a valid-looking token but the Usher URL yields 403 on the m3u8).

**Why it happens:** Twitch GQL uses a different auth scheme (`OAuth`) than Helix REST (`Bearer`). The Helix pattern is already in the codebase and developers copy it.

**How to avoid:** In `TwitchStreamService`, explicitly use `Authorization: OAuth ${token}` — never import from a shared header builder that adds `Bearer`.

**Warning signs:** GQL request returns 200 but `data.streamPlaybackAccessToken` is null, or Usher responds with HTTP 403 / empty m3u8.

### Pitfall 2: hls.js `backBufferLength` Memory Leak

**What goes wrong:** After 15-30 minutes, the TV's Chromium tab runs out of RAM and the app is killed or the video freezes.

**Why it happens:** Default `backBufferLength` is Infinity — hls.js keeps all played media in the MSE buffer. webOS TV hardware has 1-2 GB total RAM split between the OS, browser engine, and app.

**How to avoid:** Set `backBufferLength: 0` in the hls.js config. This discards played-back buffer aggressively.

**Warning signs:** Memory usage in webOS developer tools growing linearly during playback; video freezes after 20+ minutes.

### Pitfall 3: GQL Persisted Query Hash Staleness

**What goes wrong:** Twitch rotates the SHA256 hash for `PlaybackAccessToken`, breaking stream URL acquisition without any API change.

**Why it happens:** Twitch uses automatic persisted queries (APQ). The hash is derived from the query string. If Twitch updates the query, the hash changes.

**How to avoid:** Monitor GQL 400 responses ("PersistedQueryNotFound"). When detected, fall back to sending the full query string instead of the persisted hash. Streamlink handles this automatically.

**Warning signs:** GQL response contains `errors: [{message: "PersistedQueryNotFound"}]` instead of token data.

**Mitigation:** Include the full query string as a fallback. If the persisted query fails, retry with the explicit query:

```typescript
const PLAYBACK_ACCESS_TOKEN_QUERY = `
  query PlaybackAccessToken_Template(
    $login: String!, $isLive: Boolean!,
    $vodID: ID!, $isVod: Boolean!, $playerType: String!
  ) {
    streamPlaybackAccessToken(channelName: $login, params: {
      platform: "web", playerBackend: "mediaplayer", playerType: $playerType
    }) @include(if: $isLive) { value signature }
  }
`
```

### Pitfall 4: `hls.loadSource` Before `attachMedia`

**What goes wrong:** Video never plays; no error shown.

**Why it happens:** Calling `loadSource` before `attachMedia` is not supported. hls.js needs the `<video>` element attached before loading a source.

**How to avoid:** Always call `attachMedia(videoRef)` first, then `loadSource(url)`.

**Warning signs:** Silent no-op — no MANIFEST_PARSED event fires, video element stays black.

### Pitfall 5: Not Destroying hls Instance on PlayerScreen Unmount

**What goes wrong:** Navigating Back to channel list and then back to a stream creates multiple hls instances targeting the same (or a new) video element, causing audio doubling, buffer conflicts, or crashes.

**Why it happens:** `onCleanup` not registered, or registered but hls variable is out of scope.

**How to avoid:** Always declare `let hls: Hls | undefined` at component scope and call `hls?.destroy()` in `onCleanup`.

### Pitfall 6: Chromium 68 MSE MIME Type

**What goes wrong:** `Hls.isSupported()` returns false on webOS.

**Why it happens:** Older hls.js versions checked for specific MIME types that Chromium 68 didn't advertise correctly. v1.6.x has improved detection.

**How to avoid:** Use hls.js 1.6.x. If `isSupported()` still returns false on a specific webOS model, use `Hls.isSupported()` as a gate but also test `MediaSource.isTypeSupported('video/mp4; codecs="avc1.42E01E,mp4a.40.2"')` directly for diagnostic logging.

**Warning signs:** Black screen immediately on `PlayerScreen` mount, no HLS events fire.

### Pitfall 7: Auto-Retry Loop on Fatal Stream Offline Error

**What goes wrong:** The stream ended mid-watch. hls.js fires a fatal network error. The retry logic calls `startLoad()` repeatedly, burning network requests indefinitely.

**Why it happens:** Not distinguishing between transient network errors (recoverable) and "stream went offline" (permanent). Both come through as NETWORK_ERROR.

**How to avoid:** Cap retry attempts (3 max with exponential backoff: 2s, 4s, 8s). After 3 failures, transition to ERROR state and show the error overlay. Let the user decide to retry manually.

---

## Code Examples

### Complete GQL + Usher flow

```typescript
// Source: Streamlink twitch.py [CITED] + ShufflePerson/Twitch Frontend & Video API.md [CITED]

const GQL_ENDPOINT = 'https://gql.twitch.tv/gql'
const TWITCH_INTERNAL_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko'
const PERSISTED_QUERY_HASH = 'ed230aa1e33e07eebb8928504583da78a5173989fadfb1ac94be06a04f3cdbe9'

export async function fetchStreamM3u8Url(
  channelLogin: string,
  oauthToken: string
): Promise<string> {
  // Step 1: Get PlaybackAccessToken
  const res = await fetch(GQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Client-ID': TWITCH_INTERNAL_CLIENT_ID,
      'Authorization': `OAuth ${oauthToken}`,  // NOTE: OAuth not Bearer
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      operationName: 'PlaybackAccessToken',
      extensions: {
        persistedQuery: { version: 1, sha256Hash: PERSISTED_QUERY_HASH },
      },
      variables: {
        isLive: true,
        login: channelLogin,
        isVod: false,
        vodID: '',
        playerType: 'site',
      },
    }),
  })
  if (!res.ok) throw new Error(`GQL failed: ${res.status}`)
  const json = await res.json()

  // Detect persisted query staleness
  if (json.errors?.some((e: { message: string }) => e.message === 'PersistedQueryNotFound')) {
    throw new Error('GQL persisted query hash stale — needs update')
  }

  const pat = json.data?.streamPlaybackAccessToken
  if (!pat) throw new Error('streamPlaybackAccessToken missing from GQL response')

  // Step 2: Build Usher URL
  const params = new URLSearchParams({
    sig: pat.signature,
    token: pat.value,
    allow_source: 'true',
    allow_audio_only: 'true',
    allow_spectre: 'false',
    fast_bread: 'true',
    playlist_include_framerate: 'true',
    p: String(Math.floor(Math.random() * 999999)),
  })
  return `https://usher.ttvnw.net/api/channel/hls/${channelLogin}.m3u8?${params.toString()}`
}
```

### hls.js instance init with error recovery

```typescript
// Source: hls.js docs/API.md [CITED]
import Hls from 'hls.js'

function initHls(videoEl: HTMLVideoElement, url: string, onFatal: () => void): Hls {
  const hls = new Hls({
    maxBufferLength: 30,
    maxBufferSize: 30 * 1000 * 1000,
    backBufferLength: 0,
    liveSyncDurationCount: 3,
  })

  let mediaErrorRecoveryAttempted = false

  hls.on(Hls.Events.ERROR, (_e, data) => {
    if (!data.fatal) return
    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
      hls.startLoad()
    } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !mediaErrorRecoveryAttempted) {
      mediaErrorRecoveryAttempted = true
      hls.recoverMediaError()
    } else {
      hls.destroy()
      onFatal()
    }
  })

  hls.attachMedia(videoEl)
  hls.loadSource(url)

  hls.on(Hls.Events.MANIFEST_PARSED, () => {
    videoEl.play().catch(() => {})
  })

  return hls
}
```

### PlayerScreen route param extraction (SolidJS Router)

```typescript
// Source: existing App.tsx pattern [VERIFIED: codebase]
// Route: /player/:channel
import { useParams } from '@solidjs/router'

const params = useParams<{ channel: string }>()
const channelLogin = params.channel  // e.g. "xqc", "summit1g"
```

### Fetching StreamData for info bar on PlayerScreen

```typescript
// Source: existing TwitchChannelService pattern [VERIFIED: codebase]
// Re-fetch a single stream's metadata on mount
const [streamData] = createResource(
  () => params.channel,
  async (login) => {
    const headers = {
      'Authorization': `Bearer ${authStore.token}`,
      'Client-Id': CLIENT_ID,
    }
    const res = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${login}`,
      { headers }
    )
    if (!res.ok) return null
    const data = await res.json()
    return (data.data[0] as StreamData) ?? null
  }
)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| hls.js full query string in GQL body | Persisted query (SHA256 hash via APQ) | ~2021 | Must send hash extension; full query as fallback if hash stale |
| `fragLoadingTimeOut` / `levelLoadingTimeOut` config | `fragLoadPolicy` / `levelLoadPolicy` objects | hls.js 1.x | Legacy keys still accepted as shims but new config style preferred |
| `lowLatencyMode: true` for live | Default false for stable playback | n/a | For Twitch this is deferred (PLAY-06). Keep default false. |

**Deprecated/outdated:**
- `maxMaxBufferLength`: Accepted but superseded by `maxBufferSize` (byte cap). Both can coexist.
- Sending full GQL query text (without persisted hash): Still works as fallback but incurs higher network cost on every request.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `OAuth` prefix is required (not `Bearer`) for GQL Authorization header | Pattern 1, Pitfall 1 | If `Bearer` works, no harm. If `OAuth` doesn't work, 401 or silent token failure. Multiple community implementations consistently use `OAuth`. Risk LOW. |
| A2 | Persisted query SHA256 hash `ed230aa1e33e07eebb8928504583da78a5173989fadfb1ac94be06a04f3cdbe9` is still current | Pattern 1 | If stale, GQL returns PersistedQueryNotFound. Fallback to full query string resolves it. Risk MEDIUM — mitigated by fallback. |
| A3 | Re-fetching StreamData from Helix on PlayerScreen mount is preferable to passing via navigation state | Pattern 6 | Minor architectural preference. Either approach works. Risk LOW. |
| A4 | `kimne78kx3ncx6brgo4mv6wki5h1ko` (Twitch internal Client-ID) is still active for gql.twitch.tv | Pattern 1 | If rotated, all GQL calls fail. Risk LOW — stable since at least 2018; would break all community tools simultaneously and be immediately visible. |
| A5 | `fast_bread=true` Usher parameter is still accepted | Pattern 2 | If removed from Usher, it becomes a no-op (unknown params are ignored by m3u8 endpoints). Risk NONE. |

---

## Open Questions

1. **Does `Hls.isSupported()` return true on all target webOS models (5.x Chromium 68)?**
   - What we know: MSE is present on webOS 5+ [CLAUDE.md], hls.js 1.6.x improved detection. One GitHub issue reports "No compatible source was found" on Chromium 68 with an older Video.js HLS plugin (different library).
   - What's unclear: Whether hls.js specifically has been tested on webOS 5 Chromium 68.
   - Recommendation: Add a `console.warn` diagnostic log on `Hls.isSupported() === false` during development. Test on device in Phase 4 execution. If unsupported, use native HLS (`<video src={m3u8Url}>`) as fallback — but this is the unreliable path per CLAUDE.md.

2. **Should `TwitchStreamService` inherit the same 401 → refresh → retry pattern as `TwitchChannelService`?**
   - What we know: `TwitchChannelService.fetchLiveFollowedChannels` retries once on 401 after refreshing tokens. The GQL endpoint also uses the OAuth token.
   - What's unclear: Whether Twitch GQL ever returns 401 specifically (vs. returning 200 with null data on bad token).
   - Recommendation: Include the pattern for consistency even if rarely triggered.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| hls.js | PLAY-01, PLAY-02, PLAY-03 | Not installed | 1.6.16 available | — (no fallback; must install) |
| Node.js | Build toolchain | Yes | v24.14.1 | — |
| vitest | Test runner | Yes | 3.2.4 (via npx) | — |
| happy-dom | DOM env for tests | Yes (devDep) | 20.9.0 | — |
| Twitch GQL endpoint | PLAY-01 | External (network) | — | None for stream URLs |
| Usher endpoint | PLAY-01 | External (network) | — | None for HLS manifest |

**Missing dependencies with no fallback:**
- `hls.js` — not in `package.json`. Must be installed before implementation: `npm install hls.js@^1.6.16`

**Missing dependencies with fallback:**
- None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` (merges vite.config.ts) |
| Environment | happy-dom (default) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAY-01 | `fetchStreamM3u8Url` builds correct GQL request and Usher URL | unit | `npm test -- TwitchStreamService` | No — Wave 0 |
| PLAY-01 | `fetchStreamM3u8Url` throws on GQL non-200 | unit | `npm test -- TwitchStreamService` | No — Wave 0 |
| PLAY-01 | `fetchStreamM3u8Url` detects PersistedQueryNotFound error | unit | `npm test -- TwitchStreamService` | No — Wave 0 |
| PLAY-02 | hls.js ABR — no level forced in config (default=auto) | unit | `npm test -- TwitchStreamService` | No — Wave 0 |
| PLAY-03 | PlayerScreen shows error overlay on fatal hls error | unit | `npm test -- PlayerScreen` | No — Wave 0 |
| PLAY-03 | PlayerScreen transitions LOADING → ERROR on GQL failure | unit | `npm test -- PlayerScreen` | No — Wave 0 |
| PLAY-03 | Retry button triggers re-acquisition and re-init | unit | `npm test -- PlayerScreen` | No — Wave 0 |
| PLAY-04 | Info bar renders channel name, title, game, viewer count | unit | `npm test -- PlayerScreen` | No — Wave 0 |
| PLAY-04 | Info bar auto-hides after 4s (timer fires) | unit | `npm test -- PlayerScreen` | No — Wave 0 |
| PLAY-04 | Info bar re-shows on keydown | unit | `npm test -- PlayerScreen` | No — Wave 0 |

**Note on hls.js testing:** hls.js creates `MediaSource` instances which happy-dom does not implement. Tests must mock `hls.js` entirely (as `vi.mock('hls.js', ...)`) to test PlayerScreen state transitions without real HLS playback. This is the same pattern used for `TwitchChannelService` (mock the service, test the screen state).

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** All tests green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/services/__tests__/TwitchStreamService.test.ts` — covers PLAY-01 GQL + Usher logic
- [ ] `src/screens/__tests__/PlayerScreen.test.tsx` — covers PLAY-03 state machine, PLAY-04 info bar

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | OAuth tokens already managed by TwitchAuthService |
| V3 Session Management | no | No new session management |
| V4 Access Control | no | No new access control |
| V5 Input Validation | yes | Channel login from route param — validate is alphanumeric/hyphen before GQL call |
| V6 Cryptography | no | No new crypto |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Channel login param injection (route param used in URL and GQL body) | Tampering | Validate `channelLogin` matches `/^[a-zA-Z0-9_]{1,25}$/` before use in fetch calls |
| OAuth token leaked in Usher URL (token is in query string) | Information Disclosure | Accepted: Twitch designed this flow; token is short-lived and stream-scoped. Do not log the full URL. |

---

## Project Constraints (from CLAUDE.md)

These directives are binding on the planner:

- **SolidJS only** — no React, no Vue. SolidJS 1.9.x stable (not 2.0-experimental).
- **hls.js ^1.6.x** — already specified. Latest stable is 1.6.16.
- **`maxBufferLength` conservative (~30s)** — mandatory to avoid TV RAM exhaustion.
- **Twitch GQL + Usher** — required; no alternative stream URL source exists.
- **`Authorization: OAuth <token>` for GQL** — not `Bearer`.
- **No official Helix stream URL endpoint** — GQL is the only path.
- **localStorage for token persistence** — already in TwitchAuthService; no IndexedDB.
- **webOS target = Chromium 68** — `build.target: ['chrome68']` already in vite.config.ts.
- **No SSR** — static build only; no Vite server features.
- **D-pad navigable** — all interactive elements in error state must receive focus via `setFocus()`.
- **No manual quality selection** — ABR auto-only in this phase (PLAY-05 deferred to v2).

---

## Sources

### Primary (HIGH confidence)
- Streamlink twitch.py source (GitHub) — GQL PlaybackAccessToken persisted query hash, variables, Usher URL parameters, `Authorization: OAuth` header, `fast_bread` param
- hls.js docs/API.md (GitHub) — `maxBufferLength`, `backBufferLength`, `liveSyncDurationCount`, Events.ERROR, fatal/non-fatal pattern, `recoverMediaError()`, `startLoad()`
- Existing codebase: `TwitchAuthService.ts`, `TwitchChannelService.ts`, `authStore.ts`, `navigation/index.ts`, `App.tsx` — integration patterns, auth token location, route param, onMount/onCleanup usage

### Secondary (MEDIUM confidence)
- ShufflePerson/Twitch Frontend & Video API.md — full GQL query string text, Usher URL parameters cross-reference
- hls.js GitHub issue #5493 — webOS live stream freezing reports; confirms conservative buffer config requirement
- npm registry — hls.js 1.6.16 is current stable [VERIFIED: `npm view hls.js version`]

### Tertiary (LOW confidence)
- Twitch Developer Forums discuss.dev.twitch.com — confirms `kimne78kx3ncx6brgo4mv6wki5h1ko` as the only valid Client-ID for gql.twitch.tv
- WebSearch: GQL `Authorization: OAuth` vs `Bearer` — consistent across multiple community implementations

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — hls.js version verified via npm; already referenced in CLAUDE.md
- GQL + Usher flow: MEDIUM-HIGH — well-documented by Streamlink (community reverse-engineering), stable for years, two assumptions flagged (A1, A2) with mitigations
- Architecture patterns: HIGH — follow existing codebase conventions exactly
- Pitfalls: HIGH — confirmed by hls.js docs and known webOS memory constraints

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (GQL hash could theoretically change; npm packages stable for 30+ days)
