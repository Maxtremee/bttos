import { authStore } from '../stores/authStore'
import { helixClient, HelixClientError } from './clients'

// Safety cap: max 50 pages (5000 channels) to prevent infinite loops from malformed API responses
const MAX_PAGINATION_PAGES = 50

export interface StreamData {
  user_id: string
  user_login: string
  user_name: string
  game_name: string
  title: string
  viewer_count: number
  thumbnail_url: string
  type: string
  started_at: string
}

/**
 * Replace {width} and {height} template tokens in a Twitch thumbnail URL.
 */
export function thumbnailUrl(templateUrl: string, width: number, height: number): string {
  return templateUrl.replace('{width}', String(width)).replace('{height}', String(height))
}

/**
 * Format a viewer count for display.
 * - < 1000: "N viewers"
 * - >= 1000: "N.NK viewers"
 */
export function formatViewers(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K viewers`
  }
  return `${count} viewers`
}

export class TwitchChannelService {
  /**
   * Fetch all live streams for the authenticated user's followed channels.
   *
   * Step 1: Paginate /helix/channels/followed to collect all broadcaster IDs.
   * Step 2: Batch-query /helix/streams with up to 100 user_ids per request.
   * Returns combined array of StreamData from all batches.
   */
  async fetchLiveFollowedChannels(): Promise<StreamData[]> {
    // Step 1: Collect all followed broadcaster IDs via paginated /helix/channels/followed
    const followerIds: string[] = []
    let cursor: string | undefined = undefined
    let pageCount = 0

    do {
      let data: {
        data: { broadcaster_id: string }[]
        pagination?: { cursor?: string }
      }

      try {
        data = await helixClient.fetchFollowedChannelsPage(authStore.userId ?? '', cursor)
      } catch (err) {
        if (err instanceof HelixClientError && typeof err.status === 'number') {
          throw new Error(`Failed to fetch followed channels: ${err.status}`)
        }
        throw err
      }

      for (const channel of data.data) {
        followerIds.push(channel.broadcaster_id)
      }

      cursor = data.pagination?.cursor
      pageCount++
    } while (cursor && pageCount < MAX_PAGINATION_PAGES)

    // If no followed channels, return early without calling /helix/streams
    if (followerIds.length === 0) {
      return []
    }

    // Step 2: Batch followerIds into groups of 100 and query /helix/streams
    const streams: StreamData[] = []
    const batchSize = 100

    for (let i = 0; i < followerIds.length; i += batchSize) {
      const batch = followerIds.slice(i, i + batchSize)

      let data: { data: StreamData[] }
      try {
        data = await helixClient.fetchStreamsByUserIds(batch)
      } catch (err) {
        if (err instanceof HelixClientError && typeof err.status === 'number') {
          throw new Error(`Failed to fetch streams: ${err.status}`)
        }
        throw err
      }
      streams.push(...data.data)
    }

    return streams
  }
}

export const twitchChannelService = new TwitchChannelService()
