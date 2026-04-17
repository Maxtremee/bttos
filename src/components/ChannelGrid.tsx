import { For, createEffect, onMount } from 'solid-js'
import { FocusableGroup, Focusable, useSpatialNavigation } from '../navigation'
import { useNavigate } from '@solidjs/router'
import ChannelCard from './ChannelCard'
import type { StreamData } from '../services/TwitchChannelService'
import styles from './ChannelGrid.module.css'

interface ChannelGridProps {
  channels: StreamData[]
}

interface FocusableChannelCardProps {
  channel: StreamData
  focused: () => boolean
  element: HTMLDivElement | undefined
}

function FocusableChannelCard(props: FocusableChannelCardProps) {
  createEffect(() => {
    if (props.focused()) {
      props.element?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
  })

  return <ChannelCard channel={props.channel} focused={props.focused()} />
}

export default function ChannelGrid(props: ChannelGridProps) {
  const { setFocus } = useSpatialNavigation()
  const navigate = useNavigate()

  onMount(() => {
    if (props.channels.length > 0) {
      setFocus('channel-' + props.channels[0].user_login)
    }
  })

  return (
    <FocusableGroup as="div" focusKey="channels-grid">
      {() => (
        <div class={styles.grid}>
          <For each={props.channels}>
            {(channel) => (
              <Focusable
                as="div"
                focusKey={'channel-' + channel.user_login}
                onEnterPress={() => navigate('/player/' + channel.user_login, { state: { broadcasterId: channel.user_id } })}
              >
                {({ focused, ref }) => (
                  <FocusableChannelCard channel={channel} focused={focused} element={ref} />
                )}
              </Focusable>
            )}
          </For>
        </div>
      )}
    </FocusableGroup>
  )
}
