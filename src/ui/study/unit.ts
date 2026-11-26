// The state of Study: `useUnit` opens the unit the address names, holds its exercises and
// exposes the views of the domain and the actions that append attempts. Components show what it
// gives and call its actions; none of them reaches the store.

import { computed, onMounted, onUnmounted, reactive, ref, shallowRef } from "vue";
import type { Pack, Unit } from "../../domain/packs/types";
import { demoBooks } from "../../domain/books/demo/profiles";
import { TEXT } from "../../domain/study";
import { failureMessage, failureOf, keepFailureMessage, progressMessage } from "../demo/messages";
import { demoState, summaryOf } from "../demo/state";
import { getStore, noteStorageFailure, onStoredDataChange } from "../storage";
import { useAttempts, viewOf } from "./attempts";
import { unsaved, useDrafts } from "./drafts";
import { openUnit, readUnit, unitLinks, type ExerciseEntry, type TopicOfUnit } from "./unit-read";

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
 * The field that has the focus, if one has: the element id of its exercise block (`ex-` and the
 * exercise id with dashes) and its item. A reread keeps what is typed in that field.
 */
function editedField(): { readonly block: string; readonly item: string } | undefined {
  const active = document.activeElement;
  if (!(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)) return;
  const block = active.closest("article[id^='ex-']")?.id;
  if (block === undefined) return;
  // Fields are `<block>-<item>-field`, or `<block>-text` for an open exercise (ExerciseBlock).
  const rest = active.id.slice(block.length + 1);
  const item = rest === "text" ? TEXT : rest.replace(/-field$/u, "");
  return { block, item };
}

const elementIdOf = (entry: ExerciseEntry) => `ex-${entry.exercise.id.replaceAll(".", "-")}`;

/** Nothing of `entry` is on its way to the store: what is stored is what the screen holds. */
const settled = (entry: ExerciseEntry) => !unsaved(entry) && !entry.busy;

export function useUnit(packId: string, unitId: string) {
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
   * Reads the unit again, as another tab may have changed it. An exercise is left as it is when
   * what the screen holds is newer than what was read: its answers are not stored yet, an action on
   * it is being written, or one was kept after the read began. In the exercise being typed in, the
   * focused field keeps its text; the rest is read again only when another tab added to its log. A
   * draft whose write failed is written again.
   */
  async function reread() {
    const from = pack.value;
    const shown = unit.value;
    if (phase.value !== "ready" || from === undefined || shown === undefined) return;
    writeUnsaved();
    const before = entries.value.map((entry) =>
      settled(entry) ? { edits: entry.edits, attempts: entry.attempts } : undefined,
    );
    try {
      const read = await readUnit(await getStore(), from, shown);
      const edited = editedField();
      const kept = new Set<string>();
      read.exercises.forEach((fresh, index) => {
        const entry = entries.value[index];
        const was = before[index];
        if (entry === undefined) return;
        if (
          was === undefined ||
          !settled(entry) ||
          entry.edits !== was.edits ||
          entry.attempts !== was.attempts
        ) {
          kept.add(entry.exercise.id);
          return;
        }
        const typing = edited?.block === elementIdOf(entry) ? edited.item : undefined;
        if (typing !== undefined) {
          // Another tab added to the log, or changed what it derives to.
          const changed =
            fresh.attempts.length !== entry.attempts.length ||
            JSON.stringify(fresh.state) !== JSON.stringify(entry.state);
          if (!changed) {
            kept.add(entry.exercise.id);
            return;
          }
          const text = entry.answers[typing];
          entry.state = fresh.state;
          entry.attempts = fresh.attempts;
          entry.answers = { ...fresh.answers };
          // The text kept in the field is newer than what was read: an edit, saved as a draft.
          if (text !== undefined && text !== fresh.answers[typing]) setAnswer(entry, typing, text);
          else if (text !== undefined) entry.answers[typing] = text;
          return;
        }
        entry.state = fresh.state;
        entry.attempts = fresh.attempts;
        entry.answers = fresh.answers;
      });
      for (const [id, state] of read.states) if (!kept.has(id)) done.set(id, state.done);
    } catch (error) {
      noteStorageFailure(error);
    }
  }

  let rereading = false;
  let rereadAgain = false;

  /**
   * One reread at a time: a reread asked for while one runs is made after it, so that what another
   * tab wrote meanwhile is not read by a reread that the running one makes look stale.
   */
  async function refresh() {
    if (rereading) {
      rereadAgain = true;
      return;
    }
    rereading = true;
    try {
      do {
        rereadAgain = false;
        await reread();
      } while (rereadAgain);
    } finally {
      rereading = false;
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

  const onHidden = () => {
    if (document.visibilityState === "hidden") flush();
  };
  const onPageHide = () => flush();
  let stopWatching: (() => void) | undefined;
  onMounted(() => {
    void load();
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);
    stopWatching = onStoredDataChange(() => void refresh());
  });
  onUnmounted(() => {
    document.removeEventListener("visibilitychange", onHidden);
    window.removeEventListener("pagehide", onPageHide);
    stopWatching?.();
  });

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
