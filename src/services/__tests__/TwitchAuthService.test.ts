// @vitest-environment happy-dom
import { describe, it } from 'vitest'

// Implementation lives in src/services/TwitchAuthService.ts (Wave 2)
describe('TwitchAuthService', () => {
  describe('requestDeviceCode()', () => {
    it.todo('builds POST to https://id.twitch.tv/oauth2/device with client_id and scope')
    it.todo('returns DeviceCodeResponse with device_code, user_code, verification_uri, expires_in, interval')
  })

  describe('pollForToken()', () => {
    it.todo('returns TokenResponse on HTTP 200')
    it.todo('returns "pending" when response body message is "authorization_pending"')
    it.todo('returns "expired" on any non-200 non-pending response')
  })

  describe('refreshTokens()', () => {
    it.todo('deduplicates concurrent calls — only one HTTP request made when called twice simultaneously')
    it.todo('writes access_token, then expires_at, then refresh_token (write ordering)')
    it.todo('throws and clears stored tokens when refresh endpoint returns non-200')
    it.todo('uses grant_type=urn:ietf:params:oauth:grant-type:device_code for poll (not short form)')
    it.todo('does NOT include client_secret in refresh request (Public client)')
  })
})
