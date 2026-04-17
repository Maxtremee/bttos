---
phase: 05-chat
plan: "02"
subsystem: ui
tags: [chat, sidebar, emotes, player, toggle, eventsub, solidjs]

# Dependency graph
requires:
  - phase: 05-chat-01
    provides: "TwitchChatService, EmoteService, EmoteMap, ChatMessage types"
  - phase: 04-stream-playback
    provides: "PlayerScreen base, HLS playback, info bar, error overlay"
provides:
  - "ChatSidebar: 360px scrolling sidebar with column-reverse message list, status bar"
  - "ChatMessage: inline emote rendering (Twitch native + 3rd-party via EmoteMap)"
  - "PlayerScreen: flex layout, chat lifecycle, Red-button toggle, scope error overlay, message batching"
affects: []

# Tech tracking
tech-stack:
  added:
    - "@solidjs/testing-library@0.8.10 (dev) — installed for component testing, not used directly (render from solid-js/web used instead)"
    - "@testing-library/jest-dom@6.9.1 (dev)"
  patterns:
    - "createStore (solid-js/store) for mutable chat message array — avoids full array replacement on each append"
    - "Message batching: 100ms setTimeout buffer, flush to store, cap at 150 entries"
    - "column-reverse flex container for chat scroll — newest messages appear at bottom without JS scroll management"
    - "useLocation() router state for broadcasterId — avoids extra Helix API call for broadcaster numeric ID"
    - "Existing test file updated to add vi.mock for new service imports (TwitchChatService, EmoteService, TwitchAuthService, useLocation)"

key-files:
  created:
    - src/components/ChatMessage.tsx
    - src/components/ChatSidebar.tsx
    - src/components/__tests__/ChatSidebar.test.tsx
  modified:
    - src/components/ChannelGrid.tsx
    - src/screens/PlayerScreen.tsx
    - src/screens/__tests__/PlayerScreen.test.tsx
    - package.json
    - package-lock.json

key-decisions:
  - "Use solid-js/web render() in component tests (not @solidjs/testing-library) — consistent with existing AuthGuard test pattern"
  - "PlayerScreen test mocks extended to cover TwitchChatService, EmoteService, TwitchAuthService, useLocation — prevents WebSocket unhandled rejection errors in happy-dom"
  - "flushMessages closes over pendingMessages array; setMessages receives prev to avoid stale closure issues"

patterns-established:
  - "Pattern: ChatSidebar column-reverse layout — no JS scroll management needed for live-append chat"
  - "Pattern: broadcasterId via useLocation router state — ChannelGrid passes numeric user_id so PlayerScreen skips extra API call"

requirements-completed: [CHAT-02]

# Metrics
duration: ~10min
completed: 2026-04-15
checkpoint: human-verify (Task 3 pending)
---

# Phase 5, Plan 02: Chat UI Components Summary

**Chat sidebar with live Twitch chat, inline emote rendering (native + BTTV/7TV/FFZ), Red-button toggle, and scope error handling — integrated into PlayerScreen flex layout**

## Status

**PARTIAL — Tasks 1 and 2 complete. Task 3 (human-verify checkpoint) is pending user verification.**

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-04-15T00:39:00Z
- **Tasks completed:** 2 of 3 (Task 3 is a human-verify checkpoint)
- **Files created:** 3
- **Files modified:** 5

## Accomplishments

### Task 1: ChatMessage + ChatSidebar components + tests + ChannelGrid router state

- `ChatMessage` renders username with color (fallback for `#000000` and empty), Twitch-native emote fragments as `<img>` pointing to `static-cdn.jtvnw.net/emoticons/v2/{id}/static/dark/2.0`, and text tokens checked against EmoteMap for 3rd-party emotes (BTTV/7TV/FFZ)
- `ChatSidebar` provides a 360px flex column with `column-reverse` message list (CSS-native newest-at-bottom without JS scroll), status bar showing "Loading chat..." or "Reconnecting..." conditionally
- `ChannelGrid` now passes `{ state: { broadcasterId: channel.user_id } }` via router navigate — PlayerScreen reads this to avoid an extra Helix API call
- 6 component tests: message list rendering, Twitch emote img, 3rd-party emoteMap lookup, status text for loading-emotes/reconnecting/active

### Task 2: PlayerScreen integration

- Flex row layout: `<div display:flex>` → video area (`flex:1, position:relative`) + `<ChatSidebar>` (`width:360px`)
- Video `object-fit` changed from `cover` to `contain` — letterboxes when chat sidebar is visible per UI-SPEC
- `twitchChatService.connect()` called in `initChat()` triggered by `createEffect` on `streamData()` resolving
- `twitchChatService.disconnect()` called in `onCleanup` alongside HLS destroy
- Message batching: `queueMessage()` buffers 100ms via `setTimeout(flushMessages, 100)`, flushes to `createStore<ChatMessage[]>` capped at `MAX_MESSAGES = 150`
- Red button (keyCode 403): `handleKeyDown` toggles `chatVisible`, replaces `showInfoBar` as the keydown listener
- Toggle hint: "Red — toggle chat" shows in bottom-right of video area when `playerState === 'playing'`, auto-hides 3s after stream starts, re-shows briefly on each toggle
- Scope error overlay: `setScopeError(true)` from `twitchChatService.onScopeError`, renders full-screen "Chat access required" with "Sign in again" button calling `twitchAuthService.clearTokens()` + reload
- `useLocation()` reads `broadcasterId` from router state, falls back to `streamData.user_id`

## Task Commits

1. **Task 1: ChatMessage + ChatSidebar + tests + ChannelGrid** — `629a5b6`
2. **Task 2: PlayerScreen integration** — `57cd019`

## Files Created/Modified

- `src/components/ChatMessage.tsx` — Inline message renderer: username color, Twitch emote img, 3rd-party emote token lookup
- `src/components/ChatSidebar.tsx` — 360px sidebar: column-reverse list, status bar for connecting states
- `src/components/__tests__/ChatSidebar.test.tsx` — 6 component tests (render from solid-js/web)
- `src/components/ChannelGrid.tsx` — Added `state: { broadcasterId: channel.user_id }` to navigate call
- `src/screens/PlayerScreen.tsx` — Full rewrite: flex layout, chat lifecycle, toggle, scope error, batching
- `src/screens/__tests__/PlayerScreen.test.tsx` — Added mocks for useLocation, TwitchChatService, EmoteService, TwitchAuthService

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] PlayerScreen.test.tsx missing mocks for new imports**
- **Found during:** Task 2 verification (npx vitest run)
- **Issue:** Existing `@solidjs/router` mock lacked `useLocation`, causing "No useLocation export" error. TwitchChatService mock absent, causing WebSocket unhandled rejections in happy-dom environment.
- **Fix:** Added `useLocation: () => ({ state: null })` to router mock. Added `vi.mock` blocks for TwitchChatService (connect/disconnect/callbacks as vi.fn()), EmoteService (getEmoteMap returning empty Map), and TwitchAuthService (clearTokens as vi.fn()).
- **Files modified:** `src/screens/__tests__/PlayerScreen.test.tsx`
- **Commit:** `57cd019`

## Test Results

- **Before Task 1:** 83 tests, 13 test files passing
- **After Task 1:** 89 tests, 13 test files passing (6 new ChatSidebar component tests)
- **After Task 2:** 89 tests, 13 test files passing, 0 unhandled errors

## Checkpoint Pending

Task 3 is `type="checkpoint:human-verify"` — requires visual confirmation in browser that:
1. Chat sidebar renders at 360px with scrolling messages
2. Usernames have colors, emotes appear as images
3. Video letterboxed (object-fit: contain) to left of chat
4. Red button (keyCode 403) toggles chat on/off
5. Toggle hint appears on stream start, auto-hides after 3s
6. Info bar overlays only video area, not chat sidebar

## Known Stubs

None — all chat data flows from live TwitchChatService EventSub connection. EmoteMap loaded from BTTV/7TV/FFZ APIs. No placeholder data.

## Threat Flags

No new network surface beyond what the plan threat model specifies. T-05-08 (text content auto-escaped by SolidJS JSX) and T-05-09 (emote URLs constructed from known CDN patterns only) mitigations implemented as designed.

---
*Phase: 05-chat*
*Completed (partial): 2026-04-15*
*Checkpoint: Task 3 human-verify pending*
