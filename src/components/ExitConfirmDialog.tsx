import { onMount } from 'solid-js'
import { FocusableGroup, Focusable, useSpatialNavigation } from '../navigation'

interface ExitConfirmDialogProps {
  onExit: () => void
  onCancel: () => void
}

export default function ExitConfirmDialog(props: ExitConfirmDialogProps) {
  const { setFocus } = useSpatialNavigation()
  onMount(() => setFocus('exit-confirm-exit-btn'))

  return (
    // Full-screen overlay — sits above all screens
    <div style={{
      position: 'fixed',
      inset: '0',
      background: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      'z-index': '1000',
    }}>
      <FocusableGroup focusKey="exit-confirm" isFocusBoundary={true}>
        {() => <div style={{
          background: 'var(--color-surface)',
          padding: 'var(--space-3xl)',
          display: 'flex',
          'flex-direction': 'column',
          gap: 'var(--space-2xl)',
          'min-width': '400px',
        }}>
          <h2 style={{
            'font-size': 'var(--font-size-heading)',
            'font-weight': 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)',
            'text-align': 'center',
          }}>
            Exit app?
          </h2>
          <div style={{
            display: 'flex',
            gap: 'var(--space-lg)',
            'justify-content': 'center',
          }}>
            <Focusable focusKey="exit-confirm-exit-btn" as="div">
              {({ focused }) => (
                <button
                  class={focused() ? 'focused' : ''}
                  onClick={() => props.onExit()}
                  style={{
                    'min-height': 'var(--min-target-height)',
                    padding: 'var(--space-md) var(--space-2xl)',
                    'font-size': 'var(--font-size-label)',
                    'font-weight': 'var(--font-weight-semibold)',
                    background: 'var(--color-destructive)',
                    color: 'var(--color-text-primary)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Exit
                </button>
              )}
            </Focusable>
            <Focusable focusKey="exit-confirm-cancel-btn" as="div">
              {({ focused }) => (
                <button
                  class={focused() ? 'focused' : ''}
                  onClick={() => props.onCancel()}
                  style={{
                    'min-height': 'var(--min-target-height)',
                    padding: 'var(--space-md) var(--space-2xl)',
                    'font-size': 'var(--font-size-label)',
                    'font-weight': 'var(--font-weight-semibold)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                    border: '2px solid var(--color-text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              )}
            </Focusable>
          </div>
        </div>}
      </FocusableGroup>
    </div>
  )
}
