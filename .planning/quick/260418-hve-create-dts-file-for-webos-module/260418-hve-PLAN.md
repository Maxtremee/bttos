---
id: 260418-hve
type: quick
title: Create .d.ts file for webOSTVjs-1.2.13 module
status: planned
---

# Quick Task 260418-hve: Create .d.ts for webOSTVjs-1.2.13

## Goal
Provide TypeScript ambient type declarations for the bundled webOSTV.js and webOSTV-dev.js (v1.2.13), so SolidJS code can use `window.webOS` and `window.webOSDev` with full type safety.

## Rationale
- The library is a plain IIFE that attaches to `window.webOS` / `window.webOSDev` — no npm package, no bundled types.
- Community packages (e.g. `@procot/webostv`) exist but don't match this exact vendored version. Writing our own keeps the types honest against the minified JS we actually ship.
- A single ambient `.d.ts` keeps it simple: no imports needed in consuming code, just a reference in `tsconfig.json`'s `include` or a `/// <reference>`.

## Tasks

### Task 1: Write webOSTV.d.ts
- **Files:** `webOSTVjs-1.2.13/webOSTV.d.ts` (new)
- **Action:**
  - Declare ambient global `webOS` (namespace) exposing: `deviceInfo`, `fetchAppId`, `fetchAppInfo`, `fetchAppRootPath`, `keyboard`, `libVersion`, `platform`, `platformBack`, `service`, `systemInfo`.
  - Declare ambient global `webOSDev` exposing: `APP`, `DRM`, `LGUDID`, `connection`, `drmAgent`, `launch`, `launchParams`.
  - Extend `Window` interface with `webOS` and `webOSDev`.
  - Cover callback/options shapes derived from the minified source (ServiceRequest, DrmClient, launch params, etc.).
- **Verify:** `tsc --noEmit` on a test file that imports nothing and uses `window.webOS.service.request(...)` compiles without errors.
- **Done:** File exists, is referenced by the project via its include path, types match the runtime behavior inferred from webOSTV.js / webOSTV-dev.js.

## Must-haves
- Ambient `Window.webOS` and `Window.webOSDev` augmentations
- `service.request` returns a cancellable `ServiceRequest`
- `drmAgent` returns a typed DRM client or null
- `platform` fields match runtime detection (tv, watch, legacy, open, unknown, chrome)
