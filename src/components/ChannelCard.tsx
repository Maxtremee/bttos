import type { StreamData } from '../services/TwitchChannelService'
import { thumbnailUrl, formatViewers } from '../services/TwitchChannelService'

interface ChannelCardProps {
  channel: StreamData
  focused: boolean
}

export default function ChannelCard(props: ChannelCardProps) {
  return (
    <div
      class={props.focused ? 'focused' : ''}
      style={{
        background: 'var(--color-surface)',
        'border-radius': '8px',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      <img
        src={thumbnailUrl(props.channel.thumbnail_url, 284, 160)}
        width={284}
        height={160}
        loading="lazy"
        alt={props.channel.user_name}
        style={{ display: 'block', width: '100%', height: 'auto' }}
        onerror={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
      <div style={{ padding: 'var(--space-md)' }}>
        <div
          style={{
            'font-size': 'var(--font-size-body)',
            'font-weight': 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)',
            overflow: 'hidden',
            'text-overflow': 'ellipsis',
            'white-space': 'nowrap',
          }}
        >
          {props.channel.user_name}
        </div>
        <div
          style={{
            'font-size': 'var(--font-size-label)',
            color: 'var(--color-text-secondary)',
            'margin-top': 'var(--space-sm)',
            display: '-webkit-box',
            '-webkit-line-clamp': '2',
            '-webkit-box-orient': 'vertical',
            overflow: 'hidden',
            'line-height': 'var(--line-height-body)',
          }}
        >
          {props.channel.title}
        </div>
        <div
          style={{
            'font-size': 'var(--font-size-label)',
            color: 'var(--color-text-secondary)',
            'margin-top': 'var(--space-sm)',
            overflow: 'hidden',
            'text-overflow': 'ellipsis',
            'white-space': 'nowrap',
          }}
        >
          {props.channel.game_name}
        </div>
        <div
          style={{
            'font-size': 'var(--font-size-label)',
            color: 'var(--color-text-secondary)',
            'margin-top': 'var(--space-xs)',
          }}
        >
          {formatViewers(props.channel.viewer_count)}
        </div>
      </div>
    </div>
  )
}
