# Phase 6: Settings & Polish - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can log out, configure basic preferences (chat visibility and position), and all navigation paths are complete with no dead ends. This phase replaces the SettingsScreen skeleton with a working settings screen, adds a settings overlay for the player screen, creates a preferences store, and wires up the gear icon and Green button shortcut for settings access.

</domain>

<decisions>
## Implementation Decisions

### Navigation to settings
- **D-01:** Gear icon in the Channels screen header (top-right area) as the primary navigation path to settings. D-pad up from the channel grid reaches it.
- **D-02:** Green remote button as a global shortcut to open settings from any screen.
- **D-03:** On the Channels screen, Green button navigates to the full `/settings` route.
- **D-04:** On the Player screen, Green button opens a settings overlay on top of the video — stream keeps playing underneath. User is NOT redirected away from playback.

### Preferences scope
- **D-05:** Two preferences for v1: chat default visibility (on/off toggle — whether chat sidebar shows by default when entering a stream) and chat position (left/right side of the video).
- **D-06:** Preferences persist via localStorage across app restarts — consistent with the existing auth token persistence pattern.
- **D-07:** Chat position is configurable only from settings, not via a live toggle during playback. (Chat width/text size already have yellow/blue button live controls.)
- **D-08:** The player settings overlay shows only chat-related preferences (visibility, position). Full settings (all preferences + logout) are only available on the full settings screen accessible from the channels screen.

### Logout flow
- **D-09:** Logout requires a confirmation dialog ("Are you sure?") before clearing tokens — prevents accidental logout.
- **D-10:** On confirm, clear all tokens from localStorage only (no Twitch API token revocation call). Redirect to `/login` after clearing.

### Claude's Discretion
- Confirmation dialog visual design and button labels
- Gear icon visual style (icon choice, size, color)
- Settings screen layout (list of options, toggle controls styling)
- Player settings overlay visual design (position, background opacity, animation)
- Preferences store implementation details (SolidJS store pattern)
- Navigation polish — ensuring all remote navigation paths have no dead ends across all screens (success criteria #3)
- Green button keyCode mapping for webOS remote

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` — Project vision, constraints (SolidJS, webOS, remote-only navigation)
- `.planning/REQUIREMENTS.md` — SETT-01 (logout from settings), SETT-02 (basic preferences)
- `CLAUDE.md` — Tech stack details, spatial navigation library, design constraints

### Phase 1-5 foundation
- `src/screens/SettingsScreen.tsx` — Existing skeleton to replace with working settings screen
- `src/screens/ChannelsScreen.tsx` — Channels screen where gear icon will be added to header
- `src/screens/PlayerScreen.tsx` — Player screen where settings overlay and chat preference integration will be added
- `src/App.tsx` — Router with `/settings` route already inside AuthGuard, global keydown handler for Back key (Green button handler goes here)
- `src/stores/authStore.ts` — Auth state store (token, refreshToken, userId) — logout clears these
- `src/services/TwitchAuthService.ts` — Token management service
- `src/navigation/index.ts` — Spatial navigation module (Focusable, useSpatialNavigation)
- `src/styles/global.css` — Design tokens (colors, spacing, typography, focus ring)
- `src/components/ChatSidebar.tsx` — Chat sidebar component that will consume preferences (visibility, position)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SettingsScreen.tsx` — Skeleton with a single "Log Out" Focusable button, ready for replacement
- `Focusable` component + `useSpatialNavigation()` — D-pad focus management for settings controls
- `authStore` + `setAuthStore` — Reactive auth state; logout will call `setAuthStore` to clear all fields
- CSS custom properties — Full dark theme design token system for consistent styling
- `ChatSidebar` component — Already accepts `width` and `scale` props; will need `position` and `visible` integration

### Established Patterns
- SolidJS signals/stores for state management (no external state library)
- `createStore` from `solid-js/store` for structured reactive state (used in authStore)
- `onMount` + `setFocus()` pattern for screen focus initialization
- localStorage for persistence (auth tokens pattern — reuse for preferences)
- Global keydown handler in App.tsx for Back key (extend for Green button)
- `createMemoryHistory` + `history.set()` for navigation

### Integration Points
- `App.tsx` global keydown handler — Add Green button (keyCode TBD) to open settings
- `ChannelsScreen.tsx` header — Add gear icon with Focusable wrapper
- `PlayerScreen.tsx` — Add settings overlay component, integrate chat preferences (position, default visibility)
- `chatWidth` signal in PlayerScreen — Chat preferences will interact with existing chat width/scale controls
- `/login` route — Logout redirects here after clearing tokens

</code_context>

<specifics>
## Specific Ideas

- Player settings overlay must not interrupt video playback — overlay renders on top of the playing stream
- Chat sidebar already has yellow/blue button width scaling — preferences add position (left/right) and default visibility (on/off) as complementary controls
- Existing `chatWidth` signal starts at 260px — preferences don't override the live scaling, just set defaults

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-settings-polish*
*Context gathered: 2026-04-15*
