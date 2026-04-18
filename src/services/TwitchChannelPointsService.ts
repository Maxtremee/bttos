/**
 * TwitchChannelPointsService
 *
 * Adapted from https://github.com/adamff-dev/twitch-adfree-webos/blob/main/src/scripts/claim_community_points.js
 * by adamff-dev. Rewritten in TypeScript / SolidJS idioms — not a verbatim copy.
 *
 * Silently polls Twitch's private GQL endpoint for available community-point claims
 * and auto-submits them while the user is watching a stream.
 */
import { authStore } from "../stores/authStore";
import { gqlClient, GqlClientError } from "./clients";

export type PollResult = "claimed" | "nothing" | "stop";

interface FetchContextResult {
  channelId: string;
  claimId: string;
}

export class TwitchChannelPointsService {
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
      return "stop";
    }

    const ctx = await this.fetchContext(channelLogin);
    if (ctx === "stop") return "stop";
    if (ctx === null) return "nothing";

    const ok = await this.claim(ctx.channelId, ctx.claimId);
    return ok ? "claimed" : "nothing";
  }

  private async fetchContext(channelLogin: string): Promise<FetchContextResult | "stop" | null> {
    let response: {
      community?: {
        id?: string;
        channel?: {
          self?: {
            communityPoints?: {
              availableClaim?: { id?: string } | null;
            };
          };
        };
      } | null;
    };

    try {
      response = await gqlClient.fetchChannelPointsContext(channelLogin);
    } catch (err) {
      if (err instanceof GqlClientError) {
        if (err.code === "persisted_query_not_found") {
          console.warn(
            "[TwitchChannelPointsService] ChannelPointsContext persisted-query hash is stale — stopping poll for",
            channelLogin,
          );
          return "stop";
        }
        if (err.code === "unauthorized" || (err.code === "http" && err.status === 401)) {
          console.warn(
            "[TwitchChannelPointsService] 401 from GQL — stopping poll for",
            channelLogin,
          );
          return "stop";
        }
        if (err.code === "http" && typeof err.status === "number") {
          throw new Error(`[TwitchChannelPointsService] GQL request failed: ${err.status}`);
        }
        if (err.code === "graphql") {
          return null;
        }
      }
      throw err;
    }

    const community = response.community;
    if (!community || !community.id) {
      // Stream offline or channel has no community points enabled — nothing to do.
      return null;
    }

    const availableClaim = community.channel?.self?.communityPoints?.availableClaim;
    if (!availableClaim || !availableClaim.id) {
      return null;
    }

    return { channelId: community.id, claimId: availableClaim.id };
  }

  private async claim(channelId: string, claimId: string): Promise<boolean> {
    try {
      await gqlClient.claimCommunityPoints(channelId, claimId);
    } catch (err) {
      if (err instanceof GqlClientError) {
        if (err.code === "http" && typeof err.status === "number") {
          console.warn(
            `[TwitchChannelPointsService] claim mutation failed: ${err.status} — will retry next tick`,
          );
          return false;
        }
        if (err.code === "graphql" && err.message) {
          console.warn(
            "[TwitchChannelPointsService] claim mutation returned errors — will retry next tick:",
            err.message,
          );
          return false;
        }
        if (err.code === "persisted_query_not_found") {
          console.warn(
            "[TwitchChannelPointsService] claim mutation persisted query stale — will retry next tick",
          );
          return false;
        }
        if (err.code === "unauthorized") {
          return false;
        }
      }
      throw err;
    }

    console.log("[TwitchChannelPointsService] claimed community points", {
      channelId,
      claimId,
    });
    return true;
  }
}

export const twitchChannelPointsService = new TwitchChannelPointsService();
