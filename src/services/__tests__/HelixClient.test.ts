// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.stubEnv('VITE_TWITCH_CLIENT_ID', 'test_client_id')

const mockAuthStore = {
  token: 'test_oauth_token',
  refreshToken: 'refresh_token',
  userId: 'test_user',
  expiresAt: Date.now() + 3_600_000,
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

describe('HelixClient', () => {
  let client: import('../clients').HelixClient

  beforeEach(async () => {
    vi.resetModules()
    vi.stubEnv('VITE_TWITCH_CLIENT_ID', 'test_client_id')
    mockAuthStore.token = 'test_oauth_token'
    mockAuthStore.expiresAt = Date.now() + 3_600_000
    mockRefreshTokens.mockClear()

    globalThis.fetch = vi.fn()

    const mod = await import('../clients')
    client = new mod.HelixClient()
  })

  it('fetchFollowedChannelsPage sends expected URL and auth headers', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ data: [], pagination: {} }),
    })

    await client.fetchFollowedChannelsPage('user-1', 'cursor-1')

    const [url, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(String(url)).toContain('https://api.twitch.tv/helix/channels/followed')
    expect(String(url)).toContain('user_id=user-1')
    expect(String(url)).toContain('after=cursor-1')
    expect(options.headers['Authorization']).toBe('Bearer test_oauth_token')
    expect(options.headers['Client-Id']).toBe('test_client_id')
  })

  it('retries once on 401 for auth-store backed requests', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ data: [] }),
      })

    await client.fetchStreamsByUserIds(['u1'])

    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
    expect(mockRefreshTokens).toHaveBeenCalledOnce()
  })

  it('createChatSubscription uses explicit token override and does not refresh', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ data: [] }),
    })

    await client.createChatSubscription({
      sessionId: 'sid',
      broadcasterId: 'bid',
      userId: 'uid',
      token: 'ws_token',
    })

    const [url, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(String(url)).toBe('https://api.twitch.tv/helix/eventsub/subscriptions')
    expect(options.method).toBe('POST')
    expect(options.headers['Authorization']).toBe('Bearer ws_token')
    expect(mockRefreshTokens).not.toHaveBeenCalled()
  })
})
