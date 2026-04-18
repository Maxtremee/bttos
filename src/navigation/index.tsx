import { splitProps } from "solid-js";
import type { JSX } from "solid-js";
import {
  init,
  Focusable as BaseFocusable,
  FocusableGroup,
  useSpatialNavigation,
  type FocusableProps,
  type FocusableCallbackProps,
} from "@lampa-dev/solidjs-spatial-navigation";

/**
 * Call once at app startup (before render in main.tsx).
 * Initialises the spatial navigation engine for D-pad focus management.
 */
export function initSpatialNav(): void {
  init({
    debug: false,
    visualDebug: false,
    shouldFocusDOMNode: true,
  });
}

type FocusableRenderProps = FocusableProps<object> &
  Omit<JSX.HTMLAttributes<HTMLElement>, "children" | "ref"> & {
    children: (props: FocusableCallbackProps) => JSX.Element;
  };

/**
 * Wrapped Focusable that auto-scrolls the focused node into view.
 * The library's `onFocus` callback hands us the DOM node via `layout.node`,
 * which is reliable (unlike the render-prop `ref`, which is captured as
 * undefined before the element mounts, and unlike `document.activeElement`,
 * which is <body> when the focusable is a non-natively-focusable element).
 */
export function Focusable(props: FocusableRenderProps): JSX.Element {
  const [local, others] = splitProps(props, ["children", "onFocus"]);
  return (
    <BaseFocusable
      {...others}
      // @ts-expect-error
      onFocus={(layout, extra, details) => {
        layout.node.scrollIntoView({
          block: "nearest",
          inline: "nearest",
          behavior: "smooth",
        });
        local.onFocus?.(layout, extra, details);
      }}
    >
      {local.children}
    </BaseFocusable>
  );
}

// Re-export unchanged — all screens and components import from '../navigation'
// so this file remains the single swap point for the underlying library.
export { FocusableGroup, useSpatialNavigation };
