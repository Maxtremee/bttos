import styles from "./ToggleHint.module.css";

/**
 * ToggleHint — transient bottom-right hint showing the color-button
 * shortcuts available on the player screen. Presentational organism:
 * visibility is controlled by the caller via conditional render.
 */
export default function ToggleHint() {
  return (
    <div class={styles.hint}>
      Red — toggle chat | Yellow — smaller | Blue — larger | Green — settings
    </div>
  );
}
