import { onCleanup } from "solid-js";
import { twitchChannelPointsService } from "../services/TwitchChannelPointsService";
import { prefsStore } from "../stores/prefsStore";

const POLL_INTERVAL_MS = 60_000;

/**
 * Auto-claim Twitch community points while the caller (PlayerScreen) is mounted.
 * Polls every 60s and fires the claim mutation when a bonus is available.
 * Silent by default — no return value, no UI. onCleanup tears down the interval
 * when the component unmounts (including when the user switches channels, since
 * PlayerScreen remounts per channel route).
 */
export function useChannelPointsClaimer(channelLogin: string): void {
  let stopped = false;

  async function tick() {
    if (stopped) return;
    if (!prefsStore.autoClaimChannelPoints) return;
    try {
      const result = await twitchChannelPointsService.pollAndClaim(channelLogin);
      if (result === "stop") {
        stopped = true;
        clearInterval(intervalId);
      }
    } catch (err) {
      // Transient failure — log and wait for next tick. Do NOT stop polling.
      console.warn("[useChannelPointsClaimer] poll failed:", err);
    }
  }

  // Kick off an immediate first poll, then schedule recurring ticks.
  // Don't await — fire-and-forget so this hook never blocks the component body.
  void tick();
  const intervalId = setInterval(tick, POLL_INTERVAL_MS);

  onCleanup(() => {
    stopped = true;
    clearInterval(intervalId);
  });
}
