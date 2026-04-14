---
phase: 05-chat
plan: "01"
subsystem: api
tags: [eventsub, websocket, twitch, bttv, 7tv, ffz, emotes, chat]

# Dependency graph
requires:
  - phase: 02-authentication
    provides: "auth token, CLIENT_ID, user:read:chat scope already declared in TwitchAuthService"
provides:
  - "TwitchChatService: EventSub WebSocket lifecycle, subscription, reconnection with exponential backoff, keepalive monitoring, scope error callback"
  - "EmoteService: BTTV/7TV/FFZ emote resolution, per-broadcaster caching, unified EmoteMap"
  - "src/types/chat.ts: ChatMessage, MessageFragment, ChatMessageEvent type definitions"
affects: [05-chat-02, ChatOverlay, PlayerScreen]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Service singleton pattern (class + exported instance) — consistent with TwitchAuthService, TwitchStreamService"
    - "TDD: write failing tests first, implement to make them pass"
    - "vi.useFakeTimers() for timer-dependent service testing without runAllTimersAsync (avoids setInterval infinite loop)"
    - "Provider-isolated try/catch in parallel Promise.all — single provider failure does not block others"

key-files:
  created:
    - src/types/chat.ts
    - src/services/TwitchChatService.ts
    - src/services/__tests__/TwitchChatService.test.ts
    - src/services/EmoteService.ts
    - src/services/__tests__/EmoteService.test.ts
  modified: []

key-decisions:
  - "Use 2x.webp for 7TV emotes (not AVIF) — Chromium 68 on older webOS has no AVIF support"
  - "Keepalive interval check uses Promise.resolve() microtask flushing in tests rather than vi.runAllTimersAsync() — the latter triggers infinite setInterval loops"
  - "Reconnect max attempts capped at 3 with delays [1s, 2s, 4s] — exponential backoff stops rather than retrying indefinitely"
  - "EmoteService caches per broadcasterId — avoids refetching 6 endpoints every time chat reconnects to same channel"

patterns-established:
  - "Pattern: WebSocket service callbacks (onMessage, onScopeError, onConnectionChange) set as public properties before connect()"
  - "Pattern: EmoteMap = Map<string, string> — emote code to CDN URL, shared type exported from EmoteService"

requirements-completed: [CHAT-01, CHAT-03, CHAT-04]

# Metrics
duration: 4min
completed: 2026-04-15
---

# Phase 5, Plan 01: Chat Service Layer Summary

**EventSub WebSocket chat ingestion (TwitchChatService) and BTTV/7TV/FFZ third-party emote resolution (EmoteService) with full test coverage — 17 tests, 0 new runtime dependencies**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-15T00:29:38Z
- **Completed:** 2026-04-15T00:33:25Z
- **Tasks:** 2
- **Files created:** 5

## Accomplishments

- TwitchChatService connects to `wss://eventsub.wss.twitch.tv/ws`, handles full session lifecycle (welcome, keepalive, reconnect), subscribes to `channel.chat.message`, delivers `ChatMessage` objects via callback, handles scope errors (403) and exponential backoff reconnection
- EmoteService fetches from 6 endpoints in parallel (BTTV global+channel, 7TV global+channel, FFZ global+channel), builds a unified emote code → CDN URL map, caches per broadcaster, uses `.webp` for 7TV (Chromium 68 compatibility)
- Type definitions in `src/types/chat.ts` shared between services and upcoming Plan 02 UI components

## Task Commits

1. **Task 1: Type definitions + TwitchChatService with tests** - `89c6425` (feat)
2. **Task 2: EmoteService with tests** - `e71bd67` (feat)

## Files Created/Modified

- `src/types/chat.ts` — ChatMessage, MessageFragment, ChatMessageEvent interfaces
- `src/services/TwitchChatService.ts` — EventSub WebSocket service class + singleton export
- `src/services/__tests__/TwitchChatService.test.ts` — 8 tests: connect, subscribe POST, notification parsing, reconnect, disconnect, 403 scope error, exponential backoff, keepalive timeout
- `src/services/EmoteService.ts` — Multi-provider emote service with caching + singleton export
- `src/services/__tests__/EmoteService.test.ts` — 9 tests: all 6 endpoints, WEBP enforcement, error isolation, caching, per-broadcaster segregation

## Decisions Made

- **7TV uses `.webp` not `.avif`:** Chromium 68 (webOS 5.x target) does not support AVIF. Using `.webp` format which Chromium 68 does support.
- **Test timer strategy:** `vi.runAllTimersAsync()` triggers infinite setInterval loops in keepalive monitor tests. Switched to `await Promise.resolve()` chains to flush async microtasks without advancing fake timers.
- **Reconnect backoff capped at 3 attempts:** After 3 failures, service stops retrying to avoid battery/CPU drain on TV hardware.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test timer strategy for async subscribe tests**
- **Found during:** Task 1 (TwitchChatService tests — Test 2 and Test 6)
- **Issue:** `vi.runAllTimersAsync()` caused "infinite loop after 10000 timers" because the keepalive setInterval fires repeatedly when all timers are advanced
- **Fix:** Replaced `vi.runAllTimersAsync()` with three sequential `await Promise.resolve()` calls to flush only the async subscribe microtasks without triggering timer-based intervals
- **Files modified:** `src/services/__tests__/TwitchChatService.test.ts`
- **Verification:** All 8 tests pass without infinite loop errors
- **Committed in:** `89c6425` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — test bug)
**Impact on plan:** Minor test implementation fix. No scope creep, no implementation changes required.

## Issues Encountered

None beyond the timer strategy fix documented above.

## User Setup Required

None — no external service configuration required for these service classes.

## Next Phase Readiness

- Plan 02 (ChatOverlay UI) can now import `twitchChatService` and `emoteService` singletons
- `ChatMessage` and `EmoteMap` types are exported and ready for the component layer
- All 104 tests pass (16 test files) — no regressions

## Known Stubs

None — service layer is fully wired. No placeholder data or hardcoded empty returns.

## Threat Flags

No new network surface beyond what was specified in the plan threat model (EventSub WSS, Helix subscribe, BTTV/7TV/FFZ GET endpoints). All mitigations from T-05-02 (optional chaining on nested message fields) and T-05-05 (onScopeError on 403) are implemented.

---
*Phase: 05-chat*
*Completed: 2026-04-15*
