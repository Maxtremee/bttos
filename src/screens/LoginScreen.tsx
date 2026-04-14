import { onMount } from 'solid-js'
import { Focusable, useSpatialNavigation } from '../navigation'

export default function LoginScreen() {
  const { setFocus } = useSpatialNavigation()
  onMount(() => setFocus('login-signin-btn'))

  return (
    <main style={{
      padding: 'var(--space-2xl)',
      'min-height': '100vh',
      display: 'flex',
      'flex-direction': 'column',
      'justify-content': 'center',
      gap: 'var(--space-xl)',
    }}>
      <h1 style={{
        'font-size': 'var(--font-size-heading)',
        'font-weight': 'var(--font-weight-semibold)',
        'line-height': 'var(--line-height-heading)',
        color: 'var(--color-text-primary)',
      }}>
        Login screen — navigation test
      </h1>
      <Focusable focusKey="login-signin-btn" as="div">
        {({ focused }) => (
          <button
            class={focused() ? 'focused' : ''}
            style={{
              'min-height': 'var(--min-target-height)',
              padding: 'var(--space-md) var(--space-xl)',
              'font-size': 'var(--font-size-label)',
              'font-weight': 'var(--font-weight-semibold)',
              background: 'var(--color-accent)',
              color: 'var(--color-text-primary)',
              border: 'none',
              cursor: 'pointer',
              'align-self': 'flex-start',
            }}
          >
            Sign in with Twitch
          </button>
        )}
      </Focusable>
    </main>
  )
}
