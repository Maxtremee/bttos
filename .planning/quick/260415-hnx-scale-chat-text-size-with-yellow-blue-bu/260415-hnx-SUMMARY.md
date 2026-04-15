---
phase: quick-260415-hnx
plan: "01"
subsystem: chat-ui
tags: [chat, scaling, text-size, emotes, tv-remote]
dependency_graph:
  requires: [quick-260415-hjo]
  provides: [proportional-chat-scaling]
  affects: [PlayerScreen, ChatSidebar, ChatMessage]
tech_stack:
  added: []
  patterns: [derived-signal-as-jsx-expression, prop-threading]
key_files:
  created: []
  modified:
    - src/screens/PlayerScreen.tsx
    - src/components/ChatSidebar.tsx
    - src/components/ChatMessage.tsx
decisions:
  - Scale passed inline as chatWidth()/260 expression in JSX (no extra createSignal)
  - Font-size floor of 10px prevents unreadable text at minimum chat width (140px)
  - Emote dimensions use Math.round to keep integer pixel values on constrained hardware
metrics:
  duration: "< 5 minutes"
  completed: "2026-04-15"
  tasks_completed: 1
  files_modified: 3
---

# Quick Task 260415-hnx: Scale Chat Text Size with Yellow/Blue Buttons Summary

**One-liner:** Proportional font-size (clamped 10px min) and emote dimensions threaded via scale=chatWidth/260 from PlayerScreen through ChatSidebar to ChatMessage.

## What Was Built

When the user presses yellow/blue to resize the chat panel width, chat text and emote images now grow and shrink proportionally alongside the panel. The scale factor is `chatWidth / 260` (where 260px is the default width). Font-size is clamped to a minimum of 10px to stay readable at the narrowest allowed width (140px).

**Scaling behavior at key widths:**

| Chat width | Scale | Font-size | Emote size |
|-----------|-------|-----------|------------|
| 140px (min) | 0.54 | 10px (clamped) | 12px |
| 260px (default) | 1.00 | 14px | 22px |
| 500px (max) | 1.92 | 27px | 42px |

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Thread scale prop from PlayerScreen through ChatSidebar to ChatMessage | 856704e | PlayerScreen.tsx, ChatSidebar.tsx, ChatMessage.tsx |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `src/screens/PlayerScreen.tsx` — modified (scale={chatWidth() / 260} passed to ChatSidebar)
- [x] `src/components/ChatSidebar.tsx` — modified (scale prop added, forwarded to ChatMessageComponent)
- [x] `src/components/ChatMessage.tsx` — modified (scale-aware font-size and emote dimensions)
- [x] Commit 856704e exists
- [x] `npm run build` exits 0 with no TypeScript errors

## Self-Check: PASSED
