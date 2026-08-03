import { beforeEach, describe, expect, it, vi } from "vitest";
import { setAuthStore } from "../../stores/authStore";
import { GqlClientError, gqlClient } from "../clients/GqlClient";
import { twitchChannelPointsService } from "../TwitchChannelPointsService";

describe("TwitchChannelPointsService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setAuthStore({ token: "test-token" });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("stops without a token", async () => {
    setAuthStore({ token: null });
    const fetchContext = vi.spyOn(gqlClient, "fetchChannelPointsContext");

    await expect(twitchChannelPointsService.pollAndClaim("channel")).resolves.toBe("stop");
    expect(fetchContext).not.toHaveBeenCalled();
  });

  it("does nothing when no claim is available", async () => {
    vi.spyOn(gqlClient, "fetchChannelPointsContext").mockResolvedValue({
      community: { id: "channel-id", channel: { self: { communityPoints: {} } } },
    });
    const claim = vi.spyOn(gqlClient, "claimCommunityPoints");

    await expect(twitchChannelPointsService.pollAndClaim("channel")).resolves.toBe("nothing");
    expect(claim).not.toHaveBeenCalled();
  });

  it("claims an available reward", async () => {
    vi.spyOn(gqlClient, "fetchChannelPointsContext").mockResolvedValue({
      community: {
        id: "channel-id",
        channel: { self: { communityPoints: { availableClaim: { id: "claim-id" } } } },
      },
    });
    const claim = vi.spyOn(gqlClient, "claimCommunityPoints").mockResolvedValue();

    await expect(twitchChannelPointsService.pollAndClaim("channel")).resolves.toBe("claimed");
    expect(claim).toHaveBeenCalledWith("channel-id", "claim-id");
  });

  it("stops when a persisted query is stale", async () => {
    vi.spyOn(gqlClient, "fetchChannelPointsContext").mockRejectedValue(
      new GqlClientError("persisted_query_not_found", "stale"),
    );
    await expect(twitchChannelPointsService.pollAndClaim("channel")).resolves.toBe("stop");
  });

  it("rethrows transient request failures", async () => {
    vi.spyOn(gqlClient, "fetchChannelPointsContext").mockRejectedValue(
      new GqlClientError("http", "failed", { status: 500 }),
    );
    await expect(twitchChannelPointsService.pollAndClaim("channel")).rejects.toThrow(
      "GQL request failed: 500",
    );
  });

  it("continues polling after a rejected claim", async () => {
    vi.spyOn(gqlClient, "fetchChannelPointsContext").mockResolvedValue({
      community: {
        id: "channel-id",
        channel: { self: { communityPoints: { availableClaim: { id: "claim-id" } } } },
      },
    });
    vi.spyOn(gqlClient, "claimCommunityPoints").mockRejectedValue(
      new GqlClientError("graphql", "rejected"),
    );

    await expect(twitchChannelPointsService.pollAndClaim("channel")).resolves.toBe("nothing");
  });
});
