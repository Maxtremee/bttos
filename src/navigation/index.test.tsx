// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import type { JSX } from "solid-js";

const mocks = vi.hoisted(() => ({
  details: {} as { event?: Event },
  scrollIntoView: vi.fn(),
}));

vi.mock("@lampa-dev/solidjs-spatial-navigation", () => ({
  init: vi.fn(),
  Focusable: (props: {
    onFocus: (
      layout: { node: { scrollIntoView: typeof mocks.scrollIntoView } },
      extra: object,
      details: { event?: Event },
    ) => void;
    children: () => JSX.Element;
  }) => {
    props.onFocus({ node: { scrollIntoView: mocks.scrollIntoView } }, {}, mocks.details);
    return props.children();
  },
}));

import { Focusable } from ".";

describe("Focusable scrolling", () => {
  beforeEach(() => {
    mocks.details = {};
    mocks.scrollIntoView.mockClear();
  });

  it("does not align initial programmatic focus to the top", () => {
    const container = document.createElement("div");
    const dispose = render(
      () => <Focusable scrollAlignment="start">{() => <div>Channel</div>}</Focusable>,
      container,
    );

    expect(mocks.scrollIntoView).toHaveBeenCalledWith({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });
    dispose();
  });

  it("aligns D-pad focus to the requested position", () => {
    mocks.details = { event: new Event("keydown") };
    const container = document.createElement("div");
    const dispose = render(
      () => <Focusable scrollAlignment="start">{() => <div>Channel</div>}</Focusable>,
      container,
    );

    expect(mocks.scrollIntoView).toHaveBeenCalledWith({
      block: "start",
      inline: "nearest",
      behavior: "smooth",
    });
    dispose();
  });
});
