import { createResource, onMount, onCleanup, Show } from 'solid-js'
import { Focusable, useSpatialNavigation } from '../navigation'
import ChannelGrid from '../components/ChannelGrid'
import { twitchChannelService } from '../services/TwitchChannelService'
import { history } from '../router/history'

function EmptyState() {
  return (
    <div
      class="gap-col-sm"
      style={{
        display: 'flex',
        'flex-direction': 'column',
        'align-items': 'center',
        'justify-content': 'center',
        'min-height': '60vh',
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
      <div style={{
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
        'margin-bottom': 'var(--space-xl)',
      }}>
        <h1 style={{
          'font-size': 'var(--font-size-heading)',
          'font-weight': 'var(--font-weight-semibold)',
          color: 'var(--color-text-primary)',
        }}>
          Live Channels
        </h1>
        <Focusable
          focusKey="channels-gear"
          onEnterPress={() => history.set({ value: '/settings' })}
          as="div"
        >
          {({ focused }: { focused: () => boolean }) => (
            <div
              class={focused() ? 'focused' : ''}
              style={{
                'min-width': 'var(--min-target-height)',
                'min-height': 'var(--min-target-height)',
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                'font-size': 'var(--font-size-heading)',
                color: focused() ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              {'\u2699'}
            </div>
          )}
        </Focusable>
      </div>

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
              class="gap-col-md"
              style={{
                display: 'flex',
                'flex-direction': 'column',
                'align-items': 'center',
                'justify-content': 'center',
                'min-height': '60vh',
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
