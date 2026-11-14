// The state of Study (design D6, D10 of `study-screen`): `useUnit` loads the pack, prepares the
// keys, reads the states, attempts and drafts of the unit, and exposes the views of the domain and
// the actions that append attempts. Components show what it gives and call its actions; none of
// them reaches the store.

import { computed, nextTick, onMounted, onUnmounted, reactive, ref, shallowRef } from "vue";
import type { Exercise, Pack, Unit } from "../../domain/packs/types";
import { demoBooks } from "../../domain/books/demo/profiles";
import { validatePack } from "../../domain/packs/validate";
import { deriveExercise, type Attempt, type ExerciseState } from "../../domain/progress";
import {
  checkAttempt,
  initialAnswers,
  markDoneAttempt,
  overrideAttempt,
  prepareKeys,
  progressOf,
  revealAttempt,
  TEXT,
  viewOfExercise,
  type AttemptContext,
  type ExerciseView,
  type Keys,
  type Progress,
  type RowChange,
} from "../../domain/study";
import type { Store } from "../../storage/db";
import { failureMessage, failureOf, keepFailureMessage, progressMessage } from "../demo/messages";
import { demoState, summaryOf } from "../demo/state";
import { getStore, noteStorageFailure, onStoredDataChange } from "../storage";
import { newId, now } from "./ids";
import {
  changedMessage,
  checkedMessage,
  markedDoneMessage,
  notKeptMessage,
  nothingToCheck,
  revealedMessage,
  sampleMessage,
  type KeptAction,
} from "./messages";

/** Drafts are written this long after the last keystroke (design D6). */
export const DRAFT_DELAY = 400;

/** An exercise of the unit as Study holds it. */
export interface ExerciseEntry {
  readonly exercise: Exercise;
  /** The prepared keys; none for an exercise shown as open. */
  readonly keys: Keys | undefined;
  state: ExerciseState;
  attempts: Attempt[];
  /** The answers in the fields; text and open exercises use `text`. */
  answers: Record<string, string>;
  /** The result of an action could not be kept: what to say, and how to repeat it (D6). */
  failure: { readonly message: string; readonly retry: () => void } | null;
  /** A quiet word next to Проверить, such as that there is nothing to check. */
  notice: string | null;
  /** An action is being written. */
  busy: boolean;
  /** How many edits the fields have had: a reload does not overwrite newer edits. */
  edits: number;
  /** The value of `edits` the stored draft holds: answers not stored are never read over. */
  stored: number;
}

export type UnitPhase =
  | "loading"
  | "ready"
  | "not-found"
  /** The address is a unit of a demo book, and the demo is not added in this browser (PROD-008). */
  | "demo-missing"
  | "failed";

/** Adding the demo from Study: what is being done, or why it failed. */
export type DemoAdding =
  | { readonly phase: "idle" }
  | { readonly phase: "adding"; readonly message: string }
  | { readonly phase: "failed"; readonly message: string };

export interface UnitLink {
  readonly id: string;
  readonly title: string;
  readonly progress: Progress;
}

const idOf = (value: unknown): unknown =>
  typeof value === "object" && value !== null && "id" in value ? value.id : undefined;

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

/** The answers in the fields of `entry` are newer than its stored draft. */
const unsaved = (entry: ExerciseEntry) => entry.stored !== entry.edits;

/** Nothing of `entry` is on its way to the store: what is stored is what the screen holds. */
const settled = (entry: ExerciseEntry) => !unsaved(entry) && !entry.busy;

/** The states of every exercise of the pack, and what the store holds for the exercises of `shown`. */
async function readUnit(store: Store, from: Pack, shown: Unit) {
  const ids = from.units.flatMap((each) => each.exercises.map((exercise) => exercise.id));
  const read = await store.getExerciseStates(from.id, ids);
  const stateOf = new Map(ids.map((id, index) => [id, read[index]!] as const));
  const exercises = await Promise.all(
    shown.exercises.map(async (exercise) => {
      const [attempts, draft] = await Promise.all([
        store.getAttempts(from.id, exercise.id),
        store.getDraft(from.id, exercise.id),
      ]);
      // Derived from the log just read, not taken from the cache read before it: a check that
      // another tab writes between the two reads would give a new log with an old state.
      const state = attempts.length === 0 ? stateOf.get(exercise.id)! : deriveExercise(attempts);
      stateOf.set(exercise.id, state);
      return {
        exercise,
        state,
        attempts,
        answers: initialAnswers(state, attempts, draft?.answers),
      };
    }),
  );
  return { states: [...stateOf], exercises };
}

export function useUnit(packId: string, unitId: string) {
  const phase = ref<UnitPhase>("loading");
  const pack = shallowRef<Pack>();
  const unit = shallowRef<Unit>();
  const entries = ref<ExerciseEntry[]>([]);
  /** Exercise id → done, for every exercise of the pack (the unit list counts them). */
  const done = reactive(new Map<string, boolean>());
  const draftFailed = ref(false);
  const announcement = ref("");
  const adding = shallowRef<DemoAdding>({ phase: "idle" });
  /** The demo book the address names, if it names one. */
  const demoBook = demoBooks.find((book) => book.profile.id === packId);

  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const writing = new Set<string>();
  /** The exercises whose last draft write failed. */
  const failed = new Set<string>();

  const unitIndex = computed(() =>
    pack.value && unit.value ? pack.value.units.indexOf(unit.value) : -1,
  );
  const units = computed<UnitLink[]>(() =>
    (pack.value?.units ?? []).map((each) => ({
      id: each.id,
      title: each.title,
      progress: progressOf(
        each.exercises.map((exercise) => exercise.id),
        (id) => done.get(id) === true,
      ),
    })),
  );
  const progress = computed(() => units.value[unitIndex.value]?.progress);
  const previous = computed(() => pack.value?.units[unitIndex.value - 1]?.id);
  const next = computed(() =>
    unitIndex.value < 0 ? undefined : pack.value?.units[unitIndex.value + 1]?.id,
  );

  function viewOf(entry: ExerciseEntry): ExerciseView {
    return viewOfExercise(
      entry.exercise,
      entry.state,
      entry.answers,
      entry.attempts,
      entry.keys === undefined,
    );
  }

  /** Says `message` through the polite live region, again even if it is the same (D7). */
  async function announce(message: string) {
    announcement.value = "";
    await nextTick();
    announcement.value = message;
  }

  async function load() {
    phase.value = "loading";
    try {
      const store = await getStore();
      const found = (await store.getPacks()).find((value) => idOf(value) === packId);
      const validation = found === undefined ? undefined : validatePack(found);
      const shown = validation?.ok
        ? validation.pack.units.find(({ id }) => id === unitId)
        : undefined;
      if (!validation?.ok || shown === undefined) {
        phase.value = found === undefined && demoBook !== undefined ? "demo-missing" : "not-found";
        return;
      }
      const read = await readUnit(store, validation.pack, shown);
      pack.value = validation.pack;
      unit.value = shown;
      for (const [id, state] of read.states) done.set(id, state.done);
      entries.value = read.exercises.map(({ exercise, state, attempts, answers }) => ({
        exercise,
        keys: exercise.type === "items" ? prepareKeys(exercise) : undefined,
        state,
        attempts,
        answers,
        failure: null,
        notice: null,
        busy: false,
        edits: 0,
        stored: 0,
      }));
      phase.value = "ready";
    } catch (error) {
      noteStorageFailure(error);
      phase.value = "failed";
    }
  }

  /**
   * Reads the unit again, as another tab may have changed it (DATA-012, design D6). An exercise is
   * left as it is when what the screen holds is newer than what was read: its answers are not
   * stored yet, an action on it is being written, or one was kept after the read began. In the
   * exercise being typed in, the focused field keeps its text; the rest is read again only when
   * another tab added to its log. A draft whose write failed is written again.
   */
  async function reread() {
    const from = pack.value;
    const shown = unit.value;
    if (phase.value !== "ready" || from === undefined || shown === undefined) return;
    for (const entry of entries.value) {
      const id = entry.exercise.id;
      if (unsaved(entry) && !timers.has(id) && !writing.has(id)) void writeDraft(entry);
    }
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

  async function writeDraft(entry: ExerciseEntry) {
    const id = entry.exercise.id;
    clearTimeout(timers.get(id));
    timers.delete(id);
    if (pack.value === undefined) return;
    writing.add(id);
    const edits = entry.edits;
    try {
      await (
        await getStore()
      ).putDraft({ pack: pack.value.id, exercise: id, answers: { ...entry.answers } });
      entry.stored = edits;
      failed.delete(id);
      draftFailed.value = failed.size > 0;
    } catch (error) {
      noteStorageFailure(error);
      failed.add(id);
      draftFailed.value = true;
    } finally {
      writing.delete(id);
    }
  }

  /** Puts `text` in a field and writes the draft once typing pauses (PLAY-005). */
  function setAnswer(entry: ExerciseEntry, item: string, text: string) {
    entry.answers[item] = text;
    entry.edits += 1;
    entry.notice = null;
    clearTimeout(timers.get(entry.exercise.id));
    timers.set(
      entry.exercise.id,
      setTimeout(() => void writeDraft(entry), DRAFT_DELAY),
    );
  }

  /** Writes a waiting draft at once: when a field loses focus or the page is hidden. */
  function flush(entry?: ExerciseEntry) {
    for (const each of entry ? [entry] : entries.value) {
      const id = each.exercise.id;
      if (timers.has(id) || (failed.has(id) && !writing.has(id))) void writeDraft(each);
    }
  }

  function contextOf(entry: ExerciseEntry): AttemptContext {
    const { id, version } = pack.value!;
    return { id: newId(), at: now(), pack: { id, version }, exercise: entry.exercise.id };
  }

  /**
   * Appends the attempt `build` makes and shows its result only once it is kept; if it is not,
   * the exercise says so and offers to repeat (PLAY-006, DATA-004, design D6).
   */
  async function keep(
    entry: ExerciseEntry,
    action: KeptAction,
    build: () => Attempt | undefined,
    said: (state: ExerciseState) => string,
  ) {
    if (entry.busy) return;
    const attempt = build();
    if (attempt === undefined) return;
    entry.busy = true;
    entry.notice = null;
    try {
      const state = await (await getStore()).appendAttempt(attempt);
      entry.failure = null;
      entry.attempts = [...entry.attempts, attempt];
      entry.state = state;
      done.set(entry.exercise.id, state.done);
      void announce(said(state));
    } catch (error) {
      noteStorageFailure(error);
      entry.failure = {
        message: notKeptMessage(action, error),
        retry: () => void keep(entry, action, build, said),
      };
    } finally {
      entry.busy = false;
    }
  }

  function check(entry: ExerciseEntry) {
    const { exercise, keys } = entry;
    if (exercise.type !== "items" || keys === undefined || entry.busy) return;
    flush(entry);
    if (Object.values(entry.answers).every((text) => text.trim() === "")) {
      entry.notice = nothingToCheck;
      void announce(nothingToCheck);
      return;
    }
    void keep(
      entry,
      "check",
      () => checkAttempt(contextOf(entry), exercise, keys, { ...entry.answers }),
      (state) => {
        const view = viewOf(entry);
        const score = view.kind === "items" ? view.score : null;
        return checkedMessage(exercise.id, score?.ok ?? 0, score?.total ?? 0, state.done);
      },
    );
  }

  function reveal(entry: ExerciseEntry, item: string) {
    void keep(
      entry,
      item === TEXT ? "sample" : "reveal",
      () => revealAttempt(contextOf(entry), item, entry.answers),
      () => (item === TEXT ? sampleMessage(entry.exercise.id) : revealedMessage(item)),
    );
  }

  function change(entry: ExerciseEntry, item: string, how: RowChange) {
    const { exercise } = entry;
    if (exercise.type !== "items") return;
    const verdict = how === "count" ? "ok" : how === "uncount" ? "bad" : null;
    void keep(
      entry,
      "change",
      () => overrideAttempt(contextOf(entry), exercise, entry.attempts, item, verdict),
      () => changedMessage(item, how),
    );
  }

  function markDone(entry: ExerciseEntry) {
    flush(entry);
    void keep(
      entry,
      "mark-done",
      () => markDoneAttempt(contextOf(entry), entry.answers[TEXT] ?? ""),
      () => markedDoneMessage(entry.exercise.id),
    );
  }

  /**
   * Adds the demo books, as the start screen does, and opens the unit the address names (PROD-008):
   * a copied address of a demo unit leads to it in a browser where the demo was never added.
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
    flush();
    document.removeEventListener("visibilitychange", onHidden);
    window.removeEventListener("pagehide", onPageHide);
    stopWatching?.();
  });

  return {
    phase,
    pack,
    unit,
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
