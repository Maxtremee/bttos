# Twitch webOS Alt

## What This Is

An alternative Twitch client for LG webOS TVs, replacing the slow and feature-poor official app. A lean, focused stream viewer for users who manage channels and chat from their phone or PC — the TV is purely a display device.

## Core Value

User can log in, see their followed channels, pick one, and watch the stream with chat — fast and reliably on webOS TV hardware.

## Requirements

### Validated

- ✓ App loads and runs on real webOS TV hardware (Chromium 68+) — Phase 1
- ✓ App is fully navigable with a standard TV remote (D-pad + OK + Back) — Phase 1
- ✓ User can authenticate via device code or QR flow (required to use the app) — Phase 2 (pending human UAT)

### Active
- [ ] User sees a list of their followed channels that are currently live
- [ ] User can select a channel and watch the stream
- [ ] Stream plays at auto-selected best quality
- [ ] User can toggle Twitch chat overlay on/off during playback
- [ ] User can access a settings screen (logout, basic preferences)

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
| SolidJS over React/Vue | Maximum performance on constrained TV hardware — no virtual DOM, tiny bundle, fine-grained updates | — Pending |
| No chat input, only display | TV is a display device; users chat from phone/PC | — Pending |
| Auto quality only | Simplicity for v1; TV should just play the best it can handle | — Pending |
| Login required | App only works with followed channels, which requires auth | — Pending |

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
*Last updated: 2026-04-14 after Phase 2 completion*
