import { Show, createEffect, onMount, onCleanup } from 'solid-js'
import { Focusable, useSpatialNavigation } from '../navigation'
import { prefsStore, updatePref } from '../stores/prefsStore'
import styles from './PlayerSettingsOverlay.module.css'

interface PlayerSettingsOverlayProps {
  open: boolean
  onClose: () => void
}

export default function PlayerSettingsOverlay(props: PlayerSettingsOverlayProps) {
  const { setFocus } = useSpatialNavigation()

  // Set focus when overlay opens (not just on mount)
  createEffect(() => {
    if (props.open) {
      setFocus('overlay-pref-chat-visible')
    }
  })

  function handleKeyDown(e: KeyboardEvent) {
    if (!props.open) return
    if (e.keyCode === 461) {
      e.stopPropagation()
      e.preventDefault()
      props.onClose()
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown, true)
    onCleanup(() => window.removeEventListener('keydown', handleKeyDown, true))
  })

  return (
    <Show when={props.open}>
      {/* Full-screen backdrop to center the panel */}
      <div class={styles.backdrop}>
        <div class={`${styles.panel} gap-col-md`}>
          {/* Section title */}
          <div class={styles.sectionTitle}>
            Chat Settings
          </div>

          {/* Chat visibility toggle */}
          <Focusable
            focusKey="overlay-pref-chat-visible"
            onEnterPress={() => updatePref('chatVisible', !prefsStore.chatVisible)}
            as="div"
          >
            {({ focused }: { focused: () => boolean }) => (
              <div
                class={`${styles.prefRow} ${focused() ? 'focused' : ''}`}
              >
                <span class={styles.prefLabel}>
                  Chat visibility
                </span>
                <span
                  class={styles.prefValue}
                  style={{
                    color: prefsStore.chatVisible ? 'var(--color-accent)' : 'var(--color-text-disabled)',
                  }}
                >
                  {prefsStore.chatVisible ? 'On' : 'Off'}
                </span>
              </div>
            )}
          </Focusable>

          {/* Chat position toggle */}
          <Focusable
            focusKey="overlay-pref-chat-position"
            onEnterPress={() =>
              updatePref('chatPosition', prefsStore.chatPosition === 'right' ? 'left' : 'right')
            }
            as="div"
          >
            {({ focused }: { focused: () => boolean }) => (
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

          {/* Dismiss hint */}
          <div class={styles.hint}>
            Press Green or Back to close
          </div>
        </div>
      </div>
    </Show>
  )
}
