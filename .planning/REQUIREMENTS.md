# Requirements: Twitch webOS Alt — Milestone v1.1 polish

**Defined:** 2026-04-18
**Milestone:** v1.1 polish
**Core Value:** User can log in, see their followed channels, pick one, and watch the stream with chat — fast and reliably on webOS TV hardware.
**Milestone Goal:** Bring animated emote support to parity across all providers and guard the rendering cost on constrained TV hardware.

## v1.1 Requirements

Requirements for this milestone. Each maps to exactly one roadmap phase.

### Animated Emotes

- [ ] **EMOTE-01**: Twitch first-party animated emotes render with animation when the emote has an animated format; static emotes continue rendering as static (no broken images or layout shift for non-animated emotes)
- [ ] **EMOTE-02**: 7TV animated emotes render animated in chat (animated WebP served at an appropriate size)
- [ ] **EMOTE-03**: BTTV animated emotes render animated in chat (native GIF/WebP from BTTV CDN)
- [ ] **EMOTE-04**: FFZ animated emotes render animated in chat (via FFZ v2 API with animated URLs where available)

### Performance

- [ ] **PERF-01**: Emote animation pauses when the chat overlay is hidden — no decode cost incurred during chat-off playback
- [ ] **PERF-02**: Off-screen emotes in the chat list do not animate — only emotes in the visible viewport of the chat sidebar animate

## Future Requirements

Deferred beyond v1.1. Tracked but not in current roadmap.

### Emote Enhancements

- **EMOTE-05**: Animated emote rendering in channel card previews (if emote previews are ever added to the channel grid)
- **EMOTE-06**: User-facing animation toggle in settings (deferred — v1.1 decision is always-on; revisit if performance feedback demands it)

### Carry-over Operational

- **OPS-01**: Complete deferred manual runtime checks from v1.0 audit and phase verification docs
- **OPS-02**: Close Nyquist compliance metadata gaps across v1.0 phases 1, 3, 4, 5, 6

## Out of Scope

Explicitly excluded from v1.1. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Channel card animated emote previews | Only chat renders emotes today; adding preview rendering pipeline is a separate feature |
| Cheermote animation | Cheermotes are rendered as plain text in v1.0; animating them is a new rendering pipeline |
| Subscriber-only / channel-point emote tiers | Unrelated to animation; orthogonal feature |
| User-facing animation toggle | Decision: always-on. Perf guardrails handle the cost instead of a settings knob |
| Auto hardware-capability detection | Explicit decision during milestone scoping: no toggle, always-on |
| Animated badges (subscriber/mod/etc.) | Badges are out of scope for this milestone — emotes only |

## Traceability

Which phases cover which requirements.

| Requirement | Phase | Status |
|-------------|-------|--------|
| EMOTE-01 | Phase 7 | Pending |
| EMOTE-02 | Phase 8 | Pending |
| EMOTE-03 | Phase 8 | Pending |
| EMOTE-04 | Phase 8 | Pending |
| PERF-01 | Phase 9 | Pending |
| PERF-02 | Phase 9 | Pending |

**Coverage:**
- v1.1 requirements: 6 total
- Mapped to phases: 6
- Unmapped: 0

---
*Requirements defined: 2026-04-18*
*Last updated: 2026-04-18 — v1.1 roadmap created; traceability populated (Phases 7–9)*
