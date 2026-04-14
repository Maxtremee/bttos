# Feature Landscape

**Domain:** Alternative Twitch client for TV (lean-back viewer, webOS)
**Researched:** 2026-04-14
**Project scope:** Lean viewer — TV as display device, not interaction device

---

## Context: What This Project Is Not

Before listing features, it is critical to internalize the project's stated scope from PROJECT.md. This is NOT a full Twitch client. The user model is a tech-savvy viewer who manages their Twitch experience (follows, chat input, discovery) from phone or PC. The TV is purely a display device. This shapes every category below.

---

## Table Stakes

Features that users of any alternative Twitch TV client expect. Missing any of these and users will not adopt or will abandon the app.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Authentication (device code / QR flow) | No keyboard on TV; official app supports this; without auth, followed channels are inaccessible | Medium | Device Authorization Grant (OAuth 2.0) via Twitch API; QR code is optional polish on top |
| Followed live channels list | Primary navigation for any authenticated Twitch user; the entire use case of this app | Low-Medium | Twitch Helix API: `GET /streams/followed`; requires auth token |
| Live stream playback | The entire point of the app | High | Twitch does not expose HLS URLs through the official API; requires GQL `PlaybackAccessToken` mutation (unofficial, risk: see PITFALLS.md) or a proxy approach |
| Stream thumbnail / preview in channel list | Users need to identify what is on-screen before selecting | Low | Available as `thumbnail_url` in Helix followed streams response |
| Channel name, game name, viewer count in list | Core metadata for choosing which stream to watch | Low | All returned by `GET /streams/followed` |
| Basic playback controls | Play/pause, back to channel list; expected on any video app | Low | Standard HTML5 video element; remote D-pad maps to `keydown` events |
| Auto quality / adaptive bitrate | TV should just play the best quality it can; users do not want to manage this on TV | Medium | HLS player (hls.js) handles ABR automatically once you have the m3u8 master playlist |
| Chat overlay (read-only) | Core reason to prefer this over a Roku/Fire TV casting solution; Twitch without chat is incomplete for most users | High | IRC/WebSocket connection to `wss://irc-ws.chat.twitch.tv`; render chat messages overlaid on video |
| Chat toggle (on/off) | Chat can be distracting; users need to be able to hide it | Low | Local UI state toggle |
| Loading/buffering feedback | Without feedback, users think the app is frozen on slow webOS hardware | Low | HTML5 video `waiting`/`playing` events |
| Error states and recovery | Streams go offline; tokens expire; network drops | Medium | Must handle 404 from HLS endpoint gracefully, auto-retry on transient errors |
| Settings screen with logout | Required for multi-account households and to recover from broken auth state | Low | Clear stored OAuth token, return to login screen |

---

## Differentiators

Features that set this app apart from the official webOS Twitch app and from other alternatives. Not required to ship, but create competitive advantage.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Third-party emote rendering (BTTV / 7TV / FFZ) | The #1 complaint about official clients: they show emote text codes instead of images; tech-savvy Twitch viewers expect BTTV/7TV emotes | High | Fetch channel emote sets from BTTV API (`https://api.betterttv.net/3/cached/users/twitch/{userId}`) and 7TV API (`https://7tv.io/v3/users/twitch/{userId}`); replace text tokens in chat messages with `<img>` tags; global emote sets also needed |
| Chat text customization (font size, opacity, position) | TV viewers sit farther away; chat readability is a genuine problem | Low-Medium | CSS custom properties + settings screen; position as overlay percentage |
| Transparent/overlay chat style | Official app renders chat in a sidebar that wastes screen space; transparent overlay is standard in webOS alternatives (twitch-adfree-webos does this) | Low-Medium | CSS overlay with semi-transparent background; no layout shift |
| Manual quality selection | "Auto" sometimes picks wrong quality on constrained webOS hardware; power users want control | Medium | Parse m3u8 master playlist for named renditions (source, 720p60, 480p, etc.); present in settings or a quick toggle |
| Viewer count display during playback | Social presence signal; common in SmartTwitchTV and similar apps | Low | Poll `GET /streams?user_login={channel}` every 60s; display in overlay |
| Stream title and game during playback | Context while watching; avoids having to exit stream to see what game is being played | Low | Already available from the initial stream data; display in a dismissable info bar |
| Low-latency mode indicator | Streamlink and SmartTwitchTV both surface this; it is a mild differentiator for the subset of users who care | Low | Detect `#EXT-X-TWITCH-INFO` tag in HLS manifest; `LOW-LATENCY=true` or similar |
| Keyboard shortcut / remote shortcuts | Assigned number keys for quick navigation (twitch-adfree-webos does this); speeds up navigation for frequent users | Low | webOS key event mapping; requires testing on real hardware |
| Channel points auto-claim | twitch-adfree-webos implements this; visible indicator that points were claimed | Medium | Requires monitoring chat IRC messages for `PRIVMSG` with `custom-reward-id` or a dedicated EventSub subscription; borderline ToS area |

---

## Anti-Features

Things to deliberately NOT build, with rationale. These protect scope, performance, and project viability.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Chat input / sending messages | TV remote is not a chat input device; phone/PC handles this for the target user; implementing on-screen keyboard is large scope | State this clearly in the UI ("Chat view only"); no text input fields |
| Channel discovery / category browsing | Phone/PC is better for this; building a full browse UI requires significant API work (categories, search, pagination) and adds navigation complexity on a remote-only device | Show followed live channels only; if a user wants to browse, they open Twitch on their phone |
| Follow / unfollow channels | Account management belongs on phone/PC; implementing write operations adds OAuth scope requirements and risk | Read-only; no follow/unfollow buttons in the UI |
| VOD and clip playback | Increases scope significantly; requires separate playback pipeline; project explicitly calls this out of scope for v1 | Live streams only for v1 |
| Multistream / picture-in-picture | SmartTwitchTV has this; it is a power feature that requires significant UI and performance investment; wrong for lean-back TV viewing | Single stream at a time |
| Notifications / push alerts when channel goes live | webOS apps cannot run in background; persistent notification service would require a separate server component | Followed channels list refreshes on app open; no push notifications |
| Channel management (sub, gift subs, raids) | Streamer tooling; wrong device for this | Not in scope; no streamer-facing UI |
| Ad insertion / ad management | Twitch server-side ad injection is complex; blocking is a legal grey area; attempting it adds instability | If ads play, they play; do not actively block or inject |
| Animated emote rendering (initially) | Animated GIFs and WebP in scrolling chat can cause significant performance degradation on low-end webOS hardware (Xtra for Android had overheating issues from this) | Start with static emote images only; add animated emotes as an opt-in setting after performance validation on real hardware |
| On-screen keyboard for search | Requires substantial accessibility work for remote navigation; wrong input paradigm for this project | Users type channel names on phone/PC and navigate to followed channels on TV |

---

## Feature Dependencies

The following chain must be understood when planning phase order. Each line means "right side requires left side first."

```
Auth (OAuth device flow)
  --> Followed channels list (requires access token)
    --> Stream playback (requires channel name from list + access token for PlaybackAccessToken GQL)
      --> Chat overlay (requires IRC connection + channel name from stream context)
        --> Third-party emote rendering (requires chat overlay + per-channel emote API calls)
          --> Animated emote support (requires emote rendering + performance validation)

Stream playback
  --> Manual quality selection (requires parsed m3u8 with named renditions)

Chat overlay
  --> Chat customization (font size / position / opacity) — UI only, no new APIs
```

---

## MVP Recommendation

The minimum viable product that delivers the stated core value ("user can log in, see followed channels, pick one, watch with chat — fast and reliably"):

**Must ship in MVP:**
1. Authentication via device code flow (OAuth 2.0)
2. Followed live channels list with thumbnail, title, game, viewer count
3. Stream playback (HLS via GQL access token + hls.js)
4. Read-only chat overlay, toggleable
5. Auto quality (ABR via hls.js — no manual quality selection needed)
6. Settings screen with logout
7. Graceful error states (stream offline, auth expired, network error)

**Defer but worth building next:**
- Third-party emotes (BTTV global, 7TV global; channel-specific second)
- Chat font size and opacity customization
- Manual quality selection (especially important for low-end hardware)
- Stream info bar (title, game) during playback

**Explicitly out of scope for this project:**
- Everything in the Anti-Features section above
- Category browsing, VODs, clips, chat input, follow management

---

## API Surface Required for MVP

| Feature | API / Protocol | Auth Required |
|---------|---------------|---------------|
| Device code login | `POST /oauth2/device` + `POST /oauth2/token` | Client ID only |
| Followed live channels | `GET /helix/streams/followed` | User access token |
| Stream playback URL | GQL `PlaybackAccessToken` mutation (unofficial) | Client ID + user token |
| HLS playlist + playback | `https://usher.twitnw.net/api/channel/hls/{login}.m3u8` | Access token as query param |
| Chat messages | `wss://irc-ws.chat.twitch.tv` (IRC over WebSocket) | Anonymous or user token |
| BTTV channel emotes | `https://api.betterttv.net/3/cached/users/twitch/{id}` | None |
| BTTV global emotes | `https://api.betterttv.net/3/cached/emotes/global` | None |
| 7TV channel emotes | `https://7tv.io/v3/users/twitch/{id}` | None |
| 7TV global emotes | `https://7tv.io/v3/emote-sets/global` | None |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Table stakes (core features) | HIGH | Consistent across all researched clients (SmartTwitchTV, Xtra, Frosty, twitch-adfree-webos) and official app complaints |
| Third-party emotes | HIGH | APIs are stable, well-documented by community; libraries exist (twitch-emoticons, emoteTTV) |
| Stream playback mechanism | MEDIUM | GQL PlaybackAccessToken approach is unofficial and Twitch has restricted it before; this is the highest-risk technical dependency — see PITFALLS.md |
| IRC chat connection | HIGH | Official Twitch IRC documentation exists; WebSocket transport is standard; migration to EventSub noted but IRC still works |
| Anti-features rationale | HIGH | Scope exclusions align with PROJECT.md; animated emote performance risk is documented (Xtra changelog) |

---

## Sources

- GitHub: [crackededed/Xtra](https://github.com/crackededed/Xtra/) — third-party Android Twitch client
- GitHub: [fgl27/SmartTwitchTV](https://github.com/fgl27/SmartTwitchTV) — Android TV / web Twitch client
- GitHub: [adamff-dev/twitch-adfree-webos](https://github.com/adamff-dev/twitch-adfree-webos) — webOS-specific Twitch alternative
- GitHub: [TBSniller/twitch-webos](https://github.com/TBSniller/twitch-webos) — archived webOS Twitch client
- [Frosty for Twitch](https://frostyapp.io/) — iOS/Android client with BTTV/FFZ/7TV
- [Twitch IRC migration docs](https://dev.twitch.tv/docs/chat/irc-migration/) — official Twitch documentation
- [Twitch UserVoice: LG webOS chat pinning](https://twitch.uservoice.com/forums/310225-twitch-applications-tv-apps/suggestions/41734411-on-the-lg-webos-app-make-it-so-the-twitch-chat-do) — user complaints about official app
- [twitch-emoticons npm](https://www.npmjs.com/package/@mkody/twitch-emoticons) — emote fetching library
- [StreamEmote BTTV/FFZ/7TV guide](https://streamemote.com/blog/bttv-ffz-7tv-guide/) — emote API overview
- [GQL PlaybackAccessToken docs](https://kawcco.com/twitch-graphql-api/playbackaccesstoken.doc.html) — unofficial GQL documentation
