import { gqlClient, GqlClientError } from './clients'
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
 * Note: Uses Bearer prefix for GQL Authorization header (device code flow tokens).
 * Uses Twitch's internal Client-ID (kimne78kx3ncx6brgo4mv6wki5h1ko) for the GQL endpoint.
 */
export class TwitchStreamService {
  /**
   * Fetch the PlaybackAccessToken for a channel via Twitch GQL.
   * @throws Error if channel login is invalid, GQL request fails, stream is offline, or persisted query is stale
   */
  async fetchPlaybackAccessToken(channelLogin: string): Promise<PlaybackAccessToken> {
    if (!validateChannelLogin(channelLogin)) {
      throw new Error(`Invalid channel login: ${channelLogin}`)
    }

    try {
      return await gqlClient.fetchPlaybackAccessToken(channelLogin)
    } catch (err) {
      if (!(err instanceof GqlClientError)) {
        throw err
      }
      if (err.code === 'persisted_query_not_found') {
        throw new Error('GQL persisted query hash stale — needs update')
      }
      if (err.code === 'http' && typeof err.status === 'number') {
        throw new Error(`GQL request failed: ${err.status}`)
      }
      throw new Error(err.message)
    }
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
    const base = import.meta.env.DEV
      ? '/proxy/usher/api/channel/hls'
      : 'https://usher.ttvnw.net/api/channel/hls'
    return `${base}/${channelLogin}.m3u8?${params.toString()}`
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
