import { For, onMount } from 'solid-js'
import { FocusableGroup, Focusable, useSpatialNavigation } from '../navigation'
import { useNavigate } from '@solidjs/router'
import ChannelCard from './ChannelCard'
import type { StreamData } from '../services/TwitchChannelService'

interface ChannelGridProps {
  channels: StreamData[]
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
        <div
          style={{
            display: 'grid',
            'grid-template-columns': 'repeat(4, 1fr)',
            gap: 'var(--space-lg)',
          }}
        >
          <For each={props.channels}>
            {(channel) => (
              <Focusable
                as="div"
                focusKey={'channel-' + channel.user_login}
                onEnterPress={() => navigate('/player/' + channel.user_login)}
              >
                {({ focused }) => (
                  <ChannelCard channel={channel} focused={focused()} />
                )}
              </Focusable>
            )}
          </For>
        </div>
      )}
    </FocusableGroup>
  )
}
