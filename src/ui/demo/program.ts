// The demo program over the stored demo books: its progress, today's topic with the
// focus, and the reading of both from the store, shared by Today and Topics.

import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import {
  demoProgram as program,
  todayTopic,
  topicProgress,
  type Topic,
} from "../../domain/programs";
import type { TopicProgress } from "../../domain/programs/progress";
import { getStore, noteStorageFailure, onStoredDataChange } from "../storage";
import { doneExercises, doneKey, readDone } from "./progress";
import { demoState, type DemoBookSummary } from "./state";

/** The stored focus topic; read again whenever the store may have changed. */
const focusTopic = ref<string | undefined>();

async function readFocus(): Promise<void> {
  try {
    focusTopic.value = await (await getStore()).getSetting("focusTopic");
  } catch (error) {
    noteStorageFailure(error);
  }
}

/** Stores `topic` as the focus; rejects with the store's error when it cannot be kept. */
export async function chooseFocus(topic: Topic): Promise<void> {
  await (await getStore()).putSetting("focusTopic", topic.id);
  focusTopic.value = topic.id;
}

/** The stored demo books, while the demo is added. */
export const demoBooks = computed(() =>
  demoState.value.phase === "added" ? demoState.value.books : undefined,
);

/**
 * Reads the done states and the focus while the demo is added: on mount, when the books change
 * and whenever the store may have changed.
 */
export function useStoredProgress(): void {
  function read() {
    if (demoBooks.value === undefined) return;
    void readDone(demoBooks.value);
    void readFocus();
  }
  watch(demoBooks, read, { immediate: true });
  let stop: (() => void) | undefined;
  onMounted(() => (stop = onStoredDataChange(read)));
  onUnmounted(() => stop?.());
}

export const isDone = (pack: string, exercise: string) =>
  doneExercises.get(doneKey(pack, exercise)) === true;

/** Progress over the demo program for the stored `books`. */
export function useProgram(books: () => readonly DemoBookSummary[]) {
  // The program's packs, units and exercises exist in the stored demo books: CI checks the program
  // against the books' profiles, and the program is shown only while both are stored.
  const bookOf = (pack: string) => books().find((book) => book.id === pack)!;
  const leadUnit = (topic: Topic) =>
    bookOf(topic.lead.pack).units.find((unit) => unit.id === topic.lead.unit)!;
  const unitOf = (pack: string, exercise: string) =>
    bookOf(pack).units.find((unit) => unit.exercises.includes(exercise))!;

  const progress = computed<ReadonlyMap<Topic, TopicProgress>>(
    () =>
      new Map<Topic, TopicProgress>(
        program.topics.map((topic) => [
          topic,
          topicProgress(topic, leadUnit(topic).exercises, isDone, program.rules.supplementMin),
        ]),
      ),
  );
  const passed = (topic: Topic) => progress.value.get(topic)!.passed;
  const today = computed(() => todayTopic(program.topics, passed, focusTopic.value));

  return { program, bookOf, leadUnit, unitOf, progress, passed, today };
}
