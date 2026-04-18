# Roadmap: Twitch webOS Alt

## Milestones

- ✅ **v1.0** — six-phase MVP delivery (archived 2026-04-17)
  - Roadmap snapshot: `.planning/milestones/v1.0-ROADMAP.md`
  - Requirements snapshot: `.planning/milestones/v1.0-REQUIREMENTS.md`
  - Audit snapshot: `.planning/milestones/v1.0-MILESTONE-AUDIT.md`

## Active Milestone

**v1.1 polish** — animated emote support across all providers, with performance guardrails for constrained TV hardware.

- Requirements: `.planning/REQUIREMENTS.md` (6 requirements: EMOTE-01..04, PERF-01..02)
- Phase numbering continues from v1.0: new work starts at Phase 7.
- Explicit decision: no user-facing animation toggle — always-on with perf guardrails.

## Phases

- [ ] **Phase 7: Twitch First-Party Animated Emotes** — render Twitch animated emotes from the CDN's animated path with a static fallback, keeping non-animated emotes visually unchanged.
- [ ] **Phase 8: Third-Party Animated Emote Parity** — verify and fix 7TV/BTTV animated rendering on webOS Chromium 68 and add FFZ v2 API animated support so all three providers animate in chat.
- [ ] **Phase 9: Animation Performance Guardrails** — pause emote animation when chat is hidden and when emotes are scrolled off-screen so decode cost is bounded on low-end TVs.

## Phase Details

### Phase 7: Twitch First-Party Animated Emotes
**Goal**: Twitch first-party emotes flagged as animated render animated in chat while static emotes keep rendering as static, with no visible regression to the v1.0 chat layout.
**Depends on**: Nothing (first v1.1 phase; builds on v1.0 chat pipeline)
**Requirements**: EMOTE-01
**Success Criteria** (what must be TRUE):
  1. In a channel whose chat contains at least one Twitch animated emote (e.g. a channel running an active emote like `SoBayed`), the emote visibly animates in the chat sidebar on a real webOS TV.
  2. Non-animated Twitch emotes continue to render as static images with the same size and alignment as v1.0 — no layout shift, no broken image icons, no "animated" URL 404 fallthroughs visible to the user.
  3. When the Twitch CDN does not expose an animated asset for a given emote ID, the rendered image falls back to the static variant automatically (no blank tile, no console-level crash).
  4. Chat scroll and batching behaviour (150-message cap, 100ms batch interval) is unchanged — no new stutter introduced by the animated path.
**Plans**: TBD

### Phase 8: Third-Party Animated Emote Parity
**Goal**: 7TV, BTTV, and FFZ emotes that have animated variants render animated in the chat sidebar on webOS Chromium 68, so all four emote providers reach animation parity.
**Depends on**: Phase 7 (Twitch pipeline proves the animated `<img>` path; 3rd-party reuses the same rendering approach)
**Requirements**: EMOTE-02, EMOTE-03, EMOTE-04
**Success Criteria** (what must be TRUE):
  1. In a channel with active 7TV animated emotes, the animated emotes visibly animate in chat (animated WebP decoded by Chromium 68 from the 7TV CDN).
  2. In a channel with active BTTV animated emotes (GIF or WebP from the BTTV CDN), the emotes visibly animate in chat.
  3. In a channel with active FFZ animated emotes, the emotes visibly animate in chat using FFZ's v2 API-supplied animated URLs; non-animated FFZ emotes continue to render correctly via the upgraded v2 code path.
  4. Channel load time for the emote map (measured from `start(broadcasterId)` to `status === 'active'`) stays within the v1.0 baseline — the provider-parallel fetch in `EmoteService` is preserved.
  5. If any single provider's API is unreachable, the other providers' emotes still render (existing try/catch-per-provider resilience is preserved).
**Plans**: TBD

### Phase 9: Animation Performance Guardrails
**Goal**: Animated emote decoding cost is bounded on low-end webOS hardware by pausing animation when chat is not visible and when emotes are scrolled outside the chat viewport.
**Depends on**: Phase 7, Phase 8 (there must be animated emotes to pause; guardrails are pointless without them)
**Requirements**: PERF-01, PERF-02
**Success Criteria** (what must be TRUE):
  1. When the user toggles the chat overlay off during playback (existing v1.0 toggle), any animated emotes that were visible stop advancing frames — observable by confirming animation decode cost drops (no visible motion, no CPU pressure from emote rendering when chat is hidden).
  2. When chat is re-shown, previously-loaded animated emotes resume animating without re-fetching from the network.
  3. In a scrolling chat list, only emotes within the visible viewport of the chat sidebar advance frames; emotes scrolled out of view stop animating while still occupying correct layout space.
  4. When an off-screen emote is scrolled back into view, it resumes animating (no permanent freeze, no broken image).
  5. No user-facing setting is added for animation control — the guardrails are automatic (matches the explicit v1.1 decision of always-on).
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 7. Twitch First-Party Animated Emotes | 0/0 | Not started | — |
| 8. Third-Party Animated Emote Parity | 0/0 | Not started | — |
| 9. Animation Performance Guardrails | 0/0 | Not started | — |

## Build Order Rationale

Twitch first-party (Phase 7) goes first because it is the smallest-blast-radius change — a single hardcoded URL in `ChatMessage.tsx` — and it proves the animated `<img>` rendering path on real webOS hardware before any third-party work depends on it. Third-party parity (Phase 8) comes next: all three providers live in `EmoteService` and share URL-construction concerns (including the FFZ v2 migration), so they cohere as one phase and benefit from the Twitch path having already validated Chromium 68 animated WebP behaviour. Performance guardrails (Phase 9) land last because they are only meaningful once something is actually animating — pausing nothing has no observable benefit, and the guardrails need all four providers' animations to be in place to verify coverage.

## Next Step

Plan the first v1.1 phase with `/gsd-plan-phase 7`.
