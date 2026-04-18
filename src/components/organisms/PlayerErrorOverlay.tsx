import ActionButton from "../atoms/ActionButton";
import styles from "./PlayerErrorOverlay.module.css";

export type PlayerErrorKind = "offline" | "network" | "unknown";

interface PlayerErrorOverlayProps {
  kind: PlayerErrorKind;
  onRetry: () => void;
}

const HEADINGS: Record<PlayerErrorKind, string> = {
  offline: "Stream is offline",
  network: "Connection lost",
  unknown: "Playback error",
};

const BODIES: Record<PlayerErrorKind, string> = {
  offline: "This channel has ended their stream. Press OK to retry or Back to return to channels.",
  network: "Could not reach the stream. Check your connection, then press OK to retry.",
  unknown: "Something went wrong. Press OK to retry or Back to return to channels.",
};

/**
 * PlayerErrorOverlay — full-area overlay shown when HLS playback fails.
 * Presentational organism: error kind + retry callback.
 */
export default function PlayerErrorOverlay(props: PlayerErrorOverlayProps) {
  return (
    <div class={`${styles.overlay} gap-col-md`}>
      <h2 class={styles.heading}>{HEADINGS[props.kind]}</h2>
      <p class={styles.text}>{BODIES[props.kind]}</p>
      <ActionButton focusKey="player-retry" onPress={props.onRetry}>
        Retry
      </ActionButton>
    </div>
  );
}
