---
quick_id: 260416-fsf
description: "Further reduce PlayerScreen: extract useHlsPlayer, useChatSession, ToggleHint organism"
date: 2026-04-16
status: completed
commits:
  - 0cc964b
  - 1d0eccf
  - ef4a1e5
---

# Quick Task 260416-fsf — Summary

## Objective

Follow-up to 260416-fjq. The visual-organism extraction already dropped
PlayerScreen from 434 → 365 LOC. Remaining bulk was **behavioral**:
HLS init + retry, EventSub chat lifecycle + message batching, and the
repetitive color-button hint-display dance. Extract these into
composables so PlayerScreen becomes a near-pure template that
orchestrates a few hooks and renders the atomic-design organisms.

## What Was Done

### Task 1 — `useHlsPlayer` composable (commit `0cc964b`)

New file `src/hooks/useHlsPlayer.ts`. Owns:

- `fetchStreamM3u8Url` call via twitchStreamService
- hls.js instantiation with TV-safe buffer config (`maxBufferLength: 30`,
  `maxBufferSize: 30MB`, `backBufferLength: 0`, `liveSyncDurationCount: 3`)
- `MANIFEST_PARSED` handler that plays the video and fires `onPlaying`
- `ERROR` handler with:
  - NETWORK_ERROR → exponential backoff retry (up to 3: 2s, 4s, 8s)
  - MEDIA_ERROR → recoverMediaError()
  - unrecoverable → classify (offline vs network vs unknown) and surface
- `classifyError()` for thrown exceptions (TypeError/fetch → network,
  message 'offline' → offline, else unknown)
- `onCleanup` that destroys the Hls instance

**API:**
```ts
const { state, errorKind, attachVideo, retry } = useHlsPlayer(
  params.channel,
  { onPlaying: showInfoBar }
)
```

### Task 2 — `useChatSession` composable (commit `1d0eccf`)

New file `src/hooks/useChatSession.ts`. Owns:

- Reactive `status`, `scopeError`, `emoteMap` signals + `messages` store
- `queueMessage` / `flushMessages` batching (100ms window, cap 150)
- Wiring twitchChatService callbacks (`onMessage`, `onScopeError`,
  `onConnectionChange`)
- Emote fetch via emoteService
- `onCleanup` that disconnects + clears the batch timer

**API:**
```ts
const chat = useChatSession()
// elsewhere:
chat.start(broadcasterId)
```

### Task 3 — `ToggleHint` organism + PlayerScreen rewrite (commit `ef4a1e5`)

- New `src/components/organisms/ToggleHint.tsx` + CSS module — purely
  presentational, visibility controlled by caller.
- PlayerScreen rewritten top-to-bottom:
  - Consumes `useHlsPlayer` and `useChatSession` instead of inlining
  - Introduces named constants: `KEY_RED`/`KEY_GREEN`/`KEY_YELLOW`/`KEY_BLUE`
    and `CHAT_WIDTH_DEFAULT`/`CHAT_WIDTH_MIN`/`CHAT_WIDTH_MAX`/`CHAT_WIDTH_STEP`,
    `INFO_BAR_HIDE_MS`, `HINT_HIDE_MS` — removes magic numbers
  - Consolidates three `setHintVisible(true); clearTimeout; setTimeout(...)`
    blocks into one `showHint()` helper (mirrors existing `showInfoBar`)
  - Color-button `if/else if` chain becomes a clean `switch (e.keyCode)`
- `.toggleHint` CSS removed from PlayerScreen.module.css (moved to
  ToggleHint.module.css)

## Cumulative Impact

```
                               Before 260415-m2b     After 260416-fsf     Δ
PlayerScreen.tsx                      434                  207       −227  (−52%)
PlayerScreen.module.css               145                   41       −104  (−72%)
```

Across the three quick tasks (260415-m2b → 260416-fjq → 260416-fsf),
PlayerScreen went from a 434-line god component with 3 inline overlays,
5 duplicate button sites, and entangled HLS/chat/hint logic, to a
**207-line template** that:

- declares 4 UI-state signals + 2 auto-hide timer refs
- delegates HLS to `useHlsPlayer`
- delegates chat to `useChatSession`
- renders 6 presentational components (ScopeErrorOverlay, ChatSidebar,
  PlayerErrorOverlay, VideoInfoBar, ToggleHint, PlayerSettingsOverlay)

## New Hierarchy

```
src/
├── hooks/                       ← behavioral composables
│   ├── useHlsPlayer.ts          (121 LOC)
│   └── useChatSession.ts        ( 69 LOC)
└── components/
    ├── atoms/
    │   └── ActionButton
    ├── molecules/
    │   └── PrefRow
    └── organisms/
        ├── VideoInfoBar
        ├── PlayerErrorOverlay
        ├── ScopeErrorOverlay
        └── ToggleHint           ← new in this task
```

## Skill Alignment (atomic-design)

| Rule | Applied |
|------|---------|
| Components are presentational (data in, events out) | ✓ PlayerScreen no longer imports hls.js or the chat/emote services directly — those live in hooks |
| Single responsibility per level | ✓ Screen orchestrates; hooks own behavior; organisms own presentation |
| Magic numbers → named tokens/constants | ✓ Key codes, chat-width bounds, auto-hide durations now named |
| Compose, do not duplicate | ✓ `showHint()` and `showInfoBar()` collapse what was 4 duplicated inline timer dances |

## Verification

- `npx vitest run` — **99/99 tests pass** across all 3 commits
- `npx vite build` — succeeds, 238 modules transformed
- `wc -l src/screens/PlayerScreen.tsx` — **207** (target was ~225; beat by 18)

## Notes / Deferred

- Stream metadata `createResource` (Helix `/streams?user_login=`) kept
  inline in PlayerScreen. It's a one-off, used only for VideoInfoBar,
  and extracting it to `twitchChannelService.fetchByLogin()` is a
  service-API decision that deserves its own task.
- `useHlsPlayer`'s `attachVideo` has a subtle contract: must be called
  exactly once when the `<video>` element mounts. Currently done via
  `ref={(el) => player.attachVideo(el)}`. If future work mounts/unmounts
  the video conditionally, the hook will need a re-attach path.
