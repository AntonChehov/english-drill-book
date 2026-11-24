import { describe, expect, it } from "vitest";
import { nextBar, SCROLL_THRESHOLD, TOP_ZONE, type BarState } from "./bar";

const shown = (anchor: number): BarState => ({ shown: true, anchor });
const hidden = (anchor: number): BarState => ({ shown: false, anchor });
const far = TOP_ZONE + 500;

describe("nextBar", () => {
  it("@req PROD-012 a scroll down hides the bar and a scroll up shows it", () => {
    const down = nextBar(shown(far), far + SCROLL_THRESHOLD, false);
    expect(down).toEqual(hidden(far + SCROLL_THRESHOLD));

    const up = nextBar(down, far, false);
    expect(up).toEqual(shown(far));
  });

  it("@req PROD-012 a move under the threshold changes nothing, and adds up until it counts", () => {
    const small = SCROLL_THRESHOLD - 1;
    const state = shown(far);
    expect(nextBar(state, far + small, false)).toBe(state);
    expect(nextBar(hidden(far), far - small, false)).toEqual(hidden(far));
    // The anchor stays, so small moves in the same direction add up.
    expect(nextBar(nextBar(state, far + small, false), far + 2 * small, false).shown).toBe(false);
  });

  it("@req PROD-012 the bar is shown at the top of the page", () => {
    expect(nextBar(hidden(far), TOP_ZONE, false)).toEqual(shown(TOP_ZONE));
    expect(nextBar(hidden(far), -40, false)).toEqual(shown(-40));
  });

  it("@req PROD-012 the bar stays while focus is inside it or the list of units is open", () => {
    expect(nextBar(shown(far), far + 300, true)).toEqual(shown(far + 300));
    expect(nextBar(hidden(far), far + 300, true)).toEqual(shown(far + 300));
  });

  it("@req PROD-012 after the hold ends, the next scroll down hides it again", () => {
    const held = nextBar(shown(far), far + 300, true);
    expect(nextBar(held, far + 300 + SCROLL_THRESHOLD, false).shown).toBe(false);
  });
});
