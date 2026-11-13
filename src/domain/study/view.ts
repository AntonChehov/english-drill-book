// What Study shows of an exercise (PLAY-003 – PLAY-011, PLAY-013; design D4, D5 of
// `study-screen`): pure, so the components only show it.

import type { Verdict } from "../checking";
import type { Exercise, ItemsExercise } from "../packs/types";
import type { Attempt, ExerciseState } from "../progress";
import { latestCheck, TEXT } from "./attempts";
import type { Answers } from "./grade";

/** The state an exercise names (PLAY-011). */
export type ExerciseStatus = "untouched" | "in-progress" | "done";

/** A change by hand the learner may make to a row (PLAY-008). */
export type RowChange =
  /** Count a wrong or almost answer as correct. */
  | "count"
  /** Count an accepted answer as wrong. */
  | "uncount"
  /** Undo the change by hand. */
  | "undo";

export interface RowView {
  readonly id: string;
  readonly prompt?: string;
  readonly choices?: readonly string[];
  /** The verdict shown: only while the field holds exactly the answer that was judged (D4). */
  readonly verdict: Verdict | null;
  /** The verdict shown was set by hand. */
  readonly byHand: boolean;
  /** The key, its accepted patterns joined by "или", once revealed (PLAY-007). */
  readonly key: string | null;
  /** The change by hand the row offers, if any. */
  readonly change: RowChange | null;
}

export interface ItemsView {
  readonly kind: "items";
  readonly status: ExerciseStatus;
  /** "верно X из Y": the rows shown as correct, once the exercise has been checked. */
  readonly score: { readonly ok: number; readonly total: number } | null;
  readonly rows: readonly RowView[];
}

/** An open exercise, a connected text for now, or an exercise whose key cannot be read (PLAY-013). */
export interface FreeView {
  readonly kind: "free";
  readonly status: ExerciseStatus;
  /** The sample or model the pack provides, if any. */
  readonly sample: string | null;
  /** The sample was asked for. */
  readonly sampleShown: boolean;
  readonly done: boolean;
}

export type ExerciseView = ItemsView | FreeView;

/** The answer each item's latest verdict judged: from the check that judged it. */
export function judgedAnswers(
  state: ExerciseState,
  attempts: readonly Attempt[],
): Record<string, string> {
  const byId = new Map(attempts.map((attempt) => [attempt.id, attempt]));
  const judged: Record<string, string> = {};
  for (const [item, { check }] of Object.entries(state.items)) {
    const answers = byId.get(check)?.answers;
    if (answers !== undefined && Object.hasOwn(answers, item)) judged[item] = answers[item]!;
  }
  return judged;
}

/**
 * What the fields of an exercise hold when its unit opens: the answers of its latest verdicts,
 * replaced by the draft where there is one (PLAY-005).
 */
export function initialAnswers(
  state: ExerciseState,
  attempts: readonly Attempt[],
  draft: Answers | undefined,
): Record<string, string> {
  return { ...judgedAnswers(state, attempts), ...draft };
}

const answerOf = (answers: Answers, item: string) =>
  Object.hasOwn(answers, item) ? answers[item]! : "";

function statusOf(
  state: ExerciseState,
  attempts: readonly Attempt[],
  answers: Answers,
): ExerciseStatus {
  if (state.done) return "done";
  const typed = Object.values(answers).some((text) => text.trim() !== "");
  return typed || attempts.length > 0 ? "in-progress" : "untouched";
}

function itemsView(
  exercise: ItemsExercise,
  state: ExerciseState,
  answers: Answers,
  attempts: readonly Attempt[],
): ItemsView {
  const judged = judgedAnswers(state, attempts);
  const latest = latestCheck(attempts)?.id;
  const revealed = new Set(state.revealed);
  const rows = exercise.items.map((item): RowView => {
    const shown = Object.hasOwn(judged, item.id) && judged[item.id] === answerOf(answers, item.id);
    const verdict = shown ? state.verdicts[item.id]! : null;
    const byHand = shown && Object.hasOwn(state.overridden, item.id);
    const ofLatest = shown && state.items[item.id]?.check === latest;
    const change: RowChange | null = !ofLatest
      ? null
      : byHand
        ? "undo"
        : verdict === "ok"
          ? "uncount"
          : "count";
    return {
      id: item.id,
      ...(item.prompt !== undefined && { prompt: item.prompt }),
      ...(item.choices !== undefined && { choices: item.choices }),
      verdict,
      byHand,
      key: revealed.has(item.id) ? item.accept.join(" или ") : null,
      change,
    };
  });
  const checked = Object.keys(state.checks).length > 0;
  return {
    kind: "items",
    status: statusOf(state, attempts, answers),
    score: checked
      ? { ok: rows.filter((row) => row.verdict === "ok").length, total: rows.length }
      : null,
    rows,
  };
}

function sampleOf(exercise: Exercise): string | null {
  if (exercise.type === "text") return exercise.model;
  if (exercise.type === "open") return exercise.sample ?? null;
  return null;
}

/**
 * What each row of `exercise` shows, given its derived state, the answers in its fields and its
 * attempts (design D4, D5). `open` shows an `items` exercise as an open one, as when its key
 * cannot be prepared; text and open exercises are always shown so.
 */
export function viewOfExercise(
  exercise: Exercise,
  state: ExerciseState,
  answers: Answers,
  attempts: readonly Attempt[],
  open = false,
): ExerciseView {
  if (exercise.type === "items" && !open) return itemsView(exercise, state, answers, attempts);
  return {
    kind: "free",
    status: statusOf(state, attempts, answers),
    sample: sampleOf(exercise),
    sampleShown: state.revealed.includes(TEXT),
    done: state.done,
  };
}
