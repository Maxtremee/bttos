import { Show, createEffect, onCleanup } from 'solid-js'
import { Focusable, useSpatialNavigation } from '../navigation'
import { prefsStore, updatePref } from '../stores/prefsStore'

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

  window.addEventListener('keydown', handleKeyDown, true)
  onCleanup(() => window.removeEventListener('keydown', handleKeyDown, true))

  return (
    <Show when={props.open}>
      {/* Full-screen backdrop to center the panel */}
      <div
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100vw',
          height: '100vh',
          'z-index': 50,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
        }}
      >
        <div
          class="gap-col-md"
          style={{
            width: '400px',
            background: 'rgba(26, 26, 26, 0.95)',
            padding: 'var(--space-xl)',
            display: 'flex',
            'flex-direction': 'column',
          }}
        >
          {/* Section title */}
          <div
            style={{
              'font-size': 'var(--font-size-heading)',
              'font-weight': 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
            }}
          >
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
                class={focused() ? 'focused' : ''}
                style={{
                  display: 'flex',
                  'justify-content': 'space-between',
                  'align-items': 'center',
                  'min-height': 'var(--min-target-height)',
                  padding: 'var(--space-md) var(--space-lg)',
                  background: 'var(--color-surface)',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    'font-size': 'var(--font-size-body)',
                    'font-weight': 'var(--font-weight-regular)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  Chat visibility
                </span>
                <span
                  style={{
                    'font-size': 'var(--font-size-label)',
                    'font-weight': 'var(--font-weight-semibold)',
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
                class={focused() ? 'focused' : ''}
                style={{
                  display: 'flex',
                  'justify-content': 'space-between',
                  'align-items': 'center',
                  'min-height': 'var(--min-target-height)',
                  padding: 'var(--space-md) var(--space-lg)',
                  background: 'var(--color-surface)',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    'font-size': 'var(--font-size-body)',
                    'font-weight': 'var(--font-weight-regular)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  Chat position
                </span>
                <span
                  style={{
                    'font-size': 'var(--font-size-label)',
                    'font-weight': 'var(--font-weight-semibold)',
                    color: 'var(--color-accent)',
                  }}
                >
                  {prefsStore.chatPosition === 'right' ? 'Right' : 'Left'}
                </span>
              </div>
            )}
          </Focusable>

          {/* Dismiss hint */}
          <div
            style={{
              'font-size': 'var(--font-size-label)',
              color: 'var(--color-text-disabled)',
            }}
          >
            Press Green or Back to close
          </div>
        </div>
      </div>
    </Show>
  )
}
