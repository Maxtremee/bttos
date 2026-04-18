# Phase 7: Twitch First-Party Animated Emotes - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Render Twitch first-party emotes using the CDN's `/animated/` path when the EventSub emote fragment is flagged as animated, with an automatic fallback to `/static/` when the animated asset is absent. Non-animated Twitch emotes continue rendering exactly as in v1.0 (same size, alignment, URL path). Third-party providers (7TV/BTTV/FFZ) and animation pause/resume guardrails are explicitly out of scope — they belong to Phases 8 and 9.

</domain>

<decisions>
## Implementation Decisions

### Animation detection
- **D-01:** Render the emote from `/animated/` iff `frag.emote.format` contains `"animated"` (case-insensitive match — defensive against Twitch shipping a differently-cased value); otherwise render from `/static/`.
- **D-02:** When `format` is empty or missing, default to `/static/`. Zero-regression guarantee for Criterion 2 — any emote without an explicit animated flag keeps its v1.0 rendering path.

### Fallback behavior
- **D-03:** On `<img>` load error for an `/animated/` URL, an inline `onerror` handler swaps `src` to the corresponding `/static/` URL and clears `onerror` to prevent a swap loop if `/static/` also errors. This is the mechanism that satisfies Criterion 3 ("no blank tile, no console-level crash").
- **D-04:** If the `/static/` fallback also fails to load, allow the browser's default alt-text rendering to take over. No retry loop, no JS placeholder, no hidden `<img>`. Alt text is the emote name (from `frag.text`) — meaningful, not blank.
- **D-05:** No in-memory cache of failed-animated emote IDs in Phase 7. Each `<img>` is independent; rely on Chromium's HTTP cache for repeat fetches. Revisit only if measurable bandwidth or decode cost shows up during Phase 9 performance work.

### Code placement
- **D-06:** Add a new pure helper module `src/services/TwitchEmoteUrl.ts` exporting two functions: one that builds the `/animated/`-or-`/static/` URL from `(id, format)`, and one that always returns the `/static/` URL from `(id)` alone (for use inside the `onerror` handler).
- **D-07:** Bake `dark` theme and `2.0` scale in as constants inside the helper — no parameters, no options object. Matches current behavior byte-for-byte and eliminates any caller path that could regress non-animated rendering.
- **D-08:** Fallback logic (the `onerror` swap) lives inline at the emote render site in `ChatMessage.tsx`. The helper stays DOM-free and unit-testable in isolation.

### Testing
- **D-09:** Unit tests for the helper covering four cases: animated format → `/animated/` URL, static format → `/static/` URL, empty/missing format → `/static/` URL, case-insensitive match (`"Animated"`, `"ANIMATED"`) → `/animated/` URL.
- **D-10:** Component test that simulates an `<img>` error event on a rendered animated emote and asserts the `src` swaps to the `/static/` URL after error propagation. Covers Criterion 3 at CI level.
- **D-11:** Tighten the existing assertion in `src/components/__tests__/ChatSidebar.test.tsx:84` from `toContain('static-cdn.jtvnw.net/emoticons/v2/25')` to explicitly assert the `/static/` path segment — the fixture's `format: ['static']` should lock in the static URL choice at unit-test level.
- **D-12:** Criterion 1 (animation visibly plays on real webOS TV) is validated by a manual runtime check recorded in `07-VERIFICATION.md`. Open a channel with an active Twitch animated emote (e.g. `SoBayed`) on real hardware and confirm animation. Matches the v1.0 pattern of deferred-manual-check entries.

### Claude's Discretion
- Exact export names for the helper functions in `TwitchEmoteUrl.ts`.
- Whether to `console.debug` the fallback event for on-device diagnostics (leaning: silent — an expected 404 is not worth a log line).
- Precise shape of the component test (how error is dispatched via happy-dom).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements
- `.planning/ROADMAP.md` §"Phase 7: Twitch First-Party Animated Emotes" — goal, 4 success criteria, build-order rationale
- `.planning/REQUIREMENTS.md` §"Animated Emotes" EMOTE-01 — requirement this phase satisfies
- `.planning/PROJECT.md` §"Current Milestone: v1.1 polish" — always-on decision, no user-facing toggle

### Ground-truth code
- `src/components/ChatMessage.tsx:61` — the hardcoded `/static/dark/2.0` URL that this phase generalizes
- `src/types/chat.ts:1-11` — `MessageFragment.emote.format: string[]` contract already on the payload
- `src/components/__tests__/ChatSidebar.test.tsx:67-85` — existing emote render test (Test 2) with `format: ['static']` fixture; will be tightened per D-11
- `src/services/TwitchChannelService.ts` — existing pattern for pure service helpers (small module with named exports + co-located vitest file)

### External URL contract
- Twitch CDN emote URL template: `https://static-cdn.jtvnw.net/emoticons/v2/{id}/{format}/{theme_mode}/{scale}` where `{format}` ∈ {`static`, `animated`}. No external spec doc exists in this repo — the contract is encoded in ROADMAP.md §Phase 7 Success Criteria and the current `ChatMessage.tsx:61` URL. Researcher should confirm the URL shape against the Twitch documentation before planning.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/services/TwitchChannelService.ts`** — pattern for a small pure service module with named exports and a co-located vitest file; `TwitchEmoteUrl.ts` will follow the same shape.
- **Happy-dom vitest env** — existing emote tests (`EmoteService.test.ts`, `ChatSidebar.test.tsx`) use `// @vitest-environment happy-dom`; component test for D-10 can reuse the same setup.
- **`<img>` rendering path in `ChatMessage.tsx`** — only one render site to change; non-animated and animated flow through the same `<img>` element.

### Established Patterns
- **CSS Modules** — `ChatMessage.module.css` `.emote` class keeps `vertical-align: middle; display: inline-block;`. No CSS changes needed for Phase 7 — same sizing (`emoteSizePx()`), same alt text, same class.
- **Service-layer helpers stay DOM-free** — `EmoteService`, `TwitchChannelService`, and `TwitchEmoteUrl` (new) all return strings/data, not DOM. DOM concerns live in components.
- **Fragment-driven rendering** — `ChatMessage` iterates `props.message.fragments` with `<For>`; the `emote`-type branch is isolated from the `text`-type (third-party) branch. Phase 7 touches only the `emote` branch; Phase 8's third-party work goes into `EmoteService` + the text branch's `emoteMap` lookup, not here.

### Integration Points
- **`ChatMessage.tsx` emote render branch (lines 58-68)** — the single touchpoint for this phase. Import from new `TwitchEmoteUrl.ts`, swap the template-literal URL for a call to the helper, add `onerror` handler.
- **`ChatSidebar.test.tsx:84`** — tighten existing assertion per D-11 so the static/animated branches are locked at the unit-test level.

</code_context>

<specifics>
## Specific Ideas

- Minimal-blast-radius framing from ROADMAP.md build-order rationale is load-bearing: "a single hardcoded URL in `ChatMessage.tsx`" — the plan should reflect that and resist expanding scope.
- The fallback mechanism must be observable via an automated test (D-10). The phase cannot rely solely on real-TV validation for Criterion 3 because Criterion 3 is a negative ("no blank tile, no crash") that is hard to spot by eye.
- `SoBayed` is called out in ROADMAP.md as a known Twitch first-party animated emote; use it as the manual verification target per D-12.

</specifics>

<deferred>
## Deferred Ideas

- **Third-party animated parity (7TV/BTTV/FFZ)** — Phase 8. Do not edit `EmoteService.ts` for animated URL changes in Phase 7.
- **Animation pause when chat hidden / off-screen** — Phase 9 (PERF-01, PERF-02). In Phase 7, animated emotes loop with Chromium's default behavior.
- **In-memory cache of failed-animated emote IDs** — revisit only if Phase 9 measurements show it's worth the state (see D-05).
- **Parametrizing theme (light/dark) or scale on the helper** — no user-facing theme choice in v1.1; adding params is premature (see D-07).
- **Animated emote rendering in channel card previews** — tracked as EMOTE-05 (future requirement, beyond v1.1).
- **User-facing animation toggle** — tracked as EMOTE-06 (explicit v1.1 decision: always-on).
- **Animated badges / animated cheermotes** — out of scope per REQUIREMENTS.md §"Out of Scope".

</deferred>

---

*Phase: 07-twitch-first-party-animated-emotes*
*Context gathered: 2026-04-18*
