// What Study remembers of its layout: the zoom
// of each book, the split between the panels and the collapsed panel. Each is read once, when
// Study opens, and written when it changes. A failed read gives the defaults and a failed write is
// not shown: the setting applies for the visit, and a lost layout costs little.

import { onScopeDispose, ref } from "vue";
import type { Store } from "../../storage/db";
import { getStore, noteStorageFailure } from "../storage";
import { clampSplit, clampZoom, DEFAULT_SPLIT } from "./layout";

export type Panel = "pages" | "exercises";

/** Runs `write` on the store; a failure is noted and not shown. */
function keep(write: (store: Store) => Promise<void>) {
  getStore()
    .then(write)
    .catch((error: unknown) => noteStorageFailure(error));
}

/** How long after the last change the split and the zoom are written. */
const DELAY = 300;

// Kept for the visit, so that the next unit opens as the last one was left, not as the defaults
// until the store answers.
const split = ref(DEFAULT_SPLIT);
const collapsed = ref<Panel>();
const zooms = ref<Record<string, number>>({});

export function useStudyPreferences() {
  const waiting = new Map<string, { timer: ReturnType<typeof setTimeout>; write: () => void }>();

  /** Writes `write` after `DELAY` ms without another call of the same `name`. */
  function later(name: string, write: () => void) {
    clearTimeout(waiting.get(name)?.timer);
    waiting.set(name, {
      timer: setTimeout(() => {
        waiting.delete(name);
        write();
      }, DELAY),
      write,
    });
  }

  async function read() {
    try {
      const store = await getStore();
      const [storedZooms, storedSplit, storedPanel] = await Promise.all([
        store.getSetting("pageZoom"),
        store.getSetting("studySplit"),
        store.getSetting("collapsedPanel"),
      ]);
      zooms.value = Object.fromEntries(
        Object.entries(storedZooms ?? {}).map(([pack, zoom]) => [pack, clampZoom(zoom)]),
      );
      split.value = clampSplit(storedSplit);
      collapsed.value =
        storedPanel === "pages" || storedPanel === "exercises" ? storedPanel : undefined;
    } catch (error) {
      noteStorageFailure(error);
    }
  }
  void read();

  // A change made a moment before Study closes is still written.
  onScopeDispose(() => {
    for (const { timer, write } of waiting.values()) {
      clearTimeout(timer);
      write();
    }
    waiting.clear();
  });

  return {
    /** The pages' share of the row, 0.3 to 0.75. */
    split,
    setSplit(value: number) {
      split.value = clampSplit(value);
      later("split", () => keep((store) => store.putSetting("studySplit", split.value)));
    },
    /** The collapsed panel, if there is one. */
    collapsed,
    setCollapsed(panel: Panel | undefined) {
      collapsed.value = panel;
      keep((store) =>
        panel === undefined
          ? store.deleteSetting("collapsedPanel")
          : store.putSetting("collapsedPanel", panel),
      );
    },
    /** The zoom of the book `pack`; 100 % until the learner sets another. */
    zoomOf: (pack: string) => zooms.value[pack] ?? 1,
    setZoom(pack: string, zoom: number) {
      zooms.value = { ...zooms.value, [pack]: zoom };
      later("zoom", () => keep((store) => store.putSetting("pageZoom", { ...zooms.value })));
    },
  };
}
