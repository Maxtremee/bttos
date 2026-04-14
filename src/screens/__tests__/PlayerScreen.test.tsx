// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from 'solid-js/web'

// --- Hoisted shared state for mocks (available inside vi.mock factories) ---
const { mockSetFocus, mockFetchStreamM3u8Url, hlsEventHandlers, mockHlsInstance, MockHls } = vi.hoisted(() => {
  type HlsEventHandler = (...args: unknown[]) => void
  const hlsEventHandlers = new Map<string, HlsEventHandler>()
  const mockHlsInstance = {
    attachMedia: vi.fn(),
    loadSource: vi.fn(),
    destroy: vi.fn(),
    recoverMediaError: vi.fn(),
    startLoad: vi.fn(),
    on: vi.fn((event: string, handler: HlsEventHandler) => {
      hlsEventHandlers.set(event, handler)
    }),
  }
  const MockHlsCtor = vi.fn(() => mockHlsInstance) as unknown as {
    new (config?: unknown): typeof mockHlsInstance
    isSupported: () => boolean
    Events: Record<string, string>
    ErrorTypes: Record<string, string>
  }
  MockHlsCtor.isSupported = () => true
  MockHlsCtor.Events = {
    MANIFEST_PARSED: 'hlsManifestParsed',
    ERROR: 'hlsError',
  }
  MockHlsCtor.ErrorTypes = {
    NETWORK_ERROR: 'networkError',
    MEDIA_ERROR: 'mediaError',
  }

  return {
    mockSetFocus: vi.fn(),
    mockFetchStreamM3u8Url: vi.fn(),
    hlsEventHandlers,
    mockHlsInstance,
    MockHls: MockHlsCtor,
  }
})

// --- Module mocks ---

vi.mock('../../navigation', () => ({
  useSpatialNavigation: () => ({ setFocus: mockSetFocus }),
  Focusable: (props: {
    focusKey?: string
    as?: string
    onEnterPress?: () => void
    children: ((bag: { focused: () => boolean }) => unknown) | unknown
  }) => {
    const bag = { focused: () => false }
    return (typeof props.children === 'function' ? props.children(bag) : props.children) as JSX.Element
  },
}))

vi.mock('../../services/TwitchStreamService', () => ({
  twitchStreamService: {
    get fetchStreamM3u8Url() { return mockFetchStreamM3u8Url },
  },
}))

vi.mock('../../stores/authStore', () => ({
  authStore: { token: 'test-token', refreshToken: null, expiresAt: null, userId: 'user123' },
}))

vi.mock('@solidjs/router', () => ({
  useParams: () => ({ channel: 'testchannel' }),
}))

vi.mock('hls.js', () => ({
  default: MockHls,
}))

import PlayerScreen from '../PlayerScreen'

// Flush microtasks
const flushPromises = async (rounds = 5) => {
  for (let i = 0; i < rounds; i++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
  }
}

// Mock stream data for info bar tests
const mockStreamData = {
  data: [{
    user_id: '12345',
    user_login: 'testchannel',
    user_name: 'TestChannel',
    game_name: 'Just Chatting',
    title: 'Test stream title',
    viewer_count: 42300,
    thumbnail_url: 'https://example.com/thumb.jpg',
    type: 'live',
    started_at: '2026-01-01T00:00:00Z',
  }],
}

describe('PlayerScreen', () => {
  let container: HTMLDivElement
  let dispose: () => void
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    mockSetFocus.mockClear()
    mockFetchStreamM3u8Url.mockReset()
    mockHlsInstance.attachMedia.mockClear()
    mockHlsInstance.loadSource.mockClear()
    mockHlsInstance.destroy.mockClear()
    mockHlsInstance.on.mockClear()
    hlsEventHandlers.clear()
    ;(MockHls as unknown as ReturnType<typeof vi.fn>).mockClear()

    // Default: fetchStreamM3u8Url never resolves (loading state)
    mockFetchStreamM3u8Url.mockReturnValue(new Promise(() => {}))

    // Mock global fetch for Helix stream metadata
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockStreamData),
    }) as unknown as typeof fetch

    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    dispose?.()
    if (container.parentNode) {
      document.body.removeChild(container)
    }
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('renders "Loading stream..." text on mount (initial state = loading)', () => {
    dispose = render(() => <PlayerScreen />, container)
    expect(container.textContent).toContain('Loading stream...')
  })

  it('renders video element with no src attribute (hls.js manages MSE)', () => {
    dispose = render(() => <PlayerScreen />, container)
    const video = container.querySelector('video')
    expect(video).toBeTruthy()
    expect(video?.getAttribute('src')).toBeNull()
  })

  it('shows error overlay with heading, body text, and Retry button when playerState is error', async () => {
    mockFetchStreamM3u8Url.mockRejectedValue(new Error('Network error'))

    dispose = render(() => <PlayerScreen />, container)
    await flushPromises()

    expect(container.textContent).toContain('Retry')
  })

  it('calls setFocus("player-retry") when error overlay mounts', async () => {
    mockFetchStreamM3u8Url.mockRejectedValue(new Error('fail'))

    dispose = render(() => <PlayerScreen />, container)
    await flushPromises()

    expect(mockSetFocus).toHaveBeenCalledWith('player-retry')
  })

  it('clicking Retry button resets state to loading (re-triggers stream acquisition)', async () => {
    // First call fails, second call hangs (loading)
    mockFetchStreamM3u8Url
      .mockRejectedValueOnce(new Error('fail'))
      .mockReturnValue(new Promise(() => {}))

    dispose = render(() => <PlayerScreen />, container)
    await flushPromises()

    expect(container.textContent).toContain('Retry')

    // Click retry
    const retryBtn = container.querySelector('button')
    retryBtn?.click()
    await flushPromises()

    expect(container.textContent).toContain('Loading stream...')
  })

  it('info bar renders channel name, stream title, game name, viewer count from fetched StreamData', async () => {
    mockFetchStreamM3u8Url.mockResolvedValue('https://usher.ttvnw.net/test.m3u8')

    dispose = render(() => <PlayerScreen />, container)
    await flushPromises()

    // Trigger MANIFEST_PARSED to move to playing state
    const manifestHandler = hlsEventHandlers.get('hlsManifestParsed')
    manifestHandler?.()
    await flushPromises()

    expect(container.textContent).toContain('TestChannel')
    expect(container.textContent).toContain('Test stream title')
    expect(container.textContent).toContain('Just Chatting')
    expect(container.textContent).toContain('42.3K watching')
  })

  it('info bar formats viewer count using formatWatching (e.g. "42.3K watching")', async () => {
    mockFetchStreamM3u8Url.mockResolvedValue('https://usher.ttvnw.net/test.m3u8')

    dispose = render(() => <PlayerScreen />, container)
    await flushPromises()

    const manifestHandler = hlsEventHandlers.get('hlsManifestParsed')
    manifestHandler?.()
    await flushPromises()

    expect(container.textContent).toContain('42.3K watching')
  })

  it('info bar auto-hides after 4000ms (use vi.useFakeTimers)', async () => {
    vi.useFakeTimers()
    mockFetchStreamM3u8Url.mockResolvedValue('https://usher.ttvnw.net/test.m3u8')

    dispose = render(() => <PlayerScreen />, container)

    // Manually resolve promises with fake timers
    await vi.advanceTimersByTimeAsync(100)

    const manifestHandler = hlsEventHandlers.get('hlsManifestParsed')
    manifestHandler?.()
    await vi.advanceTimersByTimeAsync(100)

    // Info bar should be visible
    expect(container.textContent).toContain('TestChannel')

    // Advance past 4000ms
    vi.advanceTimersByTime(4100)

    // Info bar should be hidden
    expect(container.textContent).not.toContain('TestChannel')
  })

  it('info bar re-shows on keydown event (window dispatch)', async () => {
    vi.useFakeTimers()
    mockFetchStreamM3u8Url.mockResolvedValue('https://usher.ttvnw.net/test.m3u8')

    dispose = render(() => <PlayerScreen />, container)
    await vi.advanceTimersByTimeAsync(100)

    const manifestHandler = hlsEventHandlers.get('hlsManifestParsed')
    manifestHandler?.()
    await vi.advanceTimersByTimeAsync(100)

    // Hide info bar
    vi.advanceTimersByTime(4100)
    expect(container.textContent).not.toContain('TestChannel')

    // Press a key to re-show
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    await vi.advanceTimersByTimeAsync(50)

    expect(container.textContent).toContain('TestChannel')
  })

  it('error overlay shows "Stream is offline" heading when errorKind is offline', async () => {
    mockFetchStreamM3u8Url.mockRejectedValue(new Error('Stream is offline or unavailable'))

    dispose = render(() => <PlayerScreen />, container)
    await flushPromises()

    expect(container.textContent).toContain('Stream is offline')
  })

  it('error overlay shows "Connection lost" heading when errorKind is network', async () => {
    mockFetchStreamM3u8Url.mockRejectedValue(new TypeError('Failed to fetch'))

    dispose = render(() => <PlayerScreen />, container)
    await flushPromises()

    expect(container.textContent).toContain('Connection lost')
  })

  it('error overlay shows "Playback error" heading when errorKind is unknown', async () => {
    mockFetchStreamM3u8Url.mockRejectedValue(new Error('Some weird error'))

    dispose = render(() => <PlayerScreen />, container)
    await flushPromises()

    expect(container.textContent).toContain('Playback error')
  })
})
