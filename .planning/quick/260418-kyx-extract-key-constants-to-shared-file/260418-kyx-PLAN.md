---
phase: quick-260418-kyx
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/const/keys.ts
  - src/App.tsx
  - src/screens/PlayerScreen.tsx
  - src/components/LogoutConfirmDialog.tsx
  - src/components/PlayerSettingsOverlay.tsx
autonomous: true
requirements:
  - QT-260418-kyx
---

<objective>
Extract duplicated webOS remote keyCode constants into a single shared module at `src/const/keys.ts` and update all callers to import from it.

Today, `KEY_BACK`, `KEY_GREEN`, `KEY_RED`, `KEY_YELLOW`, and `KEY_BLUE` are redeclared across `App.tsx`, `PlayerScreen.tsx`, and `LogoutConfirmDialog.tsx`, and `PlayerSettingsOverlay.tsx` still uses a raw `461` literal for Back. Centralizing them removes duplication and the last magic number.

Output:
- New file `src/const/keys.ts` exporting named constants for all remote keyCodes currently in use.
- Four call-site files updated to import from the new module; no local redeclarations remain.
- Behavior unchanged: same keyCodes mapped to same handlers.
</objective>

<tasks>

### Task 1: Create `src/const/keys.ts`

Define and export one `as const` numeric constant per webOS remote key currently referenced:

- `KEY_BACK = 461`
- `KEY_RED = 403`
- `KEY_GREEN = 404`
- `KEY_YELLOW = 405`
- `KEY_BLUE = 406`

Each exported as a top-level `export const`. Short comment block at the top explaining these are webOS TV remote keyCodes from the keydown event. No other logic.

### Task 2: Update `src/App.tsx`

- Remove local `KEY_BACK` and `KEY_GREEN` declarations.
- Add `import { KEY_BACK, KEY_GREEN } from './const/keys'`.
- Leave handler logic untouched.

### Task 3: Update `src/screens/PlayerScreen.tsx`

- Remove the local `KEY_RED`, `KEY_GREEN`, `KEY_YELLOW`, `KEY_BLUE` block and its "Remote color-button keyCodes" comment.
- Add `import { KEY_RED, KEY_GREEN, KEY_YELLOW, KEY_BLUE } from '../const/keys'`.
- Keep the `CHAT_WIDTH_*` / `*_HIDE_MS` constants in place.

### Task 4: Update `src/components/LogoutConfirmDialog.tsx`

- Remove local `const KEY_BACK = 461`.
- Add `import { KEY_BACK } from '../const/keys'`.

### Task 5: Update `src/components/PlayerSettingsOverlay.tsx`

- Replace the `e.keyCode === 461` magic literal with `e.keyCode === KEY_BACK`.
- Add `import { KEY_BACK } from '../const/keys'`.

### Task 6: Verify

- `npx tsc --noEmit` passes.
- `npx vitest run` passes.

</tasks>

<verify>
- `rg "= 461|= 40[3-6]" src` returns only matches inside `src/const/keys.ts`.
- `rg "KEY_(BACK|RED|GREEN|YELLOW|BLUE)" src` shows `const/keys.ts` as the only declaration site; all other hits are imports or usages.
- Typecheck + tests green.
</verify>
