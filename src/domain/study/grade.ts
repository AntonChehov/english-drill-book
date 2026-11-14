// Grading an exercise on screen (PLAY-003, PLAY-004; design D5 of the change `study-screen`).

import { checkAnswer, compileKey, type Key, type Verdict } from "../checking";
import type { ItemsExercise } from "../packs/types";

/** Answers as typed: item id → text. */
export type Answers = Readonly<Record<string, string>>;

/** The prepared key of every item of an exercise, by item id. */
export type Keys = ReadonlyMap<string, Key>;

/**
 * The keys of every item, prepared once when the unit opens. `undefined` when some key cannot be
 * prepared, which a validated pack never has: the exercise is then shown as an open one (D5).
 */
export function prepareKeys(exercise: ItemsExercise): Keys | undefined {
  const keys = new Map<string, Key>();
  for (const item of exercise.items) {
    const compiled = compileKey(item.accept);
    if (!compiled.ok) return undefined;
    keys.set(item.id, compiled.key);
  }
  return keys;
}

export interface Grading {
  /** Item id → verdict, for every item that was not blank (or whose key accepts a blank). */
  readonly results: Readonly<Record<string, Verdict>>;
  /** Every item of the exercise is `ok`. */
  readonly complete: boolean;
}

/** Grades every item of `exercise` that has an answer; a blank item gets no verdict (PLAY-003). */
export function gradeExercise(exercise: ItemsExercise, keys: Keys, answers: Answers): Grading {
  const results: Record<string, Verdict> = {};
  for (const item of exercise.items) {
    const key = keys.get(item.id);
    if (key === undefined) continue;
    const answer = Object.hasOwn(answers, item.id) ? answers[item.id]! : "";
    const verdict = checkAnswer(key, answer, item.choices ? { choices: item.choices } : {});
    if (verdict !== null) results[item.id] = verdict;
  }
  const complete = exercise.items.every((item) => results[item.id] === "ok");
  return { results, complete };
}
