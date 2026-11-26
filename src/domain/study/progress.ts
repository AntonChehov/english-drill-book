// Done counts of units and books.

/** How many exercises of a unit are done. */
export interface Progress {
  readonly done: number;
  readonly total: number;
}

/** The progress of a list of exercises, `isDone` telling which are done. */
export function progressOf(
  exercises: readonly string[],
  isDone: (exercise: string) => boolean,
): Progress {
  return { done: exercises.filter(isDone).length, total: exercises.length };
}

/** The index of the first unit not finished, where the learner continues; -1 if none. */
export function continueAt(units: readonly Progress[]): number {
  return units.findIndex(({ done, total }) => done < total);
}

/** Every exercise is done, and there is at least one. */
export function isFinished({ done, total }: Progress): boolean {
  return total > 0 && done === total;
}
