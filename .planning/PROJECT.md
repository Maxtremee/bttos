# Twitch webOS Alt

## Current State

v1.0 is archived. v1.1 ("polish") is the active milestone — chat parity and animated emote support.

- Core product path from v1.0 is implemented: device-code auth, live followed channels, playback, chat, settings.
- v1.1 focus: animated emote support across all providers, with performance guardrails for constrained TV hardware.
- Remaining operational follow-up from v1.0 (manual runtime checks, Nyquist metadata) is tracked outside this milestone.

## Current Milestone: v1.1 polish

**Goal:** Bring animated emote support to parity across all providers and guard the rendering cost on constrained TV hardware.

**Target features:**
- Twitch first-party animated emotes (switch from `/static/` to `/animated/` with static fallback)
- Verify (and fix if broken) 7TV animated webp rendering on webOS Chromium 68
- Verify (and fix if broken) BTTV animated GIF/webp rendering
- FFZ animated emote support (upgrade to FFZ v2 API)
- Pause emote animation when the chat overlay is hidden
- Pause animation for emotes that aren't on-screen in the chat list

**Key context:**
- No user-facing animation toggle — always on (explicit decision)
- Target platform still Chromium 68 on older webOS 5.x; animated webp supported since Chromium 32
- Must not regress v1.0 chat rendering or introduce noticeable jank on low-end hardware

## What This Is

An alternative Twitch client for LG webOS TVs, replacing the slow and feature-poor official app. A lean, focused stream viewer for users who manage channels and chat from their phone or PC — the TV is purely a display device.

## Core Value

User can log in, see their followed channels, pick one, and watch the stream with chat — fast and reliably on webOS TV hardware.

## Next Milestone Goals

See `## Current Milestone: v1.1 polish` above. Post-v1.1 candidates:

- Execute deferred manual runtime validation checklist against real webOS hardware.
- Close Nyquist compliance gaps for phases 1, 3, 4, 5, and 6.

## Requirements

### Validated

- ✓ App loads and runs on real webOS TV hardware (Chromium 68+) — Phase 1
- ✓ App is fully navigable with a standard TV remote (D-pad + OK + Back) — Phase 1
- ✓ User can authenticate via device code or QR flow (required to use the app) — Phase 2 (manual runtime validation deferred)
- ✓ User sees a list of their followed channels that are currently live — Phase 3 (manual runtime validation deferred)
- ✓ User can select a channel and watch the stream — Phase 4 (manual runtime validation deferred)
- ✓ Stream plays at auto-selected best quality — Phase 4
- ✓ User can toggle Twitch chat overlay on/off during playback — Phase 5 (manual runtime validation deferred)
- ✓ User can access a settings screen (logout, basic preferences) — Phase 6 (manual runtime validation deferred)

### Active

- [ ] Animated emote support across Twitch first-party, 7TV, BTTV, FFZ (v1.1)
- [ ] Performance guardrails: pause animation when chat hidden or emotes off-screen (v1.1)
- [ ] Complete deferred manual runtime checks recorded in v1.0 audit and phase verification docs (carry-over)
- [ ] Close Nyquist compliance metadata gaps across all phases (carry-over)

### Out of Scope

- Channel discovery / browsing categories — users rely on phone/PC for this
- Chat input / sending messages — phone/PC handles interaction
- Channel management (follow/unfollow) — managed on other devices
- VOD / clip playback — live streams only for v1
- Manual quality selection — auto quality only for v1
- User profiles / account management — managed on Twitch directly

## Context

- **Platform:** LG webOS smart TVs (web-based app runtime, essentially a Chromium browser)
- **Input:** TV remote only — no keyboard, no mouse, no touch
- **Hardware constraints:** Limited CPU/RAM compared to desktop; performance is critical
- **Official app pain points:** Slow performance, missing features, poor remote navigation
- **User model:** Tech-savvy Twitch viewers who use phone/PC for discovery and chat participation, TV for lean-back viewing
- **Twitch API:** Will use official API with OAuth where possible; may need alternative approaches for stream playback URLs

## Constraints

- **Tech stack**: SolidJS — chosen for minimal bundle size and fine-grained reactivity on constrained TV hardware
- **Platform**: webOS TV apps are web apps running in a built-in browser engine
- **Input**: Must be fully navigable with a standard TV remote (D-pad + OK + Back)
- **Auth**: No physical keyboard available — must use device code flow or QR code for login
- **Performance**: Must feel responsive on low-end webOS TV hardware

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SolidJS over React/Vue | Maximum performance on constrained TV hardware — no virtual DOM, tiny bundle, fine-grained updates | ✓ Good |
| No chat input, only display | TV is a display device; users chat from phone/PC | ✓ Good |
| Auto quality only | Simplicity for v1; TV should just play the best it can handle | ✓ Good |
| Login required | App only works with followed channels, which requires auth | ✓ Good |
| Animated emotes always on (v1.1) | Avoid a settings knob; performance guardrails (pause-off-screen, pause-when-chat-hidden) handle the cost instead | Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-18 — v1.1 "polish" milestone started (animated emote support)*
