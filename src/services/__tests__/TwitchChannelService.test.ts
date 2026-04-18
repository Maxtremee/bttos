// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mutable mock state — tests can mutate per-test for isolation
const mockAuthStore = {
  token: "test_token",
  userId: "test_user",
  expiresAt: Date.now() + 3600000, // 1 hour — not near expiry by default
};

const mockRefreshTokens = vi.fn().mockResolvedValue(undefined);

vi.mock("../../stores/authStore", () => ({
  get authStore() {
    return mockAuthStore;
  },
}));

vi.mock("../TwitchAuthService", () => ({
  twitchAuthService: {
    get refreshTokens() {
      return mockRefreshTokens;
    },
  },
}));

describe("TwitchChannelService", () => {
  let service: import("../TwitchChannelService").TwitchChannelService;
  let thumbnailUrlFn: typeof import("../TwitchChannelService").thumbnailUrl;
  let formatViewersFn: typeof import("../TwitchChannelService").formatViewers;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv("VITE_TWITCH_CLIENT_ID", "test_client_id");

    // Reset mutable mock state to defaults
    mockAuthStore.token = "test_token";
    mockAuthStore.userId = "test_user";
    mockAuthStore.expiresAt = Date.now() + 3600000;
    mockRefreshTokens.mockClear();

    const mod = await import("../TwitchChannelService");
    service = new mod.TwitchChannelService();
    thumbnailUrlFn = mod.thumbnailUrl;
    formatViewersFn = mod.formatViewers;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe("fetchLiveFollowedChannels()", () => {
    it("Test 1: calls /helix/channels/followed with Authorization Bearer and Client-Id headers", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes("/helix/channels/followed")) {
          return new Response(JSON.stringify({ data: [], pagination: {} }), { status: 200 });
        }
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      });

      await service.fetchLiveFollowedChannels();

      const followedCall = fetchSpy.mock.calls.find(([url]) =>
        String(url).includes("/helix/channels/followed"),
      );
      expect(followedCall).toBeDefined();
      const [url, options] = followedCall as [string, RequestInit];
      expect(url).toContain("user_id=test_user");
      expect((options.headers as Record<string, string>)["Authorization"]).toBe(
        "Bearer test_token",
      );
      expect((options.headers as Record<string, string>)["Client-Id"]).toBe("test_client_id");
    });

    it("Test 2: paginates through all pages when cursor is present", async () => {
      let callCount = 0;
      const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes("/helix/channels/followed")) {
          callCount++;
          if (callCount === 1) {
            return new Response(
              JSON.stringify({
                data: [{ broadcaster_id: "channel1" }],
                pagination: { cursor: "next_cursor_abc" },
              }),
              { status: 200 },
            );
          } else {
            return new Response(
              JSON.stringify({
                data: [{ broadcaster_id: "channel2" }],
                pagination: {},
              }),
              { status: 200 },
            );
          }
        }
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      });

      await service.fetchLiveFollowedChannels();

      const followedCalls = fetchSpy.mock.calls.filter(([url]) =>
        String(url).includes("/helix/channels/followed"),
      );
      expect(followedCalls.length).toBe(2);
      expect(String(followedCalls[1][0])).toContain("after=next_cursor_abc");
    });

    it("Test 3: batches broadcaster IDs using params.append (not comma-joined) for /helix/streams", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes("/helix/channels/followed")) {
          return new Response(
            JSON.stringify({
              data: [
                { broadcaster_id: "ch1" },
                { broadcaster_id: "ch2" },
                { broadcaster_id: "ch3" },
              ],
              pagination: {},
            }),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      });

      await service.fetchLiveFollowedChannels();

      const streamCall = fetchSpy.mock.calls.find(([url]) =>
        String(url).includes("/helix/streams"),
      );
      expect(streamCall).toBeDefined();
      const urlStr = String(streamCall![0]);
      expect(urlStr).toContain("user_id=ch1");
      expect(urlStr).toContain("user_id=ch2");
      expect(urlStr).toContain("user_id=ch3");
      expect(urlStr).not.toContain("user_id=ch1%2Cch2");
      expect(urlStr).not.toContain("user_id=ch1,ch2");
    });

    it("Test 4: returns data from /helix/streams response", async () => {
      const mockStream = {
        user_id: "ch1",
        user_login: "streamer1",
        user_name: "Streamer1",
        game_name: "Just Chatting",
        title: "Test Stream",
        viewer_count: 500,
        thumbnail_url: "https://example.com/{width}x{height}.jpg",
        type: "live",
        started_at: "2026-01-01T00:00:00Z",
      };
      vi.spyOn(global, "fetch").mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes("/helix/channels/followed")) {
          return new Response(
            JSON.stringify({
              data: [{ broadcaster_id: "ch1" }],
              pagination: {},
            }),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify({ data: [mockStream] }), { status: 200 });
      });

      const result = await service.fetchLiveFollowedChannels();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockStream);
    });

    it("Test 5: returns [] without calling /helix/streams when followed list is empty", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes("/helix/channels/followed")) {
          return new Response(JSON.stringify({ data: [], pagination: {} }), { status: 200 });
        }
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      });

      const result = await service.fetchLiveFollowedChannels();

      expect(result).toEqual([]);
      const streamCalls = fetchSpy.mock.calls.filter(([url]) =>
        String(url).includes("/helix/streams"),
      );
      expect(streamCalls).toHaveLength(0);
    });

    it("Test 8: calls twitchAuthService.refreshTokens() when token is within 5 minutes of expiry", async () => {
      // Set near-expiry time (less than 5 min = 300000ms)
      mockAuthStore.expiresAt = Date.now() + 200000;

      vi.spyOn(global, "fetch").mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes("/helix/channels/followed")) {
          return new Response(JSON.stringify({ data: [], pagination: {} }), { status: 200 });
        }
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      });

      await service.fetchLiveFollowedChannels();
      expect(mockRefreshTokens).toHaveBeenCalledOnce();
    });

    it("Test 9: on 401 from Helix, calls refreshTokens() and retries once", async () => {
      let callCount = 0;
      const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes("/helix/channels/followed")) {
          callCount++;
          if (callCount === 1) {
            return new Response("Unauthorized", { status: 401 });
          }
          return new Response(JSON.stringify({ data: [], pagination: {} }), { status: 200 });
        }
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      });

      await service.fetchLiveFollowedChannels();

      const followedCalls = fetchSpy.mock.calls.filter(([url]) =>
        String(url).includes("/helix/channels/followed"),
      );
      expect(followedCalls.length).toBe(2);
      expect(mockRefreshTokens).toHaveBeenCalledOnce();
    });
  });

  describe("thumbnailUrl()", () => {
    it("Test 6: replaces {width} and {height} in template URL with given dimensions", () => {
      const result = thumbnailUrlFn("https://example.com/{width}x{height}.jpg", 284, 160);
      expect(result).toBe("https://example.com/284x160.jpg");
    });
  });

  describe("formatViewers()", () => {
    it("Test 7: formats viewer counts correctly", () => {
      expect(formatViewersFn(500)).toBe("500 viewers");
      expect(formatViewersFn(1000)).toBe("1.0K viewers");
      expect(formatViewersFn(1234)).toBe("1.2K viewers");
      expect(formatViewersFn(15678)).toBe("15.7K viewers");
    });
  });
});
