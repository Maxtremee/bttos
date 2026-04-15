---
phase: quick
plan: 260415-lly
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/ChannelCard.tsx
  - src/components/ChannelCard.module.css
  - src/components/ChatMessage.tsx
  - src/components/ChatMessage.module.css
  - src/components/ChatSidebar.tsx
  - src/components/ChatSidebar.module.css
  - src/components/LogoutConfirmDialog.tsx
  - src/components/LogoutConfirmDialog.module.css
  - src/components/ChannelGrid.tsx
  - src/components/ChannelGrid.module.css
  - src/components/PlayerSettingsOverlay.tsx
  - src/components/PlayerSettingsOverlay.module.css
  - src/screens/LoginScreen.tsx
  - src/screens/LoginScreen.module.css
  - src/screens/ChannelsScreen.tsx
  - src/screens/ChannelsScreen.module.css
  - src/screens/PlayerScreen.tsx
  - src/screens/PlayerScreen.module.css
  - src/screens/SettingsScreen.tsx
  - src/screens/SettingsScreen.module.css
autonomous: true
requirements: []
must_haves:
  truths:
    - "All component/screen inline styles are extracted to colocated .module.css files"
    - "CSS variables from global.css remain accessible in module files (they are on :root)"
    - "Global utility classes (.focused, .gap-*) still work alongside CSS module classes"
    - "Dynamic/computed styles (scale-dependent sizes, signal-driven widths) remain as inline styles"
    - "Application builds successfully with no CSS errors"
    - "Existing tests pass without changes or with minimal class selector updates"
  artifacts:
    - path: "src/components/ChannelCard.module.css"
      provides: "Extracted styles for ChannelCard"
    - path: "src/components/ChatMessage.module.css"
      provides: "Extracted styles for ChatMessage"
    - path: "src/components/ChatSidebar.module.css"
      provides: "Extracted styles for ChatSidebar"
    - path: "src/components/LogoutConfirmDialog.module.css"
      provides: "Extracted styles for LogoutConfirmDialog"
    - path: "src/components/ChannelGrid.module.css"
      provides: "Extracted styles for ChannelGrid"
    - path: "src/components/PlayerSettingsOverlay.module.css"
      provides: "Extracted styles for PlayerSettingsOverlay"
    - path: "src/screens/LoginScreen.module.css"
      provides: "Extracted styles for LoginScreen"
    - path: "src/screens/ChannelsScreen.module.css"
      provides: "Extracted styles for ChannelsScreen"
    - path: "src/screens/PlayerScreen.module.css"
      provides: "Extracted styles for PlayerScreen"
    - path: "src/screens/SettingsScreen.module.css"
      provides: "Extracted styles for SettingsScreen"
  key_links:
    - from: "src/components/*.tsx"
      to: "src/components/*.module.css"
      via: "import styles from './Component.module.css'"
      pattern: "import styles from"
    - from: "src/screens/*.tsx"
      to: "src/screens/*.module.css"
      via: "import styles from './Screen.module.css'"
      pattern: "import styles from"
---

<objective>
Move all inline styles from components and screens to colocated CSS module files (.module.css), keeping global variables and utility classes in src/styles/global.css.

Purpose: Improve code readability, enable proper CSS caching by the browser, reduce JSX noise, and follow standard CSS module conventions.
Output: 10 new .module.css files colocated with their components/screens, and updated .tsx files using CSS module class references.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/styles/global.css
@src/components/ChannelCard.tsx
@src/components/ChatMessage.tsx
@src/components/ChatSidebar.tsx
@src/components/LogoutConfirmDialog.tsx
@src/components/ChannelGrid.tsx
@src/components/PlayerSettingsOverlay.tsx
@src/screens/LoginScreen.tsx
@src/screens/ChannelsScreen.tsx
@src/screens/PlayerScreen.tsx
@src/screens/SettingsScreen.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extract component inline styles to CSS modules</name>
  <files>
    src/components/ChannelCard.tsx
    src/components/ChannelCard.module.css
    src/components/ChatMessage.tsx
    src/components/ChatMessage.module.css
    src/components/ChatSidebar.tsx
    src/components/ChatSidebar.module.css
    src/components/LogoutConfirmDialog.tsx
    src/components/LogoutConfirmDialog.module.css
    src/components/ChannelGrid.tsx
    src/components/ChannelGrid.module.css
    src/components/PlayerSettingsOverlay.tsx
    src/components/PlayerSettingsOverlay.module.css
  </files>
  <action>
For each component, create a colocated `.module.css` file and extract inline styles into named CSS classes. Update the `.tsx` file to import and use the CSS module.

**Pattern for each file:**
1. Create `ComponentName.module.css` with classes for each styled element
2. Add `import styles from './ComponentName.module.css'` at top of .tsx
3. Replace `style={{...}}` with `class={styles.className}`
4. For elements that ALSO use global classes (`.focused`, `.gap-*`), combine: `class={\`${styles.card} ${props.focused ? 'focused' : ''}\`}` or use template literals
5. Keep inline styles ONLY for truly dynamic/computed values that depend on signals or props at runtime

**Per-component specifics:**

**ChannelCard.tsx** — All styles are static CSS-variable references. Extract everything. The root div combines `styles.card` with the global `focused` class: `class={\`${styles.card} ${props.focused ? 'focused' : ''}\`}`. Create classes: `.card`, `.thumbnail`, `.info`, `.userName`, `.title`, `.gameName`, `.viewerCount`.

**ChatMessage.tsx** — The `font-size` and emote sizes are dynamic (computed from `scale` signal). Keep `font-size` and `padding-block` as inline style (they use `fontSizePx()` signal). Extract static properties (`line-height`, `word-break`, `font-weight`, `color` for username/text spans) into module classes. The inline `style="vertical-align: middle; display: inline-block"` on emote `<img>` tags should become a `.emote` class. Create classes: `.message`, `.username`, `.text`, `.emote`.

**ChatSidebar.tsx** — The `width` is dynamic (prop-driven). Keep `width` as inline style. Extract everything else. The conditional border (left vs right based on `position` prop) should use two classes: `.borderLeft` and `.borderRight`, applied conditionally. Create classes: `.container`, `.borderLeft`, `.borderRight`, `.statusBar`, `.statusText`, `.messageList`.

**LogoutConfirmDialog.tsx** — All styles are static. Extract everything. Root backdrop uses `.backdrop`. Dialog box uses `.dialog` combined with global `gap-col-lg`. Buttons use `.button` combined with global `focused`. Add `.buttonDestructive` for the red logout button (extends `.button` with `background: var(--color-destructive)`). Create classes: `.backdrop`, `.dialog`, `.heading`, `.description`, `.buttonRow`, `.button`, `.buttonDestructive`.

**ChannelGrid.tsx** — Simple grid layout. Extract grid styles. Create classes: `.grid`.

**PlayerSettingsOverlay.tsx** — Extract backdrop, panel, setting row, and hint styles. Setting rows use `.settingRow` combined with global `focused`. Create classes: `.backdrop`, `.panel`, `.sectionTitle`, `.settingRow`, `.settingLabel`, `.settingValue`, `.hint`.

**IMPORTANT rules:**
- CSS variables (`var(--color-*)`, `var(--space-*)`, etc.) work in CSS modules because they are defined on `:root` in global.css. Use them freely in .module.css files.
- Global classes like `focused` and `gap-col-md` are NOT scoped to modules. Reference them as plain strings in JSX, not through `styles.*`.
- When combining module class + global class, use template literal: `class={\`${styles.foo} gap-col-md\`}` or `class={\`${styles.foo} ${condition ? 'focused' : ''}\`}`
- For conditional dynamic colors (like `prefsStore.chatVisible ? 'var(--color-accent)' : 'var(--color-text-disabled)'`), keep as inline `style` since the value depends on a runtime signal.
- Hardcoded color values like `#000000`, `rgba(0, 0, 0, 0.7)`, `rgba(26, 26, 26, 0.95)`, `rgba(255,255,255,0.1)` should move into the CSS module as-is.
  </action>
  <verify>
    <automated>cd /Users/maksymilianzadka/repos/twitch-webos-alt && npx vite build 2>&1 | tail -5</automated>
  </verify>
  <done>All 6 component .module.css files exist. All 6 component .tsx files import and use CSS module classes instead of inline styles. Only truly dynamic styles remain inline. Build succeeds.</done>
</task>

<task type="auto">
  <name>Task 2: Extract screen inline styles to CSS modules</name>
  <files>
    src/screens/LoginScreen.tsx
    src/screens/LoginScreen.module.css
    src/screens/ChannelsScreen.tsx
    src/screens/ChannelsScreen.module.css
    src/screens/PlayerScreen.tsx
    src/screens/PlayerScreen.module.css
    src/screens/SettingsScreen.tsx
    src/screens/SettingsScreen.module.css
  </files>
  <action>
Apply the same CSS module extraction pattern to all 4 screen files.

**LoginScreen.tsx** — All styles static. Create classes: `.main` (combined with `gap-col-xl`), `.heading`, `.loadingText`, `.codeLayout` (combined with `gap-row-2xl`), `.qrColumn` (combined with `gap-col-md`), `.qrBox`, `.urlText`, `.codeColumn` (combined with `gap-col-md`), `.instruction`, `.userCode`, `.statusText`, `.errorSection` (combined with `gap-col-md`), `.button`.

**ChannelsScreen.tsx** — Extract all styles. The gear icon has a conditional color based on `focused()` — keep that single `color` property inline, extract everything else. Create classes: `.main`, `.header`, `.heading`, `.gearIcon`, `.centerState`, `.stateText`, `.emptyHeading`, `.emptySubtext`, `.button`, `.errorSection` (combined with `gap-col-md`).

**PlayerScreen.tsx** — This is the largest file. Many styles are static despite the file's complexity. Extract all static overlay/layout styles. Keep inline:
  - `video` element `display` (toggles based on `playerState()` signal)
  - Dynamic computations that do not exist here (all player styles use CSS vars, so they CAN move to modules)

Create classes: `.scopeOverlay` (combined with `gap-col-md`), `.scopeHeading`, `.scopeText`, `.scopeButton`, `.layout`, `.chatLeft`, `.videoArea`, `.video`, `.videoHidden` (display:none variant), `.loadingOverlay`, `.loadingText`, `.errorOverlay` (combined with `gap-col-md`), `.errorHeading`, `.errorText`, `.retryButton`, `.infoBar`, `.infoLayout`, `.infoLeft`, `.streamerName`, `.streamTitle`, `.infoRight`, `.infoMeta`, `.toggleHint`.

For the video element, use two classes: `class={playerState() === 'error' ? styles.videoHidden : styles.video}` instead of the inline display toggle.

**SettingsScreen.tsx** — All styles static. Create classes: `.main`, `.heading`, `.settingsGroup` (combined with `gap-col-lg`), `.settingRow`, `.settingLabel`, `.settingValue`, `.logoutSection`, `.button`, `.buttonDestructive`.

Same rules apply as Task 1 for combining global + module classes and handling dynamic values.
  </action>
  <verify>
    <automated>cd /Users/maksymilianzadka/repos/twitch-webos-alt && npx vite build 2>&1 | tail -5</automated>
  </verify>
  <done>All 4 screen .module.css files exist. All 4 screen .tsx files import and use CSS module classes. Only truly dynamic styles remain inline. Build succeeds.</done>
</task>

<task type="auto">
  <name>Task 3: Verify tests pass and fix any broken selectors</name>
  <files>
    src/components/__tests__/ChannelCard.test.tsx
    src/components/__tests__/ChannelGrid.test.tsx
    src/components/__tests__/ChatSidebar.test.tsx
    src/components/__tests__/LogoutConfirmDialog.test.tsx
    src/screens/__tests__/ChannelsScreen.test.tsx
    src/screens/__tests__/LoginScreen.test.tsx
    src/screens/__tests__/PlayerScreen.test.tsx
  </files>
  <action>
Run the full test suite. If tests fail due to:

1. **Checking for inline `style` attributes** that no longer exist (now in CSS modules) — update assertions to check for the CSS module class instead. In Vitest with jsdom, CSS module imports resolve to `{ className: 'className' }` by default (Vite's CSS module handling in test mode). If the test config uses `css: true` or a CSS module transform, class names will be the original names. Check the Vite/Vitest config first (`vite.config.ts` or `vitest.config.ts`) to understand how CSS modules are handled in tests.

2. **Checking for hardcoded class names** like `.focused` — these are global and unchanged, should still work.

3. **Querying by role/text** — these should be unaffected by the CSS change.

Fix any broken tests. Do NOT change test behavior/intent — only update selectors and assertions to match the new CSS module class approach.

If CSS modules are not properly configured for the test environment (e.g., tests fail because `.module.css` imports are not handled), add CSS module support to the Vitest config. Typically this means ensuring `css: true` is set in the Vitest config, or adding an identity-obj-proxy-style transform. Check if Vite's built-in CSS module support is already active in test mode.
  </action>
  <verify>
    <automated>cd /Users/maksymilianzadka/repos/twitch-webos-alt && npx vitest run 2>&1 | tail -20</automated>
  </verify>
  <done>All existing tests pass. No test behavior changed — only selectors updated if needed to match CSS module class names.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

No trust boundaries affected — this is a pure styling refactor with no behavior changes.

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-01 | N/A | CSS modules | accept | Styling-only refactor, no security surface |
</threat_model>

<verification>
1. `npx vite build` completes without errors
2. `npx vitest run` — all tests pass
3. 10 new `.module.css` files exist colocated with their components/screens
4. No inline `style={{...}}` remains in .tsx files except for truly dynamic values (scale-computed sizes, signal-driven widths/display toggles, conditional colors from reactive state)
5. Global classes (`.focused`, `.gap-*`) are still used as plain strings, not through module imports
</verification>

<success_criteria>
- All 10 components/screens migrated from inline styles to CSS modules
- global.css unchanged (variables, reset, focus, gap utilities preserved)
- Application builds and renders identically to before
- All tests pass
</success_criteria>

<output>
After completion, create `.planning/quick/260415-lly-move-to-css-modules-colocate-styles-with/260415-lly-SUMMARY.md`
</output>
