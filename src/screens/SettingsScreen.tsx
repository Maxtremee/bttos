import { createSignal, onMount } from 'solid-js'
import { Focusable, useSpatialNavigation } from '../navigation'
import { prefsStore, updatePref } from '../stores/prefsStore'
import LogoutConfirmDialog from '../components/LogoutConfirmDialog'

export default function SettingsScreen() {
  const { setFocus } = useSpatialNavigation()
  const [dialogOpen, setDialogOpen] = createSignal(false)

  onMount(() => setFocus('settings-pref-chat-visible'))

  return (
    <main
      style={{
        padding: 'var(--space-2xl)',
        'min-height': '100vh',
        background: 'var(--color-bg)',
      }}
    >
      <h1
        style={{
          'font-size': 'var(--font-size-heading)',
          'font-weight': 'var(--font-weight-semibold)',
          color: 'var(--color-text-primary)',
          'margin-bottom': 'var(--space-xl)',
        }}
      >
        Settings
      </h1>

      <div
        class="gap-col-lg"
        style={{
          display: 'flex',
          'flex-direction': 'column',
        }}
      >
        {/* Chat visibility toggle */}
        <Focusable
          focusKey="settings-pref-chat-visible"
          onEnterPress={() => updatePref('chatVisible', !prefsStore.chatVisible)}
          as="div"
        >
          {({ focused }) => (
            <div
              class={focused() ? 'focused' : ''}
              style={{
                display: 'flex',
                'justify-content': 'space-between',
                'align-items': 'center',
                'min-height': 'var(--min-target-height)',
                padding: 'var(--space-md) var(--space-xl)',
                background: 'var(--color-surface)',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  'font-size': 'var(--font-size-body)',
                  color: 'var(--color-text-primary)',
                }}
              >
                Chat visibility
              </span>
              <span
                style={{
                  'font-size': 'var(--font-size-label)',
                  'font-weight': 'var(--font-weight-semibold)',
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
              class={focused() ? 'focused' : ''}
              style={{
                display: 'flex',
                'justify-content': 'space-between',
                'align-items': 'center',
                'min-height': 'var(--min-target-height)',
                padding: 'var(--space-md) var(--space-xl)',
                background: 'var(--color-surface)',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  'font-size': 'var(--font-size-body)',
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
      </div>

      {/* Log Out button — visually separated from prefs */}
      <div style={{ 'margin-top': 'var(--space-3xl)' }}>
        <Focusable
          focusKey="settings-logout"
          onEnterPress={() => setDialogOpen(true)}
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

      <LogoutConfirmDialog open={dialogOpen()} onCancel={() => { setDialogOpen(false); setFocus('settings-logout') }} />
    </main>
  )
}
