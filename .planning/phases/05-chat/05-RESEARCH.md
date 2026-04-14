# Phase 5: Chat - Research

**Researched:** 2026-04-14
**Domain:** Twitch EventSub WebSocket, emote APIs (Twitch/BTTV/7TV/FFZ), SolidJS reactive list rendering
**Confidence:** HIGH (core protocol), MEDIUM (third-party emote APIs), HIGH (SolidJS patterns)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHAT-01 | Read-only Twitch chat overlay displayed during stream playback | EventSub WebSocket `channel.chat.message` — messages stream in real-time; overlay is a `position:absolute` div over the video |
| CHAT-02 | User can toggle chat overlay on/off with remote | `createSignal<boolean>` for visibility; `keydown` handler for designated button (e.g., Info/Red); toggling hides the DOM node without stopping the WebSocket |
| CHAT-03 | Twitch native emotes rendered as images in chat | EventSub message fragments include `emote.id`; CDN URL: `https://static-cdn.jtvnw.net/emoticons/v2/{id}/static/dark/2.0` |
| CHAT-04 | BTTV, 7TV, and FFZ emotes rendered in chat | Three REST APIs fetched once on channel join; emote code map built in memory; text fragments scanned for third-party codes |
</phase_requirements>

---

## Summary

Phase 5 adds a read-only chat overlay on top of the video player already built in Phase 4. The recommended approach is **Twitch EventSub WebSocket** — the modern official protocol that replaced IRC for read-only chat clients. EventSub delivers `channel.chat.message` events over a native browser WebSocket to `wss://eventsub.wss.twitch.tv/ws`, requires only the `user:read:chat` scope (already present in `TwitchAuthService.ts`), and provides structured message fragments — including emote IDs — directly in the event payload, eliminating manual IRC tag parsing.

Third-party emotes (BTTV, 7TV, FFZ) are fetched once via their respective REST APIs when a channel is joined. Each provider returns a list of emote codes and IDs. The chat renderer builds an in-memory map of `code → imageUrl` at startup. When rendering a message text fragment, the renderer splits on whitespace and checks each token against the map, replacing matches with `<img>` tags.

Performance is the dominant concern on webOS TV hardware. The strategy is: cap the message buffer at 100–150 items (splice from the front when exceeded), batch DOM writes every 100ms, use `createStore` with index-append updates for `<For>` to avoid full list re-renders, and use `flex-direction: column-reverse` so auto-scroll is CSS-native without JavaScript scroll manipulation.

**Primary recommendation:** Use EventSub WebSocket for chat ingestion. Build a `TwitchChatService` class that manages the WebSocket lifecycle. Build a `ChatOverlay` SolidJS component that consumes a store of messages and renders them in a `position:absolute` panel over the video.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native `WebSocket` | Browser built-in | EventSub WebSocket connection | No library needed — Chromium 68 has full native WebSocket WSS support [VERIFIED: caniuse.com] |
| SolidJS `createStore` | ^1.9.12 (already installed) | Reactive message list | Index-append store updates trigger only new item renders, not full list reconciliation [CITED: docs.solidjs.com] |
| SolidJS `<For>` | ^1.9.12 (already installed) | Efficient list rendering | Fine-grained reactivity — only new/removed items update the DOM [CITED: docs.solidjs.com] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @solid-primitives/websocket | ^1.3.2 | Optional WS abstraction | Stage 0 — experimental. Prefer hand-rolling the WebSocket class for production reliability. Only use if reconnection logic becomes complex. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| EventSub WebSocket | Twitch IRC over `wss://irc-ws.chat.twitch.tv` | IRC is deprecated-in-favor, requires manual IRC message parsing, `tmi.js` brings 97.6KB and `ws`/`node-fetch` Node.js deps, harder to tree-shake in a browser/Vite build |
| EventSub WebSocket | `tmi.js` | 97.6KB, Node.js dependencies (`ws`, `node-fetch`), browser field excludes those deps — but still carries dead code; EventSub is the official successor |
| Hand-rolled WS class | `@solid-primitives/websocket` | Primitives package is Stage 0 / experimental; hand-rolling ~40 lines gives full control over reconnection logic |

**Installation:** No new runtime dependencies required. `user:read:chat` scope is already present in `TwitchAuthService.ts` (line 4).

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── services/
│   └── TwitchChatService.ts     # EventSub WebSocket lifecycle, subscription management
├── screens/
│   └── PlayerScreen.tsx         # Add chat overlay, toggle signal, keydown handler
└── components/
    └── ChatOverlay.tsx           # Scrolling message list, emote rendering
```

### Pattern 1: EventSub WebSocket Session Flow

**What:** Connect → receive session_welcome → POST to Helix to subscribe → receive `channel.chat.message` notifications

**When to use:** Always. This is the only supported modern path for read-only browser chat clients.

```typescript
// Source: https://dev.twitch.tv/docs/eventsub/handling-websocket-events/
// Step 1: Connect
const ws = new WebSocket('wss://eventsub.wss.twitch.tv/ws')

// Step 2: On session_welcome, extract session_id then subscribe
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)
  if (msg.metadata.message_type === 'session_welcome') {
    const sessionId = msg.payload.session.id
    subscribeToChat(sessionId, broadcasterId, userId)
  }
  if (msg.metadata.message_type === 'notification') {
    const chatEvent = msg.payload.event
    // chatEvent.message.fragments contains text and emote fragments
    onMessage(chatEvent)
  }
}

// Step 3: POST to Helix to create subscription (must happen within 10s of welcome)
async function subscribeToChat(sessionId: string, broadcasterId: string, userId: string) {
  await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Client-Id': CLIENT_ID,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'channel.chat.message',
      version: '1',
      condition: { broadcaster_user_id: broadcasterId, user_id: userId },
      transport: { method: 'websocket', session_id: sessionId },
    }),
  })
}

// Step 4: Respond to PING (separate from EventSub keepalive — most WS libs do this automatically)
// EventSub uses session_keepalive messages, not PING frames, for its own keepalive
// The WebSocket protocol-level PING is handled by the browser automatically
```

[CITED: https://dev.twitch.tv/docs/eventsub/handling-websocket-events/]

### Pattern 2: EventSub Message Fragment Processing

**What:** Each `channel.chat.message` event contains a `message.fragments` array. Fragments are typed as `text` or `emote`. For `emote` fragments, the emote ID is provided directly — no regex parsing needed.

```typescript
// Source: https://dev.twitch.tv/docs/chat/send-receive-messages/
// Source: https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelchatmessage

interface MessageFragment {
  type: 'text' | 'emote' | 'cheermote'
  text: string
  emote?: {
    id: string
    emote_set_id: string
    owner_id: string
    format: string[]  // e.g. ["static"] or ["animated", "static"]
  }
  cheermote?: unknown
}

// Twitch native emote CDN URL
function twitchEmoteUrl(emoteId: string, scale: '1.0' | '2.0' | '3.0' = '2.0'): string {
  return `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/static/dark/${scale}`
}
```

[CITED: https://dev.twitch.tv/docs/chat/send-receive-messages/]

### Pattern 3: Third-Party Emote Resolution

**What:** Fetch global + channel emotes from BTTV, 7TV, and FFZ once per channel join. Build a `Map<code, imageUrl>` for O(1) lookup during message rendering. Text fragments (not emote fragments) are split on whitespace and each token checked against the map.

```typescript
// BTTV global emotes
// Source: https://api.betterttv.net/3/cached/emotes/global
type BttvEmote = { id: string; code: string; imageType: string }
const BTTV_CDN = (id: string) => `https://cdn.betterttv.net/emote/${id}/2x`

// BTTV channel emotes (by Twitch user ID)
// Source: https://api.betterttv.net/3/cached/users/twitch/{twitchUserId}
// Response: { channelEmotes: BttvEmote[], sharedEmotes: BttvEmote[] }

// 7TV global emotes
// Source: https://7tv.io/v3/emote-sets/global
// Response: { emotes: [{ id, name, data: { host: { url, files } } }] }
const SEVENTV_CDN = (url: string) => `https:${url}/2x.webp`
// url = data.host.url e.g. "//cdn.7tv.app/emote/{id}"

// 7TV channel emotes (by Twitch user ID)
// Source: https://7tv.io/v3/users/twitch/{twitchUserId}
// Response: { emote_set: { emotes: [...] } }

// FFZ channel emotes (by Twitch user ID)
// Source: https://api.frankerfacez.com/v1/room/id/{twitchUserId}
// Response: { sets: { [setId]: { emoticons: [{ id, name, urls }] } } }
const FFZ_CDN = (id: number) => `https://cdn.frankerfacez.com/emote/${id}/2`

// FFZ global emotes
// Source: https://api.frankerfacez.com/v1/set/global
// Response: { default_sets: number[], sets: { [setId]: { emoticons: [...] } } }
```

[VERIFIED: https://api.betterttv.net/3/cached/emotes/global responded with correct schema]
[VERIFIED: https://7tv.io/v3/emote-sets/global responded with correct schema]
[CITED: https://gist.github.com/chuckxD/377211b3dd3e8ca8dc505500938555eb — endpoint list]
[CITED: https://api.frankerfacez.com/docs/]

### Pattern 4: SolidJS Store for Message List

**What:** Use `createStore` with index-append to avoid full list re-renders. Cap at 150 messages. Use `<For>` with `each={messages()}`.

```typescript
// Source: https://docs.solidjs.com/reference/store-utilities/create-store
import { createStore } from 'solid-js/store'

interface ChatMessage {
  id: string          // message_id from EventSub (unique, used as <For> key)
  displayName: string
  color: string
  fragments: MessageFragment[]
}

const MAX_MESSAGES = 150
const [messages, setMessages] = createStore<ChatMessage[]>([])

function addMessage(msg: ChatMessage) {
  setMessages(prev => {
    const next = [...prev, msg]
    return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next
  })
  // OR more efficiently (avoids full clone):
  // setMessages(messages.length, msg)
  // then if (messages.length > MAX_MESSAGES) setMessages(m => m.slice(-MAX_MESSAGES))
}
```

[CITED: https://docs.solidjs.com/reference/store-utilities/create-store]

### Pattern 5: CSS-Native Auto-Scroll

**What:** Use `flex-direction: column-reverse` so newest messages appear at the bottom without JavaScript scroll manipulation. The browser handles overflow automatically.

```typescript
// Chat container style — newest messages at bottom, no JS scroll needed
const containerStyle = {
  display: 'flex',
  'flex-direction': 'column-reverse',
  overflow: 'hidden',              // No scrollbar; messages push off top
  'max-height': '100%',
}
// Reverse the messages array before rendering so column-reverse shows them correctly
// Or: keep array newest-first and display without reversal
```

**Alternative:** `overflow-y: auto` + scroll-to-bottom imperatively with `scrollTop = scrollHeight`. Avoid on constrained hardware — relying on CSS is zero-JS overhead.

[CITED: https://blog.twitch.tv/en/2016/08/08/improving-chat-rendering-performance-1c0945b82764/]

### Pattern 6: Message Batching (for high-traffic channels)

**What:** Buffer incoming messages for 100ms before appending to store. Prevents layout thrashing in busy chat rooms.

```typescript
// Source: Twitch engineering blog — https://blog.twitch.tv/en/2016/08/08/improving-chat-rendering-performance-1c0945b82764/
let pendingMessages: ChatMessage[] = []
let batchTimer: ReturnType<typeof setTimeout> | undefined

function queueMessage(msg: ChatMessage) {
  pendingMessages.push(msg)
  if (!batchTimer) {
    batchTimer = setTimeout(() => {
      flushMessages()
      batchTimer = undefined
    }, 100)
  }
}

function flushMessages() {
  if (!pendingMessages.length) return
  setMessages(prev => {
    const next = [...prev, ...pendingMessages]
    pendingMessages = []
    return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next
  })
}
```

### Pattern 7: Chat Toggle via Remote Button

**What:** Listen for a specific keycode in the `PlayerScreen` keydown handler. Toggle a `chatVisible` signal. The overlay is conditionally rendered with `<Show>`. The WebSocket stays alive regardless of visibility.

```typescript
// webOS remote button keycodes (approximate — verify on device)
// Standard remote: OK=13, Back=461, Red=403, Green=404, Yellow=405, Blue=406
// Info/Display button varies by remote model — 457 or 403 or custom
const CHAT_TOGGLE_KEY = 403  // Red button (most universally available)

window.addEventListener('keydown', (e) => {
  if (e.keyCode === CHAT_TOGGLE_KEY) {
    setChatVisible(v => !v)
  }
})
```

[ASSUMED: webOS keycode 403 for Red button — verify on physical device. Chromium 68 keycodes match HTML standard for OK/Back but extra remote buttons are vendor-specific.]

### Anti-Patterns to Avoid

- **Using tmi.js in browser Vite build:** tmi.js has `ws` and `node-fetch` as npm dependencies (Node.js packages). The `browser` field in package.json sets them to `false`, meaning Vite will produce an empty stub. tmi.js will fail silently or throw at runtime. Use EventSub WebSocket instead.
- **Rendering emotes with dangerouslySetInnerHTML / innerHTML:** SolidJS does not have dangerouslySetInnerHTML. Use a helper that returns a JSX node array from fragments, rendering `<img>` for emotes and `<span>` for text. Never inject raw HTML.
- **Fetching emotes on every message:** Build the emote code map once when the channel is joined, not per-message.
- **Using `createSignal<ChatMessage[]>` for the message list:** A signal triggers full `<For>` list re-render on every message. Use `createStore` with index-append instead.
- **Subscribing to EventSub before receiving `session_welcome`:** The subscription POST must include the `session_id` from the welcome message. Subscribing before this is received will fail. You have 10 seconds from connection to subscribe.
- **Not cleaning up the WebSocket on `onCleanup`:** The WebSocket must be closed when `PlayerScreen` unmounts to avoid ghost connections accumulating.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chat ingestion | Custom IRC parser | EventSub WebSocket `channel.chat.message` | EventSub provides structured JSON — fragments already parsed, emote IDs included. IRC requires regex tag parsing and handles edge cases like /me, action messages, IRCv3 escaping. |
| Emote images | Custom CDN URL guesser | Documented CDN patterns per provider | BTTV/7TV/FFZ CDN URLs are documented; guessing leads to broken images |
| Scroll-to-bottom | JS `scrollTop` management | CSS `flex-direction: column-reverse` | Zero runtime cost, works in Chromium 68, no RAF/rAF loops needed |
| WebSocket reconnection | Exponential backoff from scratch | ~30 lines of standard pattern (see pitfall below) | The pattern is simple enough to hand-roll correctly; no library needed |

**Key insight:** EventSub completely eliminates the need to parse IRC protocol. The structured JSON payload means the renderer is just a mapping of typed fragments to JSX nodes.

---

## Common Pitfalls

### Pitfall 1: EventSub subscription window expires (10-second deadline)

**What goes wrong:** After connecting to `wss://eventsub.wss.twitch.tv/ws`, you receive `session_welcome` with a `session_id`. If you don't POST the subscription within 10 seconds, the server closes the connection with code 4003.

**Why it happens:** EventSub is designed for authenticated subscriptions — unauthenticated sessions are killed to prevent abuse.

**How to avoid:** In the `onmessage` handler, immediately call the subscription POST when `message_type === 'session_welcome'`. Don't defer it to a `createEffect` or `setTimeout`.

**Warning signs:** WebSocket closes immediately after connect with code 4003.

### Pitfall 2: `broadcaster_user_id` requires the channel's numeric Twitch user ID, not login name

**What goes wrong:** The EventSub subscription POST requires `broadcaster_user_id` as a numeric ID string (e.g., `"56648155"`), not a login name (e.g., `"channelname"`). The channel list (`ChannelsScreen`) stores `user_id` in `StreamData` but the `PlayerScreen` only receives `channel` (login) via router params.

**Why it happens:** Helix API uses IDs consistently; route params use login names for human-readable URLs.

**How to avoid:** Either (a) pass the broadcaster's `user_id` through router state alongside the login, or (b) call `GET /helix/users?login={channelLogin}` once to resolve ID before subscribing. Option (a) is simpler — the `ChannelsScreen` already has `user_id` from the stream data.

**Warning signs:** EventSub subscription POST returns 400 with "invalid broadcaster_user_id".

### Pitfall 3: Third-party emote APIs — CORS and rate limits

**What goes wrong:** BTTV, 7TV, and FFZ APIs are all cross-origin. webOS Chromium 68 enforces CORS. These APIs do support CORS for browser clients, but they have undocumented rate limits.

**Why it happens:** Fetching all three providers for global + channel emotes on every channel join can trigger rate limits in development if you reload frequently.

**How to avoid:** Cache emote maps by broadcaster ID in memory for the session lifetime. If the same channel is rejoined, reuse the cached map. Add `try/catch` around each provider fetch so one failure doesn't prevent the others from loading.

**Warning signs:** 429 responses in the network tab; emotes not rendering.

### Pitfall 4: 7TV global emotes endpoint returns WEBP/AVIF format

**What goes wrong:** 7TV `host.files` contains WEBP and AVIF variants. AVIF support in Chromium 68 is unknown. WEBP is supported in Chromium 25+.

**Why it happens:** 7TV uses modern image formats for bandwidth efficiency.

**How to avoid:** Always use `2x.webp` from the 7TV CDN URL (e.g., `https://cdn.7tv.app/emote/{id}/2x.webp`). Never use AVIF for webOS targets.

**Warning signs:** Broken image icons for 7TV emotes on older webOS hardware.

### Pitfall 5: `flex-direction: column-reverse` and Chromium 68 flexbox bugs

**What goes wrong:** Chromium 68 had flexbox bugs around `column-reverse` with `overflow: hidden`. Specifically, the first paint may show items in wrong order or the container may not respect `max-height`.

**Why it happens:** Flexbox spec implementation was still maturing in Chromium 68 (2018).

**How to avoid:** Test on real hardware. Fallback: render messages in normal order and imperatively scroll to bottom with `ref.scrollTop = ref.scrollHeight` inside a `requestAnimationFrame`. The RAF ensures the DOM has painted before measuring.

**Warning signs:** Messages appear reversed, or container height is wrong on first render.

### Pitfall 6: WebSocket keepalive — `session_keepalive` vs `session_reconnect`

**What goes wrong:** If no events or keepalive messages are received within the `keepalive_timeout_seconds` window (from `session_welcome`), the connection has dropped. If not detected, the UI shows stale chat while silently disconnected.

**Why it happens:** Idle channels generate no events, so keepalive messages are the only signal of liveness.

**How to avoid:** Track `lastMessageAt = Date.now()` on every received message (including `session_keepalive`). Poll every 30s: if `Date.now() - lastMessageAt > keepaliveTimeout * 1.5`, close and reconnect.

**Warning signs:** Chat appears frozen but no error state in UI.

### Pitfall 7: `channel.chat.message` scope already present but not yet requested by existing users

**What goes wrong:** `user:read:chat` is already in `SCOPE` in `TwitchAuthService.ts` (line 4). But users who authenticated before Phase 5 was deployed will have tokens that lack this scope.

**Why it happens:** OAuth scopes are fixed at authorization time. Existing tokens won't include new scopes.

**How to avoid:** The plan must include a scope check: after EventSub subscription POST, if the response is 403 with "Missing scope: user:read:chat", clear tokens and redirect to LoginScreen. This forces re-auth with the new scope. [ASSUMED: 403 is the exact error — verify against EventSub API responses]

**Warning signs:** EventSub subscription POST returns 403 immediately after connection.

### Pitfall 8: webOS remote toggle button keycode uncertainty

**What goes wrong:** TV remote button keycodes vary by webOS version and remote model. The Info button (blue circle with "i") may be keycode 457 on some remotes and 404 on others.

**Why it happens:** LG has multiple remote generations; webOS doesn't standardize extra button keycodes across all models.

**How to avoid:** Use the Red button (keycode 403) as the chat toggle — it is the most consistently available colored button on LG Magic Remote and standard remotes. Consider making the keycode configurable via a constant at the top of the file. Always test on physical device.

**Warning signs:** Chat toggle works in simulator but not on TV.

---

## Code Examples

### EventSub WebSocket Connection Lifecycle

```typescript
// Source: https://dev.twitch.tv/docs/eventsub/handling-websocket-events/

class TwitchChatService {
  private ws: WebSocket | null = null
  private keepaliveTimeout = 10  // seconds, updated from session_welcome

  connect(broadcasterId: string, userId: string, token: string, clientId: string): void {
    this.ws = new WebSocket('wss://eventsub.wss.twitch.tv/ws')

    this.ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data as string)
      const type = msg.metadata?.message_type

      if (type === 'session_welcome') {
        this.keepaliveTimeout = msg.payload.session.keepalive_timeout_seconds
        await this.subscribe(msg.payload.session.id, broadcasterId, userId, token, clientId)
      }

      if (type === 'notification' && msg.metadata?.subscription_type === 'channel.chat.message') {
        this.onChatMessage?.(msg.payload.event)
      }

      if (type === 'session_reconnect') {
        const newWs = new WebSocket(msg.payload.session.reconnect_url)
        // Maintain old connection until welcome received on new connection
        newWs.onmessage = this.ws!.onmessage
        newWs.onopen = () => {
          this.ws!.close()
          this.ws = newWs
        }
      }
    }

    this.ws.onerror = () => this.scheduleReconnect(broadcasterId, userId, token, clientId)
    this.ws.onclose = (e) => {
      if (e.code !== 1000) this.scheduleReconnect(broadcasterId, userId, token, clientId)
    }
  }

  disconnect(): void {
    this.ws?.close(1000)
    this.ws = null
  }

  onChatMessage?: (event: ChatMessageEvent) => void
}
```

### Emote Code Map Builder

```typescript
// Source: https://api.betterttv.net/3/cached/emotes/global (verified)
// Source: https://7tv.io/v3/emote-sets/global (verified)
// Source: https://api.frankerfacez.com/v1/set/global

type EmoteMap = Map<string, string>  // code -> imageUrl

async function buildEmoteMap(broadcasterId: string): Promise<EmoteMap> {
  const map: EmoteMap = new Map()

  // BTTV global
  const bttvGlobal = await fetch('https://api.betterttv.net/3/cached/emotes/global')
    .then(r => r.json()).catch(() => [])
  for (const e of bttvGlobal) map.set(e.code, `https://cdn.betterttv.net/emote/${e.id}/2x`)

  // BTTV channel (uses Twitch numeric user ID)
  const bttvChannel = await fetch(`https://api.betterttv.net/3/cached/users/twitch/${broadcasterId}`)
    .then(r => r.json()).catch(() => ({ channelEmotes: [], sharedEmotes: [] }))
  for (const e of [...(bttvChannel.channelEmotes ?? []), ...(bttvChannel.sharedEmotes ?? [])]) {
    map.set(e.code, `https://cdn.betterttv.net/emote/${e.id}/2x`)
  }

  // 7TV global
  const stvGlobal = await fetch('https://7tv.io/v3/emote-sets/global')
    .then(r => r.json()).catch(() => ({ emotes: [] }))
  for (const e of stvGlobal.emotes ?? []) {
    const cdnBase = e.data?.host?.url
    if (cdnBase) map.set(e.name, `https:${cdnBase}/2x.webp`)
  }

  // 7TV channel
  const stvChannel = await fetch(`https://7tv.io/v3/users/twitch/${broadcasterId}`)
    .then(r => r.json()).catch(() => null)
  for (const e of stvChannel?.emote_set?.emotes ?? []) {
    const cdnBase = e.data?.host?.url
    if (cdnBase) map.set(e.name, `https:${cdnBase}/2x.webp`)
  }

  // FFZ global
  const ffzGlobal = await fetch('https://api.frankerfacez.com/v1/set/global')
    .then(r => r.json()).catch(() => ({ default_sets: [], sets: {} }))
  for (const setId of ffzGlobal.default_sets ?? []) {
    for (const e of ffzGlobal.sets?.[setId]?.emoticons ?? []) {
      map.set(e.name, `https://cdn.frankerfacez.com/emote/${e.id}/2`)
    }
  }

  // FFZ channel
  const ffzChannel = await fetch(`https://api.frankerfacez.com/v1/room/id/${broadcasterId}`)
    .then(r => r.json()).catch(() => ({ sets: {} }))
  for (const set of Object.values(ffzChannel.sets ?? {})) {
    for (const e of (set as any).emoticons ?? []) {
      map.set(e.name, `https://cdn.frankerfacez.com/emote/${e.id}/2`)
    }
  }

  return map
}
```

### Fragment Renderer (JSX)

```typescript
// Renders a single chat message's fragments array as JSX nodes
// Source: https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelchatmessage

import { For } from 'solid-js'

function renderFragments(fragments: MessageFragment[], emoteMap: EmoteMap) {
  return (
    <For each={fragments}>
      {(frag) => {
        if (frag.type === 'emote' && frag.emote) {
          const url = `https://static-cdn.jtvnw.net/emoticons/v2/${frag.emote.id}/static/dark/2.0`
          return <img src={url} alt={frag.text} title={frag.text} style={{ height: '1.5em', 'vertical-align': 'middle' }} />
        }
        // For text fragments: scan for third-party emote codes
        const tokens = frag.text.split(' ')
        return (
          <For each={tokens}>
            {(token, i) => {
              const url = emoteMap.get(token)
              if (url) return <img src={url} alt={token} title={token} style={{ height: '1.5em', 'vertical-align': 'middle' }} />
              return <>{i() > 0 ? ' ' : ''}{token}</>
            }}
          </For>
        )
      }}
    </For>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Twitch IRC over `wss://irc-ws.chat.twitch.tv` | EventSub WebSocket `channel.chat.message` | 2023 (EventSub chat GA) | Structured JSON replaces manual IRC parsing; officially recommended path |
| Twitch PubSub | EventSub | April 2024 (decommissioned April 2025) | PubSub is dead — do not use |
| `tmi.js` for browser chat | Raw WebSocket + EventSub | Ongoing | tmi.js carries Node.js deps; EventSub is cleaner for browsers |
| Manual IRC `emotes` tag parsing | EventSub fragment array | 2023 | Fragments include `emote.id` directly — no position tracking needed |

**Deprecated/outdated:**
- `wss://irc-ws.chat.twitch.tv` IRC: Still works but Twitch recommends migration to EventSub for new apps [CITED: https://dev.twitch.tv/docs/chat/irc-migration/]
- Twitch PubSub: Fully decommissioned April 2025 [CITED: https://dev.twitch.tv/docs/pubsub/]
- `tmi.js 1.8.5` for browser: Last published August 2025, Node.js dep field set to `false`, no ESM — functional but carries unnecessary weight in a Vite/browser build [VERIFIED: npm registry]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | webOS remote Red button = keycode 403 | Patterns #7, Pitfall 8 | Chat toggle won't work on all remotes; mitigation: expose as constant |
| A2 | 403 "Missing scope" is the exact error when user:read:chat absent from token | Pitfall 7 | Error handling logic targets wrong response; mitigation: log full error payload and handle gracefully |
| A3 | `flex-direction: column-reverse` works correctly in Chromium 68 for the chat layout | Patterns #5, Pitfall 5 | Chat messages may render in wrong order; mitigation: fallback to imperative scroll-to-bottom |
| A4 | BTTV, 7TV, FFZ APIs support CORS for browser fetch requests from a TV app | Code Examples | All third-party emotes fail to load; mitigation: proxy through a simple worker or accept graceful degradation |
| A5 | FFZ global emote endpoint is `https://api.frankerfacez.com/v1/set/global` | Standard Stack, Code Examples | Wrong endpoint, FFZ global emotes missing; mitigation: try/catch per provider |

---

## Open Questions

1. **broadcaster_user_id routing**
   - What we know: `PlayerScreen` receives `channel` (login name) via `useParams`. EventSub needs numeric `broadcaster_user_id`.
   - What's unclear: Does the channel list already pass numeric ID through router state, or does PlayerScreen need to resolve it?
   - Recommendation: Audit `ChannelsScreen` link/navigation to see if `user_id` from `StreamData` is passed as router state. If not, add a `GET /helix/users?login=` call in the new `TwitchChatService.connect()` flow, or preferably thread the ID through router state in Phase 5 plan.

2. **webOS remote keycode for chat toggle button**
   - What we know: keycode 403 = Red button on most LG remotes
   - What's unclear: whether the user wants Red or another button (Info/blue circle = 457 on some models)
   - Recommendation: Default to Red (403). Expose as `CHAT_TOGGLE_KEYCODE` constant in the service. Test on physical device.

3. **Animated emote rendering**
   - What we know: CHAT-06 (animated emotes) is explicitly deferred to v2 requirements
   - What's unclear: Whether static-only emote rendering for animated emotes (Kappa is fine, PartyParrot shows still frame) is acceptable UX
   - Recommendation: Always use `static` format in Twitch CDN URL. For 7TV, use `.webp` which is the static variant at `2x.webp`. This is in-scope; animated GIF/WebP sequences are v2.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Native WebSocket (WSS) | TwitchChatService | ✓ | Chromium 68 built-in | — |
| BTTV API | CHAT-04 | ✓ (public REST, no auth) | — | Skip BTTV, use other providers |
| 7TV API | CHAT-04 | ✓ (public REST, no auth) | — | Skip 7TV, use other providers |
| FFZ API | CHAT-04 | ✓ (public REST, no auth) | — | Skip FFZ, use other providers |
| user:read:chat scope | CHAT-01 | ✓ Already in SCOPE string in TwitchAuthService.ts | — | — |

**Missing dependencies with no fallback:** None.

**Note:** Third-party emote APIs (BTTV, 7TV, FFZ) are independent services outside Twitch's control. If any is down, the emote map for that provider is empty — messages still render as text. This is acceptable graceful degradation.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^3.1.2 |
| Config file | `vite.config.ts` (no separate vitest.config — uses Vite plugin) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |
| Test environment | happy-dom (via `// @vitest-environment happy-dom` docblock) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHAT-01 | Chat service connects, receives messages, passes to callback | unit | `npm test -- TwitchChatService` | ❌ Wave 0 |
| CHAT-01 | ChatOverlay renders messages list | unit | `npm test -- ChatOverlay` | ❌ Wave 0 |
| CHAT-02 | PlayerScreen toggle signal flips on keydown 403 | unit | `npm test -- PlayerScreen` | ✅ (extend existing) |
| CHAT-02 | ChatOverlay hidden when visible=false | unit | `npm test -- ChatOverlay` | ❌ Wave 0 |
| CHAT-03 | Twitch emote fragment renders as `<img>` with correct CDN URL | unit | `npm test -- ChatOverlay` | ❌ Wave 0 |
| CHAT-04 | buildEmoteMap returns correct URLs for BTTV/7TV/FFZ codes | unit | `npm test -- TwitchChatService` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/services/__tests__/TwitchChatService.test.ts` — covers CHAT-01, CHAT-04 (WebSocket mock + emote map)
- [ ] `src/components/__tests__/ChatOverlay.test.tsx` — covers CHAT-01, CHAT-02, CHAT-03, CHAT-04 (rendering)

*(No new framework install needed — vitest + happy-dom already installed)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | Sanitize display names and message text before rendering (no dangerouslySetInnerHTML — SolidJS escapes text nodes automatically) |
| V6 Cryptography | no | — |

### Known Threat Patterns for Chat Rendering

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via chat message content | Tampering | SolidJS auto-escapes text in JSX text nodes. Never use `innerHTML`. Render text fragments as text nodes, not HTML. |
| Phishing via display names containing look-alike chars | Spoofing | Read-only app — no user input. Display as-is; users recognize streamer context. |
| Image hotlinking abuse | — | Only load images from known CDN domains (jtvnw.net, cdn.betterttv.net, cdn.7tv.app, cdn.frankerfacez.com). Never construct `<img src>` from untrusted message content. |
| EventSub session token exposure | Information Disclosure | Access token is in Authorization header only — never in URL, never logged. Close WebSocket on token expiry and reconnect after refresh. |

---

## Sources

### Primary (HIGH confidence)

- [Twitch EventSub WebSocket docs](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/) — connection flow, session_welcome, subscribe deadline
- [Twitch channel.chat.message subscription type](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/) — fragment structure, required scopes
- [Twitch send/receive messages guide](https://dev.twitch.tv/docs/chat/send-receive-messages/) — emote CDN URL template
- [Twitch IRC migration guide](https://dev.twitch.tv/docs/chat/irc-migration/) — confirms IRC deprecated in favor of EventSub
- [Twitch EventSub authentication](https://dev.twitch.tv/docs/chat/authenticating/) — user:read:chat scope
- [SolidJS createStore docs](https://docs.solidjs.com/reference/store-utilities/create-store) — store mutation patterns
- [SolidJS For component docs](https://docs.solidjs.com/concepts/control-flow/list-rendering) — list rendering
- npm registry: tmi.js 1.8.5 (last published 2025-08-06), browser field = `{ws: false, 'node-fetch': false}`
- npm registry: @solid-primitives/websocket 1.3.2 (last updated 2026-02-21)
- Live API: BTTV global emotes `https://api.betterttv.net/3/cached/emotes/global` — confirmed schema
- Live API: 7TV global emotes `https://7tv.io/v3/emote-sets/global` — confirmed schema

### Secondary (MEDIUM confidence)

- [Twitch chat rendering performance blog](https://blog.twitch.tv/en/2016/08/08/improving-chat-rendering-performance-1c0945b82764/) — 100ms batch strategy, DOM buffer limits
- [BTTV/FFZ API endpoint gist](https://gist.github.com/chuckxD/377211b3dd3e8ca8dc505500938555eb) — endpoint list cross-checked against live API
- [Twitch developer forums — EventSub auth clarification](https://discuss.dev.twitch.com/t/confused-about-channel-bot-for-eventsub/61972) — user:read:chat sufficient for non-bot viewer apps

### Tertiary (LOW confidence)

- webOS remote keycodes (403=Red, 457=Info) — community knowledge, unverified against official LG documentation [ASSUMED]
- FFZ global emotes endpoint `https://api.frankerfacez.com/v1/set/global` — from community gist, official docs page did not render [ASSUMED — needs verification at implementation time]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — EventSub is official and documented; no library needed
- Architecture: HIGH — EventSub flow is documented; emote APIs verified live
- Pitfalls: MEDIUM — some from community knowledge, some from official docs
- Emote APIs: MEDIUM — BTTV/7TV endpoints verified live; FFZ docs page did not render (endpoint from community gist)

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (30 days — EventSub and emote APIs are stable; remote keycodes don't change)
