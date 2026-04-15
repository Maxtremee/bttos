import { createResource, onMount, onCleanup, Show } from 'solid-js'
import { Focusable, useSpatialNavigation } from '../navigation'
import ChannelGrid from '../components/ChannelGrid'
import { twitchChannelService } from '../services/TwitchChannelService'
import { history } from '../router/history'
import styles from './ChannelsScreen.module.css'

function EmptyState() {
  return (
    <div class={`${styles.emptyState} gap-col-sm`}>
      <p class={styles.emptyHeading}>
        No channels live right now
      </p>
      <p class={styles.emptySubtext}>
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
    <main class={styles.screen}>
      <div class={styles.header}>
        <h1 class={styles.heading}>
          Live Channels
        </h1>
        <Focusable
          focusKey="channels-gear"
          onEnterPress={() => history.set({ value: '/settings' })}
          as="div"
        >
          {({ focused }: { focused: () => boolean }) => (
            <div
              class={`${styles.gearButton} ${focused() ? 'focused' : ''}`}
              style={{
                color: focused() ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              }}
            >
              {'\u2699'}
            </div>
          )}
        </Focusable>
      </div>

      {/* State machine: loading -> error | empty | data */}
      <Show when={channels.state === 'pending' || channels.state === 'unresolved'}>
        <div class={styles.centerContainer}>
          <p class={styles.loadingText}>
            Loading channels...
          </p>
        </div>
      </Show>

      <Show when={channels.state === 'errored'}>
        {(() => {
          onMount(() => setFocus('retry-btn'))
          return (
            <div class={`${styles.errorContainer} gap-col-md`}>
              <p class={styles.errorHeading}>
                Could not load channels
              </p>
              <p class={styles.errorSubtext}>
                Check your connection and press OK to retry
              </p>
              <Focusable
                as="button"
                focusKey="retry-btn"
                onEnterPress={() => refetch()}
              >
                {({ focused }) => (
                  <button
                    class={`${styles.button} ${focused() ? 'focused' : ''}`}
                    onClick={() => refetch()}
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
