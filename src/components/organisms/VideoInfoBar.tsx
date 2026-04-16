import type { StreamData } from '../../services/TwitchChannelService'
import styles from './VideoInfoBar.module.css'

interface VideoInfoBarProps {
  stream: StreamData
}

/**
 * Format viewer count for display.
 * Uses "watching" per UI-SPEC copywriting contract.
 */
function formatWatching(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K watching`
  }
  return `${count} watching`
}

/**
 * VideoInfoBar — bottom overlay showing stream metadata on the player.
 * Presentational organism: data via stream prop, no side effects.
 */
export default function VideoInfoBar(props: VideoInfoBarProps) {
  return (
    <div class={styles.bar}>
      <div class={styles.inner}>
        <div>
          <div class={styles.username}>{props.stream.user_name}</div>
          <div class={styles.title}>{props.stream.title}</div>
        </div>
        <div class={styles.right}>
          <div class={styles.meta}>{props.stream.game_name}</div>
          <div class={styles.meta}>{formatWatching(props.stream.viewer_count)}</div>
        </div>
      </div>
    </div>
  )
}
