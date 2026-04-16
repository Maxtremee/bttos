---
quick_id: 260415-m2b
description: "Apply skills-based codebase improvements: design tokens, shared CSS utilities, SolidJS memoization"
date: 2026-04-16
status: completed
commits:
  - 07347e4
  - 447f3a2
  - da9dd60
---

# Quick Task 260415-m2b — Summary

## Objective

Apply improvements from the three project skills (`atomic-design`, `solidjs`,
`architecture-patterns`) to the existing codebase. Focus on actionable gaps
flagged by the skills' hard constraints: no raw values in components, no
style duplication, and fine-grained reactivity for SolidJS.

## What Was Done

### Task 1 — Design tokens + shared CSS utilities (commit `07347e4`)

Added eight new tokens to `src/styles/global.css` covering every hardcoded
color/backdrop/radius that appeared across the CSS modules, and introduced
`src/styles/shared.css` with `.button-base` and `.pref-row` utility classes.

**New tokens:**
- `--color-bg-chat` (`#000000`)
- `--color-border-subtle` (`rgba(255,255,255,0.1)`)
- `--color-bg-qr` (`#ffffff`)
- `--color-backdrop` (`rgba(0,0,0,0.7)`)
- `--color-backdrop-light` (`rgba(0,0,0,0.5)`)
- `--color-surface-overlay` (`rgba(26,26,26,0.95)`)
- `--color-surface-overlay-light` (`rgba(26,26,26,0.85)`)
- `--radius-md` (`8px`)

### Task 2 — Replace hardcoded values; compose shared styles (commit `447f3a2`)

Nine CSS modules updated to reference tokens and compose shared utility
classes via CSS Modules `composes` (natively supported by Vite).

**Token substitutions:**
| File | Change |
|------|--------|
| ChatSidebar.module.css | `#000000` → `--color-bg-chat`; two `rgba(...)` → `--color-border-subtle` |
| ChatMessage.module.css | `line-height: 1.4` → `var(--line-height-label)` |
| ChannelCard.module.css | `border-radius: 8px` → `var(--radius-md)` |
| LoginScreen.module.css | `#ffffff` → `--color-bg-qr`; `8px` → `--space-sm` |
| LogoutConfirmDialog.module.css | `rgba(0,0,0,0.7)` → `--color-backdrop` |
| PlayerSettingsOverlay.module.css | `rgba(0,0,0,0.5)` → `--color-backdrop-light`; `rgba(26,26,26,0.95)` → `--color-surface-overlay` |
| PlayerScreen.module.css | `rgba(26,26,26,0.85)` → `--color-surface-overlay-light` |

**Shared-style composition (eliminates 5 duplicates + 2 duplicates):**
- `.button-base` composed by: `LoginScreen`, `ChannelsScreen`, `PlayerScreen`, `SettingsScreen`, `LogoutConfirmDialog`
- `.pref-row` composed by: `SettingsScreen`, `PlayerSettingsOverlay`

Net effect: **9 files changed, +18/−59 lines** (41 lines of duplication
removed while keeping behavior identical).

### Task 3 — Memoize ChatSidebar message reversal (commit `da9dd60`)

`ChatSidebar.tsx` previously called `[...props.messages].reverse()` inside
the JSX `<For each={...}>`, so the reversed array was rebuilt on every
reactive read (including unrelated `width`, `scale`, and `status` updates).
Wrapped it in `createMemo` so the array rebuilds only when `props.messages`
itself changes — aligns with the SolidJS skill's fine-grained reactivity
guidance.

## Verification

- `npx vite build` — succeeds, 235 modules transformed
- `npx vitest run` — **99/99 tests pass** (15 test files)
- `grep -E "#[0-9a-fA-F]{3,6}|rgba\\(" src/ --include="*.module.css"` — **0 matches**
- `grep "composes.*button-base" src/` — **5 matches** (expected)
- `grep "composes.*pref-row" src/` — **2 matches** (expected)
- `grep "createMemo" src/components/ChatSidebar.tsx` — **1 match**

## Skill Alignment

| Skill | Rule | Status |
|-------|------|--------|
| atomic-design | Token-only references (no raw values in components) | ✓ All CSS modules use tokens |
| atomic-design | Compose, do not duplicate | ✓ 5 button + 2 pref-row duplicates consolidated |
| solidjs | Fine-grained reactivity via `createMemo` for derived arrays | ✓ ChatSidebar reversal memoized |
| architecture-patterns | N/A (backend skill) | — |

## Files Modified

```
src/styles/global.css                         (+8)
src/styles/shared.css                         (new)
src/components/ChatSidebar.module.css
src/components/ChatSidebar.tsx
src/components/ChatMessage.module.css
src/components/ChannelCard.module.css
src/components/LogoutConfirmDialog.module.css
src/components/PlayerSettingsOverlay.module.css
src/screens/LoginScreen.module.css
src/screens/ChannelsScreen.module.css
src/screens/PlayerScreen.module.css
src/screens/SettingsScreen.module.css
```

## Notes / Intentional Deviations from Plan

- **`ChatMessage.module.css` `padding-block: 2px` kept literal.** The plan
  suggested either bumping to `--space-xs` (4px — changes chat density) or
  adding a `--space-2xs: 2px` token. A one-off 2px padding that no other
  component uses does not earn a token per the atomic-design skill's own
  "tokens exist for reuse" rule. Left the literal value; swapped `1.4` →
  `var(--line-height-label)` which was a genuine duplicate.
- **Shared CSS import path** is `'../styles/shared.css'` (not
  `'../../styles/shared.css'` as the plan drafted). Both `components/` and
  `screens/` sit directly under `src/`, so one `..` is correct. Verified by
  successful build.
