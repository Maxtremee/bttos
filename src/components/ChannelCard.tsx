import type { StreamData } from '../services/TwitchChannelService'
import { thumbnailUrl, formatViewers } from '../services/TwitchChannelService'
import styles from './ChannelCard.module.css'

interface ChannelCardProps {
  channel: StreamData
  focused: boolean
}

export default function ChannelCard(props: ChannelCardProps) {
  return (
    <div
      class={props.focused ? `${styles.card} focused` : styles.card}
    >
      <img
        src={thumbnailUrl(props.channel.thumbnail_url, 284, 160)}
        width={284}
        height={160}
        loading="lazy"
        alt={props.channel.user_name}
        class={styles.thumbnail}
        onerror={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
      <div class={styles.info}>
        <div class={styles.username}>
          {props.channel.user_name}
        </div>
        <div class={styles.title}>
          {props.channel.title}
        </div>
        <div class={styles.game}>
          {props.channel.game_name}
        </div>
        <div class={styles.viewers}>
          {formatViewers(props.channel.viewer_count)}
        </div>
      </div>
    </div>
  )
}
