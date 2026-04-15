import { Show, onMount, onCleanup } from 'solid-js'
import { Focusable, useSpatialNavigation } from '../navigation'
import { twitchAuthService } from '../services/TwitchAuthService'
import { history } from '../router/history'

const KEY_BACK = 461

interface LogoutConfirmDialogProps {
  open: boolean
  onCancel: () => void
}

export default function LogoutConfirmDialog(props: LogoutConfirmDialogProps) {
  const { setFocus } = useSpatialNavigation()

  function handleBackKey(e: KeyboardEvent) {
    if (!props.open) return
    if (e.keyCode !== KEY_BACK) return
    e.stopPropagation()
    e.preventDefault()
    props.onCancel()
  }

  onMount(() => window.addEventListener('keydown', handleBackKey, true))
  onCleanup(() => window.removeEventListener('keydown', handleBackKey, true))

  function handleOpen() {
    setFocus('logout-cancel')
  }

  return (
    <Show when={props.open} keyed={false}>
      {/* Side-effect: set focus when dialog opens */}
      {(() => { handleOpen(); return null })()}
      <div
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100vw',
          height: '100vh',
          'z-index': '200',
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
        }}
      >
        <div
          style={{
            background: 'var(--color-surface)',
            padding: 'var(--space-xl)',
            display: 'flex',
            'flex-direction': 'column',
            gap: 'var(--space-lg)',
            'max-width': '600px',
            width: '100%',
          }}
        >
          <h2
            style={{
              'font-size': 'var(--font-size-heading)',
              'font-weight': 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
              margin: '0',
            }}
          >
            Log out of Twitch?
          </h2>
          <p
            style={{
              'font-size': 'var(--font-size-body)',
              color: 'var(--color-text-secondary)',
              margin: '0',
            }}
          >
            You will need to sign in again on your phone or computer.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
            <Focusable
              focusKey="logout-cancel"
              onEnterPress={() => props.onCancel()}
              as="div"
            >
              {({ focused }) => (
                <button
                  class={focused() ? 'focused' : ''}
                  style={{
                    'min-height': 'var(--min-target-height)',
                    padding: 'var(--space-md) var(--space-xl)',
                    'font-size': 'var(--font-size-label)',
                    'font-weight': 'var(--font-weight-semibold)',
                    color: 'var(--color-text-primary)',
                    background: 'var(--color-accent)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              )}
            </Focusable>
            <Focusable
              focusKey="logout-confirm"
              onEnterPress={() => {
                twitchAuthService.clearTokens()
                history.set({ value: '/login' })
              }}
              as="div"
            >
              {({ focused }) => (
                <button
                  class={focused() ? 'focused' : ''}
                  style={{
                    'min-height': 'var(--min-target-height)',
                    padding: 'var(--space-md) var(--space-xl)',
                    'font-size': 'var(--font-size-label)',
                    'font-weight': 'var(--font-weight-semibold)',
                    color: 'var(--color-text-primary)',
                    background: 'var(--color-destructive)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Log Out
                </button>
              )}
            </Focusable>
          </div>
        </div>
      </div>
    </Show>
  )
}
