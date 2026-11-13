// The progress log and what is derived from it (capability `progress-data`): pure functions.

export {
  AttemptError,
  MAX_ANSWER_CHARACTERS,
  newAttempt,
  type Attempt,
  type AttemptAction,
  type AttemptInput,
  type OverrideVerdict,
} from "./attempt";
export {
  compareAttempts,
  DERIVATION,
  deriveExercise,
  emptyExerciseState,
  type CheckState,
  type ExerciseState,
  type ItemState,
} from "./derive";
