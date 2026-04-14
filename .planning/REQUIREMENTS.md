# Requirements: Twitch webOS Alt

**Defined:** 2026-04-14
**Core Value:** User can log in, see their followed channels, pick one, and watch the stream with chat — fast and reliably on webOS TV hardware.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can authenticate via Twitch device code flow (code shown on TV, entered on phone/PC)
- [ ] **AUTH-02**: QR code displayed alongside device code for faster auth
- [ ] **AUTH-03**: Auth tokens persist across app launches via localStorage
- [ ] **AUTH-04**: Tokens refresh automatically and transparently when expired
- [ ] **AUTH-05**: Unauthenticated users are redirected to login screen

### Channel List

- [ ] **CHAN-01**: User sees a grid of followed channels that are currently live (thumbnail, title, game, viewer count)
- [ ] **CHAN-02**: User can navigate the channel grid with D-pad remote
- [ ] **CHAN-03**: Channel list auto-refreshes periodically to show newly live channels

### Stream Playback

- [ ] **PLAY-01**: User can select a channel and watch the live stream
- [ ] **PLAY-02**: Stream plays at automatically selected best quality (ABR)
- [ ] **PLAY-03**: Playback recovers gracefully from errors (stream offline, network drops)
- [ ] **PLAY-04**: Stream info bar shows title, game, and viewer count during playback

### Chat

- [ ] **CHAT-01**: Read-only Twitch chat overlay displayed during stream playback
- [ ] **CHAT-02**: User can toggle chat overlay on/off with remote
- [ ] **CHAT-03**: Twitch native emotes rendered as images in chat
- [ ] **CHAT-04**: BTTV, 7TV, and FFZ third-party emotes rendered in chat

### Settings

- [ ] **SETT-01**: User can log out from settings screen
- [ ] **SETT-02**: User can access basic preferences from settings

### Foundation

- [ ] **FNDN-01**: App loads and runs on real webOS TV hardware (Chromium 68+)
- [ ] **FNDN-02**: App is fully navigable with a standard TV remote (D-pad + OK + Back)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Playback Enhancements

- **PLAY-05**: User can manually select stream quality (360p, 720p, 1080p, etc.)
- **PLAY-06**: Low-latency mode for competitive viewing

### Chat Enhancements

- **CHAT-05**: User can adjust chat overlay opacity
- **CHAT-06**: User can adjust chat font size
- **CHAT-07**: Animated emotes rendered (GIF/WEBP)

### Channel List Enhancements

- **CHAN-04**: Offline followed channels shown greyed out below live channels

### Deployment

- **DEPL-01**: App packaged as .ipk for easy sideloading
- **DEPL-02**: Homebrew Channel integration for permanent installation

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Chat input / sending messages | TV is a display device; users chat from phone/PC |
| Channel discovery / browsing categories | Users rely on phone/PC for discovery |
| Follow/unfollow management | Managed on other devices |
| VOD / clip playback | Live streams only — different playback pipeline |
| User profiles / account management | Managed on Twitch directly |
| Multistream / picture-in-picture | High complexity, niche use case |
| Push notifications | webOS background services add complexity; not needed for lean viewer |
| OAuth via username/password | Device code flow is the correct TV pattern |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| AUTH-05 | Phase 2 | Pending |
| CHAN-01 | Phase 3 | Pending |
| CHAN-02 | Phase 3 | Pending |
| CHAN-03 | Phase 3 | Pending |
| PLAY-01 | Phase 4 | Pending |
| PLAY-02 | Phase 4 | Pending |
| PLAY-03 | Phase 4 | Pending |
| PLAY-04 | Phase 4 | Pending |
| CHAT-01 | Phase 5 | Pending |
| CHAT-02 | Phase 5 | Pending |
| CHAT-03 | Phase 5 | Pending |
| CHAT-04 | Phase 5 | Pending |
| SETT-01 | Phase 6 | Pending |
| SETT-02 | Phase 6 | Pending |
| FNDN-01 | Phase 1 | Pending |
| FNDN-02 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-14*
*Last updated: 2026-04-14 after roadmap creation*
