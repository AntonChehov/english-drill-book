// The attempts Study appends to the log (PLAY-006 – PLAY-010; design D5 of `study-screen`). The id
// and the time come from the caller: the domain has no clock and no randomness (C-08).

import type { ItemsExercise, Pack } from "../packs/types";
import { compareAttempts, newAttempt, type Attempt, type OverrideVerdict } from "../progress";
import { gradeExercise, type Answers, type Keys } from "./grade";
import { notEarlierThan } from "./time";

/** Who and when: what every attempt of an exercise needs from the caller. */
export interface AttemptContext {
  readonly id: string;
  readonly at: string;
  readonly pack: Pick<Pack, "id" | "version">;
  readonly exercise: string;
}

/** The key under which text and open exercises keep their one answer. */
export const TEXT = "text";

/** The answers that are not blank. */
function typed(answers: Answers): Record<string, string> {
  return Object.fromEntries(Object.entries(answers).filter(([, text]) => text.trim() !== ""));
}

/**
 * The check of `answers`: every item that is not blank graded, its answer and verdict recorded,
 * `complete` when every item is `ok` (PLAY-003, PLAY-006, PLAY-009).
 */
export function checkAttempt(
  context: AttemptContext,
  exercise: ItemsExercise,
  keys: Keys,
  answers: Answers,
): Attempt {
  const { results, complete } = gradeExercise(exercise, keys, answers);
  const judged = Object.fromEntries(
    Object.keys(results).map((item) => [item, Object.hasOwn(answers, item) ? answers[item]! : ""]),
  );
  return newAttempt({ ...context, action: "check", answers: judged, results, complete });
}

/** The reveal of one item's key, or of the sample of an open exercise (`TEXT`) (PLAY-007). */
export function revealAttempt(context: AttemptContext, item: string, answers: Answers): Attempt {
  return newAttempt({
    ...context,
    action: "reveal",
    answers: typed(answers),
    results: {},
    revealed: [item],
    complete: false,
  });
}

/** An open exercise, or one shown as open, marked as done by the learner (PLAY-013). */
export function markDoneAttempt(context: AttemptContext, text: string): Attempt {
  return newAttempt({
    ...context,
    action: "mark-done",
    answers: { [TEXT]: text },
    results: {},
    complete: true,
  });
}

/** The latest check among `attempts`, if any. */
export function latestCheck(attempts: readonly Attempt[]): Attempt | undefined {
  return attempts
    .filter((attempt) => attempt.action === "check")
    .toSorted(compareAttempts)
    .at(-1);
}

/** The overrides of `check` among `attempts`, in time order. */
function overridesOf(check: Attempt, attempts: readonly Attempt[]): Attempt[] {
  return attempts
    .filter((attempt) => attempt.action === "override" && attempt.corrects === check.id)
    .toSorted(compareAttempts);
}

/** The items of the latest check set by hand, by its latest override. */
export function overriddenOf(
  attempts: readonly Attempt[],
): Readonly<Record<string, OverrideVerdict>> {
  const check = latestCheck(attempts);
  if (check === undefined) return {};
  return overridesOf(check, attempts).at(-1)?.overridden ?? {};
}

/**
 * A change by hand of the verdict of `item` in the latest check (PLAY-008): `verdict` sets it,
 * `null` undoes the change. The override names that check, carries the whole set of its items set
 * by hand with this change applied, and is `complete` when the check with these changes has every
 * item `ok` (PLAY-009). Its time is never earlier than its check's or the check's latest override,
 * one millisecond after it if the clock says otherwise, so that the derivation keeps it in order.
 * `undefined` when there is no check or the latest one did not judge `item`.
 */
export function overrideAttempt(
  context: AttemptContext,
  exercise: ItemsExercise,
  attempts: readonly Attempt[],
  item: string,
  verdict: OverrideVerdict | null,
): Attempt | undefined {
  const check = latestCheck(attempts);
  if (check === undefined || !Object.hasOwn(check.results, item)) return undefined;
  const earlier = overridesOf(check, attempts).at(-1);
  const overridden: Record<string, OverrideVerdict> = { ...earlier?.overridden };
  if (verdict === null) delete overridden[item];
  else overridden[item] = verdict;
  const complete = exercise.items.every(
    ({ id }) => (Object.hasOwn(overridden, id) ? overridden[id] : check.results[id]) === "ok",
  );
  return newAttempt({
    ...context,
    at: notEarlierThan(context.at, (earlier ?? check).at),
    action: "override",
    answers: {},
    results: {},
    overridden,
    corrects: check.id,
    complete,
  });
}
