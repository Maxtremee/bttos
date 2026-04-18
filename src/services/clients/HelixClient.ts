import { authStore } from "../../stores/authStore";
import { twitchAuthService } from "../TwitchAuthService";
import type { StreamData } from "../TwitchChannelService";

const CLIENT_ID = import.meta.env.VITE_TWITCH_CLIENT_ID as string;
const HELIX_BASE_URL = "https://api.twitch.tv/helix";

type HelixErrorCode = "unauthorized" | "http";

export class HelixClientError extends Error {
  code: HelixErrorCode;
  status?: number;

  constructor(code: HelixErrorCode, message: string, status?: number) {
    super(message);
    this.name = "HelixClientError";
    this.code = code;
    this.status = status;
  }
}

interface RequestOptions {
  tokenOverride?: string;
  retryOnUnauthorized?: boolean;
}

export interface HelixFollowedChannelsResponse {
  data: { broadcaster_id: string }[];
  pagination?: { cursor?: string };
}

export interface HelixStreamsResponse {
  data: StreamData[];
}

export class HelixClient {
  private async ensureFreshToken(): Promise<void> {
    if (authStore.expiresAt !== null && authStore.expiresAt - Date.now() < 300_000) {
      await twitchAuthService.refreshTokens();
    }
  }

  private buildHeaders(tokenOverride?: string): Record<string, string> {
    const token = tokenOverride ?? authStore.token;
    if (!token) {
      throw new HelixClientError("unauthorized", "Missing OAuth token");
    }
    return {
      Authorization: `Bearer ${token}`,
      "Client-Id": CLIENT_ID,
      "Content-Type": "application/json",
    };
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    params: URLSearchParams | undefined,
    body: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    if (!options?.tokenOverride) {
      await this.ensureFreshToken();
    }
    return this.requestWithRetry<T>(method, path, params, body, options, true);
  }

  private async requestWithRetry<T>(
    method: "GET" | "POST",
    path: string,
    params: URLSearchParams | undefined,
    body: unknown,
    options: RequestOptions | undefined,
    allowRetry: boolean,
  ): Promise<T> {
    const url = `${HELIX_BASE_URL}${path}${params ? `?${params.toString()}` : ""}`;
    const res = await fetch(url, {
      method,
      headers: this.buildHeaders(options?.tokenOverride),
      // oxlint-disable-next-line unicorn/no-invalid-fetch-options
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const retryOnUnauthorized = options?.retryOnUnauthorized ?? !options?.tokenOverride;
    if (res.status === 401 && allowRetry && retryOnUnauthorized) {
      await twitchAuthService.refreshTokens();
      return this.requestWithRetry(method, path, params, body, options, false);
    }

    if (!res.ok) {
      throw new HelixClientError("http", `Helix request failed: ${res.status}`, res.status);
    }

    return (await res.json()) as T;
  }

  async fetchFollowedChannelsPage(
    userId: string,
    cursor?: string,
  ): Promise<HelixFollowedChannelsResponse> {
    const params = new URLSearchParams({ user_id: userId, first: "100" });
    if (cursor) params.set("after", cursor);
    return this.request("GET", "/channels/followed", params, undefined);
  }

  async fetchStreamsByUserIds(userIds: string[]): Promise<HelixStreamsResponse> {
    const params = new URLSearchParams({ first: "100" });
    for (const userId of userIds) {
      params.append("user_id", userId);
    }
    return this.request("GET", "/streams", params, undefined);
  }

  async fetchStreamByLogin(login: string): Promise<StreamData | null> {
    const params = new URLSearchParams({ user_login: login });
    const result = await this.request<HelixStreamsResponse>("GET", "/streams", params, undefined);
    return result.data[0] ?? null;
  }

  async createChatSubscription(args: {
    sessionId: string;
    broadcasterId: string;
    userId: string;
    token: string;
  }): Promise<number> {
    try {
      await this.request(
        "POST",
        "/eventsub/subscriptions",
        undefined,
        {
          type: "channel.chat.message",
          version: "1",
          condition: {
            broadcaster_user_id: args.broadcasterId,
            user_id: args.userId,
          },
          transport: {
            method: "websocket",
            session_id: args.sessionId,
          },
        },
        { tokenOverride: args.token, retryOnUnauthorized: false },
      );
      return 200;
    } catch (err) {
      const status =
        err instanceof HelixClientError ? err.status : (err as { status?: number } | null)?.status;
      if (typeof status === "number") {
        return status;
      }
      throw err;
    }
  }
}

export const helixClient = new HelixClient();
