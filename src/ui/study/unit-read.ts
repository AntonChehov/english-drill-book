// Reading a unit from the store: the pack and the unit an address names, the topic they belong to,
// and the states, attempts and drafts of its exercises. Plain functions over the store, no Vue.

import type { Exercise, Pack, Unit } from "../../domain/packs/types";
import { validatePack } from "../../domain/packs/validate";
import { demoProgram, topicStep, type TopicStep } from "../../domain/programs";
import { deriveExercise, type Attempt, type ExerciseState } from "../../domain/progress";
import {
  initialAnswers,
  prepareKeys,
  progressOf,
  type Keys,
  type Progress,
} from "../../domain/study";
import type { Store } from "../../storage/db";

/** An exercise of the unit as Study holds it. */
export interface ExerciseEntry {
  readonly exercise: Exercise;
  /** The prepared keys; none for an exercise shown as open. */
  readonly keys: Keys | undefined;
  state: ExerciseState;
  attempts: Attempt[];
  /** The answers in the fields; text and open exercises use `text`. */
  answers: Record<string, string>;
  /** The result of an action could not be kept: what to say, and how to repeat it. */
  failure: { readonly message: string; readonly retry: () => void } | null;
  /** A quiet word next to Проверить, such as that there is nothing to check. */
  notice: string | null;
  /** An action is being written. */
  busy: boolean;
  /** How many edits the fields have had: a reload does not overwrite newer edits. */
  edits: number;
  /** The value of `edits` the stored draft holds: answers not stored are never read over. */
  stored: number;
}

export interface UnitLink {
  readonly id: string;
  readonly title: string;
  readonly progress: Progress;
}

/** The topic a unit belongs to, with the links of its two steps and the course unit. */
export interface TopicOfUnit {
  readonly title: string;
  readonly step: TopicStep["step"];
  readonly courseLink: string;
  readonly drillsLink: string;
  readonly course: { readonly pack: Pack; readonly unit: Unit };
}

/** A unit the store holds, read for the screen. */
interface OpenedUnit {
  readonly pack: Pack;
  readonly unit: Unit;
  readonly topic: TopicOfUnit | undefined;
  /** Exercise id and state, for every exercise of the pack. */
  readonly states: readonly (readonly [string, ExerciseState])[];
  readonly entries: ExerciseEntry[];
}

/** Why a unit cannot be opened: no pack of that id is stored, or the pack has no such unit. */
type MissingUnit = { readonly missing: "pack" | "unit" };

const idOf = (value: unknown): unknown =>
  typeof value === "object" && value !== null && "id" in value ? value.id : undefined;

/**
 * The topic of `shown` in the demo program, when both of its books are stored and valid and hold
 * its course unit and its first supplement; else none.
 */
function topicOf(packs: readonly unknown[], from: Pack, shown: Unit): TopicOfUnit | undefined {
  const found = topicStep(
    demoProgram.topics,
    from.id,
    shown.id,
    shown.exercises.map((exercise) => exercise.id),
  );
  if (found === undefined) return;
  const { topic, step } = found;
  const first = topic.supplements[0]!;
  const packOf = (id: string) => {
    if (id === from.id) return from;
    const stored = packs.find((value) => idOf(value) === id);
    const validation = stored === undefined ? undefined : validatePack(stored);
    return validation?.ok ? validation.pack : undefined;
  };
  const coursePack = packOf(topic.lead.pack);
  const course = coursePack?.units.find(({ id }) => id === topic.lead.unit);
  const drills = packOf(first.pack)?.units.find(({ exercises }) =>
    exercises.some(({ id }) => id === first.exercise),
  );
  if (coursePack === undefined || course === undefined || drills === undefined) return;
  return {
    title: topic.title,
    step,
    courseLink: `/study/${coursePack.id}/${course.id}`,
    drillsLink: `/study/${first.pack}/${drills.id}?ex=${first.exercise}`,
    course: { pack: coursePack, unit: course },
  };
}

/** The states of every exercise of the pack, and what the store holds for the exercises of `shown`. */
export async function readUnit(store: Store, from: Pack, shown: Unit) {
  const ids = from.units.flatMap((each) => each.exercises.map((exercise) => exercise.id));
  const read = await store.getExerciseStates(from.id, ids);
  const stateOf = new Map(ids.map((id, index) => [id, read[index]!] as const));
  const exercises = await Promise.all(
    shown.exercises.map(async (exercise) => {
      const [attempts, draft] = await Promise.all([
        store.getAttempts(from.id, exercise.id),
        store.getDraft(from.id, exercise.id),
      ]);
      // Derived from the log just read, not taken from the cache read before it: a check that
      // another tab writes between the two reads would give a new log with an old state.
      const state = attempts.length === 0 ? stateOf.get(exercise.id)! : deriveExercise(attempts);
      stateOf.set(exercise.id, state);
      return {
        exercise,
        state,
        attempts,
        answers: initialAnswers(state, attempts, draft?.answers),
      };
    }),
  );
  return { states: [...stateOf], exercises };
}

/** Reads the unit `unitId` of the pack `packId`, or says why it cannot be opened. */
export async function openUnit(
  store: Store,
  packId: string,
  unitId: string,
): Promise<OpenedUnit | MissingUnit> {
  const packs = await store.getPacks();
  const found = packs.find((value) => idOf(value) === packId);
  if (found === undefined) return { missing: "pack" };
  const validation = validatePack(found);
  const shown = validation.ok ? validation.pack.units.find(({ id }) => id === unitId) : undefined;
  if (!validation.ok || shown === undefined) return { missing: "unit" };
  const read = await readUnit(store, validation.pack, shown);
  return {
    pack: validation.pack,
    unit: shown,
    topic: topicOf(packs, validation.pack, shown),
    states: read.states,
    entries: read.exercises.map(({ exercise, state, attempts, answers }) => ({
      exercise,
      keys: exercise.type === "items" ? prepareKeys(exercise) : undefined,
      state,
      attempts,
      answers,
      failure: null,
      notice: null,
      busy: false,
      edits: 0,
      stored: 0,
    })),
  };
}

/** The units of `pack` with how many of their exercises are done. */
export function unitLinks(pack: Pack | undefined, isDone: (exercise: string) => boolean) {
  return (pack?.units ?? []).map((each): UnitLink => ({
    id: each.id,
    title: each.title,
    progress: progressOf(
      each.exercises.map((exercise) => exercise.id),
      isDone,
    ),
  }));
}
