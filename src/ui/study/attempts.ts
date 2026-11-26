// Checking, revealing, changing a verdict and marking done: each appends an attempt to the log of
// the exercise, and its result is shown and announced only once the store has kept it.

import { nextTick, ref, type Ref } from "vue";
import type { Pack } from "../../domain/packs/types";
import type { Attempt, ExerciseState } from "../../domain/progress";
import {
  checkAttempt,
  markDoneAttempt,
  overrideAttempt,
  revealAttempt,
  TEXT,
  viewOfExercise,
  type AttemptContext,
  type ExerciseView,
  type RowChange,
} from "../../domain/study";
import { getStore, noteStorageFailure } from "../storage";
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
import type { ExerciseEntry } from "./unit-read";

/** What the domain shows of `entry`. */
export function viewOf(entry: ExerciseEntry): ExerciseView {
  return viewOfExercise(
    entry.exercise,
    entry.state,
    entry.answers,
    entry.attempts,
    entry.keys === undefined,
  );
}

/**
 * The actions on the exercises of `pack`. `done` is told the state each kept attempt gives; `flush`
 * writes a waiting draft before an attempt that takes the typed answers.
 */
export function useAttempts(
  pack: Readonly<Ref<Pack | undefined>>,
  done: Map<string, boolean>,
  flush: (entry: ExerciseEntry) => void,
) {
  /** What the polite live region says. */
  const announcement = ref("");

  /** Says `message` through the polite live region, again even if it is the same. */
  async function announce(message: string) {
    announcement.value = "";
    await nextTick();
    announcement.value = message;
  }

  function contextOf(entry: ExerciseEntry): AttemptContext {
    const { id, version } = pack.value!;
    return { id: newId(), at: now(), pack: { id, version }, exercise: entry.exercise.id };
  }

  /**
   * Appends the attempt `build` makes and shows its result only once it is kept; if it is not,
   * the exercise says so and offers to repeat.
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
      () => markDoneAttempt(contextOf(entry), { ...entry.answers }),
      () => markedDoneMessage(entry.exercise.id),
    );
  }

  return { announcement, check, reveal, change, markDone };
}
