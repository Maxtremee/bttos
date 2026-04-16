/**
 * TwitchChannelPointsService
 *
 * Adapted from https://github.com/adamff-dev/twitch-adfree-webos/blob/main/src/scripts/claim_community_points.js
 * by adamff-dev. Rewritten in TypeScript / SolidJS idioms — not a verbatim copy.
 *
 * Silently polls Twitch's private GQL endpoint for available community-point claims
 * and auto-submits them while the user is watching a stream.
 */
import { authStore } from '../stores/authStore'

const GQL_ENDPOINT = 'https://gql.twitch.tv/gql'
const GQL_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko'
const CONTEXT_QUERY_HASH = '374314de591e69925fce3ddc2bcf085796f56ebb8cad67a0daa3165c03adc345'
const CLAIM_MUTATION_HASH = '46aaeebe02c99afdf4fc97c7c0cba964124bf6b0af229395f1f6d1feed05b3d0'

export type PollResult = 'claimed' | 'nothing' | 'stop'

interface GqlError {
  message: string
}

interface FetchContextResult {
  channelId: string
  claimId: string
}

export class TwitchChannelPointsService {
  private gqlHeaders(): Record<string, string> {
    return {
      'Client-ID': GQL_CLIENT_ID,
      'Authorization': `Bearer ${authStore.token}`,
      'Content-Type': 'application/json',
    }
  }

  /**
   * Poll for an available claim and, if present, submit it.
   * - Returns 'stop' on 401 or PersistedQueryNotFound — caller MUST stop polling.
   * - Returns 'claimed' when a claim was fetched AND posted successfully.
   * - Returns 'nothing' on a successful poll with no availableClaim (or a claim
   *   mutation that itself returned errors — poll continues next tick).
   * - Throws on transient errors (network/5xx/JSON parse) so the composable can log + continue.
   */
  async pollAndClaim(channelLogin: string): Promise<PollResult> {
    // No point polling unauthenticated
    if (!authStore.token) {
      return 'stop'
    }

    const ctx = await this.fetchContext(channelLogin)
    if (ctx === 'stop') return 'stop'
    if (ctx === null) return 'nothing'

    const ok = await this.claim(ctx.channelId, ctx.claimId)
    return ok ? 'claimed' : 'nothing'
  }

  private async fetchContext(
    channelLogin: string,
  ): Promise<FetchContextResult | 'stop' | null> {
    const res = await fetch(GQL_ENDPOINT, {
      method: 'POST',
      headers: this.gqlHeaders(),
      body: JSON.stringify({
        operationName: 'ChannelPointsContext',
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: CONTEXT_QUERY_HASH,
          },
        },
        variables: { channelLogin },
      }),
    })

    if (res.status === 401) {
      console.warn('[TwitchChannelPointsService] 401 from GQL — stopping poll for', channelLogin)
      return 'stop'
    }

    if (!res.ok) {
      throw new Error(`[TwitchChannelPointsService] GQL request failed: ${res.status}`)
    }

    const json = (await res.json()) as {
      errors?: GqlError[]
      data?: {
        community?: {
          id?: string
          channel?: {
            self?: {
              communityPoints?: {
                availableClaim?: { id?: string } | null
              }
            }
          }
        } | null
      } | null
    }

    if (json.errors?.some((e) => e.message === 'PersistedQueryNotFound')) {
      console.warn(
        '[TwitchChannelPointsService] ChannelPointsContext persisted-query hash is stale — stopping poll for',
        channelLogin,
      )
      return 'stop'
    }

    const community = json.data?.community
    if (!community || !community.id) {
      // Stream offline or channel has no community points enabled — nothing to do.
      return null
    }

    const availableClaim = community.channel?.self?.communityPoints?.availableClaim
    if (!availableClaim || !availableClaim.id) {
      return null
    }

    return { channelId: community.id, claimId: availableClaim.id }
  }

  private async claim(channelId: string, claimId: string): Promise<boolean> {
    const res = await fetch(GQL_ENDPOINT, {
      method: 'POST',
      headers: this.gqlHeaders(),
      body: JSON.stringify({
        operationName: 'ClaimCommunityPoints',
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: CLAIM_MUTATION_HASH,
          },
        },
        variables: {
          input: { channelID: channelId, claimID: claimId },
        },
      }),
    })

    if (!res.ok) {
      console.warn(
        `[TwitchChannelPointsService] claim mutation failed: ${res.status} — will retry next tick`,
      )
      return false
    }

    const json = (await res.json()) as { errors?: GqlError[] }

    if (json.errors && json.errors.length > 0) {
      console.warn(
        '[TwitchChannelPointsService] claim mutation returned errors — will retry next tick:',
        json.errors[0].message,
      )
      return false
    }

    console.log('[TwitchChannelPointsService] claimed community points', {
      channelId,
      claimId,
    })
    return true
  }
}

export const twitchChannelPointsService = new TwitchChannelPointsService()
