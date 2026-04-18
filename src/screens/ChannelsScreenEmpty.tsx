import styles from "./ChannelsScreen.module.css";

export function ChannelsScreenEmpty() {
  return (
    <div class={`${styles.emptyState} gap-col-sm`}>
      <p class={styles.emptyHeading}>No channels live right now</p>
      <p class={styles.emptySubtext}>Check back later or follow more channels on Twitch</p>
    </div>
  );
}
