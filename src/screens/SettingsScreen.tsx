import { createSignal, onMount } from 'solid-js'
import { Focusable, useSpatialNavigation } from '../navigation'
import { prefsStore, updatePref } from '../stores/prefsStore'
import LogoutConfirmDialog from '../components/LogoutConfirmDialog'
import styles from './SettingsScreen.module.css'

export default function SettingsScreen() {
  const { setFocus } = useSpatialNavigation()
  const [dialogOpen, setDialogOpen] = createSignal(false)

  onMount(() => setFocus('settings-pref-chat-visible'))

  return (
    <main class={styles.screen}>
      <h1 class={styles.heading}>
        Settings
      </h1>

      <div class={`${styles.prefList} gap-col-lg`}>
        {/* Chat visibility toggle */}
        <Focusable
          focusKey="settings-pref-chat-visible"
          onEnterPress={() => updatePref('chatVisible', !prefsStore.chatVisible)}
          as="div"
        >
          {({ focused }) => (
            <div
              class={`${styles.prefRow} ${focused() ? 'focused' : ''}`}
            >
              <span class={styles.prefLabel}>
                Chat visibility
              </span>
              <span
                class={styles.prefValue}
                style={{
                  color: prefsStore.chatVisible
                    ? 'var(--color-accent)'
                    : 'var(--color-text-disabled)',
                }}
              >
                {prefsStore.chatVisible ? 'On' : 'Off'}
              </span>
            </div>
          )}
        </Focusable>

        {/* Chat position toggle */}
        <Focusable
          focusKey="settings-pref-chat-position"
          onEnterPress={() =>
            updatePref('chatPosition', prefsStore.chatPosition === 'right' ? 'left' : 'right')
          }
          as="div"
        >
          {({ focused }) => (
            <div
              class={`${styles.prefRow} ${focused() ? 'focused' : ''}`}
            >
              <span class={styles.prefLabel}>
                Chat position
              </span>
              <span
                class={styles.prefValue}
                style={{ color: 'var(--color-accent)' }}
              >
                {prefsStore.chatPosition === 'right' ? 'Right' : 'Left'}
              </span>
            </div>
          )}
        </Focusable>
      </div>

      {/* Log Out button — visually separated from prefs */}
      <div class={styles.logoutSection}>
        <Focusable
          focusKey="settings-logout"
          onEnterPress={() => setDialogOpen(true)}
          as="div"
        >
          {({ focused }) => (
            <button
              class={`${styles.button} ${focused() ? 'focused' : ''}`}
            >
              Log Out
            </button>
          )}
        </Focusable>
      </div>

      <LogoutConfirmDialog open={dialogOpen()} onCancel={() => { setDialogOpen(false); setFocus('settings-logout') }} />
    </main>
  )
}
