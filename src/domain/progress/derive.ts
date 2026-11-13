// What the screens show about an exercise, derived from its attempts (DATA-003, design D3 of the
// change `storage`; PLAY-008 – PLAY-010). The state is a fold over the attempts in time order, so a
// state derived from the earlier attempts and continued with the later ones equals the state of
// all of them: a cached state can be brought up to date without reading the whole log again.
//
// Every override joins the check it corrects (`corrects`). In such a group the latest attempt
// speaks for the check: its `complete` says whether the check, with the learner's changes, has
// every item `ok`, and the latest override's `overridden` is the whole set of items set by hand for
// that check (an item left out is no longer set by hand: that is how an undo is recorded).

import type { Verdict } from "../checking";
import type { Attempt, OverrideVerdict } from "./attempt";

/**
 * The version of the derivation below. A cached state built by another version is rebuilt from
 * the log; raise it whenever what `deriveExercise` returns for the same attempts changes.
 */
export const DERIVATION = 1;

/** A check and the latest attempt of its group, itself or an override of it. */
export interface CheckState {
  /** The time of the check. */
  readonly at: string;
  /** Whether the check, with the learner's changes, has every item `ok`. */
  readonly complete: boolean;
  /** Item id → verdict set by hand for this check, by its latest override. */
  readonly overridden: Readonly<Record<string, OverrideVerdict>>;
}

/** The latest check that judged an item, and what it said. */
export interface ItemState {
  readonly check: string;
  readonly result: Verdict;
}

export interface ExerciseState {
  /**
   * Some check is complete, with the learner's changes to it, or the exercise was marked done
   * (PLAY-009). A later wrong answer does not undo it (PLAY-010); counting as wrong an item of the
   * completing check does.
   */
  readonly done: boolean;
  /** When done: the time of the first check that is complete, or of the first mark as done. */
  readonly doneAt?: string;
  /** Item id → the latest verdict: of the latest check that judged it, with that check's changes. */
  readonly verdicts: Readonly<Record<string, Verdict>>;
  /** Item id → the verdict set by hand, for items whose latest verdict was set by hand. */
  readonly overridden: Readonly<Record<string, OverrideVerdict>>;
  /** Items whose answer was revealed in some attempt, sorted. */
  readonly revealed: readonly string[];
  /** Check id → the check with its changes; what the fold continues from. */
  readonly checks: Readonly<Record<string, CheckState>>;
  /** Item id → the latest check that judged it; what the fold continues from. */
  readonly items: Readonly<Record<string, ItemState>>;
  /** The time of the first mark as done; what the fold continues from. */
  readonly markedDoneAt?: string;
}

/** The state of an exercise with no attempt. */
export const emptyExerciseState: ExerciseState = {
  done: false,
  verdicts: {},
  overridden: {},
  revealed: [],
  checks: {},
  items: {},
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

/** The value of `key` in `record` if it is the record's own, so that an id such as `constructor` is safe. */
function own<T>(record: Readonly<Record<string, T>>, key: string): T | undefined {
  return Object.hasOwn(record, key) ? record[key] : undefined;
}

/** The earlier of two times; `a` may be missing. */
function earlier(a: string | undefined, b: string): string {
  return a !== undefined && timeKey(a) <= timeKey(b) ? a : b;
}

/**
 * The state of an exercise after `attempts`, continuing from `from` (by default no attempt). The
 * attempts are taken in time order whatever order they are given in; `from` must be the state of
 * attempts that all come before them.
 *
 * - A check judges the items of its `results`; for each item the latest such check counts.
 * - An override replaces the group state of the check it corrects; an override whose `corrects`
 *   names no check before it in this exercise is left out, `revealed` included.
 * - The verdict of an item is its latest check's result, unless the latest override of that same
 *   check set it by hand.
 * - Done when some check's group is complete, or the exercise was marked done.
 */
export function deriveExercise(
  attempts: readonly Attempt[],
  from: ExerciseState = emptyExerciseState,
): ExerciseState {
  const checks: Record<string, CheckState> = { ...from.checks };
  const items: Record<string, ItemState> = { ...from.items };
  const revealed = new Set(from.revealed);
  let markedDoneAt = from.markedDoneAt;

  for (const attempt of attempts.toSorted(compareAttempts)) {
    if (attempt.action === "override") {
      // `newAttempt` gives every override `corrects`; one from elsewhere without it names nothing.
      const corrects = attempt.corrects ?? "";
      const corrected = own(checks, corrects);
      if (corrected === undefined) continue;
      checks[corrects] = {
        at: corrected.at,
        complete: attempt.complete,
        overridden: { ...attempt.overridden },
      };
    } else if (attempt.action === "check") {
      checks[attempt.id] = { at: attempt.at, complete: attempt.complete, overridden: {} };
      for (const [item, result] of Object.entries(attempt.results)) {
        items[item] = { check: attempt.id, result };
      }
    } else if (attempt.action === "mark-done") {
      markedDoneAt = earlier(markedDoneAt, attempt.at);
    }
    for (const item of attempt.revealed ?? []) revealed.add(item);
  }

  const verdicts: Record<string, Verdict> = {};
  const overridden: Record<string, OverrideVerdict> = {};
  for (const [item, { check, result }] of Object.entries(items)) {
    // An item is only ever judged by a check that is in `checks`.
    const byHand = own(checks[check]!.overridden, item);
    verdicts[item] = byHand ?? result;
    if (byHand !== undefined) overridden[item] = byHand;
  }
  let doneAt = markedDoneAt;
  for (const check of Object.values(checks)) {
    if (check.complete) doneAt = earlier(doneAt, check.at);
  }

  return {
    done: doneAt !== undefined,
    ...(doneAt !== undefined && { doneAt }),
    verdicts,
    overridden,
    revealed: [...revealed].toSorted(compareText),
    checks,
    items,
    ...(markedDoneAt !== undefined && { markedDoneAt }),
  };
}
