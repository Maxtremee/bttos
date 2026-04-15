import { createSignal, createResource, createEffect, onMount, onCleanup, Show } from 'solid-js'
import { createStore } from 'solid-js/store'
import { useParams, useLocation } from '@solidjs/router'
import Hls from 'hls.js'
import { Focusable, useSpatialNavigation } from '../navigation'
import { twitchStreamService } from '../services/TwitchStreamService'
import { twitchChatService } from '../services/TwitchChatService'
import { emoteService, type EmoteMap } from '../services/EmoteService'
import { twitchAuthService } from '../services/TwitchAuthService'
import { authStore } from '../stores/authStore'
import type { StreamData } from '../services/TwitchChannelService'
import type { ChatMessage } from '../types/chat'
import ChatSidebar from '../components/ChatSidebar'
import PlayerSettingsOverlay from '../components/PlayerSettingsOverlay'
import { prefsStore, updatePref } from '../stores/prefsStore'
import styles from './PlayerScreen.module.css'

const CLIENT_ID = import.meta.env.VITE_TWITCH_CLIENT_ID as string

function helixHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${authStore.token}`,
    'Client-Id': CLIENT_ID,
  }
}

/**
 * Format viewer count for display.
 * Uses "watching" per UI-SPEC copywriting contract.
 */
function formatWatching(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K watching`
  }
  return `${count} watching`
}

/**
 * Determine errorKind from a caught error.
 * - TypeError (network failure) or message containing "fetch" -> 'network'
 * - Message containing "offline" -> 'offline'
 * - Otherwise -> 'unknown'
 */
function classifyError(err: unknown): 'offline' | 'network' | 'unknown' {
  if (err instanceof TypeError) return 'network'
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    if (msg.includes('offline')) return 'offline'
    if (msg.includes('fetch') || msg.includes('network')) return 'network'
  }
  return 'unknown'
}

export default function PlayerScreen() {
  const params = useParams<{ channel: string }>()
  const location = useLocation()
  const { setFocus } = useSpatialNavigation()

  // --- State signals ---
  const [playerState, setPlayerState] = createSignal<'loading' | 'playing' | 'error'>('loading')
  const [errorKind, setErrorKind] = createSignal<'offline' | 'network' | 'unknown'>('unknown')
  const [infoVisible, setInfoVisible] = createSignal(true)

  // --- Chat state ---
  const [chatWidth, setChatWidth] = createSignal(260)
  const [settingsOverlayVisible, setSettingsOverlayVisible] = createSignal(false)
  const [chatStatus, setChatStatus] = createSignal<'connecting' | 'loading-emotes' | 'active' | 'reconnecting'>('connecting')
  const [scopeError, setScopeError] = createSignal(false)
  const [emoteMap, setEmoteMap] = createSignal<EmoteMap>(new Map())
  const [toggleHintVisible, setToggleHintVisible] = createSignal(true)

  // Chat message store — capped at 150 messages
  const MAX_MESSAGES = 150
  const [messages, setMessages] = createStore<ChatMessage[]>([])

  // Message batching — buffer for 100ms before flushing to store
  let pendingMessages: ChatMessage[] = []
  let batchTimer: ReturnType<typeof setTimeout> | undefined
  let toggleHintTimer: ReturnType<typeof setTimeout> | undefined

  function flushMessages() {
    if (!pendingMessages.length) return
    setMessages(prev => {
      const next = [...prev, ...pendingMessages]
      pendingMessages = []
      return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next
    })
    batchTimer = undefined
  }

  function queueMessage(msg: ChatMessage) {
    pendingMessages.push(msg)
    if (!batchTimer) {
      batchTimer = setTimeout(flushMessages, 100)
    }
  }

  let videoRef!: HTMLVideoElement
  let hls: Hls | undefined
  let hideTimer: ReturnType<typeof setTimeout> | undefined
  let retryCount = 0

  // --- Stream metadata fetch for info bar ---
  const [streamData] = createResource(
    () => params.channel,
    async (login: string) => {
      const res = await fetch(
        `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(login)}`,
        { headers: helixHeaders() }
      )
      if (!res.ok) return null
      const json = await res.json() as { data: StreamData[] }
      return json.data[0] ?? null
    }
  )

  // --- Info bar auto-hide logic ---
  function showInfoBar() {
    setInfoVisible(true)
    clearTimeout(hideTimer)
    hideTimer = setTimeout(() => setInfoVisible(false), 4000)
  }

  // --- Chat lifecycle ---
  async function initChat(broadcasterId: string) {
    setChatStatus('connecting')

    // Set up chat service callbacks
    twitchChatService.onMessage = queueMessage
    twitchChatService.onScopeError = () => setScopeError(true)
    twitchChatService.onConnectionChange = (connected) => {
      setChatStatus(connected ? 'active' : 'reconnecting')
    }

    // Connect to EventSub
    twitchChatService.connect(broadcasterId, authStore.userId!, authStore.token!)

    // Fetch emote map
    setChatStatus('loading-emotes')
    const map = await emoteService.getEmoteMap(broadcasterId)
    setEmoteMap(map)
    setChatStatus('active')
  }

  // Start chat when stream metadata resolves (provides broadcaster ID)
  let chatInitialized = false
  createEffect(() => {
    const data = streamData()
    if (!data || chatInitialized) return
    chatInitialized = true

    // Prefer broadcasterId from router state (passed by ChannelGrid), fall back to streamData.user_id
    const broadcasterId = (location.state as { broadcasterId?: string })?.broadcasterId || data.user_id
    initChat(broadcasterId)
  })

  // Auto-hide toggle hint 3 seconds after stream starts playing
  createEffect(() => {
    if (playerState() === 'playing') {
      clearTimeout(toggleHintTimer)
      toggleHintTimer = setTimeout(() => setToggleHintVisible(false), 3000)
    }
  })

  // --- HLS player initialization ---
  async function initPlayer() {
    setPlayerState('loading')
    retryCount = 0

    try {
      const m3u8Url = await twitchStreamService.fetchStreamM3u8Url(params.channel)

      if (!Hls.isSupported()) {
        setErrorKind('unknown')
        setPlayerState('error')
        return
      }

      hls = new Hls({
        maxBufferLength: 30,
        maxBufferSize: 30_000_000,
        backBufferLength: 0,
        liveSyncDurationCount: 3,
      })

      hls.attachMedia(videoRef)
      hls.loadSource(m3u8Url)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoRef.play().catch(() => {})
        setPlayerState('playing')
        showInfoBar()
      })

      hls.on(Hls.Events.ERROR, (_event: string, data: { fatal: boolean; type: string; details?: string }) => {
        if (!data.fatal) return

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && retryCount < 3) {
          retryCount++
          setTimeout(() => {
            hls?.startLoad()
          }, 2000 * Math.pow(2, retryCount - 1))
          return
        }

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls?.recoverMediaError()
          return
        }

        // Fatal unrecoverable error
        hls?.destroy()
        hls = undefined

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          // Network error after max retries
          if (data.details && data.details.includes('manifestLoadError')) {
            setErrorKind('offline')
          } else {
            setErrorKind('network')
          }
        } else {
          setErrorKind('unknown')
        }
        setPlayerState('error')
      })
    } catch (err) {
      setErrorKind(classifyError(err))
      setPlayerState('error')
    }
  }

  // --- Retry handler ---
  function handleRetry() {
    hls?.destroy()
    hls = undefined
    initPlayer()
  }

  // --- Scope error re-auth handler ---
  function handleScopeReauth() {
    twitchAuthService.clearTokens()
    // Navigate to login — AuthGuard will handle redirect
    window.location.reload()
  }

  // --- Color button key handlers ---
  function handleKeyDown(e: KeyboardEvent) {
    if (e.keyCode === 403) {
      // Red — toggle chat visibility
      updatePref('chatVisible', !prefsStore.chatVisible)
      setToggleHintVisible(true)
      clearTimeout(toggleHintTimer)
      toggleHintTimer = setTimeout(() => setToggleHintVisible(false), 3000)
    } else if (e.keyCode === 405) {
      // Yellow — shrink chat
      setChatWidth(w => Math.max(140, w - 60))
      setToggleHintVisible(true)
      clearTimeout(toggleHintTimer)
      toggleHintTimer = setTimeout(() => setToggleHintVisible(false), 3000)
    } else if (e.keyCode === 406) {
      // Blue — grow chat
      setChatWidth(w => Math.min(500, w + 60))
      setToggleHintVisible(true)
      clearTimeout(toggleHintTimer)
      toggleHintTimer = setTimeout(() => setToggleHintVisible(false), 3000)
    } else if (e.keyCode === 404) {
      // Green — toggle settings overlay
      setSettingsOverlayVisible(v => !v)
    }
    showInfoBar()  // any key shows info bar
  }

  // --- Focus on error overlay ---
  createEffect(() => {
    if (playerState() === 'error') {
      setFocus('player-retry')
    }
  })

  // --- Lifecycle ---
  onMount(() => {
    initPlayer()
    showInfoBar()
    window.addEventListener('keydown', handleKeyDown)
  })

  onCleanup(() => {
    window.removeEventListener('keydown', handleKeyDown)
    clearTimeout(hideTimer)
    clearTimeout(batchTimer)
    clearTimeout(toggleHintTimer)
    twitchChatService.disconnect()
    hls?.destroy()
  })

  return (
    <>
      {/* Scope error overlay — takes over entire screen */}
      <Show when={scopeError()}>
        <div class={`${styles.scopeOverlay} gap-col-md`}>
          <h2 class={styles.scopeHeading}>
            Chat access required
          </h2>
          <p class={styles.scopeText}>
            Your login needs to be updated to show chat. Press OK to log out and sign in again.
          </p>
          <Focusable focusKey="scope-reauth" onEnterPress={handleScopeReauth} as="button">
            {({ focused }: { focused: () => boolean }) => (
              <button
                class={`${styles.button} ${focused() ? 'focused' : ''}`}
                onClick={handleScopeReauth}
              >
                Sign in again
              </button>
            )}
          </Focusable>
        </div>
      </Show>

      {/* Main layout — flex row: [chat left] video area [chat right] */}
      <div class={styles.layout}>
        {/* Chat on LEFT when position is 'left' */}
        <Show when={prefsStore.chatVisible && prefsStore.chatPosition === 'left'}>
          <ChatSidebar
            messages={messages}
            emoteMap={emoteMap()}
            status={chatStatus()}
            width={chatWidth()}
            scale={chatWidth() / 260}
            position="left"
          />
        </Show>

        {/* Video area — takes remaining space */}
        <div class={styles.videoArea}>
          {/* Video element — always rendered, hls.js manages it via MSE */}
          <video
            ref={videoRef!}
            class={`${styles.video} ${playerState() === 'error' ? styles.videoHidden : ''}`}
          />

          {/* Loading overlay */}
          <Show when={playerState() === 'loading'}>
            <div class={styles.loadingOverlay}>
              <span class={styles.loadingText}>
                Loading stream...
              </span>
            </div>
          </Show>

          {/* Error overlay */}
          <Show when={playerState() === 'error'}>
            <div class={`${styles.errorOverlay} gap-col-md`}>
              <h2 class={styles.errorHeading}>
                {errorKind() === 'offline'
                  ? 'Stream is offline'
                  : errorKind() === 'network'
                  ? 'Connection lost'
                  : 'Playback error'}
              </h2>
              <p class={styles.errorText}>
                {errorKind() === 'offline'
                  ? 'This channel has ended their stream. Press OK to retry or Back to return to channels.'
                  : errorKind() === 'network'
                  ? 'Could not reach the stream. Check your connection, then press OK to retry.'
                  : 'Something went wrong. Press OK to retry or Back to return to channels.'}
              </p>
              <Focusable focusKey="player-retry" onEnterPress={handleRetry} as="button">
                {({ focused }: { focused: () => boolean }) => (
                  <button
                    class={`${styles.button} ${focused() ? 'focused' : ''}`}
                    onClick={handleRetry}
                  >
                    Retry
                  </button>
                )}
              </Focusable>
            </div>
          </Show>

          {/* Info bar — bottom overlay, auto-hide */}
          <Show when={playerState() === 'playing' && infoVisible() && streamData()}>
            <div class={styles.infoBar}>
              <div class={styles.infoBarInner}>
                <div>
                  <div class={styles.infoUsername}>
                    {streamData()!.user_name}
                  </div>
                  <div class={styles.infoTitle}>
                    {streamData()!.title}
                  </div>
                </div>
                <div class={styles.infoRight}>
                  <div class={styles.infoMeta}>
                    {streamData()!.game_name}
                  </div>
                  <div class={styles.infoMeta}>
                    {formatWatching(streamData()!.viewer_count)}
                  </div>
                </div>
              </div>
            </div>
          </Show>

          {/* Toggle hint — bottom-right of video area */}
          <Show when={toggleHintVisible() && playerState() === 'playing'}>
            <div class={styles.toggleHint}>
              Red — toggle chat  |  Yellow — smaller  |  Blue — larger  |  Green — settings
            </div>
          </Show>

          {/* Player settings overlay — inside video area container */}
          <PlayerSettingsOverlay
            open={settingsOverlayVisible()}
            onClose={() => setSettingsOverlayVisible(false)}
          />
        </div>

        {/* Chat on RIGHT when position is 'right' (default) */}
        <Show when={prefsStore.chatVisible && prefsStore.chatPosition !== 'left'}>
          <ChatSidebar
            messages={messages}
            emoteMap={emoteMap()}
            status={chatStatus()}
            width={chatWidth()}
            scale={chatWidth() / 260}
            position="right"
          />
        </Show>
      </div>
    </>
  )
}
