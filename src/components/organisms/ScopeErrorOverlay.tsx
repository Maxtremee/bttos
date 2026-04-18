import ActionButton from "../atoms/ActionButton";
import styles from "./ScopeErrorOverlay.module.css";

interface ScopeErrorOverlayProps {
  onReauth: () => void;
}

/**
 * ScopeErrorOverlay — full-screen overlay shown when the current OAuth
 * token lacks the chat scope. Prompts the user to sign in again.
 * Presentational organism: onReauth callback only.
 */
export default function ScopeErrorOverlay(props: ScopeErrorOverlayProps) {
  return (
    <div class={`${styles.overlay} gap-col-md`}>
      <h2 class={styles.heading}>Chat access required</h2>
      <p class={styles.text}>
        Your login needs to be updated to show chat. Press OK to log out and sign in again.
      </p>
      <ActionButton focusKey="scope-reauth" onPress={props.onReauth}>
        Sign in again
      </ActionButton>
    </div>
  );
}
