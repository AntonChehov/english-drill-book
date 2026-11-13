// The demo course and helpers for the tests of Study; the answers are invented.

import coursePack from "../../../demo/course.pack.json";
import type { Exercise, ItemsExercise, Pack } from "../packs/types";
import { uuidOf } from "../progress/attempts.fixture";
import type { AttemptContext } from "./attempts";

export const course = coursePack as unknown as Pack;

/** An exercise of the demo course by its id. */
export function exerciseOf(id: string): Exercise {
  const found = course.units
    .flatMap((unit) => unit.exercises)
    .find((exercise) => exercise.id === id);
  if (found === undefined) throw new Error(`No exercise ${id}`);
  return found;
}

export const itemsOf = (id: string) => exerciseOf(id) as ItemsExercise;

/** The context of the `n`-th attempt of `exercise`, `n` seconds after a fixed moment. */
export function contextOf(n: number, exercise: string, at?: string): AttemptContext {
  const seconds = String(n % 60).padStart(2, "0");
  const minutes = String(Math.floor(n / 60)).padStart(2, "0");
  return {
    id: uuidOf(n),
    at: at ?? `2026-11-13T10:${minutes}:${seconds}.000Z`,
    pack: { id: course.id, version: course.version },
    exercise,
  };
}
