# Phase 6: Settings & Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-15
**Phase:** 06-settings-polish
**Areas discussed:** Navigation to settings, Preferences scope, Logout flow

---

## Navigation to settings

| Option | Description | Selected |
|--------|-------------|----------|
| Gear icon in header | Focusable gear icon in the top-right of the Channels screen header. D-pad up from the grid reaches it. | ✓ (combined) |
| Dedicated remote button | Map Green button to open settings from any screen. No on-screen element needed. | ✓ (combined) |
| Menu row below header | A horizontal nav bar (Live Channels / Settings) at the top of the screen. | |

**User's choice:** Combine gear icon (primary) + Green button (shortcut)
**Notes:** User wanted both options combined — gear icon as the visible UI element, Green button as a shortcut.

| Option | Description | Selected |
|--------|-------------|----------|
| Any screen (navigate away) | Green button opens settings from channels, player, or any other screen. Playback pauses/stops. | |
| Channels only | Green button only works on the channels screen. | |
| Overlay on player | Settings displayed as overlay on player screen so stream keeps playing. | ✓ |

**User's choice:** Green button works on all screens, but on the player it shows an overlay instead of navigating away
**Notes:** User explicitly said "stream keeps playing and user isn't redirected and annoyed" — this was a custom answer combining the options.

---

## Preferences scope

| Option | Description | Selected |
|--------|-------------|----------|
| Chat default visibility | Whether chat sidebar shows by default when entering a stream (on/off toggle) | ✓ |
| Chat position | Left side or right side of the video | ✓ |
| Chat text size default | Default text size for chat (small/medium/large) | |
| You decide | Claude picks a sensible minimal set | |

**User's choice:** Chat default visibility + Chat position
**Notes:** Two focused preferences that satisfy SETT-02.

| Option | Description | Selected |
|--------|-------------|----------|
| Persist via localStorage | Preferences saved to localStorage like auth tokens | ✓ |
| Session only | Preferences reset to defaults each launch | |

**User's choice:** Persist via localStorage

| Option | Description | Selected |
|--------|-------------|----------|
| Settings only | Chat position configured in settings, applied globally | ✓ |
| Also live toggle | Add a remote button to flip chat left/right during playback | |

**User's choice:** Settings only — no live toggle for chat position

| Option | Description | Selected |
|--------|-------------|----------|
| Same as full settings | Overlay shows all preferences + logout | |
| Player-relevant only | Overlay shows only chat preferences | ✓ |
| You decide | Claude picks | |

**User's choice:** Player-relevant only (chat preferences in overlay, full settings on channels screen)

---

## Logout flow

| Option | Description | Selected |
|--------|-------------|----------|
| Confirm first | Show 'Are you sure?' dialog before clearing tokens and redirecting to login | ✓ |
| Immediate logout | Press Log Out, tokens cleared, redirect instantly | |
| You decide | Claude picks the standard TV app pattern | |

**User's choice:** Confirm first

| Option | Description | Selected |
|--------|-------------|----------|
| Clear locally only | Remove tokens from localStorage and redirect to login | ✓ |
| Revoke via API + clear | Call Twitch's token revocation endpoint, then clear localStorage | |
| You decide | Claude picks based on Twitch best practices | |

**User's choice:** Clear locally only — no API revocation call

---

## Claude's Discretion

- Confirmation dialog visual design and button labels
- Gear icon visual style
- Settings screen layout and toggle control styling
- Player settings overlay design
- Preferences store implementation
- Navigation polish (no dead ends audit)
- Green button keyCode mapping

## Deferred Ideas

None — discussion stayed within phase scope
