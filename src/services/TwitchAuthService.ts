import { setAuthStore } from "../stores/authStore";

const CLIENT_ID = import.meta.env.VITE_TWITCH_CLIENT_ID as string;
const SCOPE = "user:read:follows user:read:chat";

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  scope: string[];
}

export class TwitchAuthService {
  private refreshPromise: Promise<void> | null = null;

  async requestDeviceCode(): Promise<DeviceCodeResponse> {
    const res = await fetch("https://id.twitch.tv/oauth2/device", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: CLIENT_ID, scope: SCOPE }),
    });
    if (!res.ok) throw new Error(`Device code request failed: ${res.status}`);
    return res.json();
  }

  async pollForToken(deviceCode: string): Promise<TokenResponse | "pending" | "expired"> {
    const res = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        scope: SCOPE,
      }),
    });
    if (res.ok) return res.json() as Promise<TokenResponse>;
    const err = await res.json();
    if (err.message === "authorization_pending") return "pending";
    return "expired";
  }

  async refreshTokens(): Promise<void> {
    // Deduplication: return existing in-flight promise if refresh already running
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = this._doRefresh().finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  private async _doRefresh(): Promise<void> {
    const refreshToken = localStorage.getItem("twitch_refresh_token");
    if (!refreshToken) throw new Error("No refresh token stored");

    const res = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        // No client_secret — Public client type
      }),
    });

    if (!res.ok) {
      localStorage.removeItem("twitch_access_token");
      localStorage.removeItem("twitch_expires_at");
      localStorage.removeItem("twitch_refresh_token");
      localStorage.removeItem("twitch_user_id");
      setAuthStore({ token: null, refreshToken: null, expiresAt: null, userId: null });
      throw new Error("Token refresh failed — re-authentication required");
    }

    const data = (await res.json()) as TokenResponse;
    const expiresAt = Date.now() + data.expires_in * 1000;

    // Write order: access_token first, expires_at second, refresh_token LAST
    // (If process dies mid-write, old refresh_token remains valid)
    localStorage.setItem("twitch_access_token", data.access_token);
    localStorage.setItem("twitch_expires_at", String(expiresAt));
    localStorage.setItem("twitch_refresh_token", data.refresh_token);

    setAuthStore({ token: data.access_token, refreshToken: data.refresh_token, expiresAt });
  }

  persistTokens(data: TokenResponse, userId: string): void {
    const expiresAt = Date.now() + data.expires_in * 1000;
    localStorage.setItem("twitch_access_token", data.access_token);
    localStorage.setItem("twitch_expires_at", String(expiresAt));
    localStorage.setItem("twitch_refresh_token", data.refresh_token);
    localStorage.setItem("twitch_user_id", userId);
    setAuthStore({
      token: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      userId,
    });
  }

  clearTokens(): void {
    localStorage.removeItem("twitch_access_token");
    localStorage.removeItem("twitch_expires_at");
    localStorage.removeItem("twitch_refresh_token");
    localStorage.removeItem("twitch_user_id");
    setAuthStore({ token: null, refreshToken: null, expiresAt: null, userId: null });
  }
}

export const twitchAuthService = new TwitchAuthService();
