import { createSignal, onMount } from "solid-js";
import { useSpatialNavigation } from "../navigation";
import { prefsStore, updatePref } from "../stores/prefsStore";
import LogoutConfirmDialog from "../components/LogoutConfirmDialog";
import ActionButton from "../components/atoms/ActionButton";
import PrefRow from "../components/molecules/PrefRow";
import styles from "./SettingsScreen.module.css";

export default function SettingsScreen() {
  const { setFocus } = useSpatialNavigation();
  const [dialogOpen, setDialogOpen] = createSignal(false);

  onMount(() => setFocus("settings-pref-chat-visible"));

  return (
    <main class={styles.screen}>
      <h1 class={styles.heading}>Settings</h1>

      <div class={`${styles.prefList} gap-col-lg`}>
        <PrefRow
          focusKey="settings-pref-chat-visible"
          label="Chat visibility"
          value={prefsStore.chatVisible ? "On" : "Off"}
          active={prefsStore.chatVisible}
          onToggle={() => updatePref("chatVisible", !prefsStore.chatVisible)}
        />
        <PrefRow
          focusKey="settings-pref-chat-position"
          label="Chat position"
          value={prefsStore.chatPosition === "right" ? "Right" : "Left"}
          active={true}
          onToggle={() =>
            updatePref("chatPosition", prefsStore.chatPosition === "right" ? "left" : "right")
          }
        />
        <PrefRow
          focusKey="settings-pref-auto-claim-points"
          label="Auto-claim channel points"
          value={prefsStore.autoClaimChannelPoints ? "On" : "Off"}
          active={prefsStore.autoClaimChannelPoints}
          onToggle={() => updatePref("autoClaimChannelPoints", !prefsStore.autoClaimChannelPoints)}
        />
      </div>

      {/* Log Out button — visually separated from prefs */}
      <div class={styles.logoutSection}>
        <ActionButton
          focusKey="settings-logout"
          variant="destructive"
          onPress={() => setDialogOpen(true)}
        >
          Log Out
        </ActionButton>
      </div>

      <LogoutConfirmDialog
        open={dialogOpen()}
        onCancel={() => {
          setDialogOpen(false);
          setFocus("settings-logout");
        }}
      />
    </main>
  );
}
