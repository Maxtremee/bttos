import { beforeEach, describe, expect, it, vi } from "vitest";
import { gqlClient } from "../clients/GqlClient";
import { buildUsherUrl, fetchStreamM3u8Url, validateChannelLogin } from "../TwitchStreamService";

describe("TwitchStreamService", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("builds the Usher URL", () => {
    const url = new URL(
      buildUsherUrl("testchannel", { value: '{"channel":"testchannel"}', signature: "sig" }),
      "http://localhost",
    );

    expect(url.pathname).toContain("/api/channel/hls/testchannel.m3u8");
    expect(url.searchParams.get("sig")).toBe("sig");
    expect(url.searchParams.get("token")).toBe('{"channel":"testchannel"}');
    expect(url.searchParams.get("allow_source")).toBe("true");
    expect(url.searchParams.get("allow_audio_only")).toBe("true");
  });

  it("fetches the playback token and returns its URL", async () => {
    vi.spyOn(gqlClient, "fetchPlaybackAccessToken").mockResolvedValue({
      value: "token",
      signature: "sig",
    });

    const url = await fetchStreamM3u8Url("testchannel");

    expect(gqlClient.fetchPlaybackAccessToken).toHaveBeenCalledWith("testchannel");
    expect(new URL(url, "http://localhost").searchParams.get("token")).toBe("token");
  });

  it("validates Twitch login names", () => {
    expect(validateChannelLogin("ninja_123")).toBe(true);
    expect(validateChannelLogin("a".repeat(25))).toBe(true);
    expect(validateChannelLogin("")).toBe(false);
    expect(validateChannelLogin("has space")).toBe(false);
    expect(validateChannelLogin("a".repeat(26))).toBe(false);
  });

  it("rejects invalid logins before fetching", async () => {
    const fetchToken = vi.spyOn(gqlClient, "fetchPlaybackAccessToken");
    await expect(fetchStreamM3u8Url("bad!name")).rejects.toThrow("Invalid channel login");
    expect(fetchToken).not.toHaveBeenCalled();
  });
});
