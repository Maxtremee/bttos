import { onMount } from 'solid-js'
import { useSpatialNavigation } from '../navigation'
import ActionButton from '../components/atoms/ActionButton'
import styles from './ChannelsScreen.module.css'

export default function ChannelsScreenError(props: { refetch: () => void }) {
  const { setFocus } = useSpatialNavigation()

  onMount(() => {
    onMount(() => setFocus('retry-btn'))
  })

  return (
    <div class={`${styles.errorContainer} gap-col-md`}>
      <p class={styles.errorHeading}>
        Could not load channels
      </p>
      <p class={styles.errorSubtext}>
        Check your connection and press OK to retry
      </p>
      <ActionButton focusKey="retry-btn" onPress={() => props.refetch()}>
        Retry
      </ActionButton>
    </div>
  )
}
