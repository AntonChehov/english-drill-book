// Where the focus is on the study screen: the one place that asks the document.

import { TEXT } from "../../domain/study";
import type { EditedField } from "./reread";

/** The element id of the block of exercise `id`, as `ExerciseBlock` sets it. */
const blockIdOf = (id: string) => `ex-${id.replaceAll(".", "-")}`;

/**
 * The field that has the focus, if it is a field of one of `exercises`: its exercise and its item.
 * An element id does not give the exercise id back, so the block is matched to one of them.
 */
export function fieldBeingEdited(exercises: readonly string[]): EditedField | undefined {
  const active = document.activeElement;
  if (!(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)) return;
  const block = active.closest("article[id^='ex-']")?.id;
  const exercise = exercises.find((id) => blockIdOf(id) === block);
  if (block === undefined || exercise === undefined) return;
  // Fields are `<block>-<item>-field`, or `<block>-text` for an open exercise.
  const rest = active.id.slice(block.length + 1);
  return { exercise, item: rest === "text" ? TEXT : rest.replace(/-field$/u, "") };
}
