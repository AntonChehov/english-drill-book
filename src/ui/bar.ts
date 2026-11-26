// When the compact bar of a narrow screen is shown: the rule is a function of the scroll position,
// so it is tested without a browser; `App.vue` feeds it from the page.

import { onUnmounted, ref } from "vue";

/** How far the page must move one way, in pixels, before the bar follows; smaller moves are noise. */
export const SCROLL_THRESHOLD = 8;

/** Up to this far from the top of the page the bar is always shown. */
export const TOP_ZONE = 8;

export interface BarState {
  readonly shown: boolean;
  /** The scroll position at the last move that counted. */
  readonly anchor: number;
}

/**
 * The state of the bar after the page is at `y`. `held` is true while focus is inside the bar or
 * the list of units is open: it is shown then, whatever the scroll.
 */
export function nextBar(state: BarState, y: number, held: boolean): BarState {
  if (held || y <= TOP_ZONE) return { shown: true, anchor: y };
  const moved = y - state.anchor;
  if (Math.abs(moved) < SCROLL_THRESHOLD) return state;
  return { shown: moved < 0, anchor: y };
}

/** The list of units is open (it hangs from the bar, so the bar stays while it is). */
export const unitListOpen = ref(false);

/** Whether the screen is narrower than 1024 px, where Study's navigation is in the bar. */
export function useNarrow() {
  const query = window.matchMedia("(max-width: 1023.98px)");
  const narrow = ref(query.matches);
  const change = (event: MediaQueryListEvent) => {
    narrow.value = event.matches;
  };
  query.addEventListener("change", change);
  onUnmounted(() => query.removeEventListener("change", change));
  return narrow;
}
