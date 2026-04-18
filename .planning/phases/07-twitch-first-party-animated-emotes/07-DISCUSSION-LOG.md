# Phase 7: Twitch First-Party Animated Emotes - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 07-twitch-first-party-animated-emotes
**Areas discussed:** Animation detection source, Fallback mechanism, URL construction placement, Test coverage strategy

---

## Animation detection source

| Option | Description | Selected |
|--------|-------------|----------|
| Trust format[] + fallback | Check `frag.emote.format.includes('animated')`. If true, request `/animated/`. If the response 404s, fall back to `/static/`. Best of both: zero wasted requests in the normal case, resilient to stale/wrong format data. Matches Criterion 3. | ✓ |
| Trust format[] only | Request `/animated/` iff format array contains `'animated'`; otherwise `/static/`. Simplest code. Relies on Twitch payload accuracy. | |
| Always try /animated/, fall back | Request `/animated/` for every emote, fall back to `/static/` on 404. Wastes bandwidth since most emotes are static. | |

**User's choice:** Trust format[] + fallback
**Notes:** Directly satisfies Criterion 3 (automatic fallback) without wasting requests in the common case.

| Option | Description | Selected |
|--------|-------------|----------|
| Static default | Empty/missing format → `/static/`. Matches current behavior exactly. | ✓ |
| Animated with fallback default | Empty/missing format → `/animated/` then fall back. Biases toward animation at the cost of a wasted request per such emote. | |

**User's choice:** Static default
**Notes:** Preserves v1.0 behavior for any emote without an explicit `animated` flag; zero-regression for Criterion 2.

| Option | Description | Selected |
|--------|-------------|----------|
| Case-insensitive | `format.some(f => f.toLowerCase() === 'animated')`. Defensive against Twitch shipping 'Animated' or 'ANIMATED'. | ✓ |
| Case-sensitive exact match | Match `'animated'` exactly per Twitch convention. | |

**User's choice:** Case-insensitive
**Notes:** Cheap insurance against future Twitch payload casing drift.

---

## Fallback mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Inline `<img onerror>` swap | When the animated image errors, replace its `src` with the `/static/` URL inline. Also clear `onerror` after the swap to prevent a loop if static also 404s. Minimal change to `ChatMessage.tsx`. | ✓ |
| Wrapper component with SolidJS signal | Extract `<TwitchEmoteImg>` with a `hasAnimatedFailed` signal. More idiomatic SolidJS; adds per-emote reactive boundary. | |
| No fallback | Trust format field only. Smallest code but fails Criterion 3. | |

**User's choice:** Inline `<img onerror>` swap
**Notes:** Smallest blast radius; no new component; predictable semantics.

| Option | Description | Selected |
|--------|-------------|----------|
| Alt text only on double fail | Let the browser render alt text. No JS retry, no placeholder, no crash. | ✓ |
| Hide the img entirely | Set `display:none` via onerror. More invisible failure. | |
| Retry after delay | Retry the static URL after a short backoff. Adds complexity and request volume. | |

**User's choice:** Alt text only on double fail
**Notes:** Alt text is the emote name (from `frag.text`) — meaningful, not blank. Satisfies "no blank tile, no crash" without retry complexity.

| Option | Description | Selected |
|--------|-------------|----------|
| No in-memory cache in Phase 7 | Treat each `<img>` independently; rely on Chromium HTTP cache. | ✓ |
| Cache failed animated IDs in-memory | Maintain a Set of failed animated IDs so subsequent messages skip straight to `/static/`. | |

**User's choice:** No in-memory cache in Phase 7
**Notes:** Revisit only if Phase 9 performance work surfaces measurable cost.

---

## URL construction placement

| Option | Description | Selected |
|--------|-------------|----------|
| Pure helper in new file | `src/services/TwitchEmoteUrl.ts` with `twitchEmoteUrl(id, format)` and `twitchEmoteStaticUrl(id)`. Unit-testable in isolation; matches existing service-module pattern. | ✓ |
| Inline in `ChatMessage.tsx` | Keep logic at the current render site. Smallest diff but harder to unit-test. | |
| Method on `EmoteService` | Co-locate with third-party emote URL logic. Lifecycle mismatch (Twitch URLs built per-message, not per-channel map). | |

**User's choice:** Pure helper in new file
**Notes:** Matches `TwitchChannelService.ts` pattern and enables D-09 unit tests.

| Option | Description | Selected |
|--------|-------------|----------|
| Bake in `'dark'` and `'2.0'` | Helper signature `twitchEmoteUrl(id, format)` only. Matches current behavior byte-for-byte. | ✓ |
| Accept theme/scale params with defaults | Options object with defaults. Flexible but premature. | |

**User's choice:** Bake in `'dark'` and `'2.0'`
**Notes:** Zero chance of a caller path regressing Criterion 2; add params when a real consumer needs them.

| Option | Description | Selected |
|--------|-------------|----------|
| Fallback inline in `ChatMessage.tsx` | Component renders with `onerror={swapToStatic}`; helper stays pure. | ✓ |
| Fallback inside the helper | Helper returns a pre-wired img element; encapsulates more but becomes DOM-aware. | |

**User's choice:** Fallback inline in `ChatMessage.tsx`
**Notes:** Keeps the helper DOM-free and testable; fallback is observable at the render boundary.

---

## Test coverage strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Helper unit + ChatMessage onerror assertion | Unit tests for URL construction across all format cases + component test that simulates error event and asserts src swap. Covers Criteria 2 and 3 at CI level. | ✓ |
| Helper unit tests only | Test URL construction; skip onerror assertion. Leaves Criterion 3 at code-review level. | |
| No new tests, lean on runtime check | Existing tests + manual TV verification. Lowest effort; regressions would slip CI. | |

**User's choice:** Helper unit + ChatMessage onerror assertion
**Notes:** Criterion 3 needs automated coverage — it's a negative assertion and hard to eyeball on a TV.

| Option | Description | Selected |
|--------|-------------|----------|
| Manual runtime check, logged in VERIFICATION.md | Manual step: open channel with an active animated emote (e.g. `SoBayed`), confirm animation. Matches v1.0 deferred-check pattern. | ✓ |
| Block phase completion on TV verification | Don't mark complete until real-TV check is performed and recorded. | |
| Simulator + visual inspection | Use webOS Simulator — known-unreliable for performance. | |

**User's choice:** Manual runtime check, logged in VERIFICATION.md
**Notes:** Consistent with how v1.0 handled device-dependent criteria.

| Option | Description | Selected |
|--------|-------------|----------|
| Tighten to assert `/static/` path | Change `ChatSidebar.test.tsx:84` from `toContain('...emoticons/v2/25')` to explicitly assert `/static/` segment for the `format: ['static']` fixture. | ✓ |
| Leave as-is | Keep the loose contains check. Lower change risk but less informative. | |

**User's choice:** Tighten to assert `/static/` path
**Notes:** Locks in Criterion 2 at unit-test level; a regression routing static emotes through `/animated/` would now fail CI.

---

## Claude's Discretion

- Exact export names for helper functions in `TwitchEmoteUrl.ts` (named per codebase conventions).
- Whether to `console.debug` the fallback event for on-device diagnostics (default: silent).
- Precise happy-dom error-dispatch shape for the D-10 component test.

## Deferred Ideas

- Third-party (7TV/BTTV/FFZ) animated parity — Phase 8.
- Pause-when-hidden / pause-off-screen animation guardrails — Phase 9.
- In-memory cache of failed-animated emote IDs — revisit in Phase 9 if measurable.
- Parametrizing theme/scale on the helper — premature until a caller needs it.
- Animated emotes in channel card previews — EMOTE-05 (post-v1.1).
- User-facing animation toggle — EMOTE-06 (explicit v1.1 always-on decision).
- Animated badges / cheermotes — out of scope per REQUIREMENTS.md.
