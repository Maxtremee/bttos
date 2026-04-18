import { authStore } from "../../stores/authStore";
import { twitchAuthService } from "../TwitchAuthService";

const GQL_ENDPOINT = "https://gql.twitch.tv/gql";
const GQL_CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";

export const GQL_HASH_PLAYBACK_ACCESS_TOKEN =
  "ed230aa1e33e07eebb8928504583da78a5173989fadfb1ac94be06a04f3cdbe9";
export const GQL_HASH_CHANNEL_POINTS_CONTEXT =
  "374314de591e69925fce3ddc2bcf085796f56ebb8cad67a0daa3165c03adc345";
export const GQL_HASH_CLAIM_COMMUNITY_POINTS =
  "46aaeebe02c99afdf4fc97c7c0cba964124bf6b0af229395f1f6d1feed05b3d0";

export interface PlaybackAccessToken {
  value: string;
  signature: string;
}

interface GqlError {
  message: string;
}

type GqlErrorCode = "unauthorized" | "http" | "persisted_query_not_found" | "graphql";

export class GqlClientError extends Error {
  code: GqlErrorCode;
  status?: number;
  details?: GqlError[];

  constructor(
    code: GqlErrorCode,
    message: string,
    opts?: { status?: number; details?: GqlError[] },
  ) {
    super(message);
    this.name = "GqlClientError";
    this.code = code;
    this.status = opts?.status;
    this.details = opts?.details;
  }
}

interface GqlRequestOptions {
  allowEmptyData?: boolean;
}

export class GqlClient {
  private async ensureFreshToken(): Promise<void> {
    if (authStore.expiresAt !== null && authStore.expiresAt - Date.now() < 300_000) {
      await twitchAuthService.refreshTokens();
    }
  }

  private headers(): Record<string, string> {
    if (!authStore.token) {
      throw new GqlClientError("unauthorized", "Missing OAuth token");
    }
    return {
      "Client-ID": GQL_CLIENT_ID,
      Authorization: `Bearer ${authStore.token}`,
      "Content-Type": "application/json",
    };
  }

  private async post<TData>(
    body: Record<string, unknown>,
    options?: GqlRequestOptions,
  ): Promise<TData> {
    await this.ensureFreshToken();
    return this.postWithRetry<TData>(body, true, options);
  }

  private async postWithRetry<TData>(
    body: Record<string, unknown>,
    allowRetry: boolean,
    options?: GqlRequestOptions,
  ): Promise<TData> {
    const res = await fetch(GQL_ENDPOINT, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (res.status === 401 && allowRetry) {
      try {
        await twitchAuthService.refreshTokens();
      } catch {
        throw new GqlClientError("unauthorized", "Unauthorized");
      }
      return this.postWithRetry<TData>(body, false, options);
    }

    if (!res.ok) {
      throw new GqlClientError("http", `GQL request failed: ${res.status}`, { status: res.status });
    }

    const json = (await res.json()) as { data?: TData; errors?: GqlError[] };
    if (json.errors?.some((e) => e.message === "PersistedQueryNotFound")) {
      throw new GqlClientError("persisted_query_not_found", "Persisted query hash is stale", {
        details: json.errors,
      });
    }

    if (json.errors && json.errors.length > 0) {
      throw new GqlClientError("graphql", json.errors[0].message, { details: json.errors });
    }

    if (!json.data && !options?.allowEmptyData) {
      throw new GqlClientError("graphql", "Missing GraphQL data payload");
    }

    return json.data as TData;
  }

  async fetchPlaybackAccessToken(channelLogin: string): Promise<PlaybackAccessToken> {
    const data = await this.post<{ streamPlaybackAccessToken: PlaybackAccessToken | null }>({
      operationName: "PlaybackAccessToken",
      extensions: {
        persistedQuery: {
          version: 1,
          sha256Hash: GQL_HASH_PLAYBACK_ACCESS_TOKEN,
        },
      },
      variables: {
        isLive: true,
        login: channelLogin,
        isVod: false,
        vodID: "",
        playerType: "site",
        platform: "web",
      },
    });

    if (!data.streamPlaybackAccessToken) {
      throw new GqlClientError("graphql", "Stream is offline or unavailable");
    }
    return data.streamPlaybackAccessToken;
  }

  async fetchChannelPointsContext(channelLogin: string): Promise<{
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
  }> {
    return this.post({
      operationName: "ChannelPointsContext",
      extensions: {
        persistedQuery: {
          version: 1,
          sha256Hash: GQL_HASH_CHANNEL_POINTS_CONTEXT,
        },
      },
      variables: { channelLogin },
    });
  }

  async claimCommunityPoints(channelId: string, claimId: string): Promise<void> {
    await this.post(
      {
        operationName: "ClaimCommunityPoints",
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: GQL_HASH_CLAIM_COMMUNITY_POINTS,
          },
        },
        variables: {
          input: { channelID: channelId, claimID: claimId },
        },
      },
      { allowEmptyData: true },
    );
  }
}

export const gqlClient = new GqlClient();
