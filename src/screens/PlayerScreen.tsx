import { createSignal, createResource, createEffect, onMount, onCleanup, Show } from "solid-js";
import { useParams, useLocation } from "@solidjs/router";
import { useSpatialNavigation } from "../navigation";
import { twitchAuthService } from "../services/TwitchAuthService";
import { helixClient } from "../services/clients";
import ChatSidebar from "../components/ChatSidebar";
import PlayerSettingsOverlay from "../components/PlayerSettingsOverlay";
import VideoInfoBar from "../components/organisms/VideoInfoBar";
import PlayerErrorOverlay from "../components/organisms/PlayerErrorOverlay";
import ScopeErrorOverlay from "../components/organisms/ScopeErrorOverlay";
import ToggleHint from "../components/organisms/ToggleHint";
import { useChannelPointsClaimer } from "../hooks/useChannelPointsClaimer";
import { useChatSession } from "../hooks/useChatSession";
import { useHlsPlayer } from "../hooks/useHlsPlayer";
import { prefsStore, updatePref } from "../stores/prefsStore";
import { KEY_RED, KEY_GREEN, KEY_YELLOW, KEY_BLUE } from "../const/keys";
import styles from "./PlayerScreen.module.css";

// Chat width bounds and step (px)
const CHAT_WIDTH_DEFAULT = 260;
const CHAT_WIDTH_MIN = 140;
const CHAT_WIDTH_MAX = 500;
const CHAT_WIDTH_STEP = 60;

// Auto-hide timings (ms)
const INFO_BAR_HIDE_MS = 4000;
const HINT_HIDE_MS = 3000;

export default function PlayerScreen() {
  const params = useParams<{ channel: string }>();
  const location = useLocation();
  const { setFocus } = useSpatialNavigation();

  // --- UI state ---
  const [infoVisible, setInfoVisible] = createSignal(true);
  const [hintVisible, setHintVisible] = createSignal(true);
  const [chatWidth, setChatWidth] = createSignal(CHAT_WIDTH_DEFAULT);
  const [settingsOverlayVisible, setSettingsOverlayVisible] = createSignal(false);

  let hideTimer: ReturnType<typeof setTimeout> | undefined;
  let hintTimer: ReturnType<typeof setTimeout> | undefined;

  function showInfoBar() {
    setInfoVisible(true);
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => setInfoVisible(false), INFO_BAR_HIDE_MS);
  }

  function showHint() {
    setHintVisible(true);
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => setHintVisible(false), HINT_HIDE_MS);
  }

  // --- Player + chat composables ---
  const player = useHlsPlayer(params.channel, { onPlaying: showInfoBar });
  const chat = useChatSession();
  useChannelPointsClaimer(params.channel);

  // --- Stream metadata fetch for info bar ---
  const [streamData] = createResource(
    () => params.channel,
    async (login: string) => {
      try {
        return await helixClient.fetchStreamByLogin(login);
      } catch {
        return null;
      }
    },
  );

  // Start chat as soon as streamData resolves (prefer router-state broadcasterId)
  let chatStarted = false;
  createEffect(() => {
    const data = streamData();
    if (!data || chatStarted) return;
    chatStarted = true;
    const broadcasterId =
      (location.state as { broadcasterId?: string })?.broadcasterId || data.user_id;
    chat.start(broadcasterId);
  });

  // Auto-hide hint once playback starts
  createEffect(() => {
    if (player.state() === "playing") showHint();
  });

  // Focus retry button when error overlay mounts
  createEffect(() => {
    if (player.state() === "error") setFocus("player-retry");
  });

  // --- Scope error re-auth ---
  function handleScopeReauth() {
    twitchAuthService.clearTokens();
    window.location.reload();
  }

  // --- Color button + any-key handlers ---
  function handleKeyDown(e: KeyboardEvent) {
    switch (e.keyCode) {
      case KEY_RED:
        updatePref("chatVisible", !prefsStore.chatVisible);
        showHint();
        break;
      case KEY_YELLOW:
        setChatWidth((w) => Math.max(CHAT_WIDTH_MIN, w - CHAT_WIDTH_STEP));
        showHint();
        break;
      case KEY_BLUE:
        setChatWidth((w) => Math.min(CHAT_WIDTH_MAX, w + CHAT_WIDTH_STEP));
        showHint();
        break;
      case KEY_GREEN:
        setSettingsOverlayVisible((v) => !v);
        break;
    }
    showInfoBar(); // any key reveals the info bar
  }

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
    showInfoBar();
  });

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeyDown);
    clearTimeout(hideTimer);
    clearTimeout(hintTimer);
  });

  return (
    <>
      <Show when={chat.scopeError()}>
        <ScopeErrorOverlay onReauth={handleScopeReauth} />
      </Show>

      <div class={styles.layout}>
        <Show when={prefsStore.chatVisible && prefsStore.chatPosition === "left"}>
          <ChatSidebar
            messages={chat.messages}
            emoteMap={chat.emoteMap()}
            status={chat.status()}
            width={chatWidth()}
            scale={chatWidth() / CHAT_WIDTH_DEFAULT}
            position="left"
          />
        </Show>

        <div class={styles.videoArea}>
          <video
            ref={(el) => player.attachVideo(el)}
            class={`${styles.video} ${player.state() === "error" ? styles.videoHidden : ""}`}
          />

          <Show when={player.state() === "loading"}>
            <div class={styles.loadingOverlay}>
              <span class={styles.loadingText}>Loading stream...</span>
            </div>
          </Show>

          <Show when={player.state() === "error"}>
            <PlayerErrorOverlay kind={player.errorKind()} onRetry={player.retry} />
          </Show>

          <Show when={player.state() === "playing" && infoVisible() && streamData()}>
            <VideoInfoBar stream={streamData()!} />
          </Show>

          <Show when={hintVisible() && player.state() === "playing"}>
            <ToggleHint />
          </Show>

          <PlayerSettingsOverlay
            open={settingsOverlayVisible()}
            onClose={() => setSettingsOverlayVisible(false)}
          />
        </div>

        <Show when={prefsStore.chatVisible && prefsStore.chatPosition !== "left"}>
          <ChatSidebar
            messages={chat.messages}
            emoteMap={chat.emoteMap()}
            status={chat.status()}
            width={chatWidth()}
            scale={chatWidth() / CHAT_WIDTH_DEFAULT}
            position="right"
          />
        </Show>
      </div>
    </>
  );
}
