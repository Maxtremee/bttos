// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

describe('TwitchAuthService', () => {
  // Shared service instance — recreated per test to avoid state bleed
  let service: import('../TwitchAuthService').TwitchAuthService

  beforeEach(async () => {
    vi.resetModules()
    localStorage.clear()
    vi.stubEnv('VITE_TWITCH_CLIENT_ID', 'test_client_id')
    const mod = await import('../TwitchAuthService')
    service = new mod.TwitchAuthService()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  describe('requestDeviceCode()', () => {
    it('builds POST to https://id.twitch.tv/oauth2/device with client_id and scope', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            device_code: 'dev123',
            user_code: 'USR-123',
            verification_uri: 'https://twitch.tv/activate',
            expires_in: 1800,
            interval: 5,
          }),
          { status: 200 }
        )
      )

      await service.requestDeviceCode()

      expect(fetchSpy).toHaveBeenCalledOnce()
      const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('https://id.twitch.tv/oauth2/device')
      expect(options.method).toBe('POST')

      const body = new URLSearchParams(options.body as string)
      expect(body.get('client_id')).toBe('test_client_id')
      expect(body.get('scope')).toBe('user:read:follows user:read:chat')
    })

    it('returns DeviceCodeResponse with device_code, user_code, verification_uri, expires_in, interval', async () => {
      const mockData = {
        device_code: 'dev123',
        user_code: 'USR-123',
        verification_uri: 'https://twitch.tv/activate',
        expires_in: 1800,
        interval: 5,
      }
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockData), { status: 200 })
      )

      const result = await service.requestDeviceCode()
      expect(result).toEqual(mockData)
    })

    it('throws when response is not OK', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response('Bad Request', { status: 400 })
      )
      await expect(service.requestDeviceCode()).rejects.toThrow('Device code request failed: 400')
    })
  })

  describe('pollForToken()', () => {
    it('returns TokenResponse on HTTP 200', async () => {
      const mockToken = {
        access_token: 'acc123',
        refresh_token: 'ref456',
        token_type: 'bearer' as const,
        expires_in: 14400,
        scope: ['user:read:follows', 'user:read:chat'],
      }
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockToken), { status: 200 })
      )

      const result = await service.pollForToken('device_code_abc')
      expect(result).toEqual(mockToken)
    })

    it('returns "pending" when response body message is "authorization_pending"', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ message: 'authorization_pending' }), { status: 400 })
      )

      const result = await service.pollForToken('device_code_abc')
      expect(result).toBe('pending')
    })

    it('returns "expired" on any non-200 non-pending response', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ message: 'invalid device code' }), { status: 400 })
      )

      const result = await service.pollForToken('device_code_abc')
      expect(result).toBe('expired')
    })

    it('sends POST to https://id.twitch.tv/oauth2/token with grant_type=urn:ietf:params:oauth:grant-type:device_code', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ message: 'authorization_pending' }), { status: 400 })
      )

      await service.pollForToken('device_code_abc')

      const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('https://id.twitch.tv/oauth2/token')
      const body = new URLSearchParams(options.body as string)
      expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:device_code')
    })
  })

  describe('refreshTokens()', () => {
    it('deduplicates concurrent calls — only one HTTP request made when called twice simultaneously', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: 'new_tok',
            refresh_token: 'new_ref',
            expires_in: 14400,
          }),
          { status: 200 }
        )
      )
      localStorage.setItem('twitch_refresh_token', 'old_ref')

      // Call twice without awaiting first
      const p1 = service.refreshTokens()
      const p2 = service.refreshTokens()
      await Promise.all([p1, p2])

      expect(fetchSpy).toHaveBeenCalledTimes(1) // only ONE HTTP request
    })

    it('writes access_token, then expires_at, then refresh_token (write ordering)', async () => {
      const writeOrder: string[] = []
      const originalSetItem = localStorage.setItem.bind(localStorage)
      vi.spyOn(localStorage, 'setItem').mockImplementation((key: string, value: string) => {
        writeOrder.push(key)
        originalSetItem(key, value)
      })

      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: 'new_tok',
            refresh_token: 'new_ref',
            expires_in: 14400,
          }),
          { status: 200 }
        )
      )
      localStorage.setItem('twitch_refresh_token', 'old_ref')
      // Reset tracking after setup
      writeOrder.length = 0

      await service.refreshTokens()

      const relevantWrites = writeOrder.filter(k =>
        ['twitch_access_token', 'twitch_expires_at', 'twitch_refresh_token'].includes(k)
      )
      expect(relevantWrites[0]).toBe('twitch_access_token')
      expect(relevantWrites[1]).toBe('twitch_expires_at')
      expect(relevantWrites[2]).toBe('twitch_refresh_token')
    })

    it('throws and clears stored tokens when refresh endpoint returns non-200', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response('Unauthorized', { status: 401 })
      )
      localStorage.setItem('twitch_refresh_token', 'old_ref')
      localStorage.setItem('twitch_access_token', 'old_tok')

      await expect(service.refreshTokens()).rejects.toThrow()

      expect(localStorage.getItem('twitch_access_token')).toBeNull()
      expect(localStorage.getItem('twitch_refresh_token')).toBeNull()
    })

    it('uses grant_type=urn:ietf:params:oauth:grant-type:device_code for poll (not short form)', async () => {
      // This test verifies the pollForToken uses the full URN grant_type
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ message: 'authorization_pending' }), { status: 400 })
      )

      await service.pollForToken('some_device_code')

      const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit]
      const body = new URLSearchParams(options.body as string)
      expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:device_code')
    })

    it('does NOT include client_secret in refresh request (Public client)', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: 'new_tok',
            refresh_token: 'new_ref',
            expires_in: 14400,
          }),
          { status: 200 }
        )
      )
      localStorage.setItem('twitch_refresh_token', 'old_ref')

      await service.refreshTokens()

      const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit]
      const body = new URLSearchParams(options.body as string)
      expect(body.get('client_secret')).toBeNull()
      expect(body.has('client_secret')).toBe(false)
    })
  })
})
