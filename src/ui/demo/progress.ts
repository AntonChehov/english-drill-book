// How many exercises of each demo book and unit are done, for the cards of the start screen
// (PROG-014; design D2 of `study-screen`), read from the derived state in the store.

import { reactive } from "vue";
import { getStore, noteStorageFailure } from "../storage";
import type { DemoBookSummary } from "./state";

/** `pack/exercise` → done. Kept between visits of the start screen, read again on each. */
export const doneExercises = reactive(new Map<string, boolean>());

export const doneKey = (pack: string, exercise: string) => `${pack}/${exercise}`;

/** Reads whether each exercise of `books` is done. A store that cannot be read changes nothing. */
export async function readDone(books: readonly DemoBookSummary[]): Promise<void> {
  try {
    const store = await getStore();
    const read = await Promise.all(
      books.flatMap((book) =>
        book.units.flatMap((unit) =>
          unit.exercises.map(
            async (exercise) =>
              [
                doneKey(book.id, exercise),
                (await store.getExerciseState(book.id, exercise)).done,
              ] as const,
          ),
        ),
      ),
    );
    for (const [key, done] of read) doneExercises.set(key, done);
  } catch (error) {
    noteStorageFailure(error);
  }
}
