import { beforeEach, describe, expect, it, vi } from "vitest";
import { setAuthStore } from "../../stores/authStore";
import { HelixClientError, helixClient } from "../clients/HelixClient";
import {
  formatViewers,
  thumbnailUrl,
  TwitchChannelService,
  type StreamData,
} from "../TwitchChannelService";

describe("TwitchChannelService", () => {
  const service = new TwitchChannelService();

  beforeEach(() => {
    vi.restoreAllMocks();
    setAuthStore({ userId: "test-user" });
  });

  it("paginates followed channels and fetches their streams", async () => {
    vi.spyOn(helixClient, "fetchFollowedChannelsPage")
      .mockResolvedValueOnce({ data: [{ broadcaster_id: "one" }], pagination: { cursor: "next" } })
      .mockResolvedValueOnce({ data: [{ broadcaster_id: "two" }], pagination: {} });
    const stream = { user_id: "one" } as StreamData;
    vi.spyOn(helixClient, "fetchStreamsByUserIds").mockResolvedValue({ data: [stream] });

    await expect(service.fetchLiveFollowedChannels()).resolves.toEqual([stream]);
    expect(helixClient.fetchFollowedChannelsPage).toHaveBeenNthCalledWith(
      1,
      "test-user",
      undefined,
    );
    expect(helixClient.fetchFollowedChannelsPage).toHaveBeenNthCalledWith(2, "test-user", "next");
    expect(helixClient.fetchStreamsByUserIds).toHaveBeenCalledWith(["one", "two"]);
  });

  it("batches stream requests in groups of 100", async () => {
    const ids = Array.from({ length: 101 }, (_, i) => String(i));
    vi.spyOn(helixClient, "fetchFollowedChannelsPage").mockResolvedValue({
      data: ids.map((broadcaster_id) => ({ broadcaster_id })),
      pagination: {},
    });
    const fetchStreams = vi
      .spyOn(helixClient, "fetchStreamsByUserIds")
      .mockResolvedValue({ data: [] });

    await service.fetchLiveFollowedChannels();

    expect(fetchStreams).toHaveBeenCalledTimes(2);
    expect(fetchStreams.mock.calls[0][0]).toHaveLength(100);
    expect(fetchStreams.mock.calls[1][0]).toEqual(["100"]);
  });

  it("skips stream lookup when no followed channels exist", async () => {
    vi.spyOn(helixClient, "fetchFollowedChannelsPage").mockResolvedValue({
      data: [],
      pagination: {},
    });
    const fetchStreams = vi.spyOn(helixClient, "fetchStreamsByUserIds");

    await expect(service.fetchLiveFollowedChannels()).resolves.toEqual([]);
    expect(fetchStreams).not.toHaveBeenCalled();
  });

  it("adds context to Helix errors", async () => {
    vi.spyOn(helixClient, "fetchFollowedChannelsPage").mockRejectedValue(
      new HelixClientError("http", "failed", 500),
    );
    await expect(service.fetchLiveFollowedChannels()).rejects.toThrow(
      "Failed to fetch followed channels: 500",
    );
  });

  it("formats card metadata", () => {
    expect(thumbnailUrl("https://example.com/{width}x{height}.jpg", 284, 160)).toBe(
      "https://example.com/284x160.jpg",
    );
    expect(formatViewers(500)).toBe("500 viewers");
    expect(formatViewers(1234)).toBe("1.2K viewers");
  });
});
