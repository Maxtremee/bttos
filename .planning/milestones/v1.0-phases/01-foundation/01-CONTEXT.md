# Phase 1: Foundation - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

SolidJS app runs on real webOS TV hardware (Chromium 68) with spatial focus navigation fully wired to the D-pad. This phase delivers the project scaffold, build pipeline targeting webOS, app shell with routing, global key handling, and spatial navigation — no features yet.

</domain>

<decisions>
## Implementation Decisions

### App structure
- **D-01:** Use `@solidjs/router` with `MemoryRouter` for screen management — proper route components for Login, Channels, Player, Settings
- **D-02:** Instant screen swaps, no transition animations — simplest approach and best performance on TV hardware
- **D-03:** Back button behavior on root screen — Claude's discretion to pick the standard TV app pattern (likely confirm-before-exit)

### Claude's Discretion
- Back button behavior on root screen (standard TV pattern)
- Visual theme (dark mode, color palette, typography) — can be established during implementation
- Focus indicator styling — choose something visible and consistent
- Spatial navigation library choice (js-spatial-navigation vs custom SolidJS wrapper)
- Dev workflow setup (simulator vs real TV testing, hot reload)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` — Project vision, constraints (SolidJS, webOS, remote-only navigation)
- `.planning/REQUIREMENTS.md` — FNDN-01 (runs on webOS Chromium 68+), FNDN-02 (fully navigable with TV remote)

### Research findings
- `.planning/research/STACK.md` — SolidJS 1.9.x, Vite 6 with `base: './'` and `build.target: ['chrome68']`, webOS CLI tooling
- `.planning/research/ARCHITECTURE.md` — App shell structure, MemoryRouter recommendation, spatial navigation approach
- `.planning/research/PITFALLS.md` — Chromium version targeting, `base: './'` is mandatory, focus management as first-class system

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None — patterns will be established in this phase

### Integration Points
- This phase creates the foundation all subsequent phases build on
- App shell and router structure must accommodate: auth guard (Phase 2), channel grid (Phase 3), video player (Phase 4), chat overlay (Phase 5), settings (Phase 6)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Research recommends:
- Vite 6 + vite-plugin-solid with `base: './'` (mandatory for webOS `file://` origin)
- `build.target: ['chrome68']` for webOS 5.x compatibility
- `appinfo.json` manifest for webOS packaging
- `@webosose/ares-cli` for deployment to TV

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-14*
