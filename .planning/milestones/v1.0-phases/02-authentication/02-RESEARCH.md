# Phase 2: Authentication - Research

**Researched:** 2026-04-14
**Domain:** Twitch OAuth Device Code Flow, token persistence, auth guard, QR code generation
**Confidence:** HIGH (core flow verified against official Twitch docs; QR library choice MEDIUM)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
All implementation decisions for this phase are deferred to Claude's discretion based on research
findings. The requirements (AUTH-01 through AUTH-05) and research are sufficiently specific:

- **Login screen layout:** Device code prominently displayed (Display 48px per UI-SPEC), QR code
  alongside, polling indicator while waiting — standard TV auth pattern
- **Token management:** localStorage for persistence (webOS persists across app launches),
  automatic silent refresh with promise-deduplication singleton (per research recommendation)
- **Auth guard:** Route-level guard that redirects to /login if no valid token, redirects to
  /channels after successful auth
- **Polling UX:** Poll Twitch's token endpoint during device code flow, show status to user,
  handle expiry gracefully
- **Error handling:** Network errors, expired codes, invalid tokens — show informative messages
  with retry options
- **QR code generation:** Client-side QR code library to render the verification URL as a
  scannable code

### Claude's Discretion
All implementation decisions are at Claude's discretion within the above constraints.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can authenticate via Twitch device code flow (code shown on TV, entered on phone/PC) | Device Code Flow endpoints, request/response format, polling logic — fully documented below |
| AUTH-02 | QR code displayed alongside device code for faster auth | `uqr` library — zero-dep, SVG output, ~79KB unpacked, no canvas needed |
| AUTH-03 | Auth tokens persist across app launches via localStorage | localStorage schema design, webOS persistence confirmed; 16MB limit per official LG docs |
| AUTH-04 | Tokens refresh automatically and transparently when expired | Refresh token grant — no client_secret needed for Public apps; promise-dedup singleton pattern |
| AUTH-05 | Unauthenticated users are redirected to login screen | Auth guard as layout component wrapping protected routes — `<Outlet>` pattern with `useNavigate` |
</phase_requirements>

---

## Summary

Phase 2 implements Twitch authentication without a keyboard using the Device Code Grant Flow —
the officially recommended pattern for TV and limited-input devices. The flow involves requesting
a short code from Twitch, displaying it (plus a QR code) on screen, polling until the user
completes auth on another device, then storing the resulting tokens in localStorage.

Token refresh uses a promise-deduplication singleton to prevent the race condition where multiple
concurrent requests each consume the single-use refresh token and cascade into 401 loops. This
singleton must be built before any API services (Phases 3+) are written, as it is a shared
dependency.

The auth guard pattern in `@solidjs/router` uses a layout component wrapping protected routes:
on mount it reads from `AuthStore`, redirects to `/login` if no valid token, and renders
`<Outlet />` (the protected child route) if authenticated. The existing `MemoryRouter` +
`createMemoryHistory` wiring in `App.tsx` supports this without changes to the router setup.

**Primary recommendation:** Build `TwitchAuthService` (device code flow + token refresh
singleton) and `AuthStore` first, then wire the auth guard into `App.tsx`, then replace
`LoginScreen.tsx` with the full auth UI.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@solidjs/router` | ^0.16.1 (installed) | Route-level auth guard | Already installed; `useNavigate` + `<Outlet>` is the idiomatic pattern |
| solid-js | ^1.9.12 (installed) | `createStore`, `createContext`, `createSignal` for AuthStore | Already installed, project standard |
| `uqr` | 0.1.3 | QR code generation — SVG output, zero deps | Zero dependencies, ES module, ~79KB unpacked, outputs SVG string directly, no canvas requirement — safe on Chromium 68 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Built-in `fetch` | — | HTTP calls to `id.twitch.tv` | Chromium 68 has native `fetch`; no polyfill needed |
| `localStorage` | — | Token persistence | webOS persists across launches; 16MB limit (LG official) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `uqr` | `qrcode` (1.5.4) | `qrcode` is larger (135KB unpacked), has `pngjs` / `yargs` / `dijkstrajs` dependencies, ships a `browser` field that avoids canvas but still heavier than needed |
| `uqr` | `qrcode-svg` (1.1.0) | Node-centric, smaller community, no ES module export |
| `uqr` | Manual SVG construction | QR error-correction encoding is not trivial to hand-roll; use the library |

**Installation:**

```bash
npm install uqr
```

**Version verification:**

```
uqr: 0.1.3 (verified npm registry 2026-04-14, 79278 bytes unpacked)
qrcode: 1.5.4 (verified, rejected — too heavy, unnecessary deps)
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── services/
│   └── TwitchAuthService.ts   # Device code flow + token refresh singleton
├── stores/
│   └── authStore.ts           # SolidJS store — token, userId, expiry; createContext
├── screens/
│   └── LoginScreen.tsx        # Replace skeleton with full auth UI (device code + QR)
├── components/
│   └── AuthGuard.tsx          # Layout component wrapping protected routes
├── navigation/
│   └── index.ts               # Already exists — no changes needed
└── App.tsx                    # Add AuthGuard wrapper around /channels, /player, /settings
```

### Pattern 1: Twitch Device Code Flow

**What:** Two-step HTTP dance — request device code, then poll for access token.

**Step 1 — Request device code:**

```typescript
// Source: https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#device-code-grant-flow
// POST https://id.twitch.tv/oauth2/device
// Content-Type: application/x-www-form-urlencoded
// Body params: client_id, scope

const response = await fetch('https://id.twitch.tv/oauth2/device', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: CLIENT_ID,
    scope: 'user:read:follows user:read:chat',
  }),
})
const data = await response.json()
// data: { device_code, user_code, verification_uri, expires_in, interval }
```

**Step 2 — Poll for token:**

```typescript
// POST https://id.twitch.tv/oauth2/token
// grant_type: urn:ietf:params:oauth:grant-type:device_code

const poll = await fetch('https://id.twitch.tv/oauth2/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: CLIENT_ID,
    device_code: deviceCode,
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    scope: 'user:read:follows user:read:chat',
  }),
})
// 200: { access_token, refresh_token, token_type: 'bearer', expires_in, scope }
// 400 + message "authorization_pending": keep polling at `interval` seconds
// 400 + message "invalid device code": code used or expired — restart flow
```

**Polling loop design:**

```typescript
// [ASSUMED] Polling with interval from response
let intervalId: ReturnType<typeof setInterval>

function startPolling(deviceCode: string, intervalSecs: number, expiresIn: number) {
  const expiresAt = Date.now() + expiresIn * 1000
  intervalId = setInterval(async () => {
    if (Date.now() >= expiresAt) {
      clearInterval(intervalId)
      onExpired()
      return
    }
    const result = await pollToken(deviceCode)
    if (result.access_token) {
      clearInterval(intervalId)
      onSuccess(result)
    }
    // authorization_pending: do nothing, let interval fire again
    // invalid device code: clearInterval, call onExpired()
  }, intervalSecs * 1000)
}
```

### Pattern 2: Token Refresh Singleton with Promise Deduplication

**What:** A single in-flight promise for token refresh. Any concurrent caller receives the same
promise rather than issuing a second HTTP request.

**When to use:** Always — refresh token is single-use. A second concurrent refresh call against
the same refresh token will invalidate it, causing a 401 cascade that logs the user out.

```typescript
// Source: pattern from PITFALLS.md Pitfall 6 — verified against Twitch refresh token docs
// [CITED: https://dev.twitch.tv/docs/authentication/refresh-tokens/]

class TwitchAuthService {
  private refreshPromise: Promise<void> | null = null

  async refreshTokens(): Promise<void> {
    // Deduplication: return existing promise if refresh already in flight
    if (this.refreshPromise) return this.refreshPromise

    this.refreshPromise = this._doRefresh().finally(() => {
      this.refreshPromise = null
    })
    return this.refreshPromise
  }

  private async _doRefresh(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) throw new Error('No refresh token')

    const res = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        // No client_secret: Public client apps do not need it
        // [CITED: https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/]
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    if (!res.ok) {
      // Refresh failed — token invalid or expired; must re-authenticate
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      // Redirect to /login handled by caller or auth guard
      throw new Error('Refresh failed')
    }

    const data = await res.json()
    // Write new refresh_token LAST — if process dies mid-write, access_token may be stale
    // but refresh_token is still valid
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('expires_at', String(Date.now() + data.expires_in * 1000))
    localStorage.setItem('refresh_token', data.refresh_token)
    // Update AuthStore
    setAuthStore({ token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 })
  }
}
```

### Pattern 3: Auth Guard as Layout Component

**What:** A SolidJS layout component that checks auth state on mount and redirects to `/login`
if the user is unauthenticated. Protected routes are nested inside it as `<Outlet />`.

**When to use:** Wraps `/channels`, `/player/:channel`, `/settings` routes in `App.tsx`.

```typescript
// Source: pattern from thisdot.co article (verified against @solidjs/router Outlet docs)
// [CITED: https://www.thisdot.co/blog/how-to-authenticate-your-solidjs-routes-with-solid-router]

// src/components/AuthGuard.tsx
import { Outlet, useNavigate } from '@solidjs/router'
import { createEffect } from 'solid-js'
import { authStore } from '../stores/authStore'

export default function AuthGuard() {
  const navigate = useNavigate()

  createEffect(() => {
    if (!authStore.token) {
      navigate('/login', { replace: true })
    }
  })

  return <Outlet />
}

// App.tsx — nest protected routes under AuthGuard
// <Route path="/" component={AuthGuard}>
//   <Route path="/channels" component={ChannelsScreen} />
//   <Route path="/player/:channel" component={PlayerScreen} />
//   <Route path="/settings" component={SettingsScreen} />
// </Route>
```

**Important:** The `createEffect` re-runs reactively whenever `authStore.token` changes.
This means that on logout (token cleared), the guard automatically redirects without requiring
manual navigation. [VERIFIED: SolidJS store reactivity — createEffect tracks store reads]

### Pattern 4: AuthStore (SolidJS createStore + createContext)

**What:** A global store holding auth state, provided via context so all screens can read it.

```typescript
// src/stores/authStore.ts
import { createStore } from 'solid-js/store'

export interface AuthState {
  token: string | null
  refreshToken: string | null
  expiresAt: number | null  // Unix ms timestamp
  userId: string | null
}

const [authStore, setAuthStore] = createStore<AuthState>({
  token: localStorage.getItem('access_token'),
  refreshToken: localStorage.getItem('refresh_token'),
  expiresAt: Number(localStorage.getItem('expires_at')) || null,
  userId: localStorage.getItem('user_id'),
})

export { authStore, setAuthStore }
```

### Pattern 5: QR Code Rendering with uqr

**What:** Generate an SVG string from the `verification_uri`, inject it as inner HTML.

```typescript
// Source: https://github.com/unjs/uqr
import { renderSVG } from 'uqr'

// In LoginScreen component
const qrSvg = renderSVG(verificationUri)

// In JSX — SolidJS innerHTML binding
<div innerHTML={qrSvg} style={{ width: '200px', height: '200px' }} />
```

Note: `verification_uri` returned by Twitch looks like
`https://www.twitch.tv/activate?public=true&device-code=XXXXXX` — this is the URL to encode
in the QR code. Users scan it with their phone; it pre-fills the device code.
[CITED: https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#device-code-grant-flow]

### Pattern 6: localStorage Token Schema

**What:** Keys to persist in localStorage. Named consistently so auth service and store agree.

| Key | Type | Example Value |
|-----|------|---------------|
| `twitch_access_token` | string | `"abc123..."` |
| `twitch_refresh_token` | string | `"def456..."` |
| `twitch_expires_at` | string (ms) | `"1713190000000"` |
| `twitch_user_id` | string | `"12345678"` |

Use a `twitch_` prefix to namespace from any future stored values. Parse `expires_at` as
`Number(localStorage.getItem('twitch_expires_at'))` — localStorage values are always strings.

### Anti-Patterns to Avoid

- **`setInterval` without cleanup:** Always clear the polling interval in `onCleanup()` of the
  SolidJS component. If the user navigates away mid-poll, the interval will fire against an
  unmounted component. [ASSUMED — standard SolidJS lifecycle]
- **Destructuring AuthStore props:** SolidJS signals/stores lose reactivity when destructured.
  Always read `authStore.token`, never `const { token } = authStore`. [CITED: PITFALLS.md §9]
- **Storing tokens in sessionStorage:** Lost when the webOS app process ends. Use localStorage.
  [CITED: ARCHITECTURE.md — localStorage confirmed to persist across app launches on webOS]
- **Two concurrent refresh calls:** Implement the promise-dedup singleton before any code that
  calls the Twitch API. [CITED: PITFALLS.md §6]
- **Storing client_secret in frontend code:** Public client type — no client_secret is issued
  or needed. Never add a secret field. [CITED: official Twitch docs]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| QR code generation | Custom QR encoding (Reed-Solomon error correction, format info, data masking) | `uqr` | QR encoding is a complex ISO/IEC 18004 spec; error-correction matrices alone are hundreds of lines of correct math |
| Token refresh deduplication | Ad-hoc `isRefreshing` boolean flag | Promise-stored-in-variable pattern (see Pattern 2) | Boolean flags don't handle concurrent awaits correctly; only a shared promise guarantees all callers receive the same result |
| OAuth state machine | Manual flag soup | `TwitchAuthService` class with clear states: `idle`, `polling`, `authenticated`, `refreshing`, `error` | Device code flow has 5 distinct terminal/non-terminal states; a class encapsulates transitions cleanly |

**Key insight:** The QR code encoding spec is deep and has many edge cases (version selection,
error correction level, mask pattern selection). A 79KB library that handles all of it is
preferable to hand-rolling any portion of it.

---

## Common Pitfalls

### Pitfall 1: Refresh Token Is Single-Use — Race Condition Causes Logout

**What goes wrong:** Two API calls both get a 401 at the same time. Both detect "needs refresh"
and call the refresh endpoint. The first response consumes and invalidates the refresh token.
The second call receives "Invalid refresh token" (HTTP 400), panics, and logs the user out.

**Why it happens:** Access tokens expire every ~4 hours. If any background work or screen mount
triggers two concurrent API calls near expiry time, both will 401 simultaneously.

**How to avoid:** Implement the promise-deduplication singleton in `TwitchAuthService.refreshTokens()`
before writing a single API call. Return the same in-flight `Promise<void>` to all callers.

**Warning signs:** User is unexpectedly logged out after TV wakes from standby; network log shows
two simultaneous POST requests to `/oauth2/token` within the same second.

[CITED: PITFALLS.md §6, verified against Twitch refresh token docs]

---

### Pitfall 2: Polling Interval Must Be Respected

**What goes wrong:** Polling faster than the `interval` value returned by the device code
endpoint causes Twitch to rate-limit the app and may return an error that aborts the flow.

**Why it happens:** The `interval` field in the device code response is a directive, not a
suggestion. Default is 5 seconds.

**How to avoid:** Read `interval` from the device code response and use it as the `setInterval`
delay. Do not hardcode 1000ms or other values.

[CITED: https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#device-code-grant-flow]

---

### Pitfall 3: Device Code Expires — Must Handle Gracefully

**What goes wrong:** The `expires_in` field in the device code response is typically 1800 seconds
(30 minutes). If the user hasn't authenticated by then, continued polling returns
`"invalid device code"` (400). The app should detect this, clear the timer, and offer a
"Request new code" retry button rather than showing an unexplained error.

**Why it happens:** `expires_in` is enforced server-side. Polling forever without checking
wall-clock expiry wastes battery and confuses the user.

**How to avoid:** Track `expiresAt = Date.now() + expires_in * 1000` at flow start. Before each
poll, check if `Date.now() >= expiresAt`. On expiry or `"invalid device code"` error response,
transition to an expired state with a retry CTA.

[CITED: Twitch device code flow response fields — expires_in field documented]

---

### Pitfall 4: Write Refresh Token LAST When Persisting

**What goes wrong:** If the app crashes or the webOS process is killed between writing
`access_token` and writing `refresh_token`, the stored state is internally inconsistent. A new
token has been issued but the old refresh token is now invalid (single-use).

**Why it happens:** localStorage writes are synchronous but the app process can be killed at any
point.

**How to avoid:** Write in this order: `access_token` first, then `expires_at`, then
`refresh_token` last. If the process dies before `refresh_token` is written, the old
`refresh_token` is still valid (it was never consumed by an aborted write). If `access_token`
and `refresh_token` are both stale, the user must re-authenticate — a recoverable state.

[CITED: PITFALLS.md §6 atomic write ordering]

---

### Pitfall 5: `grant_type` Parameter Value Must Be the Full URN

**What goes wrong:** Using `grant_type=device_code` in the token poll request returns an error.
The correct value is the full URN string `urn:ietf:params:oauth:grant-type:device_code`.

**Why it happens:** The Twitch device code flow documentation had a documented error in this
field that confused implementations. The full URN is the correct RFC 8628 value.

**Warning signs:** 400 errors on the polling request with "unsupported grant type" message.

[CITED: https://discuss.dev.twitch.com/t/device-code-flow-documentation-fixes/59136, verified
against Twitch official OAuth docs]

---

### Pitfall 6: Public Client — No client_secret Needed or Expected

**What goes wrong:** Registering a Confidential client type or including `client_secret` in
requests exposes credentials in open-source code and is unnecessary.

**Why it happens:** Developer instinctively copies OAuth examples that include `client_secret`.

**How to avoid:** Register the Twitch application as a "Public" client type in the Twitch
developer console. Public clients: no secret issued, no secret needed in refresh calls, safe
to ship in open-source code. [CITED: Twitch official docs — device code flow app registration]

---

## Code Examples

### Full Device Code Request + Poll

```typescript
// Source: https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#device-code-grant-flow
const CLIENT_ID = import.meta.env.VITE_TWITCH_CLIENT_ID

interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number   // seconds
  interval: number     // polling interval in seconds
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: 'bearer'
  expires_in: number
  scope: string[]
}

async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const res = await fetch('https://id.twitch.tv/oauth2/device', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      scope: 'user:read:follows user:read:chat',
    }),
  })
  if (!res.ok) throw new Error(`Device code request failed: ${res.status}`)
  return res.json()
}

async function pollForToken(deviceCode: string): Promise<TokenResponse | 'pending' | 'expired'> {
  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      scope: 'user:read:follows user:read:chat',
    }),
  })
  if (res.ok) return res.json() as Promise<TokenResponse>
  const err = await res.json()
  if (err.message === 'authorization_pending') return 'pending'
  return 'expired'  // invalid device code or any other 4xx
}
```

### Token Refresh (No client_secret)

```typescript
// Source: https://dev.twitch.tv/docs/authentication/refresh-tokens/
// Public client — no client_secret field

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      // No client_secret — Public client type
    }),
  })
  if (!res.ok) throw new Error('Refresh token invalid or expired')
  return res.json()
}
```

### QR Code Rendering in SolidJS

```typescript
// Source: https://github.com/unjs/uqr
import { renderSVG } from 'uqr'
import { createMemo } from 'solid-js'

// Inside a SolidJS component:
const qrSvg = createMemo(() => {
  if (!verificationUri()) return ''
  return renderSVG(verificationUri())
})

// In JSX:
// <div innerHTML={qrSvg()} style={{ width: '200px', height: '200px' }} />
```

### Auth Guard (Layout Component)

```typescript
// [CITED: https://www.thisdot.co/blog/how-to-authenticate-your-solidjs-routes-with-solid-router]
import { Outlet, useNavigate } from '@solidjs/router'
import { createEffect } from 'solid-js'
import { authStore } from '../stores/authStore'

export default function AuthGuard() {
  const navigate = useNavigate()
  createEffect(() => {
    if (!authStore.token) navigate('/login', { replace: true })
  })
  return <Outlet />
}
```

### App.tsx Route Structure After Auth Guard

```typescript
// Existing MemoryRouter is compatible — no router changes needed
// [VERIFIED: App.tsx lines 50-65 — MemoryRouter with history already wired]

<MemoryRouter history={history} root={(props) => <>{props.children}</>}>
  <Route path="/login" component={LoginScreen} />
  <Route path="/" component={AuthGuard}>
    <Route path="/channels" component={ChannelsScreen} />
    <Route path="/player/:channel" component={PlayerScreen} />
    <Route path="/settings" component={SettingsScreen} />
  </Route>
</MemoryRouter>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Twitch IRC OAuth implicit flow | Device Code Grant Flow (RFC 8628) | 2023 — now GA | Correct flow for TV; returns refresh token unlike implicit |
| Twitch IRC for chat | EventSub WebSocket `channel.chat.message` | 2023 — Twitch recommending migration | Scope: `user:read:chat` needed at Phase 2 auth; EventSub is Phase 5 concern |
| Refresh without scope re-request | Refresh returns same scopes | Always | No need to re-specify scope on refresh |

**Deprecated/outdated:**

- Implicit grant flow: Does not return refresh tokens. Not suitable for long-lived TV sessions.
  [CITED: Twitch docs]
- `grant_type=device_code` (short form): Wrong — must be full URN. [CITED: Twitch dev forum fix]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Polling loop implemented with `setInterval` + `onCleanup` teardown | Pattern 1 | If wrong: memory leak / phantom requests after component unmount |
| A2 | `verification_uri` from Twitch response already includes the device code pre-filled | Pattern 5 / QR code | If wrong: QR code lands on activation page without code pre-filled — user must type code anyway |
| A3 | SolidJS `innerHTML` binding is safe for uqr's SVG output (no script injection risk in QR SVG) | Pattern 5 | If wrong: XSS vector (unlikely for self-generated SVG, but worth noting) |
| A4 | `createEffect` in AuthGuard fires before any child render, preventing flash of protected content | Pattern 3 | If wrong: brief flash of channels screen before redirect to login |

---

## Open Questions (RESOLVED)

1. **Twitch Client ID delivery mechanism**
   - What we know: `client_id` must be included in all OAuth requests. It is not a secret for Public clients.
   - What's unclear: Whether to hardcode in source (visible in git) or load from `VITE_TWITCH_CLIENT_ID` env var in `.env.local` (not committed).
   - Recommendation: Use `import.meta.env.VITE_TWITCH_CLIENT_ID` — keeps the ID out of version-controlled source code, which is cleaner practice even for non-secret values.
   - RESOLVED: Use `import.meta.env.VITE_TWITCH_CLIENT_ID`. Plans 02-02 and 02-03 implement this.

2. **`verification_uri` format — does it pre-fill the code?**
   - What we know: Twitch docs show `verification_uri` format as `https://www.twitch.tv/activate?public=true&device-code=[code]`
   - What's unclear: Whether the QR code should encode `verification_uri` (URL with code embedded) or always show both the URL and the `user_code` text separately.
   - Recommendation: Display both — the QR encodes `verification_uri` for phone users, plus `user_code` in large text for users who prefer typing it. Show `verification_uri` hostname (`twitch.tv/activate`) as readable text beneath the QR.
   - RESOLVED: Display both QR (encoding verification_uri) and user_code text. Plan 02-03 implements this.

3. **Proactive token refresh vs reactive (on 401)**
   - What we know: Access tokens last ~4 hours per Twitch docs. Proactive refresh (5 min before expiry) is recommended in PITFALLS.md to avoid race conditions.
   - What's unclear: Whether to refresh on app startup if `expiresAt < now + 5min`, or only on 401 responses.
   - Recommendation: On app startup, if `expiresAt` is within 5 minutes of expiry or already expired, proactively call `refreshTokens()` before allowing any API call to proceed.
   - RESOLVED: Deferred to Phase 3 (first phase making API calls). Phase 2 implements the refresh singleton; Phase 3 adds the proactive startup check.

---

## Environment Availability

Step 2.6: No external dependencies beyond existing project toolchain are introduced by this phase. `uqr` is a pure JavaScript package with no native binaries, no external service calls, and no OS-level dependencies. The Twitch OAuth endpoints are internet services — availability depends on network, not local environment.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Network (id.twitch.tv) | AUTH-01, AUTH-04 | Assumed | — | Graceful "no network" error state in UI |
| `uqr` (to install) | AUTH-02 | Not yet installed | 0.1.3 | Omit QR code, show only text code |
| `localStorage` | AUTH-03 | Built-in Chromium 68 | — | None needed — confirmed available on webOS |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^3.1.2 |
| Config file | `vitest.config.ts` (exists — merges with `vite.config.ts`) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | `requestDeviceCode()` builds correct request and parses response | unit | `npm test -- --reporter=verbose` | Wave 0 |
| AUTH-01 | `pollForToken()` returns `'pending'` on 400 `authorization_pending` | unit | `npm test` | Wave 0 |
| AUTH-01 | `pollForToken()` returns `'expired'` on 400 `invalid device code` | unit | `npm test` | Wave 0 |
| AUTH-04 | `refreshTokens()` deduplicates concurrent calls (single HTTP request) | unit | `npm test` | Wave 0 |
| AUTH-04 | `refreshTokens()` writes tokens in correct order (access, expires, refresh last) | unit | `npm test` | Wave 0 |
| AUTH-03 | `authStore` initialises from `localStorage` on first read | unit | `npm test` | Wave 0 |
| AUTH-05 | `AuthGuard` redirects to `/login` when `authStore.token` is null | unit/integration | `npm test` | Wave 0 |
| AUTH-02 | `renderSVG(url)` from `uqr` returns non-empty SVG string | unit | `npm test` | Wave 0 |

Note: Vitest environment is `node` (see `vitest.config.ts`). Tests for DOM-dependent components
(LoginScreen, AuthGuard) require `environment: 'jsdom'` or `'happy-dom'`. Wave 0 must update
`vitest.config.ts` to add jsdom support for component tests.

### Sampling Rate

- **Per task commit:** `npm test` (all tests, fast — no E2E in this phase)
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/services/__tests__/TwitchAuthService.test.ts` — covers AUTH-01, AUTH-04 (mock fetch)
- [ ] `src/stores/__tests__/authStore.test.ts` — covers AUTH-03 (mock localStorage)
- [ ] `src/components/__tests__/AuthGuard.test.tsx` — covers AUTH-05 (mock router, authStore)
- [ ] `vitest.config.ts` — add `environment: 'happy-dom'` for component tests (or per-file `@vitest-environment happy-dom` docblock)
- [ ] Install test dependency: `npm install -D happy-dom` (or `jsdom`)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Twitch device code flow — delegated to Twitch IdP; no custom password handling |
| V3 Session Management | yes | Token expiry tracked (`expires_at`); proactive refresh; localStorage storage |
| V4 Access Control | yes | AuthGuard enforces route-level protection; unauthenticated users cannot reach protected screens |
| V5 Input Validation | partial | Twitch API responses should be validated (check for expected fields before trusting) |
| V6 Cryptography | no | No custom crypto; tokens are opaque strings managed by Twitch |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Token theft from localStorage | Information disclosure | localStorage is accessible to any JS on the same origin; webOS apps are single-origin packaged apps — no third-party scripts run in the same context; acceptable risk for personal-use app |
| Stale refresh token after process crash | Denial of service (self-DoS) | Write refresh_token last (see Pitfall 4); on auth failure, redirect to fresh device code flow |
| QR code SVG XSS | Tampering | SVG generated from Twitch's own `verification_uri` — not user input; `renderSVG` from uqr does not embed scripts |
| client_id exposure in open-source code | Information disclosure | `client_id` is not a secret for Public OAuth clients; acceptable by Twitch design |

---

## Sources

### Primary (HIGH confidence)

- [Twitch Device Code Grant Flow](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#device-code-grant-flow) — endpoints, request params, response fields, polling error codes, public client notes
- [Twitch Refresh Tokens](https://dev.twitch.tv/docs/authentication/refresh-tokens/) — refresh endpoint, no client_secret for public clients, 30-day expiry
- [Twitch Access Token Scopes](https://dev.twitch.tv/docs/authentication/scopes/) — confirmed `user:read:follows` and `user:read:chat` are the correct scopes
- [ARCHITECTURE.md](/.planning/research/ARCHITECTURE.md) — AuthStore design, token refresh singleton, localStorage schema
- [PITFALLS.md](/.planning/research/PITFALLS.md) — Pitfall 6: refresh token race condition and write ordering
- `src/App.tsx` — existing MemoryRouter wiring compatible with AuthGuard layout pattern
- `src/navigation/index.ts` — existing spatial nav exports reusable in LoginScreen as-is

### Secondary (MEDIUM confidence)

- [thisdot.co — Authenticating SolidJS Routes](https://www.thisdot.co/blog/how-to-authenticate-your-solidjs-routes-with-solid-router) — AuthGuard layout component pattern with `<Outlet>` and `useNavigate`
- [uqr GitHub (unjs/uqr)](https://github.com/unjs/uqr) — zero-dep, ES module, SVG output; npm registry confirms 0.1.3 / 79KB unpacked
- [Twitch dev forum — Device Code Flow documentation fixes](https://discuss.dev.twitch.com/t/device-code-flow-documentation-fixes/59136) — `grant_type` URN correction

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all packages verified via npm registry; Twitch endpoints verified via official docs
- Architecture: HIGH — AuthStore, AuthGuard, refresh singleton patterns verified against official SolidJS docs and Twitch docs
- Pitfalls: HIGH — refresh token race condition, write ordering, and polling interval sourced from official Twitch docs and verified PITFALLS.md

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (Twitch API stable; `uqr` 0.1.3 stable; SolidJS router 0.16.x stable)
