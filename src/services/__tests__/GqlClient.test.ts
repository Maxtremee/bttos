// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

describe('GqlClient', () => {
  let client: import('../clients').GqlClient
  let GqlClientError: typeof import('../clients').GqlClientError

  beforeEach(async () => {
    vi.resetModules()
    mockAuthStore.token = 'test_oauth_token'
    mockAuthStore.expiresAt = Date.now() + 3_600_000
    mockRefreshTokens.mockClear()

    globalThis.fetch = vi.fn()

    const mod = await import('../clients')
    client = new mod.GqlClient()
    GqlClientError = mod.GqlClientError
  })

  it('sends PlaybackAccessToken query with expected headers', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        data: {
          streamPlaybackAccessToken: {
            value: 'token-value',
            signature: 'sig-value',
          },
        },
      }),
    })

    await client.fetchPlaybackAccessToken('testchannel')

    const [url, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('https://gql.twitch.tv/gql')
    expect(options.method).toBe('POST')
    expect(options.headers['Client-ID']).toBe('kimne78kx3ncx6brgo4mv6wki5h1ko')
    expect(options.headers['Authorization']).toBe('Bearer test_oauth_token')
  })

  it('refreshes token when auth token is near expiry', async () => {
    mockAuthStore.expiresAt = Date.now() + 120_000
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        data: {
          streamPlaybackAccessToken: {
            value: 'token-value',
            signature: 'sig-value',
          },
        },
      }),
    })

    await client.fetchPlaybackAccessToken('testchannel')

    expect(mockRefreshTokens).toHaveBeenCalledOnce()
  })

  it('retries once on 401 and succeeds after refresh', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          data: {
            streamPlaybackAccessToken: {
              value: 'token-value',
              signature: 'sig-value',
            },
          },
        }),
      })

    await client.fetchPlaybackAccessToken('testchannel')

    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
    expect(mockRefreshTokens).toHaveBeenCalledOnce()
  })

  it('throws typed persisted-query error', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        errors: [{ message: 'PersistedQueryNotFound' }],
        data: null,
      }),
    })

    await expect(client.fetchPlaybackAccessToken('testchannel')).rejects.toMatchObject({
      code: 'persisted_query_not_found',
    })
  })

  it('accepts claim response with empty data payload when no GraphQL errors are present', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ data: null }),
    })

    await expect(client.claimCommunityPoints('channel-id', 'claim-id')).resolves.toBeUndefined()
  })

  it('throws unauthorized error when auth token is missing', async () => {
    mockAuthStore.token = null

    await expect(client.fetchPlaybackAccessToken('testchannel')).rejects.toBeInstanceOf(GqlClientError)
    await expect(client.fetchPlaybackAccessToken('testchannel')).rejects.toMatchObject({
      code: 'unauthorized',
    })
  })
})
