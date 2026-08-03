import { gqlClient, type PlaybackAccessToken } from "./clients/GqlClient";
const CHANNEL_LOGIN_REGEX = /^[a-zA-Z0-9_]{1,25}$/;

/**
 * Validate a Twitch channel login name.
 * Must be 1-25 characters, alphanumeric + underscore only.
 */
export function validateChannelLogin(login: string): boolean {
  return CHANNEL_LOGIN_REGEX.test(login);
}

export function buildUsherUrl(channelLogin: string, token: PlaybackAccessToken): string {
  const params = new URLSearchParams({
    sig: token.signature,
    token: token.value,
    allow_source: "true",
    allow_audio_only: "true",
    allow_spectre: "false",
    fast_bread: "true",
    playlist_include_framerate: "true",
    p: String(Math.floor(Math.random() * 999999)),
  });
  const base = import.meta.env.DEV
    ? "/proxy/usher/api/channel/hls"
    : "https://usher.ttvnw.net/api/channel/hls";
  return `${base}/${channelLogin}.m3u8?${params.toString()}`;
}

export async function fetchStreamM3u8Url(channelLogin: string): Promise<string> {
  if (!validateChannelLogin(channelLogin))
    throw new Error(`Invalid channel login: ${channelLogin}`);
  return buildUsherUrl(channelLogin, await gqlClient.fetchPlaybackAccessToken(channelLogin));
}
