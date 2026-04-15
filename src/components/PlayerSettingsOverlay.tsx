import { Show, onMount, onCleanup } from 'solid-js'
import { Focusable, useSpatialNavigation } from '../navigation'
import { prefsStore, updatePref } from '../stores/prefsStore'

interface PlayerSettingsOverlayProps {
  open: boolean
  onClose: () => void
}

export default function PlayerSettingsOverlay(props: PlayerSettingsOverlayProps) {
  const { setFocus } = useSpatialNavigation()

  onMount(() => {
    if (props.open) {
      setFocus('overlay-pref-chat-visible')
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.keyCode === 461) {
        e.stopPropagation()
        e.preventDefault()
        props.onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    onCleanup(() => window.removeEventListener('keydown', handleKeyDown, true))
  })

  return (
    <Show when={props.open}>
      <div
        style={{
          position: 'absolute',
          top: 'var(--space-2xl)',
          right: 'var(--space-2xl)',
          width: '320px',
          background: 'rgba(26, 26, 26, 0.92)',
          padding: 'var(--space-lg)',
          'z-index': 50,
          display: 'flex',
          'flex-direction': 'column',
          gap: 'var(--space-md)',
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
                padding: '0 var(--space-sm)',
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
                padding: '0 var(--space-sm)',
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
    </Show>
  )
}
