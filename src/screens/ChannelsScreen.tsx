import { createResource, onMount, onCleanup, Show } from "solid-js";
import { Focusable } from "../navigation";
import ChannelGrid from "../components/ChannelGrid";
import { twitchChannelService } from "../services/TwitchChannelService";
import { history } from "../router/history";
import styles from "./ChannelsScreen.module.css";
import ChannelsScreenError from "./ChannelsScreenError";
import { ChannelsScreenEmpty } from "./ChannelsScreenEmpty";

export default function ChannelsScreen() {
  const [channels, { refetch }] = createResource(() =>
    twitchChannelService.fetchLiveFollowedChannels(),
  );

  onMount(() => {
    const timer = setInterval(() => refetch(), 60_000);
    onCleanup(() => clearInterval(timer));
  });

  return (
    <main class={styles.screen}>
      <div class={styles.header}>
        <h1 class={styles.heading}>Live Channels</h1>
        <Focusable
          focusKey="channels-gear"
          onEnterPress={() => history.set({ value: "/settings" })}
          as="div"
        >
          {({ focused }) => (
            <div
              class={`${styles.gearButton} ${focused() ? "focused" : ""}`}
              style={{
                color: focused() ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              }}
            >
              ⚙️
            </div>
          )}
        </Focusable>
      </div>

      {/* State machine: loading -> error | empty | data */}
      <Show when={channels.state === "pending" || channels.state === "unresolved"}>
        <div class={styles.centerContainer}>
          <p class={styles.loadingText}>Loading channels...</p>
        </div>
      </Show>

      <Show when={channels.state === "errored"}>
        <ChannelsScreenError refetch={refetch} />
      </Show>

      <Show when={channels.state === "ready" || channels.state === "refreshing"}>
        <Show when={(channels() ?? []).length > 0} fallback={<ChannelsScreenEmpty />}>
          <ChannelGrid
            channels={[...(channels() ?? [])].sort((a, b) => b.viewer_count - a.viewer_count)}
          />
        </Show>
      </Show>
    </main>
  );
}
