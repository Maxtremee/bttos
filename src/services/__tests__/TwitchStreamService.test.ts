// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mutable mock state
const mockAuthStore = {
  token: 'test_oauth_token',
  userId: 'test_user',
  expiresAt: Date.now() + 3600000, // 1 hour — not near expiry
}

const mockRefreshTokens = vi.fn().mockResolvedValue(undefined)

vi.mock('../../stores/authStore', () => ({
  get authStore() {
    return mockAuthStore
  },
}))

vi.mock('../TwitchAuthService', () => ({
  twitchAuthService: {
    get refreshTokens() {
      return mockRefreshTokens
    },
  },
}))

describe('TwitchStreamService', () => {
  let service: import('../TwitchStreamService').TwitchStreamService
  let validateChannelLoginFn: typeof import('../TwitchStreamService').validateChannelLogin

  beforeEach(async () => {
    vi.resetModules()

    // Reset mock state
    mockAuthStore.token = 'test_oauth_token'
    mockAuthStore.userId = 'test_user'
    mockAuthStore.expiresAt = Date.now() + 3600000
    mockRefreshTokens.mockClear()

    globalThis.fetch = vi.fn()

    const mod = await import('../TwitchStreamService')
    service = new mod.TwitchStreamService()
    validateChannelLoginFn = mod.validateChannelLogin
  })

  it('sends POST to gql.twitch.tv with correct headers', async () => {
    const mockGqlResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: {
          streamPlaybackAccessToken: {
            value: '{"channel":"testchannel"}',
            signature: 'abc123sig',
          },
        },
      }),
    }
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockGqlResponse)

    await service.fetchStreamM3u8Url('testchannel')

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(fetchCall[0]).toBe('https://gql.twitch.tv/gql')
    expect(fetchCall[1].method).toBe('POST')
    expect(fetchCall[1].headers['Client-ID']).toBe('kimne78kx3ncx6brgo4mv6wki5h1ko')
    expect(fetchCall[1].headers['Authorization']).toBe('OAuth test_oauth_token')
    expect(fetchCall[1].headers['Content-Type']).toBe('application/json')
  })

  it('sends correct GQL body with persisted query', async () => {
    const mockGqlResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: {
          streamPlaybackAccessToken: {
            value: '{"channel":"testchannel"}',
            signature: 'abc123sig',
          },
        },
      }),
    }
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockGqlResponse)

    await service.fetchStreamM3u8Url('testchannel')

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(fetchCall[1].body)
    expect(body.operationName).toBe('PlaybackAccessToken')
    expect(body.extensions.persistedQuery.version).toBe(1)
    expect(body.extensions.persistedQuery.sha256Hash).toBe(
      'ed230aa1e33e07eebb8928504583da78a5173989fadfb1ac94be06a04f3cdbe9'
    )
    expect(body.variables).toEqual({
      isLive: true,
      login: 'testchannel',
      isVod: false,
      vodID: '',
      playerType: 'site',
    })
  })

  it('constructs correct Usher URL with required params', async () => {
    const mockGqlResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: {
          streamPlaybackAccessToken: {
            value: '{"channel":"testchannel"}',
            signature: 'abc123sig',
          },
        },
      }),
    }
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockGqlResponse)

    const url = await service.fetchStreamM3u8Url('testchannel')

    expect(url).toContain('https://usher.ttvnw.net/api/channel/hls/testchannel.m3u8')
    const parsed = new URL(url)
    expect(parsed.searchParams.get('sig')).toBe('abc123sig')
    expect(parsed.searchParams.get('token')).toBe('{"channel":"testchannel"}')
    expect(parsed.searchParams.get('allow_source')).toBe('true')
    expect(parsed.searchParams.get('allow_audio_only')).toBe('true')
    expect(parsed.searchParams.get('allow_spectre')).toBe('false')
    expect(parsed.searchParams.get('fast_bread')).toBe('true')
    expect(parsed.searchParams.get('playlist_include_framerate')).toBe('true')
    expect(parsed.searchParams.get('p')).toBeTruthy() // random cache-bust param
  })

  it('throws on GQL non-200 response', async () => {
    const mockGqlResponse = {
      ok: false,
      status: 500,
      json: vi.fn(),
    }
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockGqlResponse)

    await expect(service.fetchStreamM3u8Url('testchannel')).rejects.toThrow(
      'GQL request failed: 500'
    )
  })

  it('throws when streamPlaybackAccessToken is null (stream offline)', async () => {
    const mockGqlResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: {
          streamPlaybackAccessToken: null,
        },
      }),
    }
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockGqlResponse)

    await expect(service.fetchStreamM3u8Url('testchannel')).rejects.toThrow(
      'Stream is offline or unavailable'
    )
  })

  it('throws on PersistedQueryNotFound error', async () => {
    const mockGqlResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        errors: [{ message: 'PersistedQueryNotFound' }],
        data: null,
      }),
    }
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockGqlResponse)

    await expect(service.fetchStreamM3u8Url('testchannel')).rejects.toThrow(
      'GQL persisted query hash stale'
    )
  })

  it('validates channel login names correctly', () => {
    // Valid names
    expect(validateChannelLoginFn('shroud')).toBe(true)
    expect(validateChannelLoginFn('ninja_123')).toBe(true)
    expect(validateChannelLoginFn('a')).toBe(true)
    expect(validateChannelLoginFn('A_B_C')).toBe(true)
    expect(validateChannelLoginFn('a'.repeat(25))).toBe(true)

    // Invalid names
    expect(validateChannelLoginFn('')).toBe(false)
    expect(validateChannelLoginFn('has space')).toBe(false)
    expect(validateChannelLoginFn('special!char')).toBe(false)
    expect(validateChannelLoginFn('a'.repeat(26))).toBe(false)
    expect(validateChannelLoginFn('path/../traversal')).toBe(false)
    expect(validateChannelLoginFn('name@evil')).toBe(false)
  })

  it('throws on invalid channel login in fetchStreamM3u8Url', async () => {
    await expect(service.fetchStreamM3u8Url('')).rejects.toThrow('Invalid channel login')
    await expect(service.fetchStreamM3u8Url('bad!name')).rejects.toThrow('Invalid channel login')
    // Fetch should NOT have been called
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
})
