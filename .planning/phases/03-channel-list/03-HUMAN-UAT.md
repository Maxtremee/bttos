---
status: partial
phase: 03-channel-list
source: [03-VERIFICATION.md]
started: 2026-04-14T22:10:00Z
updated: 2026-04-14T22:10:00Z
---

## Current Test

[awaiting human testing]

## Tests

### HV-01: D-pad focus navigation between channel cards
- **Type:** behavioral
- **How to test:** Launch app on webOS TV or simulator. Navigate to Channels screen with followed live channels. Use D-pad left/right to move focus between cards in a row. Use D-pad up/down to move between rows.
- **Expected:** Purple focus ring moves between cards. Focus wraps or stops at grid boundaries.
- **Status:** untested

### HV-02: OK button triggers player navigation
- **Type:** behavioral
- **How to test:** Focus on a channel card and press OK on the TV remote.
- **Expected:** App navigates to `/player/{user_login}` for the focused channel.
- **Status:** untested

### HV-03: Auto-refresh shows newly-live channels
- **Type:** behavioral
- **How to test:** Open Channels screen. Have a followed channel go live (or use a test account). Wait 60+ seconds.
- **Expected:** New live channel appears in the grid without user interaction or page reload.
- **Status:** untested

### HV-04: No visual disruption during background refresh
- **Type:** visual
- **How to test:** While viewing the channel grid, wait for the 60-second auto-refresh. Observe the screen.
- **Expected:** Grid updates silently — no flicker, no loading spinner, no loss of focus position. Stale data remains visible until new data arrives.
- **Status:** untested
