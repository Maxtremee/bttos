# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 01-foundation
**Areas discussed:** App structure

---

## Gray Area Selection

| Area | Description | Selected |
|------|-------------|----------|
| Visual theme | Dark/light mode, color palette, typography for 10-foot TV UI | |
| Navigation feel | Focus indicator style, transition speed, spatial nav behavior | |
| App structure | Router vs conditional rendering, screen transitions, Back button | ✓ |
| Dev workflow | Simulator vs real TV, hot reload, deployment script | |

---

## App Structure

### Screen Organization

| Option | Description | Selected |
|--------|-------------|----------|
| MemoryRouter | SolidJS router with in-memory history — proper route components, clean separation (research recommended) | ✓ |
| Conditional render | Single component with signal-based screen switching — simpler, no router dependency | |
| You decide | Claude picks the best approach for TV apps | |

**User's choice:** MemoryRouter
**Notes:** Research recommended this approach; user agreed.

### Screen Transitions

| Option | Description | Selected |
|--------|-------------|----------|
| Instant swap | No animation — screens switch immediately (simplest, best performance) | ✓ |
| Fade transition | Quick fade between screens (subtle, low overhead) | |
| You decide | Claude picks based on TV performance constraints | |

**User's choice:** Instant swap
**Notes:** None

### Back Button on Root Screen

| Option | Description | Selected |
|--------|-------------|----------|
| Exit app | Back on root exits the app entirely | |
| Confirm exit | Show a "Press again to exit" prompt before closing | |
| You decide | Claude picks the standard TV pattern | ✓ |

**User's choice:** You decide (Claude's discretion)
**Notes:** User deferred to standard TV app pattern.

---

## Claude's Discretion

- Back button behavior on root screen
- Visual theme (dark mode, palette, typography)
- Focus indicator styling
- Spatial navigation library choice
- Dev workflow setup

## Deferred Ideas

None
