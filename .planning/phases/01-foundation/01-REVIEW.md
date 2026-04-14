---
phase: 01-foundation
reviewed: 2026-04-14T00:00:00Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - index.html
  - package.json
  - public/appinfo.json
  - src/App.tsx
  - src/components/ExitConfirmDialog.tsx
  - src/index.tsx
  - src/main.tsx
  - src/navigation/index.ts
  - src/screens/ChannelsScreen.tsx
  - src/screens/LoginScreen.tsx
  - src/screens/PlayerScreen.tsx
  - src/screens/SettingsScreen.tsx
  - src/styles/global.css
  - src/vite-env.d.ts
  - tsconfig.app.json
  - tsconfig.json
  - tsconfig.node.json
  - vite.config.ts
  - vitest.config.ts
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-04-14T00:00:00Z
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

This is a foundation/scaffolding phase for a SolidJS webOS TV app. All screens are placeholders, no authentication or API logic is present, and the navigation wiring is the primary functional code. The codebase is small, well-structured, and follows project conventions. Two logic bugs were found — one is a dead code branch that will silently break back-navigation from `/settings`, and one is a duplicate render entry point that will cause issues if ever invoked. The test environment configuration would silently break any future component tests. No security issues were found.

## Warnings

### WR-01: Dead ternary — back navigation always goes to `/channels`

**File:** `src/App.tsx:34`
**Issue:** The ternary `currentPath === '/settings' ? '/channels' : '/channels'` has identical values in both arms. Both branches navigate to `/channels`, so navigating back from any non-root, non-settings screen (e.g., a future `/player/:channel` screen) also goes to `/channels` rather than using history. More importantly, the intent appears to be a multi-destination back map, but only the `/settings` case is handled and the else-arm is a copy-paste error. When `/player/:channel` is a real screen, pressing Back from the player will navigate to `/channels` correctly by coincidence — but if any other non-root path is added, the logic will silently be wrong.
**Fix:** Replace the dead ternary with an explicit map, or use `history.back()` if the library supports it. At minimum, make the fallback different from the `/settings` branch so the two cases are distinguishable:
```ts
// Option A: explicit path map
const BACK_MAP: Record<string, string> = {
  '/settings': '/channels',
  // add '/player/:channel' -> '/channels' etc. when needed
}
history.set({ value: BACK_MAP[currentPath] ?? '/channels' })

// Option B: if the router history supports pop/back
history.go(-1)
```

---

### WR-02: Duplicate render entry point — `src/index.tsx` is dead but dangerous

**File:** `src/index.tsx:7`
**Issue:** `src/index.tsx` calls `render(() => <App />, root!)` but is never the actual entry point — `index.html` references `src/main.tsx` which is the real entry. `src/index.tsx` is therefore unreachable dead code. However, it renders `App` without calling `initSpatialNav()` (done in `main.tsx`) and without importing `global.css`. If this file were ever accidentally wired up (e.g., a future refactor changes the entry), spatial navigation would silently be uninitialised and global styles would be absent, producing a broken app with no error.
**Fix:** Delete `src/index.tsx`. The only entry point is `src/main.tsx`.

---

### WR-03: Vitest environment is `node` — SolidJS component tests will fail silently

**File:** `vitest.config.ts:9`
**Issue:** `environment: 'node'` is set. SolidJS components use DOM APIs (`document`, `window`, element creation). Any component or integration test added in future phases will throw `ReferenceError: document is not defined` at runtime rather than at configuration time, making test failures look like code bugs. The current test suite passes only because `--passWithNoTests` is set and no tests exist yet.
**Fix:** Change to `happy-dom` or `jsdom`, and add `@vitest/browser` or `@testing-library/user-event` when component tests are written:
```ts
// vitest.config.ts
test: {
  environment: 'happy-dom', // or 'jsdom'
  reporter: ['verbose'],
}
```
Also add `happy-dom` or `jsdom` to `devDependencies` in `package.json`.

---

## Info

### IN-01: `vite-plugin-solid` version behind project recommendation

**File:** `package.json:20`
**Issue:** The installed version is `^2.11.6` but `CLAUDE.md` (from `STACK.md`) recommends `^2.11.10`. This is a minor version gap that may include bug fixes relevant to webOS Chromium 68 compatibility.
**Fix:** Bump to `^2.11.10` in `package.json` and run `npm install`.

---

### IN-02: Magic number `461` for Back key lacks cross-reference comment

**File:** `src/App.tsx:13`
**Issue:** `const KEY_BACK = 461` has an inline comment `// webOS remote Back button (keyCode 0x1CD)` which is good, but `0x1CD` is `461` in decimal — the comment is accurate. No action strictly required, but noting that `461` is the webOS-specific keyCode and does not match the standard `VK_BACK_SPACE` (8) or browser `BrowserBack` (166). Future contributors may be confused when they see `461` with no W3C spec backing.
**Fix:** Consider adding a brief note or reference to the webOS key event documentation, or use the hex literal directly for clarity:
```ts
const KEY_BACK = 0x1CD // webOS remote Back button — LG webOS-specific keyCode
```

---

_Reviewed: 2026-04-14T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
