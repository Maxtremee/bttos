// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('../../stores/authStore', () => ({
  authStore: {
    token: 'test_token',
    userId: 'test_user',
    expiresAt: Date.now() + 3600000, // 1 hour from now — not expiring
  },
}))

vi.mock('../TwitchAuthService', () => ({
  twitchAuthService: {
    refreshTokens: vi.fn().mockResolvedValue(undefined),
  },
}))

describe('TwitchChannelService', () => {
  let service: import('../TwitchChannelService').TwitchChannelService
  let refreshTokensMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    vi.stubEnv('VITE_TWITCH_CLIENT_ID', 'test_client_id')

    // Re-apply mocks after resetModules
    vi.mock('../../stores/authStore', () => ({
      authStore: {
        token: 'test_token',
        userId: 'test_user',
        expiresAt: Date.now() + 3600000,
      },
    }))

    vi.mock('../TwitchAuthService', () => ({
      twitchAuthService: {
        refreshTokens: vi.fn().mockResolvedValue(undefined),
      },
    }))

    const mod = await import('../TwitchChannelService')
    service = new mod.TwitchChannelService()

    const authMod = await import('../TwitchAuthService')
    refreshTokensMock = authMod.twitchAuthService.refreshTokens as ReturnType<typeof vi.fn>
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  describe('fetchLiveFollowedChannels()', () => {
    it('Test 1: calls /helix/channels/followed with Authorization Bearer and Client-Id headers', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const urlStr = String(url)
        if (urlStr.includes('/helix/channels/followed')) {
          return new Response(
            JSON.stringify({ data: [], pagination: {} }),
            { status: 200 }
          )
        }
        return new Response(JSON.stringify({ data: [] }), { status: 200 })
      })

      await service.fetchLiveFollowedChannels()

      const followedCall = fetchSpy.mock.calls.find(([url]) =>
        String(url).includes('/helix/channels/followed')
      )
      expect(followedCall).toBeDefined()
      const [url, options] = followedCall as [string, RequestInit]
      expect(url).toContain('user_id=test_user')
      expect((options.headers as Record<string, string>)['Authorization']).toBe('Bearer test_token')
      expect((options.headers as Record<string, string>)['Client-Id']).toBe('test_client_id')
    })

    it('Test 2: paginates through all pages when cursor is present', async () => {
      let callCount = 0
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const urlStr = String(url)
        if (urlStr.includes('/helix/channels/followed')) {
          callCount++
          if (callCount === 1) {
            // First page — returns cursor
            return new Response(
              JSON.stringify({
                data: [{ broadcaster_id: 'channel1' }],
                pagination: { cursor: 'next_cursor_abc' },
              }),
              { status: 200 }
            )
          } else {
            // Second page — no cursor
            return new Response(
              JSON.stringify({
                data: [{ broadcaster_id: 'channel2' }],
                pagination: {},
              }),
              { status: 200 }
            )
          }
        }
        // streams call
        return new Response(JSON.stringify({ data: [] }), { status: 200 })
      })

      await service.fetchLiveFollowedChannels()

      const followedCalls = fetchSpy.mock.calls.filter(([url]) =>
        String(url).includes('/helix/channels/followed')
      )
      expect(followedCalls.length).toBe(2)
      // Second call should include after cursor
      expect(String(followedCalls[1][0])).toContain('after=next_cursor_abc')
    })

    it('Test 3: batches broadcaster IDs using params.append (not comma-joined) for /helix/streams', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const urlStr = String(url)
        if (urlStr.includes('/helix/channels/followed')) {
          return new Response(
            JSON.stringify({
              data: [
                { broadcaster_id: 'ch1' },
                { broadcaster_id: 'ch2' },
                { broadcaster_id: 'ch3' },
              ],
              pagination: {},
            }),
            { status: 200 }
          )
        }
        // streams call
        return new Response(JSON.stringify({ data: [] }), { status: 200 })
      })

      await service.fetchLiveFollowedChannels()

      const streamCall = fetchSpy.mock.calls.find(([url]) =>
        String(url).includes('/helix/streams')
      )
      expect(streamCall).toBeDefined()
      const urlStr = String(streamCall![0])
      // Must use repeated user_id params (not comma-joined)
      expect(urlStr).toContain('user_id=ch1')
      expect(urlStr).toContain('user_id=ch2')
      expect(urlStr).toContain('user_id=ch3')
      // Must NOT have comma-joined IDs
      expect(urlStr).not.toContain('user_id=ch1%2Cch2')
      expect(urlStr).not.toContain('user_id=ch1,ch2')
    })

    it('Test 4: returns data from /helix/streams response', async () => {
      const mockStream = {
        user_id: 'ch1',
        user_login: 'streamer1',
        user_name: 'Streamer1',
        game_name: 'Just Chatting',
        title: 'Test Stream',
        viewer_count: 500,
        thumbnail_url: 'https://example.com/{width}x{height}.jpg',
        type: 'live',
        started_at: '2026-01-01T00:00:00Z',
      }
      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const urlStr = String(url)
        if (urlStr.includes('/helix/channels/followed')) {
          return new Response(
            JSON.stringify({
              data: [{ broadcaster_id: 'ch1' }],
              pagination: {},
            }),
            { status: 200 }
          )
        }
        return new Response(JSON.stringify({ data: [mockStream] }), { status: 200 })
      })

      const result = await service.fetchLiveFollowedChannels()
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(mockStream)
    })

    it('Test 5: returns [] without calling /helix/streams when followed list is empty', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const urlStr = String(url)
        if (urlStr.includes('/helix/channels/followed')) {
          return new Response(
            JSON.stringify({ data: [], pagination: {} }),
            { status: 200 }
          )
        }
        return new Response(JSON.stringify({ data: [] }), { status: 200 })
      })

      const result = await service.fetchLiveFollowedChannels()

      expect(result).toEqual([])
      const streamCalls = fetchSpy.mock.calls.filter(([url]) =>
        String(url).includes('/helix/streams')
      )
      expect(streamCalls).toHaveLength(0)
    })

    it('Test 8: calls twitchAuthService.refreshTokens() when token is within 5 minutes of expiry', async () => {
      // Re-mock authStore with near-expiry token
      vi.mock('../../stores/authStore', () => ({
        authStore: {
          token: 'test_token',
          userId: 'test_user',
          expiresAt: Date.now() + 200000, // Less than 5 min (300000ms)
        },
      }))

      // Re-import to pick up new mock
      vi.resetModules()
      vi.mock('../../stores/authStore', () => ({
        authStore: {
          token: 'test_token',
          userId: 'test_user',
          expiresAt: Date.now() + 200000,
        },
      }))
      vi.mock('../TwitchAuthService', () => ({
        twitchAuthService: {
          refreshTokens: vi.fn().mockResolvedValue(undefined),
        },
      }))

      const mod = await import('../TwitchChannelService')
      const freshService = new mod.TwitchChannelService()
      const authMod = await import('../TwitchAuthService')
      const localRefreshMock = authMod.twitchAuthService.refreshTokens as ReturnType<typeof vi.fn>

      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const urlStr = String(url)
        if (urlStr.includes('/helix/channels/followed')) {
          return new Response(JSON.stringify({ data: [], pagination: {} }), { status: 200 })
        }
        return new Response(JSON.stringify({ data: [] }), { status: 200 })
      })

      await freshService.fetchLiveFollowedChannels()
      expect(localRefreshMock).toHaveBeenCalledOnce()
    })

    it('Test 9: on 401 from Helix, calls refreshTokens() and retries once', async () => {
      let callCount = 0
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const urlStr = String(url)
        if (urlStr.includes('/helix/channels/followed')) {
          callCount++
          if (callCount === 1) {
            // First call returns 401
            return new Response('Unauthorized', { status: 401 })
          }
          // Retry returns success
          return new Response(
            JSON.stringify({ data: [], pagination: {} }),
            { status: 200 }
          )
        }
        return new Response(JSON.stringify({ data: [] }), { status: 200 })
      })

      await service.fetchLiveFollowedChannels()

      // Should have retried
      const followedCalls = fetchSpy.mock.calls.filter(([url]) =>
        String(url).includes('/helix/channels/followed')
      )
      expect(followedCalls.length).toBe(2)
      expect(refreshTokensMock).toHaveBeenCalledOnce()
    })
  })

  describe('thumbnailUrl()', () => {
    it('Test 6: replaces {width} and {height} in template URL with given dimensions', async () => {
      const mod = await import('../TwitchChannelService')
      const result = mod.thumbnailUrl('https://example.com/{width}x{height}.jpg', 284, 160)
      expect(result).toBe('https://example.com/284x160.jpg')
    })
  })

  describe('formatViewers()', () => {
    it('Test 7: formats viewer counts correctly', async () => {
      const mod = await import('../TwitchChannelService')
      expect(mod.formatViewers(500)).toBe('500 viewers')
      expect(mod.formatViewers(1000)).toBe('1.0K viewers')
      expect(mod.formatViewers(1234)).toBe('1.2K viewers')
      expect(mod.formatViewers(15678)).toBe('15.7K viewers')
    })
  })
})
