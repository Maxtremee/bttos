import { authStore } from '../stores/authStore'
import { twitchAuthService } from './TwitchAuthService'

const GQL_ENDPOINT = 'https://gql.twitch.tv/gql'
const TWITCH_INTERNAL_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko'
const PERSISTED_QUERY_HASH = 'ed230aa1e33e07eebb8928504583da78a5173989fadfb1ac94be06a04f3cdbe9'
const CHANNEL_LOGIN_REGEX = /^[a-zA-Z0-9_]{1,25}$/

export interface PlaybackAccessToken {
  value: string
  signature: string
}

/**
 * Validate a Twitch channel login name.
 * Must be 1-25 characters, alphanumeric + underscore only.
 */
export function validateChannelLogin(login: string): boolean {
  return CHANNEL_LOGIN_REGEX.test(login)
}

/**
 * Service for acquiring Twitch stream HLS URLs via the GQL PlaybackAccessToken + Usher flow.
 *
 * Flow:
 * 1. POST to gql.twitch.tv/gql with PlaybackAccessToken persisted query
 * 2. Extract signature + value (JWT token) from response
 * 3. Construct Usher m3u8 URL with token params
 *
 * Note: Uses OAuth prefix (NOT Bearer) for GQL Authorization header.
 * Uses Twitch's internal Client-ID (kimne78kx3ncx6brgo4mv6wki5h1ko), not the app's Client-ID.
 */
export class TwitchStreamService {
  private async ensureFreshToken(): Promise<void> {
    if (authStore.expiresAt !== null && authStore.expiresAt - Date.now() < 300_000) {
      await twitchAuthService.refreshTokens()
    }
  }

  /**
   * Fetch the PlaybackAccessToken for a channel via Twitch GQL.
   * @throws Error if channel login is invalid, GQL request fails, stream is offline, or persisted query is stale
   */
  async fetchPlaybackAccessToken(channelLogin: string): Promise<PlaybackAccessToken> {
    if (!validateChannelLogin(channelLogin)) {
      throw new Error(`Invalid channel login: ${channelLogin}`)
    }

    await this.ensureFreshToken()

    const res = await fetch(GQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Client-ID': TWITCH_INTERNAL_CLIENT_ID,
        'Authorization': `OAuth ${authStore.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operationName: 'PlaybackAccessToken',
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: PERSISTED_QUERY_HASH,
          },
        },
        variables: {
          isLive: true,
          login: channelLogin,
          isVod: false,
          vodID: '',
          playerType: 'site',
        },
      }),
    })

    if (!res.ok) {
      throw new Error(`GQL request failed: ${res.status}`)
    }

    const json = await res.json()

    if (json.errors?.some((e: { message: string }) => e.message === 'PersistedQueryNotFound')) {
      throw new Error('GQL persisted query hash stale — needs update')
    }

    const pat = json.data?.streamPlaybackAccessToken
    if (!pat) {
      throw new Error('Stream is offline or unavailable')
    }

    return pat
  }

  /**
   * Build the Usher m3u8 URL from a channel login and PlaybackAccessToken.
   * The URL includes the signed token as query params.
   *
   * Note: Do NOT log the full URL — it contains the access token in query string.
   */
  buildUsherUrl(channelLogin: string, token: PlaybackAccessToken): string {
    const params = new URLSearchParams({
      sig: token.signature,
      token: token.value,
      allow_source: 'true',
      allow_audio_only: 'true',
      allow_spectre: 'false',
      fast_bread: 'true',
      playlist_include_framerate: 'true',
      p: String(Math.floor(Math.random() * 999999)),
    })
    return `https://usher.ttvnw.net/api/channel/hls/${channelLogin}.m3u8?${params.toString()}`
  }

  /**
   * Fetch the stream m3u8 URL for a channel.
   * This is the main entry point — combines GQL token fetch + Usher URL construction.
   */
  async fetchStreamM3u8Url(channelLogin: string): Promise<string> {
    const token = await this.fetchPlaybackAccessToken(channelLogin)
    return this.buildUsherUrl(channelLogin, token)
  }
}

export const twitchStreamService = new TwitchStreamService()
