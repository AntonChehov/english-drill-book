// What the screens show about an exercise, derived from its attempts (DATA-003, design D3 of the
// change `storage`). The state is a fold over the attempts in time order, so a state derived from
// the earlier attempts and continued with the later ones equals the state of all of them: a
// cached state can be brought up to date without reading the whole log again.

import type { Verdict } from "../checking";
import type { Attempt, OverrideVerdict } from "./attempt";

export interface ExerciseState {
  /** Some attempt made the exercise done; a later wrong answer does not undo it. */
  readonly done: boolean;
  /** Item id → the latest verdict of the item, checked or set by hand. */
  readonly verdicts: Readonly<Record<string, Verdict>>;
  /** Item id → the verdict set by hand, for items whose latest verdict was set by hand. */
  readonly overridden: Readonly<Record<string, OverrideVerdict>>;
  /** Items whose answer was revealed in some attempt, sorted. */
  readonly revealed: readonly string[];
}

/** The state of an exercise with no attempt. */
export const emptyExerciseState: ExerciseState = {
  done: false,
  verdicts: {},
  overridden: {},
  revealed: [],
};

/**
 * `at` as a string that sorts by time: the export format allows from no to three digits of a
 * second, and `…:00Z` would otherwise sort after `…:00.5Z`.
 */
function timeKey(at: string): string {
  const fraction = /\.([0-9]+)Z$/u.exec(at)?.[1] ?? "";
  return `${at.slice(0, 19)}.${fraction.padEnd(3, "0")}`;
}

const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * The time order of the log: by `at`, and attempts of the same millisecond by `id`, so that
 * every reader of the same attempts puts them in the same order.
 */
export function compareAttempts(
  a: Pick<Attempt, "at" | "id">,
  b: Pick<Attempt, "at" | "id">,
): number {
  return compareText(timeKey(a.at), timeKey(b.at)) || compareText(a.id, b.id);
}

/**
 * The state of an exercise after `attempts`, continuing from `from` (by default no attempt). The
 * attempts are taken in time order whatever order they are given in; `from` must be the state of
 * attempts that all come before them.
 */
export function deriveExercise(
  attempts: readonly Attempt[],
  from: ExerciseState = emptyExerciseState,
): ExerciseState {
  let done = from.done;
  const verdicts: Record<string, Verdict> = { ...from.verdicts };
  const overridden: Record<string, OverrideVerdict> = { ...from.overridden };
  const revealed = new Set(from.revealed);
  for (const attempt of attempts.toSorted(compareAttempts)) {
    if (attempt.complete) done = true;
    for (const [item, verdict] of Object.entries(attempt.results)) {
      verdicts[item] = verdict;
      delete overridden[item];
    }
    for (const [item, verdict] of Object.entries(attempt.overridden ?? {})) {
      verdicts[item] = verdict;
      overridden[item] = verdict;
    }
    for (const item of attempt.revealed ?? []) revealed.add(item);
  }
  return { done, verdicts, overridden, revealed: [...revealed].toSorted(compareText) };
}
