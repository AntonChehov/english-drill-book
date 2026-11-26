// Reading a unit again when another tab may have changed it, without losing what this screen
// holds that is newer than what the store gave.

import { onMounted, onUnmounted, type Ref } from "vue";
import type { Pack, Unit } from "../../domain/packs/types";
import { getStore, noteStorageFailure, onStoredDataChange } from "../storage";
import { unsaved } from "./drafts";
import { readUnit, type ExerciseEntry } from "./unit-read";

/** The field being typed in: its exercise and its item. */
export interface EditedField {
  readonly exercise: string;
  readonly item: string;
}

/** Nothing of `entry` is on its way to the store: what is stored is what the screen holds. */
const settled = (entry: ExerciseEntry) => !unsaved(entry) && !entry.busy;

interface RereadOptions {
  /** The pack and the unit shown, once the unit is open. */
  readonly shown: () => { readonly pack: Pack; readonly unit: Unit } | undefined;
  readonly entries: Readonly<Ref<ExerciseEntry[]>>;
  /** Exercise id → done, for every exercise of the pack. */
  readonly done: Map<string, boolean>;
  /** The field being typed in, asked when the read is back. */
  readonly editing: () => EditedField | undefined;
  readonly setAnswer: (entry: ExerciseEntry, item: string, text: string) => void;
  readonly writeUnsaved: () => void;
}

/** Reads the unit again whenever the stored data may have changed, while the screen is open. */
export function useReread({
  shown,
  entries,
  done,
  editing,
  setAnswer,
  writeUnsaved,
}: RereadOptions) {
  /**
   * Reads the unit again, as another tab may have changed it. An exercise is left as it is when
   * what the screen holds is newer than what was read: its answers are not stored yet, an action on
   * it is being written, or one was kept after the read began. In the exercise being typed in, the
   * focused field keeps its text; the rest is read again only when another tab added to its log. A
   * draft whose write failed is written again.
   */
  async function reread() {
    const opened = shown();
    if (opened === undefined) return;
    writeUnsaved();
    const before = entries.value.map((entry) =>
      settled(entry) ? { edits: entry.edits, attempts: entry.attempts } : undefined,
    );
    try {
      const read = await readUnit(await getStore(), opened.pack, opened.unit);
      const edited = editing();
      const kept = new Set<string>();
      read.exercises.forEach((fresh, index) => {
        const entry = entries.value[index];
        const was = before[index];
        if (entry === undefined) return;
        if (
          was === undefined ||
          !settled(entry) ||
          entry.edits !== was.edits ||
          entry.attempts !== was.attempts
        ) {
          kept.add(entry.exercise.id);
          return;
        }
        const typing = edited?.exercise === entry.exercise.id ? edited.item : undefined;
        if (typing !== undefined) {
          // Another tab added to the log, or changed what it derives to.
          const changed =
            fresh.attempts.length !== entry.attempts.length ||
            JSON.stringify(fresh.state) !== JSON.stringify(entry.state);
          if (!changed) {
            kept.add(entry.exercise.id);
            return;
          }
          const text = entry.answers[typing];
          entry.state = fresh.state;
          entry.attempts = fresh.attempts;
          entry.answers = { ...fresh.answers };
          // The text kept in the field is newer than what was read: an edit, saved as a draft.
          if (text !== undefined && text !== fresh.answers[typing]) setAnswer(entry, typing, text);
          else if (text !== undefined) entry.answers[typing] = text;
          return;
        }
        entry.state = fresh.state;
        entry.attempts = fresh.attempts;
        entry.answers = fresh.answers;
      });
      for (const [id, state] of read.states) if (!kept.has(id)) done.set(id, state.done);
    } catch (error) {
      noteStorageFailure(error);
    }
  }

  let rereading = false;
  let rereadAgain = false;

  /**
   * One reread at a time: a reread asked for while one runs is made after it, so that what another
   * tab wrote meanwhile is not read by a reread that the running one makes look stale.
   */
  async function refresh() {
    if (rereading) {
      rereadAgain = true;
      return;
    }
    rereading = true;
    try {
      do {
        rereadAgain = false;
        await reread();
      } while (rereadAgain);
    } finally {
      rereading = false;
    }
  }

  let stopWatching: (() => void) | undefined;
  onMounted(() => {
    stopWatching = onStoredDataChange(() => void refresh());
  });
  onUnmounted(() => stopWatching?.());
}
