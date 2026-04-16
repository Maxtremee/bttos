---
phase: quick
plan: 260416-fjq
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/atoms/ActionButton.tsx
  - src/components/atoms/ActionButton.module.css
  - src/components/molecules/PrefRow.tsx
  - src/components/molecules/PrefRow.module.css
  - src/components/organisms/VideoInfoBar.tsx
  - src/components/organisms/VideoInfoBar.module.css
  - src/components/organisms/PlayerErrorOverlay.tsx
  - src/components/organisms/PlayerErrorOverlay.module.css
  - src/components/organisms/ScopeErrorOverlay.tsx
  - src/components/organisms/ScopeErrorOverlay.module.css
  - src/components/LogoutConfirmDialog.tsx
  - src/components/PlayerSettingsOverlay.tsx
  - src/screens/LoginScreen.tsx
  - src/screens/LoginScreen.module.css
  - src/screens/ChannelsScreen.tsx
  - src/screens/ChannelsScreen.module.css
  - src/screens/SettingsScreen.tsx
  - src/screens/SettingsScreen.module.css
  - src/screens/PlayerScreen.tsx
  - src/screens/PlayerScreen.module.css
must_haves:
  truths:
    - "ActionButton atom exists and is used in all 7 previous button sites"
    - "PrefRow molecule exists and is used in all 4 previous inline toggle-row sites"
    - "PlayerScreen delegates error overlays and info bar to organism components"
    - "All 99 existing tests continue to pass"
    - "Production build succeeds"
  artifacts:
    - path: "src/components/atoms/ActionButton.tsx"
      provides: "Reusable focusable button atom"
      contains: "focusKey"
    - path: "src/components/molecules/PrefRow.tsx"
      provides: "Reusable preference-toggle row molecule"
      contains: "onToggle"
    - path: "src/components/organisms/VideoInfoBar.tsx"
      provides: "Player overlay info bar organism"
      contains: "streamData"
---

<objective>
Apply the atomic-design skill by decomposing large components into a proper atoms → molecules → organisms hierarchy. Three extractions eliminate duplicated JSX patterns and substantially reduce the LOC of PlayerScreen (god component) and the two settings surfaces.

Purpose: enforce "compose, do not duplicate" and "never skip a level" from the atomic-design skill; reduce PlayerScreen from ~434 → ~350 LOC; collapse 4 duplicate pref-row blocks and 7 duplicate focusable-button wrappers into single components.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: Extract ActionButton atom — replace 7 focusable-button duplicates</name>
  <files>
    src/components/atoms/ActionButton.tsx (new)
    src/components/atoms/ActionButton.module.css (new)
    src/components/LogoutConfirmDialog.tsx
    src/components/LogoutConfirmDialog.module.css
    src/screens/LoginScreen.tsx
    src/screens/LoginScreen.module.css
    src/screens/ChannelsScreen.tsx
    src/screens/ChannelsScreen.module.css
    src/screens/SettingsScreen.tsx
    src/screens/SettingsScreen.module.css
  </files>
  <action>
Create `src/components/atoms/ActionButton.tsx`:

```tsx
import type { JSX } from 'solid-js'
import { Focusable } from '../../navigation'
import styles from './ActionButton.module.css'

export type ActionButtonVariant = 'primary' | 'destructive'

interface ActionButtonProps {
  focusKey: string
  onPress: () => void
  variant?: ActionButtonVariant
  children: JSX.Element
}

/**
 * Focusable button atom — indivisible actionable element.
 * Wraps spatial-navigation Focusable + a native button with focus-ring styling.
 */
export default function ActionButton(props: ActionButtonProps) {
  return (
    <Focusable focusKey={props.focusKey} onEnterPress={() => props.onPress()} as="div">
      {({ focused }: { focused: () => boolean }) => (
        <button
          class={`${styles.button} ${styles[props.variant ?? 'primary']} ${focused() ? 'focused' : ''}`}
          onClick={() => props.onPress()}
        >
          {props.children}
        </button>
      )}
    </Focusable>
  )
}
```

Create `src/components/atoms/ActionButton.module.css`:

```css
.button {
  composes: button-base from '../../styles/shared.css';
}

.primary {
  background: var(--color-accent);
}

.destructive {
  background: var(--color-destructive);
}
```

**Replace 7 call sites:**

1. **LoginScreen.tsx** (~line 152): replace the Focusable+button "Request new code" block with `<ActionButton focusKey="login-retry-btn" onPress={startFlow}>Request new code</ActionButton>`. Remove local `.button` rule from LoginScreen.module.css.

2. **ChannelsScreen.tsx** (~line 74): replace the Focusable+button Retry with `<ActionButton focusKey="retry-btn" onPress={() => refetch()}>Retry</ActionButton>`. Remove local `.button` rule from ChannelsScreen.module.css.

3. **PlayerScreen.tsx** scope error (~line 308): replace with `<ActionButton focusKey="scope-reauth" onPress={handleScopeReauth}>Sign in again</ActionButton>`.

4. **PlayerScreen.tsx** player retry (~line 369): replace with `<ActionButton focusKey="player-retry" onPress={handleRetry}>Retry</ActionButton>`. Remove local `.button` rule from PlayerScreen.module.css.

5. **SettingsScreen.tsx** (~line 75): replace with `<ActionButton focusKey="settings-logout" variant="destructive" onPress={() => setDialogOpen(true)}>Log Out</ActionButton>`. Remove local `.button` rule from SettingsScreen.module.css.

6. **LogoutConfirmDialog.tsx** Cancel (~line 45): replace with `<ActionButton focusKey="logout-cancel" onPress={() => props.onCancel()}>Cancel</ActionButton>`.

7. **LogoutConfirmDialog.tsx** Confirm (~line 58): replace with `<ActionButton focusKey="logout-confirm" variant="destructive" onPress={() => { twitchAuthService.clearTokens(); history.set({ value: '/login' }) }}>Log Out</ActionButton>`. Remove local `.button`, `.buttonCancel`, `.buttonConfirm` rules from LogoutConfirmDialog.module.css.

Ensure all tests still pass — tests mock `Focusable` to pass `{focused: () => false}` to children, which ActionButton's inner render follows.
  </action>
  <verify>
    <automated>cd /Users/maksymilianzadka/repos/twitch-webos-alt && test -f src/components/atoms/ActionButton.tsx && npx vitest run 2>&1 | tail -5 && npx vite build 2>&1 | tail -3</automated>
  </verify>
  <done>ActionButton atom created; 7 call sites migrated; local `.button` CSS rules removed from the 4 consumer modules; all 99 tests pass; build succeeds.</done>
</task>

<task type="auto">
  <name>Task 2: Extract PrefRow molecule — replace 4 inline toggle-row duplicates</name>
  <files>
    src/components/molecules/PrefRow.tsx (new)
    src/components/molecules/PrefRow.module.css (new)
    src/screens/SettingsScreen.tsx
    src/screens/SettingsScreen.module.css
    src/components/PlayerSettingsOverlay.tsx
    src/components/PlayerSettingsOverlay.module.css
  </files>
  <action>
Create `src/components/molecules/PrefRow.tsx`:

```tsx
import { Focusable } from '../../navigation'
import styles from './PrefRow.module.css'

interface PrefRowProps {
  focusKey: string
  label: string
  value: string
  active: boolean
  onToggle: () => void
}

/**
 * Preference toggle row molecule — composes a focusable container
 * + label atom + value atom. Presentational: data in via props,
 * toggle event out via callback.
 */
export default function PrefRow(props: PrefRowProps) {
  return (
    <Focusable focusKey={props.focusKey} onEnterPress={() => props.onToggle()} as="div">
      {({ focused }: { focused: () => boolean }) => (
        <div class={`${styles.row} ${focused() ? 'focused' : ''}`}>
          <span class={styles.label}>{props.label}</span>
          <span class={`${styles.value} ${props.active ? styles.active : styles.inactive}`}>
            {props.value}
          </span>
        </div>
      )}
    </Focusable>
  )
}
```

Create `src/components/molecules/PrefRow.module.css`:

```css
.row {
  composes: pref-row from '../../styles/shared.css';
}

.label {
  font-size: var(--font-size-body);
  color: var(--color-text-primary);
}

.value {
  font-size: var(--font-size-label);
  font-weight: var(--font-weight-semibold);
}

.active {
  color: var(--color-accent);
}

.inactive {
  color: var(--color-text-disabled);
}
```

**Replace 4 inline duplicates:**

In `SettingsScreen.tsx`:
```tsx
<PrefRow
  focusKey="settings-pref-chat-visible"
  label="Chat visibility"
  value={prefsStore.chatVisible ? 'On' : 'Off'}
  active={prefsStore.chatVisible}
  onToggle={() => updatePref('chatVisible', !prefsStore.chatVisible)}
/>
<PrefRow
  focusKey="settings-pref-chat-position"
  label="Chat position"
  value={prefsStore.chatPosition === 'right' ? 'Right' : 'Left'}
  active={true}
  onToggle={() => updatePref('chatPosition', prefsStore.chatPosition === 'right' ? 'left' : 'right')}
/>
```

Remove `.prefRow`, `.prefLabel`, `.prefValue` from SettingsScreen.module.css (now lives in PrefRow.module.css).

In `PlayerSettingsOverlay.tsx`: same two replacements with focusKeys `overlay-pref-chat-visible` and `overlay-pref-chat-position`. Remove `.prefRow`, `.prefLabel`, `.prefValue` from PlayerSettingsOverlay.module.css.
  </action>
  <verify>
    <automated>cd /Users/maksymilianzadka/repos/twitch-webos-alt && test -f src/components/molecules/PrefRow.tsx && grep -c "PrefRow" src/screens/SettingsScreen.tsx src/components/PlayerSettingsOverlay.tsx && npx vitest run 2>&1 | tail -5</automated>
  </verify>
  <done>PrefRow molecule created; 4 call sites migrated (2 in SettingsScreen, 2 in PlayerSettingsOverlay); local pref-row rules removed from both consumer CSS modules; all tests pass.</done>
</task>

<task type="auto">
  <name>Task 3: Extract organisms from PlayerScreen — VideoInfoBar, PlayerErrorOverlay, ScopeErrorOverlay</name>
  <files>
    src/components/organisms/VideoInfoBar.tsx (new)
    src/components/organisms/VideoInfoBar.module.css (new)
    src/components/organisms/PlayerErrorOverlay.tsx (new)
    src/components/organisms/PlayerErrorOverlay.module.css (new)
    src/components/organisms/ScopeErrorOverlay.tsx (new)
    src/components/organisms/ScopeErrorOverlay.module.css (new)
    src/screens/PlayerScreen.tsx
    src/screens/PlayerScreen.module.css
  </files>
  <action>
Create three organism components, each **presentational** — data via props, events via callbacks, no data fetching, no service access:

**`src/components/organisms/VideoInfoBar.tsx`** — bottom overlay with stream metadata:
```tsx
import type { StreamData } from '../../services/TwitchChannelService'
import styles from './VideoInfoBar.module.css'

interface VideoInfoBarProps {
  stream: StreamData
}

function formatWatching(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K watching`
  return `${count} watching`
}

export default function VideoInfoBar(props: VideoInfoBarProps) {
  return (
    <div class={styles.bar}>
      <div class={styles.inner}>
        <div>
          <div class={styles.username}>{props.stream.user_name}</div>
          <div class={styles.title}>{props.stream.title}</div>
        </div>
        <div class={styles.right}>
          <div class={styles.meta}>{props.stream.game_name}</div>
          <div class={styles.meta}>{formatWatching(props.stream.viewer_count)}</div>
        </div>
      </div>
    </div>
  )
}
```

CSS module: move `.infoBar`, `.infoBarInner`, `.infoUsername`, `.infoTitle`, `.infoRight`, `.infoMeta` from PlayerScreen.module.css (renamed to `.bar`, `.inner`, `.username`, `.title`, `.right`, `.meta`).

**`src/components/organisms/PlayerErrorOverlay.tsx`** — retry overlay when playback fails:
```tsx
import ActionButton from '../atoms/ActionButton'
import styles from './PlayerErrorOverlay.module.css'

export type PlayerErrorKind = 'offline' | 'network' | 'unknown'

interface PlayerErrorOverlayProps {
  kind: PlayerErrorKind
  onRetry: () => void
}

const HEADINGS: Record<PlayerErrorKind, string> = {
  offline: 'Stream is offline',
  network: 'Connection lost',
  unknown: 'Playback error',
}

const BODIES: Record<PlayerErrorKind, string> = {
  offline: 'This channel has ended their stream. Press OK to retry or Back to return to channels.',
  network: 'Could not reach the stream. Check your connection, then press OK to retry.',
  unknown: 'Something went wrong. Press OK to retry or Back to return to channels.',
}

export default function PlayerErrorOverlay(props: PlayerErrorOverlayProps) {
  return (
    <div class={`${styles.overlay} gap-col-md`}>
      <h2 class={styles.heading}>{HEADINGS[props.kind]}</h2>
      <p class={styles.text}>{BODIES[props.kind]}</p>
      <ActionButton focusKey="player-retry" onPress={props.onRetry}>Retry</ActionButton>
    </div>
  )
}
```

CSS: move `.errorOverlay`, `.errorHeading`, `.errorText` from PlayerScreen.module.css (renamed to `.overlay`, `.heading`, `.text`).

**`src/components/organisms/ScopeErrorOverlay.tsx`** — full-screen overlay when chat scope missing:
```tsx
import ActionButton from '../atoms/ActionButton'
import styles from './ScopeErrorOverlay.module.css'

interface ScopeErrorOverlayProps {
  onReauth: () => void
}

export default function ScopeErrorOverlay(props: ScopeErrorOverlayProps) {
  return (
    <div class={`${styles.overlay} gap-col-md`}>
      <h2 class={styles.heading}>Chat access required</h2>
      <p class={styles.text}>
        Your login needs to be updated to show chat. Press OK to log out and sign in again.
      </p>
      <ActionButton focusKey="scope-reauth" onPress={props.onReauth}>Sign in again</ActionButton>
    </div>
  )
}
```

CSS: move `.scopeOverlay`, `.scopeHeading`, `.scopeText` from PlayerScreen.module.css (renamed).

**Update PlayerScreen.tsx:**
- Import the three organisms
- Replace the inline scope-error overlay block (~12 lines) with `<ScopeErrorOverlay onReauth={handleScopeReauth} />`
- Replace the inline error overlay block (~28 lines) with `<PlayerErrorOverlay kind={errorKind()} onRetry={handleRetry} />`
- Replace the inline info bar block (~20 lines) with `<VideoInfoBar stream={streamData()!} />`
- Remove `formatWatching` local helper (moved into VideoInfoBar)
- Remove the now-unused CSS rules from PlayerScreen.module.css
- PlayerScreen drops from ~434 to ~350 LOC
  </action>
  <verify>
    <automated>cd /Users/maksymilianzadka/repos/twitch-webos-alt && test -f src/components/organisms/VideoInfoBar.tsx && test -f src/components/organisms/PlayerErrorOverlay.tsx && test -f src/components/organisms/ScopeErrorOverlay.tsx && npx vitest run 2>&1 | tail -5 && wc -l src/screens/PlayerScreen.tsx</automated>
  </verify>
  <done>Three organism files created. PlayerScreen imports and composes them instead of inline JSX. PlayerScreen LOC reduced by ~80 lines. All 99 tests pass. Build succeeds.</done>
</task>

</tasks>

<verification>
1. `npx vitest run` — all 99 tests still pass
2. `npx vite build` — completes with no errors
3. `wc -l src/screens/PlayerScreen.tsx` — under 360 lines (was 434)
4. `grep -c "ActionButton" src/` — appears in at least 5 consumer files
5. `grep -c "PrefRow" src/` — appears in exactly 2 consumer files
6. No local `.button` rules remain in LoginScreen/ChannelsScreen/PlayerScreen/SettingsScreen/LogoutConfirmDialog CSS modules
</verification>

<success_criteria>
- `src/components/atoms/ActionButton.tsx` exists and replaces 7 previous inline Focusable+button blocks
- `src/components/molecules/PrefRow.tsx` exists and replaces 4 previous inline toggle-row blocks
- `src/components/organisms/{VideoInfoBar,PlayerErrorOverlay,ScopeErrorOverlay}.tsx` exist
- PlayerScreen LOC drops by at least 70 lines
- SettingsScreen LOC drops by at least 35 lines
- PlayerSettingsOverlay LOC drops by at least 40 lines
- All 99 tests pass; production build succeeds
</success_criteria>
