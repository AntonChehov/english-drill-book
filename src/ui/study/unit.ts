// The state of Study: `useUnit` opens the unit the address names, holds its exercises and
// exposes the views of the domain and the actions that append attempts. Components show what it
// gives and call its actions; none of them reaches the store.

import { computed, onMounted, reactive, ref, shallowRef } from "vue";
import type { Pack, Unit } from "../../domain/packs/types";
import { demoBooks } from "../../domain/books/demo/profiles";
import { failureMessage, failureOf, keepFailureMessage, progressMessage } from "../demo/messages";
import { demoState, summaryOf } from "../demo/state";
import { getStore, noteStorageFailure } from "../storage";
import { useAttempts, viewOf } from "./attempts";
import { useDrafts } from "./drafts";
import { useReread, type EditedField } from "./reread";
import { openUnit, unitLinks, type ExerciseEntry, type TopicOfUnit } from "./unit-read";

export type { ExerciseEntry, TopicOfUnit, UnitLink } from "./unit-read";

export type UnitPhase =
  | "loading"
  | "ready"
  | "not-found"
  /** The address is a unit of a demo book, and the demo is not added in this browser. */
  | "demo-missing"
  | "failed";

/** Adding the demo from Study: what is being done, or why it failed. */
export type DemoAdding =
  | { readonly phase: "idle" }
  | { readonly phase: "adding"; readonly message: string }
  | { readonly phase: "failed"; readonly message: string };

/**
 * The state of the unit `unitId` of the pack `packId`. `editing` tells which field is being typed
 * in, so that reading the unit again keeps its text.
 */
export function useUnit(
  packId: string,
  unitId: string,
  { editing }: { readonly editing: () => EditedField | undefined },
) {
  const phase = ref<UnitPhase>("loading");
  const pack = shallowRef<Pack>();
  const unit = shallowRef<Unit>();
  const topic = shallowRef<TopicOfUnit>();
  const entries = ref<ExerciseEntry[]>([]);
  /** Exercise id → done, for every exercise of the pack (the unit list counts them). */
  const done = reactive(new Map<string, boolean>());
  const adding = shallowRef<DemoAdding>({ phase: "idle" });
  /** The demo book the address names, if it names one. */
  const demoBook = demoBooks.find((book) => book.profile.id === packId);

  const { draftFailed, setAnswer, flush, writeUnsaved } = useDrafts(pack, entries);
  const { announcement, check, reveal, change, markDone } = useAttempts(pack, done, flush);
  useReread({
    shown: () =>
      phase.value === "ready" && pack.value !== undefined && unit.value !== undefined
        ? { pack: pack.value, unit: unit.value }
        : undefined,
    entries,
    done,
    editing,
    setAnswer,
    writeUnsaved,
  });

  const unitIndex = computed(() =>
    pack.value && unit.value ? pack.value.units.indexOf(unit.value) : -1,
  );
  const units = computed(() => unitLinks(pack.value, (id) => done.get(id) === true));
  const progress = computed(() => units.value[unitIndex.value]?.progress);
  const previous = computed(() => pack.value?.units[unitIndex.value - 1]?.id);
  const next = computed(() =>
    unitIndex.value < 0 ? undefined : pack.value?.units[unitIndex.value + 1]?.id,
  );

  async function load() {
    phase.value = "loading";
    try {
      const opened = await openUnit(await getStore(), packId, unitId);
      if ("missing" in opened) {
        phase.value =
          opened.missing === "pack" && demoBook !== undefined ? "demo-missing" : "not-found";
        return;
      }
      pack.value = opened.pack;
      unit.value = opened.unit;
      topic.value = opened.topic;
      for (const [id, state] of opened.states) done.set(id, state.done);
      entries.value = opened.entries;
      phase.value = "ready";
    } catch (error) {
      noteStorageFailure(error);
      phase.value = "failed";
    }
  }

  /**
   * Adds the demo books, as the start screen does, and opens the unit the address names: a copied
   * address of a demo unit leads to it in a browser where the demo was never added.
   */
  async function addDemoAndOpen() {
    if (adding.value.phase === "adding") return;
    adding.value = { phase: "adding", message: "Загружаем демо-книги…" };
    let packs: readonly Pack[] | undefined;
    try {
      const { addDemo } = await import("../demo/add-demo");
      packs = await addDemo((step) => {
        adding.value = { phase: "adding", message: progressMessage(step) };
      });
      await (await getStore()).putPacks(packs);
      demoState.value = { phase: "added", books: summaryOf(packs) };
      adding.value = { phase: "idle" };
      await load();
    } catch (error) {
      noteStorageFailure(error);
      adding.value = {
        phase: "failed",
        message: packs === undefined ? failureMessage(failureOf(error)) : keepFailureMessage(error),
      };
    }
  }

  onMounted(() => void load());

  return {
    phase,
    pack,
    unit,
    topic,
    entries,
    units,
    progress,
    previous,
    next,
    draftFailed,
    announcement,
    adding,
    demoTitle: demoBook?.profile.title,
    addDemoAndOpen,
    viewOf,
    load,
    setAnswer,
    flush,
    check,
    reveal,
    change,
    markDone,
  };
}
