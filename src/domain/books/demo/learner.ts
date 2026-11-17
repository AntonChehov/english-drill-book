// What a demo pack says to the learner in the language of the interface (PACK-004; design D2 of
// `russian-demo`): the Russian title and `theory` of each unit and the `help` of each exercise,
// written in the demo sources beside the English of the pages and bundled as learner.json by
// `pnpm demo:build`. The reader finds the English on the pages; the join happens here, after it.

import type { Exercise, Pack, Unit } from "../../packs/types";

export interface LearnerUnit {
  readonly title: string;
  readonly theory: string;
}

export interface LearnerExercise {
  readonly help: string;
}

/** One book's part of learner.json: per unit ID its texts, per exercise ID its help. */
export interface LearnerTexts {
  readonly units: Readonly<Record<string, LearnerUnit>>;
  readonly exercises: Readonly<Record<string, LearnerExercise>>;
}

function withHelp(exercise: Exercise, help: string | undefined): Exercise {
  return help === undefined ? exercise : { ...exercise, help };
}

function withUnitTexts(unit: Unit, learner: LearnerTexts): Unit {
  const texts = learner.units[unit.id];
  return {
    ...unit,
    ...(texts !== undefined && { title: texts.title, theory: texts.theory }),
    exercises: unit.exercises.map((exercise) =>
      withHelp(exercise, learner.exercises[exercise.id]?.help),
    ),
  };
}

/**
 * The pack with the titles replaced and `theory` and `help` added from `learner`, by unit and
 * exercise ID. A unit or exercise `learner` does not name is left as it is.
 */
export function withLearnerTexts(pack: Pack, learner: LearnerTexts): Pack {
  return { ...pack, units: pack.units.map((unit) => withUnitTexts(unit, learner)) };
}
