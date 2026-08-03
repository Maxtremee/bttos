import { describe, it, expect, beforeEach, vi } from "vitest";

const PREFS_KEY = "twitch_prefs";

describe("prefsStore", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("loads defaults when no localStorage key exists", async () => {
    const { prefsStore } = await import("../prefsStore");
    expect(prefsStore.chatVisible).toBe(true);
    expect(prefsStore.chatPosition).toBe("right");
    expect(prefsStore.chatWidth).toBe(260);
    expect(prefsStore.autoClaimChannelPoints).toBe(true);
  });

  it("defaults autoClaimChannelPoints to true", async () => {
    const { prefsStore } = await import("../prefsStore");
    expect(prefsStore.autoClaimChannelPoints).toBe(true);
  });

  it("loads persisted values from localStorage", async () => {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ chatVisible: false, chatPosition: "left", chatWidth: 320 }),
    );
    const { prefsStore } = await import("../prefsStore");
    expect(prefsStore.chatVisible).toBe(false);
    expect(prefsStore.chatPosition).toBe("left");
    expect(prefsStore.chatWidth).toBe(320);
  });

  it("falls back to defaults on corrupted JSON and removes the bad entry", async () => {
    localStorage.setItem(PREFS_KEY, "not-valid-json");
    const { prefsStore } = await import("../prefsStore");
    expect(prefsStore.chatVisible).toBe(true);
    expect(prefsStore.chatPosition).toBe("right");
    expect(localStorage.getItem(PREFS_KEY)).toBeNull();
  });

  it("updatePref writes updated value to localStorage", async () => {
    const { prefsStore, updatePref } = await import("../prefsStore");
    updatePref("chatWidth", 380);
    expect(prefsStore.chatWidth).toBe(380);
    const stored = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
    expect(stored.chatWidth).toBe(380);
  });

  it("merges missing keys with defaults", async () => {
    // Only chatPosition stored — chatVisible and autoClaimChannelPoints should come from defaults
    localStorage.setItem(PREFS_KEY, JSON.stringify({ chatPosition: "left" }));
    const { prefsStore } = await import("../prefsStore");
    expect(prefsStore.chatVisible).toBe(true); // default
    expect(prefsStore.chatPosition).toBe("left"); // stored
    expect(prefsStore.chatWidth).toBe(260); // default
    expect(prefsStore.autoClaimChannelPoints).toBe(true); // default
  });

  it("updatePref persists full state to localStorage after update", async () => {
    const { updatePref } = await import("../prefsStore");
    updatePref("chatPosition", "left");
    const stored = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
    expect(stored.chatPosition).toBe("left");
    // Full state should be persisted including chatVisible
    expect(typeof stored.chatVisible).toBe("boolean");
  });
});
