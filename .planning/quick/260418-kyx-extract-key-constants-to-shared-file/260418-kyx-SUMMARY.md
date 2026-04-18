---
phase: quick-260418-kyx
status: complete
completed: 2026-04-18
---

# Quick Task 260418-kyx: Extract webOS remote keyCode constants

## What changed

- Added `src/const/keys.ts` exporting `KEY_BACK`, `KEY_RED`, `KEY_GREEN`, `KEY_YELLOW`, `KEY_BLUE`.
- `src/App.tsx` — dropped local `KEY_BACK`/`KEY_GREEN` declarations, imports from `./const/keys`.
- `src/screens/PlayerScreen.tsx` — dropped the four local color-button keyCode declarations (and the comment), imports from `../const/keys`.
- `src/components/LogoutConfirmDialog.tsx` — dropped local `KEY_BACK`, imports from `../const/keys`.
- `src/components/PlayerSettingsOverlay.tsx` — replaced magic `461` with `KEY_BACK`, imports from `../const/keys`.

## Verification

- `npx tsc --noEmit` — clean.
- `rg "= 461|= 40[3-6]" src` — only matches are in `src/const/keys.ts` and an unrelated HTTP 403 status check in `TwitchChatService.ts`.
- `npx vitest run` — could not run in this worktree (pre-existing `@testing-library/jest-dom/dist/vitest.mjs` resolution failure unrelated to this change; confirmed identical failure before the edits via `git stash`).

## Notes

- Only the keyCodes actually referenced in code were added; no speculative keys. Additions should follow the same pattern as new remote keys are wired up.
- Spatial-navigation handles d-pad/OK via `@lampa-dev/solidjs-spatial-navigation`, so no directional key constants are needed here.
