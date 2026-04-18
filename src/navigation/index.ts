import { init } from "@lampa-dev/solidjs-spatial-navigation";

/**
 * Call once at app startup (before render in main.tsx).
 * Initialises the spatial navigation engine for D-pad focus management.
 */
export function initSpatialNav(): void {
  init({
    debug: false,
    visualDebug: false,
    shouldFocusDOMNode: true, // ensures DOM accessibility focus mirrors spatial focus
  });
}

// Re-export components and hook under stable paths.
// All screens and components import from '../navigation' — never from the library directly.
// This ensures a single place to swap the library if @lampa-dev/solidjs-spatial-navigation
// needs to be replaced with the js-spatial-navigation fallback (RESEARCH.md Pitfall 6).
export {
  Focusable,
  FocusableGroup,
  useSpatialNavigation,
} from "@lampa-dev/solidjs-spatial-navigation";
