// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render } from "solid-js/web";
import type { StreamData } from "../../services/TwitchChannelService";

// Import ChannelCard AFTER any setup
import ChannelCard from "../ChannelCard";

const mockChannel: StreamData = {
  user_id: "123",
  user_login: "teststreamer",
  user_name: "TestStreamer",
  game_name: "Just Chatting",
  title: "Test Stream Title",
  viewer_count: 1234,
  thumbnail_url: "https://example.com/live_user_test-{width}x{height}.jpg",
  type: "live",
  started_at: "2026-01-01T00:00:00Z",
};

describe("ChannelCard", () => {
  it("Test 1: renders an <img> with src set to thumbnail URL with {width} and {height} replaced (284x160)", () => {
    const div = document.createElement("div");
    render(() => <ChannelCard channel={mockChannel} focused={false} />, div);

    const img = div.querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.getAttribute("src")).toBe("https://example.com/live_user_test-284x160.jpg");
  });

  it("Test 2: renders the stream title text content", () => {
    const div = document.createElement("div");
    render(() => <ChannelCard channel={mockChannel} focused={false} />, div);

    expect(div.textContent).toContain("Test Stream Title");
  });

  it("Test 3: renders the game name text content", () => {
    const div = document.createElement("div");
    render(() => <ChannelCard channel={mockChannel} focused={false} />, div);

    expect(div.textContent).toContain("Just Chatting");
  });

  it('Test 4: renders formatted viewer count (e.g., "1.2K viewers" for 1234)', () => {
    const div = document.createElement("div");
    render(() => <ChannelCard channel={mockChannel} focused={false} />, div);

    expect(div.textContent).toContain("1.2K viewers");
  });

  it('Test 5: when focused prop is true, the root div has class "focused"', () => {
    const div = document.createElement("div");
    render(() => <ChannelCard channel={mockChannel} focused={true} />, div);

    const root = div.firstElementChild as HTMLElement;
    expect(root.className).toContain("focused");
  });

  it('Test 6: when focused prop is false, the root div does NOT have class "focused"', () => {
    const div = document.createElement("div");
    render(() => <ChannelCard channel={mockChannel} focused={false} />, div);

    const root = div.firstElementChild as HTMLElement;
    expect(root.className).not.toContain("focused");
  });
});
