// The drafts of a unit: the answers typed are written to the store once typing pauses, at once
// when a field is left or the page is hidden, and again after a write failed.

import { onUnmounted, ref, type Ref } from "vue";
import type { Pack } from "../../domain/packs/types";
import { getStore, noteStorageFailure } from "../storage";
import type { ExerciseEntry } from "./unit-read";

/** Drafts are written this long after the last keystroke. */
const DRAFT_DELAY = 400;

/** The answers in the fields of `entry` are newer than its stored draft. */
export const unsaved = (entry: ExerciseEntry) => entry.stored !== entry.edits;

export function useDrafts(
  pack: Readonly<Ref<Pack | undefined>>,
  entries: Readonly<Ref<ExerciseEntry[]>>,
) {
  /** The last write of a draft failed, and no later write of it has succeeded. */
  const draftFailed = ref(false);
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const writing = new Set<string>();
  /** The exercises whose last draft write failed. */
  const failed = new Set<string>();

  async function writeDraft(entry: ExerciseEntry) {
    const id = entry.exercise.id;
    clearTimeout(timers.get(id));
    timers.delete(id);
    if (pack.value === undefined) return;
    writing.add(id);
    const edits = entry.edits;
    try {
      await (
        await getStore()
      ).putDraft({ pack: pack.value.id, exercise: id, answers: { ...entry.answers } });
      entry.stored = edits;
      failed.delete(id);
      draftFailed.value = failed.size > 0;
    } catch (error) {
      noteStorageFailure(error);
      failed.add(id);
      draftFailed.value = true;
    } finally {
      writing.delete(id);
    }
  }

  /** Puts `text` in a field and writes the draft once typing pauses. */
  function setAnswer(entry: ExerciseEntry, item: string, text: string) {
    entry.answers[item] = text;
    entry.edits += 1;
    entry.notice = null;
    clearTimeout(timers.get(entry.exercise.id));
    timers.set(
      entry.exercise.id,
      setTimeout(() => void writeDraft(entry), DRAFT_DELAY),
    );
  }

  /** Writes a waiting draft at once: when a field loses focus or the page is hidden. */
  function flush(entry?: ExerciseEntry) {
    for (const each of entry ? [entry] : entries.value) {
      const id = each.exercise.id;
      if (timers.has(id) || (failed.has(id) && !writing.has(id))) void writeDraft(each);
    }
  }

  /** Writes again every draft not stored that no timer and no write is about to store. */
  function writeUnsaved() {
    for (const entry of entries.value) {
      const id = entry.exercise.id;
      if (unsaved(entry) && !timers.has(id) && !writing.has(id)) void writeDraft(entry);
    }
  }

  onUnmounted(() => flush());

  return { draftFailed, setAnswer, flush, writeUnsaved };
}
