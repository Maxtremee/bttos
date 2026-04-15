import type { ChatMessage, ChatMessageEvent } from '../types/chat'

const CLIENT_ID = import.meta.env.VITE_TWITCH_CLIENT_ID as string
const EVENTSUB_WS_URL = 'wss://eventsub.wss.twitch.tv/ws'
const SUBSCRIBE_URL = 'https://api.twitch.tv/helix/eventsub/subscriptions'
const RECONNECT_DELAYS = [1000, 2000, 4000]
const KEEPALIVE_CHECK_INTERVAL = 30_000

export class TwitchChatService {
  // Public callbacks — set before calling connect()
  onMessage?: (msg: ChatMessage) => void
  onScopeError?: () => void
  onConnectionChange?: (connected: boolean) => void

  private ws: WebSocket | null = null
  private reconnectAttempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private keepaliveInterval: ReturnType<typeof setInterval> | null = null
  private lastMessageAt = 0
  private keepaliveTimeout = 0

  // Store connection params for reconnection
  private broadcasterId = ''
  private userId = ''
  private token = ''

  connect(broadcasterId: string, userId: string, token: string): void {
    // Tear down any existing connection first to prevent duplicates
    this._closeConnection()
    this.broadcasterId = broadcasterId
    this.userId = userId
    this.token = token
    this.reconnectAttempt = 0
    this.openWebSocket(EVENTSUB_WS_URL)
  }

  disconnect(): void {
    this._closeConnection()
    this.onMessage = undefined
    this.onScopeError = undefined
    this.onConnectionChange = undefined
  }

  private _closeConnection(): void {
    this._clearTimers()
    if (this.ws) {
      this.ws.close(1000)
      this.ws = null
    }
    this.reconnectAttempt = 0
  }

  private openWebSocket(url: string): void {
    const ws = new WebSocket(url)
    this.ws = ws

    ws.onmessage = (event: MessageEvent) => {
      if (this.ws !== ws) return // stale socket
      this.lastMessageAt = Date.now()
      this._handleMessage(event, ws)
    }

    ws.onopen = () => {
      if (this.ws !== ws) return // stale socket
      this.onConnectionChange?.(true)
    }

    ws.onclose = (event: CloseEvent) => {
      if (this.ws !== ws) return // stale socket — already replaced or disconnected
      if (event.code !== 1000) {
        // Abnormal close — schedule reconnect
        this.scheduleReconnect()
      } else {
        this.onConnectionChange?.(false)
      }
    }

    ws.onerror = () => {
      // Error will be followed by close event — let close handle reconnect
    }
  }

  private _handleMessage(event: MessageEvent, ws: WebSocket): void {
    let msg: Record<string, unknown>
    try {
      msg = JSON.parse(event.data as string) as Record<string, unknown>
    } catch {
      console.warn('[TwitchChatService] Failed to parse WebSocket message')
      return
    }

    const metadata = msg.metadata as Record<string, unknown> | undefined
    const messageType = metadata?.message_type as string | undefined
    const payload = msg.payload as Record<string, unknown> | undefined

    if (messageType === 'session_welcome') {
      const session = payload?.session as Record<string, unknown> | undefined
      const sessionId = session?.id as string | undefined
      const keepaliveSecs = (session?.keepalive_timeout_seconds as number | undefined) ?? 10

      if (sessionId) {
        this.keepaliveTimeout = keepaliveSecs
        this.lastMessageAt = Date.now()
        this._startKeepaliveMonitor()
        this.reconnectAttempt = 0 // Reset backoff on successful connection
        this.subscribe(sessionId, this.broadcasterId, this.userId, this.token)
      }
    } else if (messageType === 'notification') {
      const subscriptionType = (payload?.subscription as Record<string, unknown> | undefined)?.type as string | undefined
      if (subscriptionType === 'channel.chat.message') {
        const chatEvent = payload?.event as ChatMessageEvent | undefined
        if (chatEvent) {
          const chatMessage: ChatMessage = {
            id: chatEvent.message_id,
            displayName: chatEvent.chatter_user_name,
            color: chatEvent.color || '',
            fragments: chatEvent.message?.fragments ?? [],
          }
          this.onMessage?.(chatMessage)
        }
      }
    } else if (messageType === 'session_keepalive') {
      // lastMessageAt already updated at top of _handleMessage
    } else if (messageType === 'session_reconnect') {
      const session = payload?.session as Record<string, unknown> | undefined
      const reconnectUrl = session?.reconnect_url as string | undefined
      if (reconnectUrl) {
        this._handleReconnect(reconnectUrl, ws)
      }
    }
  }

  private _handleReconnect(reconnectUrl: string, oldWs: WebSocket): void {
    // Open new WS to reconnect_url; transfer handlers; close old after new connects
    const newWs = new WebSocket(reconnectUrl)
    this.ws = newWs

    newWs.onmessage = (event: MessageEvent) => {
      this.lastMessageAt = Date.now()
      this._handleMessage(event, newWs)
    }

    newWs.onopen = () => {
      // Old WS can be closed now
      oldWs.close(1000)
      this.onConnectionChange?.(true)
    }

    newWs.onclose = (event: CloseEvent) => {
      if (event.code !== 1000) {
        this.scheduleReconnect()
      }
    }

    newWs.onerror = () => {
      // Close event will follow
    }
  }

  private async subscribe(
    sessionId: string,
    broadcasterId: string,
    userId: string,
    token: string
  ): Promise<void> {
    try {
      const res = await fetch(SUBSCRIBE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Client-Id': CLIENT_ID,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'channel.chat.message',
          version: '1',
          condition: {
            broadcaster_user_id: broadcasterId,
            user_id: userId,
          },
          transport: {
            method: 'websocket',
            session_id: sessionId,
          },
        }),
      })

      if (res.status === 403) {
        this.onScopeError?.()
        return
      }

      if (!res.ok) {
        console.warn(`[TwitchChatService] Subscribe failed: ${res.status}`)
      }
    } catch (err) {
      console.warn('[TwitchChatService] Subscribe error:', err)
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempt >= RECONNECT_DELAYS.length) {
      console.warn('[TwitchChatService] Max reconnect attempts reached. Giving up.')
      return
    }

    const delay = RECONNECT_DELAYS[this.reconnectAttempt]
    this.reconnectAttempt += 1

    this.reconnectTimer = setTimeout(() => {
      this.openWebSocket(EVENTSUB_WS_URL)
    }, delay)
  }

  private _startKeepaliveMonitor(): void {
    // Clear existing monitor
    if (this.keepaliveInterval !== null) {
      clearInterval(this.keepaliveInterval)
    }

    this.keepaliveInterval = setInterval(() => {
      const elapsed = Date.now() - this.lastMessageAt
      const threshold = this.keepaliveTimeout * 1500 // keepalive * 1.5 in ms
      if (elapsed > threshold && this.keepaliveTimeout > 0) {
        console.warn('[TwitchChatService] Keepalive timeout — reconnecting')
        if (this.ws) {
          this.ws.close(1006)
        }
        this.scheduleReconnect()
      }
    }, KEEPALIVE_CHECK_INTERVAL)
  }

  private _clearTimers(): void {
    if (this.keepaliveInterval !== null) {
      clearInterval(this.keepaliveInterval)
      this.keepaliveInterval = null
    }
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}

export const twitchChatService = new TwitchChatService()
