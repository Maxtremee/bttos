---
phase: quick
plan: 260416-fsf
type: execute
wave: 1
depends_on: []
files_modified:
  - src/hooks/useHlsPlayer.ts
  - src/hooks/useChatSession.ts
  - src/components/organisms/ToggleHint.tsx
  - src/components/organisms/ToggleHint.module.css
  - src/screens/PlayerScreen.tsx
  - src/screens/PlayerScreen.module.css
---

# Quick Task 260416-fsf — Plan

Continue PlayerScreen reduction. After 260416-fjq extracted visual
organisms, PlayerScreen was still 365 LOC — three behavioral concerns
(HLS player, chat session, color-button hint display) were still
inlined. Extract them into composables and a final organism.

## Tasks

### Task 1 — Extract `useHlsPlayer` composable
- **File:** `src/hooks/useHlsPlayer.ts`
- **API:** `useHlsPlayer(channel: string, { onPlaying? }) -> { state, errorKind, attachVideo, retry }`
- **Absorbs:** classifyError, initPlayer, HLS event handlers, retry backoff, cleanup
- **Expected LOC move:** ~85 out of PlayerScreen

### Task 2 — Extract `useChatSession` composable
- **File:** `src/hooks/useChatSession.ts`
- **API:** `useChatSession() -> { messages, emoteMap, status, scopeError, start }`
- **Absorbs:** chat service callbacks, message batching (MAX=150, BATCH=100ms),
  emote fetch, status signal, scope-error flag
- **Expected LOC move:** ~45 out of PlayerScreen

### Task 3 — Extract `ToggleHint` organism + tighten PlayerScreen
- **File:** `src/components/organisms/ToggleHint.tsx` + CSS module
- **Also:** consolidate three identical `setHintVisible(true); clearTimeout;
  setTimeout(...)` blocks into a single `showHint()` helper; name
  keyCode + width constants.
- **Expected LOC move:** ~15 + simplification

## Target
PlayerScreen.tsx: 365 → ~225 LOC

## Verification
- All 99 existing tests pass (behavior must not change)
- Production build succeeds
