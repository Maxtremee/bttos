# Phase 2: Authentication - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can log in to Twitch from the TV without a keyboard, stay authenticated across app launches, and be redirected to login when not authenticated. This phase replaces the LoginScreen skeleton with a working device code + QR auth flow, implements token persistence and refresh, and adds an auth guard to protect routes.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation decisions for this phase are deferred to Claude's discretion based on research findings. The requirements (AUTH-01 through AUTH-05) and research are sufficiently specific:

- **Login screen layout:** Device code prominently displayed (Display 48px per UI-SPEC), QR code alongside, polling indicator while waiting — standard TV auth pattern
- **Token management:** localStorage for persistence (webOS persists across app launches), automatic silent refresh with promise-deduplication singleton (per research recommendation)
- **Auth guard:** Route-level guard that redirects to /login if no valid token, redirects to /channels after successful auth
- **Polling UX:** Poll Twitch's token endpoint during device code flow, show status to user, handle expiry gracefully
- **Error handling:** Network errors, expired codes, invalid tokens — show informative messages with retry options
- **QR code generation:** Client-side QR code library to render the verification URL as a scannable code

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` — Project vision, constraints
- `.planning/REQUIREMENTS.md` — AUTH-01 through AUTH-05 requirements

### Research findings
- `.planning/research/STACK.md` — Twitch Device Code Flow details, OAuth scopes (user:read:follows), Public client type
- `.planning/research/ARCHITECTURE.md` — TwitchAuthService design, AuthStore, token refresh singleton with promise deduplication
- `.planning/research/PITFALLS.md` — OAuth refresh token race condition, token single-use refresh

### Phase 1 foundation
- `src/screens/LoginScreen.tsx` — Existing skeleton to replace with working auth UI
- `src/App.tsx` — Router and route definitions where auth guard will be added
- `src/navigation/index.ts` — Spatial nav module for focusable elements on login screen
- `src/styles/global.css` — Design tokens (Display 48px for device code, accent color for CTA)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `LoginScreen.tsx` — Skeleton screen with basic Focusable button, ready to be replaced with full auth UI
- `src/navigation/index.ts` — Spatial nav already wired, login screen can use Focusable components
- `src/styles/global.css` — CSS custom properties for typography (--font-display: 48px for device code), colors, spacing

### Established Patterns
- SolidJS signals/stores for state management (no external state library)
- MemoryRouter with `createMemoryHistory` for navigation
- `onMount` + `setFocus()` pattern for screen focus initialization
- Global keydown handler in App.tsx for Back key

### Integration Points
- App.tsx routes — auth guard wraps protected routes (/channels, /player, /settings)
- MemoryRouter history — navigate to /channels after successful auth
- Future phases (3-6) depend on auth token being available for API calls

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond research recommendations — open to standard approaches. Key constraints from research:
- Twitch Device Code Flow is officially documented and purpose-built for TV/limited-input devices
- Use Public client type (no client_secret needed)
- Only scope needed for MVP: `user:read:follows`
- Token refresh singleton with promise deduplication must exist before any API service is built (Phase 3+ dependency)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-authentication*
*Context gathered: 2026-04-14*
