import { createResource, onMount, onCleanup, Show } from 'solid-js'
import { Focusable, useSpatialNavigation } from '../navigation'
import ChannelGrid from '../components/ChannelGrid'
import { twitchChannelService } from '../services/TwitchChannelService'

function EmptyState() {
  return (
    <div
      style={{
        display: 'flex',
        'flex-direction': 'column',
        'align-items': 'center',
        'justify-content': 'center',
        'min-height': '60vh',
        gap: 'var(--space-sm)',
      }}
    >
      <p
        style={{
          'font-size': 'var(--font-size-heading)',
          'font-weight': 'var(--font-weight-semibold)',
          color: 'var(--color-text-primary)',
        }}
      >
        No channels live right now
      </p>
      <p
        style={{
          'font-size': 'var(--font-size-body)',
          color: 'var(--color-text-secondary)',
        }}
      >
        Check back later or follow more channels on Twitch
      </p>
    </div>
  )
}

export default function ChannelsScreen() {
  const { setFocus } = useSpatialNavigation()
  const [channels, { refetch }] = createResource(() => twitchChannelService.fetchLiveFollowedChannels())

  onMount(() => {
    const timer = setInterval(() => refetch(), 60_000)
    onCleanup(() => clearInterval(timer))
  })

  return (
    <main style={{ padding: 'var(--space-2xl)', height: '100vh', 'overflow-y': 'auto' }}>
      <h1
        style={{
          'font-size': 'var(--font-size-heading)',
          'font-weight': 'var(--font-weight-semibold)',
          color: 'var(--color-text-primary)',
          'margin-bottom': 'var(--space-xl)',
        }}
      >
        Live Channels
      </h1>

      {/* State machine: loading → error | empty | data */}
      <Show when={channels.state === 'pending' || channels.state === 'unresolved'}>
        <div
          style={{
            display: 'flex',
            'justify-content': 'center',
            'align-items': 'center',
            'min-height': '60vh',
          }}
        >
          <p
            style={{
              'font-size': 'var(--font-size-body)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Loading channels...
          </p>
        </div>
      </Show>

      <Show when={channels.state === 'errored'}>
        {(() => {
          onMount(() => setFocus('retry-btn'))
          return (
            <div
              style={{
                display: 'flex',
                'flex-direction': 'column',
                'align-items': 'center',
                'justify-content': 'center',
                'min-height': '60vh',
                gap: 'var(--space-md)',
              }}
            >
              <p
                style={{
                  'font-size': 'var(--font-size-heading)',
                  'font-weight': 'var(--font-weight-semibold)',
                  color: 'var(--color-text-primary)',
                }}
              >
                Could not load channels
              </p>
              <p
                style={{
                  'font-size': 'var(--font-size-body)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Check your connection and press OK to retry
              </p>
              <Focusable
                as="button"
                focusKey="retry-btn"
                onEnterPress={() => refetch()}
              >
                {({ focused }) => (
                  <button
                    class={focused() ? 'focused' : ''}
                    onClick={() => refetch()}
                    style={{
                      background: 'var(--color-accent)',
                      color: 'var(--color-text-primary)',
                      padding: 'var(--space-md) var(--space-xl)',
                      'font-size': 'var(--font-size-label)',
                      'font-weight': 'var(--font-weight-semibold)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Retry
                  </button>
                )}
              </Focusable>
            </div>
          )
        })()}
      </Show>

      <Show when={channels.state === 'ready' || channels.state === 'refreshing'}>
        <Show when={(channels() ?? []).length > 0} fallback={<EmptyState />}>
          <ChannelGrid channels={[...(channels() ?? [])].sort((a, b) => b.viewer_count - a.viewer_count)} />
        </Show>
      </Show>
    </main>
  )
}
