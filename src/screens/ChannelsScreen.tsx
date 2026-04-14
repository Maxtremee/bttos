import { onMount } from 'solid-js'
import { Focusable, useSpatialNavigation } from '../navigation'

export default function ChannelsScreen() {
  const { setFocus } = useSpatialNavigation()
  onMount(() => setFocus('channels-primary'))

  return (
    <main style={{ padding: 'var(--space-2xl)', 'min-height': '100vh' }}>
      <h1 style={{
        'font-size': 'var(--font-size-heading)',
        'font-weight': 'var(--font-weight-semibold)',
        color: 'var(--color-text-primary)',
        'margin-bottom': 'var(--space-xl)',
      }}>
        Channels screen — navigation test
      </h1>
      <Focusable focusKey="channels-primary" as="div">
        {({ focused }) => (
          <button
            class={focused() ? 'focused' : ''}
            style={{
              'min-height': 'var(--min-target-height)',
              padding: 'var(--space-md) var(--space-xl)',
              'font-size': 'var(--font-size-label)',
              'font-weight': 'var(--font-weight-semibold)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Placeholder
          </button>
        )}
      </Focusable>
    </main>
  )
}
