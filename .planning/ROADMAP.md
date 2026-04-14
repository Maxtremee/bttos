# Roadmap: Twitch webOS Alt

## Overview

Six phases, each delivering a complete vertical capability. The app goes from a blank screen to a functional Twitch viewer: first the foundation runs on real TV hardware with remote navigation wired up; then auth lets users log in; then the channel list shows what's live; then playback delivers the stream; then chat renders over the top; finally settings and polish close out v1. Nothing works end-to-end until Phase 4 — that's intentional, because each phase is a prerequisite for the next.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - SolidJS app boots on webOS TV hardware with full D-pad spatial navigation
- [ ] **Phase 2: Authentication** - Users can log in via device code / QR flow and stay authenticated
- [ ] **Phase 3: Channel List** - Users see their live followed channels and navigate the grid with a remote
- [ ] **Phase 4: Stream Playback** - Users can select a channel and watch the live stream
- [ ] **Phase 5: Chat** - Read-only chat overlay renders over the stream with emotes
- [ ] **Phase 6: Settings & Polish** - Users can log out, adjust preferences, and the app handles edge cases cleanly

## Phase Details

### Phase 1: Foundation
**Goal**: A SolidJS app runs on real webOS TV hardware (Chromium 68) with spatial focus navigation fully wired to the D-pad
**Depends on**: Nothing (first phase)
**Requirements**: FNDN-01, FNDN-02
**Success Criteria** (what must be TRUE):
  1. App launches without errors on a real webOS TV (Chromium 68 target)
  2. D-pad up/down/left/right moves focus between focusable elements on screen
  3. OK button activates the focused element; Back button returns to the previous screen
  4. Focus state is visually distinct — user can always see what is selected
**Plans:** 3 plans

Plans:
- [x] 01-01-PLAN.md — Project scaffold: Vite 6 + SolidJS, chrome68 build target, vitest wired
- [x] 01-02-PLAN.md — Infrastructure: global CSS design tokens, navigation module, appinfo.json
- [x] 01-03-PLAN.md — App shell: MemoryRouter routing, 4 skeleton screens, Back key handler, ExitConfirmDialog

**UI hint**: yes

### Phase 2: Authentication
**Goal**: Users can log in to Twitch from the TV without a keyboard, stay authenticated across app launches, and be redirected to login when not authenticated
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. A device code and QR code appear on screen; user enters the code on phone/PC and the app advances automatically
  2. After logging in, the auth token persists — reopening the app goes directly to the channel list, not the login screen
  3. When an expired token is used, it refreshes silently without logging the user out or showing an error
  4. Opening the app without a stored token lands on the login screen, not a broken state
**Plans:** 4 plans

Plans:
- [x] 02-01-PLAN.md — Test scaffold: install happy-dom + uqr, switch vitest to happy-dom env, create test stubs
- [x] 02-02-PLAN.md — Auth service layer: TwitchAuthService (device code flow, token refresh singleton) + authStore
- [x] 02-03-PLAN.md — Login screen: full device code + QR UI replacing Phase 1 skeleton
- [x] 02-04-PLAN.md — Auth guard: AuthGuard layout component + App.tsx protected route wiring

**UI hint**: yes

### Phase 3: Channel List
**Goal**: Authenticated users see a navigable grid of their currently-live followed channels
**Depends on**: Phase 2
**Requirements**: CHAN-01, CHAN-02, CHAN-03
**Success Criteria** (what must be TRUE):
  1. Live followed channels appear in a grid showing thumbnail, stream title, game name, and viewer count
  2. D-pad navigation moves focus across the grid; OK on a channel card initiates playback
  3. The list auto-refreshes periodically — a channel that goes live appears without requiring app restart
**Plans**: TBD
**UI hint**: yes

### Phase 4: Stream Playback
**Goal**: Selecting a channel starts the live stream at the best available quality; errors are handled gracefully
**Depends on**: Phase 3
**Requirements**: PLAY-01, PLAY-02, PLAY-03, PLAY-04
**Success Criteria** (what must be TRUE):
  1. Selecting a channel from the grid starts video playback within a few seconds
  2. Stream plays at the highest quality the connection can sustain (ABR / auto quality)
  3. If the stream goes offline or the network drops, the player shows an informative message and does not freeze
  4. A stream info bar shows the channel name, stream title, game, and viewer count during playback
**Plans**: TBD

### Phase 5: Chat
**Goal**: A read-only chat overlay renders live Twitch chat — including native and third-party emotes — over the stream, and can be toggled
**Depends on**: Phase 4
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04
**Success Criteria** (what must be TRUE):
  1. Live chat messages appear in a scrolling overlay on top of the video
  2. Pressing the designated remote button toggles the chat overlay on and off without interrupting playback
  3. Twitch native emotes appear as images rather than text codes
  4. BTTV, 7TV, and FFZ emotes render as images in chat messages
**Plans**: TBD
**UI hint**: yes

### Phase 6: Settings & Polish
**Goal**: Users can log out and configure basic preferences; the app handles all v1 edge cases cleanly
**Depends on**: Phase 5
**Requirements**: SETT-01, SETT-02
**Success Criteria** (what must be TRUE):
  1. User can reach a settings screen from the main navigation and log out, returning to the login screen
  2. User can adjust at least one basic preference (e.g., chat position or auto-play behavior) from the settings screen
  3. All remote navigation paths are complete — no dead ends, no unresponsive buttons across the full app
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/3 | Not started | - |
| 2. Authentication | 0/4 | Not started | - |
| 3. Channel List | 0/? | Not started | - |
| 4. Stream Playback | 0/? | Not started | - |
| 5. Chat | 0/? | Not started | - |
| 6. Settings & Polish | 0/? | Not started | - |
