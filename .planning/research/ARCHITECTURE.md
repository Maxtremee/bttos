# Architecture Patterns

**Domain:** Alternative Twitch streaming client for LG webOS TVs
**Researched:** 2026-04-14

---

## Recommended Architecture

A flat SPA with a memory-based router, five clearly bounded subsystems, and no server. All state lives in SolidJS signals/stores. The app is a packaged webOS web app (HTML/CSS/JS bundle deployed to the TV's Chromium runtime).

```
┌─────────────────────────────────────────────────────┐
│                    App Shell                        │
│  (SolidJS root, focus trap, keybind router)         │
├────────────┬──────────────┬────────────┬────────────┤
│   Auth     │  Channel     │  Player    │  Settings  │
│  Screen    │  Grid Screen │  Screen    │  Screen    │
│            │              │            │            │
│  Device    │  Follows     │  Video +   │  Logout    │
│  Code Flow │  List (live) │  Chat      │  Prefs     │
└────────────┴──────────────┴────────────┴────────────┘
         │           │              │
         ▼           ▼              ▼
┌──────────────────────────────────────────────────────┐
│                Service Layer                         │
│  TwitchAuthService  TwitchAPIService                 │
│  StreamService      ChatService                      │
│  EmoteService                                        │
└──────────────────────────────────────────────────────┘
         │           │              │
         ▼           ▼              ▼
┌──────────────────────────────────────────────────────┐
│              External Systems                        │
│  id.twitch.tv   api.twitch.tv    EventSub WSS        │
│  Usher/GQL      BTTV/7TV/FFZ     hls.js + <video>   │
└──────────────────────────────────────────────────────┘
```

---

## Component Boundaries

### 1. App Shell

**Responsibility:** Root mount point, global key handler, focus management coordinator, route/screen transitions, auth guard.

**Communicates with:** All screens (renders them), SpatialNav context, AuthStore (decides which screen to show).

**Key details:**
- Listens to `keydown` events globally; maps webOS remote keycodes (D-pad, OK=13, Back=461) to spatial navigation commands.
- Owns the `MemoryRouter` from `@solidjs/router`. No URL bar means `MemoryRouter` is correct — it keeps navigation state in memory only, with no browser history pollution and no visible address bar changes.
- Renders a single active screen at a time; transitions are instant (no animation — TV hardware is constrained).
- Acts as auth guard: if `AuthStore.token` is absent, forces `AuthScreen`; otherwise shows last active screen.

---

### 2. Spatial Navigation Layer

**Responsibility:** D-pad focus management across all focusable UI elements.

**Communicates with:** App Shell (receives key events), all screen components (registers/deregisters focusable nodes).

**Key details:**
- `js-spatial-navigation` (luke-chang, vanilla JS library — framework-agnostic, no React dependency) or manual implementation using `focusable` element registration.
- Norigin Spatial Navigation is React-hooks-based and is NOT usable in SolidJS. Use `js-spatial-navigation` directly or a thin SolidJS wrapper.
- Provides a `useFocusable` SolidJS directive/hook that registers a DOM element with the nav engine on mount and deregisters on cleanup.
- Focus ring is a CSS class applied to the currently focused element; no custom rendering needed.
- webOS Magic Remote (pointer mode) must coexist — pointer hover can steal focus; guard against this with `pointer-events: none` on non-interactive regions during D-pad navigation.

---

### 3. Auth Screen + TwitchAuthService

**Responsibility:** Device Code Flow OAuth. Obtain user access token and refresh token. Persist to localStorage.

**Communicates with:** `id.twitch.tv/oauth2/device` (POST), `id.twitch.tv/oauth2/token` (POST poll), AuthStore (writes token).

**Key details:**
- Twitch Device Code Flow is now GA (out of closed beta). Endpoint: `POST https://id.twitch.tv/oauth2/device` with `client_id` and `scope`.
- Response includes `device_code`, `user_code`, `verification_uri`, and `interval` (polling interval in seconds).
- App displays `user_code` prominently (large text) and `verification_uri` (optionally as a QR code image). User completes auth on phone/PC.
- App polls `POST https://id.twitch.tv/oauth2/token` at the given interval with `device_code` until `access_token` arrives or `expires_in` lapses.
- Token storage: `localStorage` is available on webOS (16 MB limit since webOS 3.5). Persist `{ access_token, refresh_token, expires_at }`. Data survives app restarts but is wiped on app removal/update.
- Token refresh: `POST https://id.twitch.tv/oauth2/token` with `grant_type=refresh_token`. TwitchAuthService intercepts 401 responses from TwitchAPIService and refreshes transparently.
- Required OAuth scope: `user:read:follows user:read:chat` (read followed channels + read chat via EventSub).

**AuthStore (SolidJS store):**
```
{ token: string | null, refreshToken: string | null, expiresAt: number | null, userId: string | null }
```

---

### 4. Channel Grid Screen + TwitchAPIService

**Responsibility:** Fetch and display live followed channels. Navigate to a channel to start playback.

**Communicates with:** `api.twitch.tv/helix/streams/followed` (GET), PlayerScreen (navigates to), AuthStore (reads token).

**Key details:**
- Endpoint: `GET https://api.twitch.tv/helix/streams/followed?user_id={userId}` with `Authorization: Bearer {token}` and `Client-Id: {client_id}` headers. Returns only live channels.
- Response: array of stream objects — broadcaster login, display name, title, viewer count, thumbnail URL.
- Thumbnail URLs are parametric `{width}x{height}`; request 320x180 (TV display doesn't need larger).
- Grid layout: CSS Grid, typically 3-4 columns depending on count. Each card is a focusable element.
- Data freshness: fetch on screen mount, add a manual refresh via a dedicated "Refresh" button (remote-accessible). Avoid auto-polling — TV hardware is constrained.
- No pagination needed for MVP (most users follow <100 channels; only live ones shown, typically <20).

**ChannelsStore (SolidJS store):**
```
{ streams: StreamObject[], loading: boolean, error: string | null, lastFetched: number | null }
```

---

### 5. Player Screen

**Responsibility:** Full-screen video playback + optional chat overlay. Houses VideoPlayer component and ChatOverlay component.

**Communicates with:** StreamService (stream URL), ChatService (chat messages), VideoPlayer (media control), App Shell (Back key returns to grid).

#### 5a. VideoPlayer Component

**Responsibility:** Resolve HLS M3U8 URL and play it inside a `<video>` element via hls.js.

**Stream URL resolution — critical architectural decision:**

Twitch does NOT expose an official public API for HLS stream URLs. The required flow (used by all third-party clients including Streamlink) is:

1. Call Twitch's internal GQL endpoint `gql.twitch.tv/gql` with the `PlaybackAccessToken` query, passing `login: channelName` and a hardcoded `client-id` header (value `kimne78kx3ncx6brgo4mv6wki5h1ko` — Twitch's own web client ID, publicly known and widely used by third-party clients).
2. GQL response returns `{ value, signature }` — a playback access token.
3. Construct the Usher URL: `https://usher.ttvnw.net/api/channel/hls/{channelName}.m3u8?sig={signature}&token={value}&allow_source=true`
4. Feed this M3U8 URL into hls.js.

This approach relies on Twitch's undocumented internal GQL API. It is the de facto standard for third-party clients but carries stability risk (Twitch may restrict it). Flag as a **high-risk dependency** requiring monitoring. See PITFALLS.md.

**hls.js configuration for webOS (low-memory):**
- Set `backBufferLength: 10` (seconds) — prevents memory growth from infinite back buffer, which causes OOM on webOS 4+ devices.
- Set `maxBufferLength: 30` and `maxMaxBufferLength: 60` — keeps buffer bounded.
- Avoid hls.js versions 1.5.x on older webOS devices using Chromium 53-63 (startup delay regression). Pin to a stable 1.4.x or verify against target webOS version.
- Use `Hls.isSupported()` check on init; fall back to native `<video src>` if MSE is unavailable (older webOS may lack full MSE support).

#### 5b. ChatOverlay Component

**Responsibility:** Render scrolling chat messages as a translucent overlay on the right side of the video.

**Communicates with:** ChatService (receives parsed message objects), EmoteService (resolves emote image URLs).

**Rendering pipeline:**
- Maintains a fixed-size circular buffer of last N messages (default 50 — keeps DOM node count bounded).
- Each message renders as a `<div>` with colored username + parsed message parts (text spans + emote `<img>` tags).
- No virtual scroll needed at 50 messages. Re-use SolidJS `<For>` with keyed items for minimal DOM mutation.
- Overlay is toggled on/off by a single remote button press (e.g., OK or a dedicated color button). State lives in a `createSignal<boolean>` in PlayerScreen.
- Chat is read-only (no input). No keyboard, no compose box.

---

### 6. ChatService (EventSub WebSocket)

**Responsibility:** Connect to Twitch EventSub WebSocket, subscribe to `channel.chat.message`, emit parsed message objects.

**Communicates with:** `wss://eventsub.wss.twitch.tv/ws` (WebSocket), ChatOverlay (pushes messages via signal/callback), AuthStore (reads token).

**Key details:**
- EventSub WebSocket is the modern replacement for IRC. It is the officially recommended approach for new implementations (Twitch actively migrating away from IRC).
- Subscription type: `channel.chat.message` — requires `user:read:chat` scope, User Access Token.
- Auth: subscribe using `POST https://api.twitch.tv/helix/eventsub/subscriptions` with `transport: { method: "websocket", session_id }` after WebSocket handshake delivers the `session_id`.
- Message event payload includes: `chatter_user_name`, `color`, `message.text`, `message.fragments` (fragments include `type: "emote"` with `emote.id`).
- Reconnect strategy: EventSub sends `session_reconnect` messages; handle gracefully by connecting to new URL before closing old connection.
- One WebSocket connection supports multiple subscriptions; reuse for future event types if needed.

**Parsed message shape:**
```typescript
type ChatMessage = {
  id: string;
  username: string;
  color: string;  // hex, default to "#9146FF" if absent
  fragments: Array<
    | { type: "text"; text: string }
    | { type: "emote"; emoteId: string; url: string }
    | { type: "cheermote"; text: string }
  >;
  timestamp: number;
}
```

---

### 7. EmoteService

**Responsibility:** Resolve emote image URLs from Twitch native emotes, BTTV, FFZ, and 7TV. Cache results in memory.

**Communicates with:** Third-party CDNs (fetch on demand, cache aggressively), ChatService (provides URL strings), ChatOverlay (image URLs embedded in message fragments).

**Key details:**
- Twitch native emotes: `https://static-cdn.jtvnw.net/emoticons/v2/{emote_id}/default/dark/1.0` — URL is directly constructable from `emote.id` in EventSub message fragments. No API call needed.
- BTTV: `GET https://api.betterttv.net/3/cached/emotes/global` (global) and `GET https://api.betterttv.net/3/cached/users/twitch/{broadcaster_id}` (channel-specific). Cache per channel.
- FFZ: `GET https://api.frankerfacez.com/v1/room/id/{broadcaster_id}`. Cache per channel.
- 7TV: `GET https://7tv.io/v3/emote-sets/global` (global) and `GET https://7tv.io/v3/users/twitch/{twitch_user_id}` (channel). Cache per channel.
- Strategy: fetch all three third-party sets when entering a channel. Store in a `Map<emoteName, url>`. On message parse, look up each word in the map; if found, replace with emote fragment.
- Keep emote resolution out of the hot message-render path. Pre-resolve when joining channel, not per-message.
- For MVP: Twitch native emotes only (always available via EventSub fragments). BTTV/FFZ/7TV are a non-MVP enhancement.

---

### 8. Settings Screen

**Responsibility:** Logout action, basic preferences (future).

**Communicates with:** AuthStore (clears token), App Shell (navigates back).

**Key details:**
- Single focusable "Log Out" button for MVP.
- Logout: clear `AuthStore`, clear `localStorage` entries, navigate to AuthScreen.

---

## Data Flow

```
User presses remote key
        │
        ▼
App Shell global keydown handler
        │
        ├──► Spatial Nav (D-pad: move focus)
        │
        └──► Screen-specific handler (OK: activate, Back: go back)
                    │
                    ▼
            SolidJS signal/store update
                    │
                    ▼
              Reactive DOM update
              (fine-grained, no VDOM diff)
```

```
Auth flow:
  AuthScreen → TwitchAuthService → id.twitch.tv (device code poll)
            → AuthStore.token set → App Shell navigates to ChannelGrid
```

```
Channel browsing:
  ChannelGrid mounts → TwitchAPIService.getFollowedStreams()
                     → api.twitch.tv/helix/streams/followed
                     → ChannelsStore.streams updated
                     → <For> renders channel cards
```

```
Stream playback:
  User selects channel → PlayerScreen mounts
    ├── StreamService.getPlaybackToken(channelName)
    │     → gql.twitch.tv PlaybackAccessToken query
    │     → constructs Usher M3U8 URL
    │     → hls.js loads URL into <video>
    └── ChatService.connect(broadcasterId)
          → WebSocket to eventsub.wss.twitch.tv
          → POST subscribe to channel.chat.message
          → messages arrive as events
          → EmoteService resolves emote URLs
          → ChatStore.messages signal updated
          → ChatOverlay <For> renders new messages
```

```
Token refresh (transparent):
  Any API call → TwitchAPIService
    → if 401 response → TwitchAuthService.refresh()
    → POST id.twitch.tv/oauth2/token (refresh_token grant)
    → AuthStore updated with new token
    → original request retried
```

---

## State Management Approach

Use SolidJS stores (not multiple disconnected signals) for all cross-component state. Signals are fine for local/ephemeral component state.

| Store | Contents | Scope |
|-------|----------|-------|
| `AuthStore` | token, userId, expiry | Global (context) |
| `ChannelsStore` | live streams list, loading, error | ChannelGrid lifetime |
| `PlayerStore` | current channel, playback state | PlayerScreen lifetime |
| `ChatStore` | messages circular buffer, connected flag | PlayerScreen lifetime |
| `EmoteStore` | emote name → URL map per channel | PlayerScreen lifetime, cached |
| `SettingsStore` | user preferences | Global (context, persisted to localStorage) |

**Pattern:** Global stores (AuthStore, SettingsStore) provided via SolidJS `createContext` + `useContext`. Screen-scoped stores created inside screen components and passed down as props or context. Avoid global singletons for screen-scoped data — they complicate cleanup.

**No external state management library needed.** SolidJS stores are a first-class primitive. Do not introduce Zustand or Redux — they add unnecessary abstraction and bundle weight.

---

## Suggested Build Order (Dependency Chain)

Dependencies flow upward; each layer must be built before the ones above it.

```
Layer 0 (Foundation):
  - Project scaffolding (Vite + SolidJS, webOS manifest)
  - Spatial navigation wiring (global keydown, js-spatial-navigation setup)
  - App Shell + MemoryRouter skeleton

Layer 1 (Auth):
  - TwitchAuthService (device code flow + token refresh)
  - AuthStore
  - AuthScreen (device code + polling UI)
  - localStorage persistence

Layer 2 (Core API):
  - TwitchAPIService (HTTP fetch wrapper, auth header injection, 401 retry)
  - ChannelGrid Screen (followed live streams)
  - Channel card component (focusable, D-pad navigable)

Layer 3 (Playback):
  - StreamService (GQL PlaybackAccessToken → Usher URL)
  - VideoPlayer component (hls.js, <video> element, memory config)
  - PlayerScreen shell (full-screen layout)

Layer 4 (Chat):
  - ChatService (EventSub WebSocket + subscription)
  - ChatStore (circular message buffer)
  - ChatOverlay component (read-only, toggle-able)
  - EmoteService — Twitch native emotes only (fragments from EventSub)

Layer 5 (Polish):
  - Settings screen (logout)
  - BTTV/FFZ/7TV emote resolution (non-MVP enhancement)
  - Error/loading states, edge cases
```

---

## Scalability Considerations

| Concern | webOS TV (constrained) | Notes |
|---------|----------------------|-------|
| DOM node count | Keep chat at ≤50 nodes | Chromium on webOS runs GC every ~5s with stall; fewer nodes reduce pressure |
| Memory — video buffer | hls.js `backBufferLength: 10` | Default infinite back buffer causes OOM on webOS 4 |
| Memory — emote images | Browser cache handles it; limit emote set loading to current channel | Don't preload all followed channels' emotes |
| Bundle size | SolidJS + hls.js are primary contributors; no React, no heavy UI lib | Target <500KB gzipped |
| API polling | Manual refresh only (user-initiated) | Avoid setInterval-based polling for followed streams |
| WebSocket reconnect | EventSub sends explicit reconnect message; handle it | Do not rely on automatic browser reconnect |

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: React-style component state for chat messages
**What:** Using a single `createSignal<Message[]>` for the entire message array, replacing the whole array on each message.
**Why bad:** SolidJS would re-render all 50 `<For>` items on every new message because the array reference changes.
**Instead:** Use a `createStore` with a mutable array or a `createSignal` that appends only — or better, use SolidJS `produce` helper with a circular buffer.

### Anti-Pattern 2: Infinite hls.js back buffer
**What:** Using hls.js default config on webOS TV.
**Why bad:** Memory grows continuously for the duration of the stream; webOS TVs crash or become unresponsive after 30-60 minutes.
**Instead:** Set `backBufferLength: 10` explicitly in hls.js config on init.

### Anti-Pattern 3: Using Norigin Spatial Navigation (React hooks) in SolidJS
**What:** Importing `@noriginmedia/norigin-spatial-navigation` into a SolidJS app.
**Why bad:** It is built on React hooks (`useRef`, `useCallback`) and will not work in SolidJS.
**Instead:** Use `js-spatial-navigation` (vanilla JS) directly, or write a lightweight D-pad focus manager (~100 lines) using `querySelectorAll('[data-focusable]')` and arrow-key geometry.

### Anti-Pattern 4: Using Twitch's official HLS API (it doesn't exist publicly)
**What:** Expecting `api.twitch.tv/helix/` to return a stream playback URL.
**Why bad:** The Helix API has no such endpoint. Assuming this will block the playback feature entirely.
**Instead:** Use the GQL PlaybackAccessToken + Usher flow (document this explicitly and plan for fragility).

### Anti-Pattern 5: Routing via `window.location` / hash router
**What:** Using the default BrowserRouter or HashRouter for screen navigation.
**Why bad:** webOS TVs may handle URL navigation differently; hash changes can cause unexpected behavior; URL is irrelevant for a packaged app.
**Instead:** `MemoryRouter` from `@solidjs/router` — navigation state in memory only.

---

## Sources

- [Twitch Device Code Flow announcement (GA)](https://discuss.dev.twitch.com/t/adding-device-code-flow-to-supported-authentication-flows/52074) — HIGH confidence (official Twitch forum)
- [Twitch EventSub WebSocket docs](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/) — HIGH confidence (official)
- [Twitch EventSub chat authentication](https://dev.twitch.tv/docs/chat/authenticating/) — HIGH confidence (official)
- [Twitch Get Followed Streams endpoint](https://dev.twitch.tv/docs/api/reference/) — HIGH confidence (official Helix API)
- [hls.js webOS memory issue](https://github.com/video-dev/hls.js/issues/5567) — HIGH confidence (hls.js GitHub issue with webOS-specific details)
- [hls.js back buffer memory leak](https://www.mux.com/blog/an-hls-js-cautionary-tale-qoe-and-video-player-memory) — HIGH confidence (engineering post-mortem)
- [webOS MSE performance issues](https://forum.webostv.developer.lge.com/t/poor-mse-performance-on-webos-4/7852) — HIGH confidence (LG developer forum)
- [Twitch GQL PlaybackAccessToken (undocumented)](https://github.com/2bc4/twitch-hls-client) — MEDIUM confidence (widely used by third-party clients; officially unsupported)
- [SolidJS MemoryRouter](https://docs.solidjs.com/solid-router/rendering-modes/spa) — HIGH confidence (official SolidJS docs)
- [SolidJS stores](https://docs.solidjs.com/concepts/stores) — HIGH confidence (official SolidJS docs)
- [webOS localStorage limits](https://webostv.developer.lge.com/faq/2015-11-24-web-storage-local-storage-data-removal-app-removal-or-uninstallation) — HIGH confidence (official LG webOS developer docs)
- [js-spatial-navigation webOS](https://github.com/luke-chang/js-spatial-navigation/issues/64) — MEDIUM confidence (community issue thread)
- [Twitch IRC migration guide](https://dev.twitch.tv/docs/chat/irc-migration/) — HIGH confidence (official; confirms EventSub is recommended path)
