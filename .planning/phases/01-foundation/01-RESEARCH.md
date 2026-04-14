# Phase 1: Foundation - Research

**Researched:** 2026-04-14
**Domain:** SolidJS + Vite + webOS packaging + spatial navigation + @solidjs/router MemoryRouter
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Use `@solidjs/router` with `MemoryRouter` for screen management — proper route components for Login, Channels, Player, Settings
- **D-02:** Instant screen swaps, no transition animations — simplest approach and best performance on TV hardware
- **D-03:** Back button behavior on root screen — Claude's discretion to pick the standard TV app pattern (likely confirm-before-exit)

### Claude's Discretion

- Back button behavior on root screen (standard TV pattern)
- Visual theme (dark mode, color palette, typography) — can be established during implementation
- Focus indicator styling — choose something visible and consistent
- Spatial navigation library choice (js-spatial-navigation vs custom SolidJS wrapper)
- Dev workflow setup (simulator vs real TV testing, hot reload)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FNDN-01 | App loads and runs on real webOS TV hardware (Chromium 68+) | Vite 6 `build.target: ['chrome68']` + `base: './'` + appinfo.json packaging via ares-cli ensures correct bundle for webOS file:// origin |
| FNDN-02 | App is fully navigable with a standard TV remote (D-pad + OK + Back) | `@lampa-dev/solidjs-spatial-navigation` handles D-pad spatial focus; global keydown for keyCode 461 (Back); keyCode 13 (OK); focus indicator via `.focused` CSS class |
</phase_requirements>

---

## Summary

Phase 1 is a pure scaffolding phase: no feature code, no real API calls. The deliverable is a SolidJS + Vite 6 project that builds to a static bundle loadable by webOS Chromium 68, packaged as a valid `.ipk` via `ares-cli`, with four skeleton screens (Login, Channels, Player, Settings) wired to `@solidjs/router` MemoryRouter and fully navigable via D-pad using `@lampa-dev/solidjs-spatial-navigation`.

The two locked technical requirements are independent but must both pass before Phase 1 is done: FNDN-01 (loads on hardware) is about the build pipeline, and FNDN-02 (D-pad navigation) is about the spatial navigation wiring. Failure in either means Phase 2 cannot safely begin.

The UI-SPEC is fully resolved: dark theme tokens, CSS custom properties, exact color values, typography sizes (all px, no rem), focus ring specification, and the exit-confirmation pattern for the Back button on root screens are all defined and must be implemented as specified.

**Primary recommendation:** Scaffold with `npm create vite@6 . -- --template solid-ts`, then add `@solidjs/router`, `@lampa-dev/solidjs-spatial-navigation`, configure Vite for webOS (`base: './'`, `build.target: ['chrome68']`), add `appinfo.json`, wire global keydown for the remote, install CSS tokens, and verify each screen skeleton receives and returns D-pad focus correctly.

---

## Project Constraints (from CLAUDE.md)

| Directive | Source | Enforcement |
|-----------|--------|-------------|
| Tech stack: SolidJS — no React, no Vue | CLAUDE.md | Never introduce React or React-ecosystem packages |
| Platform: webOS TV web app in built-in Chromium browser | CLAUDE.md | All code must run in Chromium 68; no Node-only APIs |
| Input: Must be fully navigable with TV remote (D-pad + OK + Back) | CLAUDE.md | Every focusable element must be reachable by D-pad |
| Auth: device code flow only — no keyboard login | CLAUDE.md | Phase 2 concern; routing scaffold must accommodate it |
| Performance: responsive on low-end webOS TV hardware | CLAUDE.md | No heavy animations; bundle size minimised |
| GSD Workflow: use GSD entry points before file edits | CLAUDE.md | `/gsd-execute-phase` is the correct entry point |
| Conventions not yet established | CLAUDE.md | Phase 1 establishes them |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| solid-js | 1.9.12 | UI framework | Locked project choice; compiles to direct DOM ops, ~7.6KB gzip, no VDOM |
| vite-plugin-solid | 2.11.12 | SolidJS Vite integration | Official plugin; works with Vite 6 |
| vite | 6.4.2 (latest 6.x) | Build + dev server | Clean static dist/ output; Rollup-based; `base: './'` support; Vite 7+ needs Node 20+ |
| @solidjs/router | 0.16.1 | Screen routing via MemoryRouter | Locked decision D-01; MemoryRouter API confirmed in current release |
| @lampa-dev/solidjs-spatial-navigation | 1.0.0 | D-pad spatial focus management | SolidJS-native fork of Norigin library; webOS/Tizen/Vidaa confirmed |
| @webosose/ares-cli | 2.4.0 | Package and deploy .ipk to TV | Official LG toolchain; `ares-package`, `ares-install`, `ares-launch` |

[VERIFIED: npm registry — all versions checked 2026-04-14]

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript | Bundled with solid-ts template | Type safety | Always; template includes it; solid-js ships own types |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @lampa-dev/solidjs-spatial-navigation | js-spatial-navigation (vanilla, luke-chang) | js-spatial-navigation is more mature (1.0.1, 2022), framework-agnostic, slightly more manual SolidJS wiring needed; @lampa-dev has direct SolidJS signals integration but lower maintenance (last publish June 2023) |
| @lampa-dev/solidjs-spatial-navigation | Custom D-pad handler (~100 lines) | Only viable for simple linear layouts; breaks on grid layouts (channel grid in Phase 3) |

**Installation:**

```bash
# Scaffold (run from project root — already has CLAUDE.md and LICENSE)
npm create vite@6 . -- --template solid-ts

# Dependencies
npm install @solidjs/router @lampa-dev/solidjs-spatial-navigation

# webOS CLI (global, install once)
npm install -g @webosose/ares-cli
```

**Version verification:** [VERIFIED: npm registry 2026-04-14]
- solid-js: 1.9.12 (published stable)
- vite-plugin-solid: 2.11.12
- @solidjs/router: 0.16.1 (modified 2026-03-19)
- @lampa-dev/solidjs-spatial-navigation: 1.0.0 (published June 2023 — last update ~3 years ago; flag as low maintenance but functional)
- @webosose/ares-cli: 2.4.0 (last modified 2023-02-16 — stable; no active development expected, LG doesn't update frequently)
- vite: 6.4.2 (latest in 6.x line)

---

## Architecture Patterns

### Recommended Project Structure

```
/
├── public/
│   ├── appinfo.json        # webOS app manifest (not processed by Vite)
│   └── icon.png            # 80x80px PNG — required by appinfo.json
├── src/
│   ├── main.tsx            # render() entry point
│   ├── App.tsx             # MemoryRouter + Route definitions
│   ├── styles/
│   │   └── global.css      # CSS custom properties tokens (UI-SPEC)
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── ChannelsScreen.tsx
│   │   ├── PlayerScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── components/
│   │   └── ExitConfirmDialog.tsx   # Back-on-root modal (D-03)
│   └── navigation/
│       └── index.ts        # Spatial nav init + re-exported helpers
├── vite.config.ts
├── tsconfig.json
└── package.json
```

**Rationale:** `public/appinfo.json` is copied verbatim to `dist/` by Vite (files in `public/` are not processed). The `navigation/` module centralises the `init()` call so it runs once at startup and exports `useSpatialNavigation`, `Focusable`, and `FocusableGroup` re-exports to keep import paths consistent.

### Pattern 1: Vite Config for webOS

**What:** Configure `base: './'` and `build.target: ['chrome68']` — both are mandatory.
**When to use:** Always; these are non-negotiable for webOS deployment.

```typescript
// Source: STACK.md (verified against Vite docs vite.dev/config/build-options)
// vite.config.ts
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid()],
  build: {
    target: ['chrome68'],      // webOS 5.x baseline (Chromium 68)
    outDir: 'dist',
    assetsInlineLimit: 0,      // file:// origin — avoid inlined base64 for large assets
  },
  base: './',                  // CRITICAL: webOS apps run from file:// — must use relative paths
})
```

[VERIFIED: Vite docs at vite.dev/config/build-options confirm `build.target` accepts `chrome68`; `base: './'` is standard Vite]

### Pattern 2: MemoryRouter Setup

**What:** Wrap the app in `MemoryRouter` with route components for all four screens.
**When to use:** Always for webOS SPA; MemoryRouter keeps navigation state in memory, not the URL.

```typescript
// Source: docs.solidjs.com/solid-router/reference/components/memory-router
// App.tsx
import { MemoryRouter, Route } from '@solidjs/router'
import { createMemoryHistory } from '@solidjs/router'
import LoginScreen from './screens/LoginScreen'
import ChannelsScreen from './screens/ChannelsScreen'
import PlayerScreen from './screens/PlayerScreen'
import SettingsScreen from './screens/SettingsScreen'

const history = createMemoryHistory()

export default function App() {
  return (
    <MemoryRouter history={history} root={(props) => <>{props.children}</>}>
      <Route path="/login" component={LoginScreen} />
      <Route path="/channels" component={ChannelsScreen} />
      <Route path="/player/:channel" component={PlayerScreen} />
      <Route path="/settings" component={SettingsScreen} />
      <Route path="/" component={LoginScreen} />
    </MemoryRouter>
  )
}
```

**Navigation:** Use `history.set({ value: '/channels' })` for programmatic navigation, or `useNavigate()` from `@solidjs/router` within route components.

[VERIFIED: docs.solidjs.com/solid-router/reference/components/memory-router — confirmed `createMemoryHistory`, `history.set()`, `MemoryRouter` component API]

### Pattern 3: Spatial Navigation Init and Focusable Components

**What:** Initialize the library once at app root, then use `Focusable` / `FocusableGroup` on interactive elements.
**When to use:** Every interactive UI element that must be D-pad reachable.

```typescript
// Source: github.com/LampaWebDev/solidjs-spatial-navigation (README)
// navigation/index.ts
import { init } from '@lampa-dev/solidjs-spatial-navigation'

export function initSpatialNav() {
  init({
    debug: false,
    visualDebug: false,
    shouldFocusDOMNode: true,   // ensures DOM accessibility focus is also set
  })
}

export { Focusable, FocusableGroup, useSpatialNavigation } from '@lampa-dev/solidjs-spatial-navigation'
```

```typescript
// Usage in a screen component
import { Focusable, FocusableGroup, useSpatialNavigation } from '../navigation'
import { onMount } from 'solid-js'

function LoginScreen() {
  const { setFocus } = useSpatialNavigation()

  // Set initial focus on mount
  onMount(() => setFocus('login-btn'))

  return (
    <div>
      <Focusable focusKey="login-btn" as="button">
        {({ focused }) => (
          <button class={focused() ? 'focused' : ''}>
            Sign in with Twitch
          </button>
        )}
      </Focusable>
    </div>
  )
}
```

[VERIFIED: github.com/LampaWebDev/solidjs-spatial-navigation — init options, Focusable, FocusableGroup, useSpatialNavigation confirmed]

### Pattern 4: Global Key Handler (webOS Remote)

**What:** Single `window` keydown listener in the App shell mapping remote keycodes.
**When to use:** App mount only; wired once; remove on unmount.

```typescript
// Source: webostv.developer.lge.com/develop/guides/back-button (official LG docs)
// Keycode reference verified against LG developer forum thread and webOS samples repo
import { onMount, onCleanup } from 'solid-js'

const KEY_BACK = 461    // webOS Back button (0x1CD)
const KEY_OK = 13       // Enter / OK
const KEY_UP = 38
const KEY_DOWN = 40
const KEY_LEFT = 37
const KEY_RIGHT = 39

function useRemoteKeys(handlers: { onBack?: () => void }) {
  function handleKeydown(e: KeyboardEvent) {
    switch (e.keyCode) {
      case KEY_BACK:
        e.preventDefault()
        handlers.onBack?.()
        break
      // D-pad keys are handled by @lampa-dev/solidjs-spatial-navigation
      // OK (13) is handled by the focused element's native click/enter event
    }
  }
  onMount(() => window.addEventListener('keydown', handleKeydown))
  onCleanup(() => window.removeEventListener('keydown', handleKeydown))
}
```

[VERIFIED: webostv.developer.lge.com/develop/guides/back-button — keyCode 461 confirmed; Back button handling guide confirms this approach]

### Pattern 5: appinfo.json

**What:** Required manifest file placed in `public/` — copied verbatim to `dist/` by Vite.
**When to use:** Always; without it `ares-package` fails and the app cannot be installed.

```json
{
  "id": "com.yourname.twitchalt",
  "version": "0.1.0",
  "vendor": "Your Name",
  "type": "web",
  "main": "index.html",
  "title": "Twitch Alt",
  "icon": "icon.png",
  "largeIcon": "largeIcon.png",
  "disableBackHistoryAPI": true
}
```

**Critical:** `disableBackHistoryAPI: true` is required. Without it, the webOS platform intercepts Back key presses and uses the DOM history API instead of emitting the keydown event. Since MemoryRouter does not use browser history, the platform's automatic back handling would go to the wrong place. Setting this flag routes all Back events to the app's keydown listener. [VERIFIED: webostv.developer.lge.com/develop/guides/back-button — disableBackHistoryAPI documented]

**Version must be semver with three parts** (`"0.1.0"` not `"0.1"`). [VERIFIED: webostv.developer.lge.com/develop/references/appinfo-json]

### Pattern 6: CSS Custom Properties (UI-SPEC Design Tokens)

**What:** Global CSS tokens declared on `:root`, used by all components. Defined in the UI-SPEC.
**When to use:** In a single `global.css` file imported in `main.tsx`.

```css
/* Source: 01-UI-SPEC.md — verbatim from the approved spec */
:root {
  --color-bg: #0f0f0f;
  --color-surface: #1a1a1a;
  --color-accent: #9147ff;
  --color-destructive: #e53935;
  --color-text-primary: #f0f0f0;
  --color-text-secondary: #a0a0a0;
  --color-text-disabled: #555555;

  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --space-3xl: 64px;

  --font-size-body: 24px;
  --font-size-label: 20px;
  --font-size-heading: 32px;
  --font-size-display: 48px;
  --font-weight-regular: 400;
  --font-weight-semibold: 600;

  --focus-ring: 3px solid var(--color-accent);
  --focus-ring-offset: 4px;
  --safe-zone: 48px;
  --min-target-height: 44px;
}

/* Never suppress focus — replace with custom ring */
:focus-visible {
  outline: var(--focus-ring);
  outline-offset: var(--focus-ring-offset);
}

/* Applied by @lampa-dev/solidjs-spatial-navigation */
.focused {
  outline: var(--focus-ring);
  outline-offset: var(--focus-ring-offset);
}
```

**Do NOT use `rem` units anywhere.** webOS may override root font size. Use `px` exclusively. [VERIFIED: 01-UI-SPEC.md]

### Pattern 7: Exit Confirmation Dialog (D-03 — Back on root)

**What:** Modal overlay shown when Back is pressed on the root screen (Login or Channels).
**When to use:** Back key press detected when `history.get()` indicates root-level screen.

The UI-SPEC has resolved D-03: use exit confirmation dialog (pattern used by Netflix, YouTube TV, Disney+).
- Dialog background: `var(--color-surface)` (`#1a1a1a`)
- Heading: "Exit app?"
- Options: "Exit" (calls `window.close()`) and "Cancel" (dismisses dialog)
- `isFocusBoundary={true}` on the dialog's `FocusableGroup` to trap D-pad focus inside
- Pressing Back again while dialog is open dismisses it

```typescript
// Skeleton structure — implementation fills in component body
function ExitConfirmDialog(props: { onExit: () => void; onCancel: () => void }) {
  const { setFocus } = useSpatialNavigation()
  onMount(() => setFocus('exit-confirm-exit-btn'))  // auto-focus Exit on open
  return (
    <FocusableGroup focusKey="exit-confirm" isFocusBoundary={true}>
      {/* "Exit" and "Cancel" Focusable buttons */}
    </FocusableGroup>
  )
}
```

[VERIFIED: 01-UI-SPEC.md — dialog pattern, copy, and color tokens confirmed]

### Anti-Patterns to Avoid

- **`base: '/'` in vite.config.ts:** Absolute asset paths break under webOS `file://` origin. Must be `base: './'`.
- **`rem` units in CSS:** webOS may override root font size. All sizes in `px`.
- **`outline: none` anywhere:** The UI-SPEC forbids it; replace browser default focus with the custom ring, never suppress it.
- **Destructuring SolidJS props:** `const { title } = props` loses reactivity. Always use `props.title`.
- **`BrowserRouter` or `HashRouter`:** Uses browser URL; MemoryRouter is the locked choice and correct for webOS.
- **Not setting `disableBackHistoryAPI: true`:** Back key events go to platform history API, bypassing the app's keydown handler.
- **Missing version in `appinfo.json`:** Must be `"x.y.z"` three-part semver or `ares-package` silently produces a broken `.ipk`.
- **React packages in package.json:** The entire ecosystem choice is SolidJS; React packages will not work.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Spatial D-pad navigation | Custom focus manager | `@lampa-dev/solidjs-spatial-navigation` | Grid navigation edge cases (wrapping, skip non-focusable, variable card sizes) are complex; library handles directional geometry calculation |
| Screen routing | Manual screen show/hide signals | `@solidjs/router` MemoryRouter | Locked decision D-01; handles URL-independent route state, `useNavigate`, `<Route>` component lifecycle |
| CSS design tokens | Inline style strings | CSS custom properties (`global.css`) | UI-SPEC defines exact token names; consistent across phases; no runtime overhead |

**Key insight:** Both the routing and navigation concerns are solved problems in the SolidJS ecosystem. The only custom code in Phase 1 is the global keydown handler and the exit confirmation dialog.

---

## Common Pitfalls

### Pitfall 1: base: './' Not Set — Assets 404 Under file://

**What goes wrong:** Default Vite config uses `base: '/'` which outputs absolute asset paths (`/assets/index.js`). webOS apps run from `file:///media/developer/apps/...` — absolute paths are resolved relative to the filesystem root, breaking all assets.
**Why it happens:** Vite default is web-server deployment, not filesystem deployment.
**How to avoid:** Set `base: './'` in `vite.config.ts` before writing any other code.
**Warning signs:** App loads on simulator (which uses a local server) but shows blank screen on real TV; network tab shows failed file:// requests.
[VERIFIED: STACK.md, PITFALLS.md — confirmed as critical]

### Pitfall 2: Missing disableBackHistoryAPI Breaks Back Button

**What goes wrong:** Back key press is intercepted by webOS platform history API, not the app. MemoryRouter has no browser history to pop, so nothing happens — or the app exits unexpectedly.
**Why it happens:** webOS default behavior for web apps uses `history.back()` on Back press. This worked for multi-page apps; for SPAs it does nothing or behaves unpredictably.
**How to avoid:** Set `"disableBackHistoryAPI": true` in `appinfo.json`. This routes all Back events to the app's keydown handler.
**Warning signs:** Back key does nothing; pressing Back exits to home screen without going through the app's confirmation dialog.
[VERIFIED: webostv.developer.lge.com/develop/guides/back-button]

### Pitfall 3: Focus Lost After Screen Transition

**What goes wrong:** Navigating between screens (MemoryRouter route change) unmounts the old screen DOM, destroying the focused element. Spatial navigation library's internal state points to a now-dead element. D-pad input lands nowhere or errors silently.
**Why it happens:** SolidJS reactive DOM teardown on route change; browser native focus does not survive element recreation.
**How to avoid:** Call `setFocus(firstFocusKey)` in `onMount` of each screen component. Use the `saveLastFocusedChild` prop on `FocusableGroup` to remember focus within a group when returning to it.
**Warning signs:** D-pad stops responding after navigating between screens; focus ring disappears.
[VERIFIED: PITFALLS.md Pitfall 4; @lampa-dev docs confirm `saveLastFocusedChild` and `setFocus`]

### Pitfall 4: SolidJS Props Destructuring Loses Reactivity

**What goes wrong:** `const { focused } = props` captures the value at call time. Component never updates when `focused` changes.
**Why it happens:** SolidJS reactivity is based on getter functions (signals), not plain values. Destructuring reads the getter once and captures the primitive.
**How to avoid:** Always access `props.focused`, `props.title`, etc. Use `splitProps(props, ['focused'])` when grouping is needed.
**Warning signs:** Component renders initially but never reflects prop changes; focus ring class never toggles.
[VERIFIED: PITFALLS.md Pitfall 9; SolidJS official docs on props]

### Pitfall 5: appinfo.json id Mismatch or Version Format

**What goes wrong:** Malformed `.ipk` installs but crashes immediately, or `ares-package` fails silently.
**Why it happens:** `id` must be lowercase + reverse-domain; `version` must be three-part semver; reserved domains (`com.webos`, `com.palm`) are rejected.
**How to avoid:** Validate `appinfo.json` at build time. Keep the `id` stable — changing it creates a new app entry rather than upgrading.
**Warning signs:** `ares-install` succeeds but app is not listed on TV home screen; app shows in launcher but crashes on launch.
[VERIFIED: webostv.developer.lge.com/develop/references/appinfo-json]

### Pitfall 6: @lampa-dev/solidjs-spatial-navigation Maintenance Risk

**What goes wrong:** Package was last published June 2023. If it has an incompatibility with the current SolidJS 1.9.x, there may be no upstream fix.
**Why it happens:** Community fork with low maintenance activity.
**How to avoid:** Verify the package works on import before building feature code. If blocked, fall back to `js-spatial-navigation` (vanilla, luke-chang/1.0.1) with a thin SolidJS wrapper using `use:` directives on focusable elements.
**Warning signs:** TypeScript errors on import; `init()` throws at runtime; `Focusable` component props don't match declared types.
[VERIFIED: npm registry — 1.0.0 published June 2023; STACK.md documents fallback strategy]

---

## Code Examples

Verified patterns from official sources:

### main.tsx Entry Point

```typescript
// Source: SolidJS solid-ts template pattern + navigation init
import { render } from 'solid-js/web'
import './styles/global.css'
import { initSpatialNav } from './navigation'
import App from './App'

initSpatialNav()

render(() => <App />, document.getElementById('root')!)
```

### ares-cli Workflow

```bash
# 1. Build
npm run build

# 2. Package (produces .ipk in current directory)
ares-package dist/

# 3. Register TV (one-time setup; TV must be in Developer Mode)
ares-setup-device

# 4. Install to TV
ares-install com.yourname.twitchalt_0.1.0_all.ipk

# 5. Launch
ares-launch com.yourname.twitchalt

# 6. Inspect logs
ares-inspect --app com.yourname.twitchalt
```

[VERIFIED: webostv.developer.lge.com/develop/tools/cli-dev-guide — STACK.md cites HIGH confidence for ares-cli]

### Screen Structure (Skeleton Pattern)

```typescript
// Source: Phase 1 requirement — each screen is a skeleton showing name + one focusable button
// ChannelsScreen.tsx (representative — all four screens follow same structure)
import { Focusable, useSpatialNavigation } from '../navigation'
import { onMount } from 'solid-js'

export default function ChannelsScreen() {
  const { setFocus } = useSpatialNavigation()
  onMount(() => setFocus('channels-primary'))

  return (
    <main style={{ padding: 'var(--space-2xl)' }}>
      <h1 style={{ 'font-size': 'var(--font-size-heading)' }}>
        Channels screen — navigation test
      </h1>
      <Focusable focusKey="channels-primary" as="button">
        {({ focused }) => (
          <button
            class={focused() ? 'focused' : ''}
            style={{ 'min-height': 'var(--min-target-height)' }}
          >
            Placeholder
          </button>
        )}
      </Focusable>
    </main>
  )
}
```

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build pipeline (Vite 6) | Yes | v24.14.1 | — |
| npm | Package installation | Yes | 11.11.0 | — |
| @webosose/ares-cli | webOS packaging and deployment | No (not globally installed) | 2.4.0 available on npm | Install globally: `npm install -g @webosose/ares-cli` |
| webOS TV hardware / Developer Mode | FNDN-01 real-hardware verification | Unknown — not testable in this environment | — | webOS TV Simulator (v1.4.1, bundled with webOS TV SDK v10.0.0) for UI iteration; simulator does NOT verify FNDN-01 |

**Missing dependencies with no fallback:**
- Real webOS TV hardware in developer mode — FNDN-01 ("runs on real webOS TV hardware") cannot be verified on the simulator. The plan must include a task to test on device.

**Missing dependencies with fallback:**
- `@webosose/ares-cli` — not installed globally. Plan must include `npm install -g @webosose/ares-cli` as a setup task. Fallback for packaging: manual zip if ares-cli fails, but this is not a real fallback for deployment.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | No automated test framework configured — greenfield project |
| Config file | None — Wave 0 must create if tests are added |
| Quick run command | `npm run build` — primary validation is that the build succeeds targeting chrome68 |
| Full suite command | Manual: build, package with ares-cli, install on TV, navigate all four screens with D-pad |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FNDN-01 | App builds to static bundle loadable by webOS Chromium 68 | Build smoke test | `npm run build` (must exit 0, must produce `dist/index.html`) | No Wave 0 file needed — standard Vite build |
| FNDN-01 | App runs on real hardware without errors | Manual | Deploy and launch via ares-cli — inspect console with `ares-inspect` | Manual task in plan |
| FNDN-02 | All four screens reachable via D-pad | Manual smoke | Navigate Login → Channels → Player → Settings → back via Back key | Manual task in plan |
| FNDN-02 | Focus ring visible on every focusable element | Visual inspection | Load in browser; tab through; confirm `.focused` class applied | Manual |
| FNDN-02 | Back on root shows exit confirmation dialog | Manual | Press Back on Login screen; confirm dialog appears | Manual |

### Sampling Rate

- **Per task commit:** `npm run build` — ensure no build regression
- **Per wave merge:** Full manual flow on simulator (or hardware if available)
- **Phase gate:** All four screens navigable on real hardware, FNDN-01 and FNDN-02 both verified before `/gsd-verify-work`

### Wave 0 Gaps

- None for automated test infrastructure — Phase 1 is a scaffold; validation is build success + manual D-pad walkthrough. No unit tests added to this phase; test infrastructure established in later phases when there is logic to test.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Not in scope — Phase 1 has no auth |
| V3 Session Management | No | Not in scope |
| V4 Access Control | No | Not in scope |
| V5 Input Validation | Minimal | No user input in Phase 1 skeleton; keyCode handling uses switch/case on integer values — no injection risk |
| V6 Cryptography | No | Not in scope |

### Known Threat Patterns for Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| localStorage read by other apps | Information Disclosure | webOS app sandboxing; localStorage is per-app; not a Phase 1 concern but document for Phase 2 token storage |
| `window.close()` abuse in exit dialog | Tampering | Only called from explicit user action (D-pad select on "Exit" button); not exposed to external input |

**Security note for Phase 1:** No sensitive data, no auth tokens, no API calls. The security surface in this phase is minimal. Phase 2 (auth tokens in localStorage) is where ASVS V3 becomes relevant.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@lampa-dev/solidjs-spatial-navigation` 1.0.0 is compatible with solid-js 1.9.x | Standard Stack | If incompatible, fall back to vanilla `js-spatial-navigation` (luke-chang) + SolidJS `use:` directive wrapper; adds ~1 day of work |
| A2 | webOS TV hardware in developer mode is available for real-device testing (FNDN-01) | Environment Availability | If no hardware available, FNDN-01 cannot be verified; simulator acceptance is a known gap |
| A3 | Node.js v24.14.1 is compatible with Vite 6.x (Vite 6 docs state Node 18+ required) | Standard Stack | Node 24 is ahead of Vite 6's stated minimum; no known issue expected |

---

## Open Questions

1. **Which app ID to use in appinfo.json**
   - What we know: Must be lowercase reverse-domain, cannot start with reserved domains (`com.webos`, `com.palm`, `com.lge`, `com.palmdts`)
   - What's unclear: The user has not specified their domain/identifier
   - Recommendation: Use a placeholder (`com.dev.twitchalt`) that the user can update before first real deployment; document that it must be stable once installed

2. **Icon assets for appinfo.json**
   - What we know: `icon.png` (80x80px) is required; `largeIcon.png` is optional but recommended
   - What's unclear: No icon assets exist in the project yet
   - Recommendation: Create placeholder icons (solid purple `#9147ff` square) in the Wave 0 / scaffold task; replace before shipping

3. **Real TV hardware availability for FNDN-01 verification**
   - What we know: Simulator does not reliably replicate Chromium 68 behavior
   - What's unclear: Whether the user has a webOS TV in developer mode available
   - Recommendation: Plan must include a "verify on hardware" task flagged as manual; if no hardware, mark FNDN-01 as conditionally passing and document the gap

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Norigin Spatial Navigation (React hooks) | @lampa-dev/solidjs-spatial-navigation or js-spatial-navigation | 2023 | SolidJS apps cannot use React hooks — must use framework-native or vanilla |
| HashRouter / BrowserRouter for SPA routing | MemoryRouter for TV/packaged apps | Ongoing | URL is irrelevant in packaged webOS apps; MemoryRouter keeps state in memory |
| webos-tv-cli (deprecated) | @webosose/ares-cli | 2022+ | ares-cli is the current official toolchain |
| `@vitejs/plugin-legacy` for old browser targets | `build.target: ['chrome68']` esbuild targeting | Vite 3+ | Plugin-legacy produces ES5 dead weight; esbuild target transpiles to the exact required level |

**Deprecated/outdated:**
- `webos-tv-cli`: Replaced by `@webosose/ares-cli`. Do not install or reference.
- `SolidJS 2.0-experimental`: API unstable. Stick to 1.9.x.
- Norigin Spatial Navigation (`@noriginmedia/norigin-spatial-navigation`): React-hooks-based; cannot be used in SolidJS. Use the lampa-dev fork or js-spatial-navigation.

---

## Sources

### Primary (HIGH confidence)

- docs.solidjs.com/solid-router/reference/components/memory-router — MemoryRouter API, `createMemoryHistory`, `history.set()`
- webostv.developer.lge.com/develop/guides/back-button — keyCode 461 confirmed; `disableBackHistoryAPI` behavior documented
- webostv.developer.lge.com/develop/references/appinfo-json — required fields, version format, id constraints
- vite.dev/config/build-options — `build.target` accepts `chrome68`; `base` option behavior
- npm registry (2026-04-14) — all package versions verified: solid-js 1.9.12, vite-plugin-solid 2.11.12, @solidjs/router 0.16.1, vite 6.4.2, @webosose/ares-cli 2.4.0, @lampa-dev/solidjs-spatial-navigation 1.0.0
- 01-UI-SPEC.md — all CSS tokens, color values, typography, focus ring spec, back button dialog pattern
- 01-CONTEXT.md — locked decisions D-01, D-02, D-03

### Secondary (MEDIUM confidence)

- github.com/LampaWebDev/solidjs-spatial-navigation — `init()` options, `Focusable`, `FocusableGroup`, `useSpatialNavigation` API (README fetched directly)
- STACK.md / PITFALLS.md / ARCHITECTURE.md — domain research conducted in prior session; HIGH-MEDIUM as noted per source

### Tertiary (LOW confidence)

- None in this research — all critical claims verified against official or direct sources

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions npm-verified; library APIs confirmed via GitHub README and official docs
- Architecture: HIGH — MemoryRouter API verified against official SolidJS docs; webOS patterns verified against LG developer docs
- Pitfalls: HIGH — all critical pitfalls traced to official sources or verified research files

**Research date:** 2026-04-14
**Valid until:** 2026-07-14 (stable ecosystem; ares-cli and solid-js change slowly; reassess if @lampa-dev/solidjs-spatial-navigation shows issues at install time)
