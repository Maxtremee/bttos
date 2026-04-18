import { Show, createEffect, onMount, onCleanup } from "solid-js";
import { useSpatialNavigation } from "../navigation";
import { prefsStore, updatePref } from "../stores/prefsStore";
import PrefRow from "./molecules/PrefRow";
import { KEY_BACK } from "../const/keys";
import styles from "./PlayerSettingsOverlay.module.css";

interface PlayerSettingsOverlayProps {
  open: boolean;
  onClose: () => void;
}

export default function PlayerSettingsOverlay(props: PlayerSettingsOverlayProps) {
  const { setFocus } = useSpatialNavigation();

  // Set focus when overlay opens (not just on mount)
  createEffect(() => {
    if (props.open) {
      setFocus("overlay-pref-chat-visible");
    }
  });

  function handleKeyDown(e: KeyboardEvent) {
    if (!props.open) return;
    if (e.keyCode === KEY_BACK) {
      e.stopPropagation();
      e.preventDefault();
      props.onClose();
    }
  }

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown, true);
    onCleanup(() => window.removeEventListener("keydown", handleKeyDown, true));
  });

  return (
    <Show when={props.open}>
      {/* Full-screen backdrop to center the panel */}
      <div class={styles.backdrop}>
        <div class={`${styles.panel} gap-col-md`}>
          {/* Section title */}
          <div class={styles.sectionTitle}>Chat Settings</div>

          <PrefRow
            focusKey="overlay-pref-chat-visible"
            label="Chat visibility"
            value={prefsStore.chatVisible ? "On" : "Off"}
            active={prefsStore.chatVisible}
            onToggle={() => updatePref("chatVisible", !prefsStore.chatVisible)}
          />
          <PrefRow
            focusKey="overlay-pref-chat-position"
            label="Chat position"
            value={prefsStore.chatPosition === "right" ? "Right" : "Left"}
            active={true}
            onToggle={() =>
              updatePref("chatPosition", prefsStore.chatPosition === "right" ? "left" : "right")
            }
          />

          {/* Dismiss hint */}
          <div class={styles.hint}>Press Green or Back to close</div>
        </div>
      </div>
    </Show>
  );
}
