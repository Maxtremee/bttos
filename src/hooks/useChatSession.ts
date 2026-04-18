import { createSignal, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";
import { twitchChatService } from "../services/TwitchChatService";
import { emoteService, type EmoteMap } from "../services/EmoteService";
import { authStore } from "../stores/authStore";
import type { ChatMessage } from "../types/chat";

export type ChatStatus = "connecting" | "loading-emotes" | "active" | "reconnecting";

const MAX_MESSAGES = 150;
const BATCH_INTERVAL_MS = 100;

/**
 * Chat session composable — owns the EventSub connection, emote fetch,
 * message batching, and scope-error flag. Call `start(broadcasterId)`
 * once the broadcaster ID is known; cleanup runs automatically on
 * component disposal.
 */
export function useChatSession() {
  const [status, setStatus] = createSignal<ChatStatus>("connecting");
  const [scopeError, setScopeError] = createSignal(false);
  const [emoteMap, setEmoteMap] = createSignal<EmoteMap>(new Map());
  const [messages, setMessages] = createStore<ChatMessage[]>([]);

  // Message batching — buffer until BATCH_INTERVAL_MS then flush in one update
  let pendingMessages: ChatMessage[] = [];
  let batchTimer: ReturnType<typeof setTimeout> | undefined;

  function flushMessages() {
    if (!pendingMessages.length) return;
    setMessages((prev) => {
      const next = [...prev, ...pendingMessages];
      pendingMessages = [];
      return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
    });
    batchTimer = undefined;
  }

  function queueMessage(msg: ChatMessage) {
    pendingMessages.push(msg);
    if (!batchTimer) {
      batchTimer = setTimeout(flushMessages, BATCH_INTERVAL_MS);
    }
  }

  async function start(broadcasterId: string) {
    setStatus("connecting");

    twitchChatService.onMessage = queueMessage;
    twitchChatService.onScopeError = () => setScopeError(true);
    twitchChatService.onConnectionChange = (connected) => {
      setStatus(connected ? "active" : "reconnecting");
    };

    twitchChatService.connect(broadcasterId, authStore.userId!, authStore.token!);

    setStatus("loading-emotes");
    const map = await emoteService.getEmoteMap(broadcasterId);
    setEmoteMap(map);
    setStatus("active");
  }

  onCleanup(() => {
    clearTimeout(batchTimer);
    twitchChatService.disconnect();
  });

  return { messages, emoteMap, status, scopeError, start };
}
