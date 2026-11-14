// Done counts of units and books (PLAY-011, PROG-014; design D2, D3 of `study-screen`).

/** How many exercises of a unit are done (PLAY-011, PROG-014). */
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

/** The index of the first unit not finished, where the learner continues (PROG-014); -1 if none. */
export function continueAt(units: readonly Progress[]): number {
  return units.findIndex(({ done, total }) => done < total);
}
