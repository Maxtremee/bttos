// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.stubEnv("VITE_TWITCH_CLIENT_ID", "test_client_id");

// Mutable mock state
const mockAuthStore = {
  token: "test_oauth_token",
  userId: "test_user",
  expiresAt: Date.now() + 3600000, // 1 hour — not near expiry
};

vi.mock("../../stores/authStore", () => ({
  get authStore() {
    return mockAuthStore;
  },
}));

const CONTEXT_HASH = "374314de591e69925fce3ddc2bcf085796f56ebb8cad67a0daa3165c03adc345";
const CLAIM_HASH = "46aaeebe02c99afdf4fc97c7c0cba964124bf6b0af229395f1f6d1feed05b3d0";

describe("TwitchChannelPointsService", () => {
  let service: import("../TwitchChannelPointsService").TwitchChannelPointsService;

  beforeEach(async () => {
    vi.resetModules();

    // Reset mock state
    mockAuthStore.token = "test_oauth_token";
    mockAuthStore.userId = "test_user";
    mockAuthStore.expiresAt = Date.now() + 3600000;

    globalThis.fetch = vi.fn();

    // Silence expected console output for cleanliness
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});

    const mod = await import("../TwitchChannelPointsService");
    service = new mod.TwitchChannelPointsService();
  });

  it("sends POST to gql.twitch.tv with correct headers (Bearer prefix + Client-ID)", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        data: {
          community: {
            id: "channel_1",
            channel: { self: { communityPoints: { availableClaim: null } } },
          },
        },
      }),
    });

    await service.pollAndClaim("somechannel");

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fetchCall[0]).toBe("https://gql.twitch.tv/gql");
    expect(fetchCall[1].method).toBe("POST");
    expect(fetchCall[1].headers["Client-ID"]).toBe("kimne78kx3ncx6brgo4mv6wki5h1ko");
    expect(fetchCall[1].headers["Authorization"]).toBe("Bearer test_oauth_token");
    expect(fetchCall[1].headers["Content-Type"]).toBe("application/json");
  });

  it("sends ChannelPointsContext with correct persistedQuery hash and channelLogin variable", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        data: {
          community: {
            id: "channel_1",
            channel: { self: { communityPoints: { availableClaim: null } } },
          },
        },
      }),
    });

    await service.pollAndClaim("somechannel");

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.operationName).toBe("ChannelPointsContext");
    expect(body.extensions.persistedQuery.version).toBe(1);
    expect(body.extensions.persistedQuery.sha256Hash).toBe(CONTEXT_HASH);
    expect(body.variables).toEqual({ channelLogin: "somechannel" });
  });

  it("returns 'nothing' and does not fire a claim mutation when availableClaim is null", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        data: {
          community: {
            id: "channel_1",
            channel: { self: { communityPoints: { availableClaim: null } } },
          },
        },
      }),
    });

    const result = await service.pollAndClaim("somechannel");

    expect(result).toBe("nothing");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("returns 'claimed' and fires ClaimCommunityPoints mutation when availableClaim has an id", async () => {
    const contextResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        data: {
          community: {
            id: "channel_123",
            channel: {
              self: {
                communityPoints: {
                  availableClaim: { id: "claim_abc" },
                },
              },
            },
          },
        },
      }),
    };
    const claimResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        data: {
          claimCommunityPoints: {
            claim: { id: "claim_abc", pointsEarnedBaseline: 50 },
          },
        },
      }),
    };
    (globalThis.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(contextResponse)
      .mockResolvedValueOnce(claimResponse);

    const result = await service.pollAndClaim("somechannel");

    expect(result).toBe("claimed");
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);

    const claimCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(claimCall[0]).toBe("https://gql.twitch.tv/gql");
    const claimBody = JSON.parse(claimCall[1].body);
    expect(claimBody.operationName).toBe("ClaimCommunityPoints");
    expect(claimBody.extensions.persistedQuery.sha256Hash).toBe(CLAIM_HASH);
    expect(claimBody.variables).toEqual({
      input: { channelID: "channel_123", claimID: "claim_abc" },
    });
  });

  it("returns 'stop' on 401 without throwing", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({}),
    });

    const result = await service.pollAndClaim("somechannel");

    expect(result).toBe("stop");
  });

  it("returns 'stop' on PersistedQueryNotFound error without throwing", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        errors: [{ message: "PersistedQueryNotFound" }],
        data: null,
      }),
    });

    const result = await service.pollAndClaim("somechannel");

    expect(result).toBe("stop");
  });

  it("throws on 500 status so the caller can log + continue polling next tick", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({}),
    });

    await expect(service.pollAndClaim("somechannel")).rejects.toThrow();
  });

  it("returns 'nothing' when the claim mutation itself returns errors (poll continues next tick)", async () => {
    const contextResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        data: {
          community: {
            id: "channel_123",
            channel: {
              self: {
                communityPoints: {
                  availableClaim: { id: "claim_abc" },
                },
              },
            },
          },
        },
      }),
    };
    const claimResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        errors: [{ message: "Something went wrong" }],
        data: null,
      }),
    };
    (globalThis.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(contextResponse)
      .mockResolvedValueOnce(claimResponse);

    const result = await service.pollAndClaim("somechannel");

    expect(result).toBe("nothing");
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});
