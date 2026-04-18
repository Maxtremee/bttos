// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------- Fetch mock helpers ----------

type FetchResponse = {
  ok: boolean;
  json: () => Promise<unknown>;
};

function makeFetchMock(responses: Record<string, unknown>) {
  return vi.fn().mockImplementation((url: string): Promise<FetchResponse> => {
    for (const [pattern, data] of Object.entries(responses)) {
      if (url.includes(pattern)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(data),
        });
      }
    }
    // Default: 404-like failure
    return Promise.resolve({
      ok: false,
      json: () => Promise.resolve({}),
    });
  });
}

// ---------- Mock data ----------

const BTTV_GLOBAL_DATA = [
  { id: "bttv1", code: "PogChamp" },
  { id: "bttv2", code: "KEKW" },
];

const BTTV_CHANNEL_DATA = {
  channelEmotes: [{ id: "bttvchan1", code: "ChannelEmote1" }],
  sharedEmotes: [{ id: "bttvchan2", code: "SharedEmote1" }],
};

const SEVENTV_GLOBAL_DATA = {
  emotes: [
    { name: "PagMan", data: { host: { url: "//cdn.7tv.app/emote/abc/1x" } } },
    { name: "POGGERS", data: { host: { url: "//cdn.7tv.app/emote/def/1x" } } },
  ],
};

const SEVENTV_CHANNEL_DATA = {
  emote_set: {
    emotes: [{ name: "ChannelSevenTV", data: { host: { url: "//cdn.7tv.app/emote/xyz/1x" } } }],
  },
};

const FFZ_GLOBAL_DATA = {
  default_sets: [3, 4],
  sets: {
    "3": { emoticons: [{ id: 100, name: "ZrehPFc" }] },
    "4": { emoticons: [{ id: 200, name: "BeanieHipster" }] },
  },
};

const FFZ_CHANNEL_DATA = {
  sets: {
    "99": { emoticons: [{ id: 300, name: "ChannelFFZ" }] },
  },
};

// ---------- Tests ----------

describe("EmoteService", () => {
  let service: import("../EmoteService").EmoteService;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../EmoteService");
    service = new mod.EmoteService();
  });

  // Test 1: BTTV global emotes
  it("buildEmoteMap fetches BTTV global emotes and maps code to CDN URL", async () => {
    globalThis.fetch = makeFetchMock({
      "betterttv.net/3/cached/emotes/global": BTTV_GLOBAL_DATA,
      "betterttv.net/3/cached/users/twitch": BTTV_CHANNEL_DATA,
      "7tv.io/v3/emote-sets/global": SEVENTV_GLOBAL_DATA,
      "7tv.io/v3/users/twitch": SEVENTV_CHANNEL_DATA,
      "frankerfacez.com/v1/set/global": FFZ_GLOBAL_DATA,
      "frankerfacez.com/v1/room/id": FFZ_CHANNEL_DATA,
    });

    const map = await service.buildEmoteMap("123456");

    expect(map.get("PogChamp")).toBe("https://cdn.betterttv.net/emote/bttv1/2x");
    expect(map.get("KEKW")).toBe("https://cdn.betterttv.net/emote/bttv2/2x");
  });

  // Test 2: BTTV channel emotes (channelEmotes + sharedEmotes)
  it("buildEmoteMap fetches BTTV channel emotes including channelEmotes and sharedEmotes", async () => {
    globalThis.fetch = makeFetchMock({
      "betterttv.net/3/cached/emotes/global": BTTV_GLOBAL_DATA,
      "betterttv.net/3/cached/users/twitch": BTTV_CHANNEL_DATA,
      "7tv.io/v3/emote-sets/global": SEVENTV_GLOBAL_DATA,
      "7tv.io/v3/users/twitch": SEVENTV_CHANNEL_DATA,
      "frankerfacez.com/v1/set/global": FFZ_GLOBAL_DATA,
      "frankerfacez.com/v1/room/id": FFZ_CHANNEL_DATA,
    });

    const map = await service.buildEmoteMap("123456");

    expect(map.get("ChannelEmote1")).toBe("https://cdn.betterttv.net/emote/bttvchan1/2x");
    expect(map.get("SharedEmote1")).toBe("https://cdn.betterttv.net/emote/bttvchan2/2x");
  });

  // Test 3: 7TV global emotes — WEBP format, not AVIF
  it("buildEmoteMap fetches 7TV global emotes using 2x.webp (not AVIF)", async () => {
    globalThis.fetch = makeFetchMock({
      "betterttv.net/3/cached/emotes/global": BTTV_GLOBAL_DATA,
      "betterttv.net/3/cached/users/twitch": BTTV_CHANNEL_DATA,
      "7tv.io/v3/emote-sets/global": SEVENTV_GLOBAL_DATA,
      "7tv.io/v3/users/twitch": SEVENTV_CHANNEL_DATA,
      "frankerfacez.com/v1/set/global": FFZ_GLOBAL_DATA,
      "frankerfacez.com/v1/room/id": FFZ_CHANNEL_DATA,
    });

    const map = await service.buildEmoteMap("123456");

    const pagmanUrl = map.get("PagMan");
    expect(pagmanUrl).toBe("https://cdn.7tv.app/emote/abc/1x/2x.webp");
    expect(pagmanUrl).not.toContain(".avif");
    expect(map.get("POGGERS")).toBe("https://cdn.7tv.app/emote/def/1x/2x.webp");
  });

  // Test 4: 7TV channel emotes
  it("buildEmoteMap fetches 7TV channel emotes from emote_set.emotes", async () => {
    globalThis.fetch = makeFetchMock({
      "betterttv.net/3/cached/emotes/global": BTTV_GLOBAL_DATA,
      "betterttv.net/3/cached/users/twitch": BTTV_CHANNEL_DATA,
      "7tv.io/v3/emote-sets/global": SEVENTV_GLOBAL_DATA,
      "7tv.io/v3/users/twitch": SEVENTV_CHANNEL_DATA,
      "frankerfacez.com/v1/set/global": FFZ_GLOBAL_DATA,
      "frankerfacez.com/v1/room/id": FFZ_CHANNEL_DATA,
    });

    const map = await service.buildEmoteMap("123456");

    expect(map.get("ChannelSevenTV")).toBe("https://cdn.7tv.app/emote/xyz/1x/2x.webp");
  });

  // Test 5: FFZ global emotes from default_sets -> sets -> emoticons
  it("buildEmoteMap fetches FFZ global emotes from default_sets and sets", async () => {
    globalThis.fetch = makeFetchMock({
      "betterttv.net/3/cached/emotes/global": BTTV_GLOBAL_DATA,
      "betterttv.net/3/cached/users/twitch": BTTV_CHANNEL_DATA,
      "7tv.io/v3/emote-sets/global": SEVENTV_GLOBAL_DATA,
      "7tv.io/v3/users/twitch": SEVENTV_CHANNEL_DATA,
      "frankerfacez.com/v1/set/global": FFZ_GLOBAL_DATA,
      "frankerfacez.com/v1/room/id": FFZ_CHANNEL_DATA,
    });

    const map = await service.buildEmoteMap("123456");

    expect(map.get("ZrehPFc")).toBe("https://cdn.frankerfacez.com/emote/100/2");
    expect(map.get("BeanieHipster")).toBe("https://cdn.frankerfacez.com/emote/200/2");
  });

  // Test 6: FFZ channel emotes
  it("buildEmoteMap fetches FFZ channel emotes from room sets", async () => {
    globalThis.fetch = makeFetchMock({
      "betterttv.net/3/cached/emotes/global": BTTV_GLOBAL_DATA,
      "betterttv.net/3/cached/users/twitch": BTTV_CHANNEL_DATA,
      "7tv.io/v3/emote-sets/global": SEVENTV_GLOBAL_DATA,
      "7tv.io/v3/users/twitch": SEVENTV_CHANNEL_DATA,
      "frankerfacez.com/v1/set/global": FFZ_GLOBAL_DATA,
      "frankerfacez.com/v1/room/id": FFZ_CHANNEL_DATA,
    });

    const map = await service.buildEmoteMap("123456");

    expect(map.get("ChannelFFZ")).toBe("https://cdn.frankerfacez.com/emote/300/2");
  });

  // Test 7: Provider failure isolation — if one fails, others still load
  it("if any provider fetch fails, others still load", async () => {
    // Only provide BTTV global — everything else will 404
    globalThis.fetch = makeFetchMock({
      "betterttv.net/3/cached/emotes/global": BTTV_GLOBAL_DATA,
      // All other providers return 404-like (default branch)
    });

    // Should not throw
    const map = await service.buildEmoteMap("123456");

    // BTTV global should still be there
    expect(map.get("PogChamp")).toBe("https://cdn.betterttv.net/emote/bttv1/2x");
    // Size should be small (only BTTV global loaded)
    expect(map.size).toBe(2);
  });

  // Test 8: getEmoteMap returns cached map on second call for same broadcasterId
  it("getEmoteMap returns cached map on second call for same broadcasterId", async () => {
    globalThis.fetch = makeFetchMock({
      "betterttv.net/3/cached/emotes/global": BTTV_GLOBAL_DATA,
      "betterttv.net/3/cached/users/twitch": BTTV_CHANNEL_DATA,
      "7tv.io/v3/emote-sets/global": SEVENTV_GLOBAL_DATA,
      "7tv.io/v3/users/twitch": SEVENTV_CHANNEL_DATA,
      "frankerfacez.com/v1/set/global": FFZ_GLOBAL_DATA,
      "frankerfacez.com/v1/room/id": FFZ_CHANNEL_DATA,
    });

    const map1 = await service.getEmoteMap("broadcaster-a");
    const fetchCallCount = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length;

    const map2 = await service.getEmoteMap("broadcaster-a");

    // No additional fetch calls
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(fetchCallCount);
    // Same map instance
    expect(map2).toBe(map1);
  });

  // Test 9: getEmoteMap fetches fresh map for different broadcasterId
  it("getEmoteMap fetches fresh map for different broadcasterId", async () => {
    globalThis.fetch = makeFetchMock({
      "betterttv.net/3/cached/emotes/global": BTTV_GLOBAL_DATA,
      "betterttv.net/3/cached/users/twitch": BTTV_CHANNEL_DATA,
      "7tv.io/v3/emote-sets/global": SEVENTV_GLOBAL_DATA,
      "7tv.io/v3/users/twitch": SEVENTV_CHANNEL_DATA,
      "frankerfacez.com/v1/set/global": FFZ_GLOBAL_DATA,
      "frankerfacez.com/v1/room/id": FFZ_CHANNEL_DATA,
    });

    const map1 = await service.getEmoteMap("broadcaster-a");
    const fetchCountAfterFirst = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length;

    const map2 = await service.getEmoteMap("broadcaster-b");
    const fetchCountAfterSecond = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length;

    // Should have made more fetch calls for the second broadcaster
    expect(fetchCountAfterSecond).toBeGreaterThan(fetchCountAfterFirst);
    // Different map instances
    expect(map2).not.toBe(map1);
  });
});
