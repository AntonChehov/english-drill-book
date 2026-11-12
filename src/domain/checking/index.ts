// The answer checker (capability `answer-checking`): pure functions, no dependency on the UI.

export {
  checkAnswer,
  MAX_ANSWER_LENGTH,
  NEAR_MIN_LENGTH,
  type CheckOptions,
  type Verdict,
} from "./check";
export { isOneEditApart } from "./distance";
export {
  compileKey,
  MAX_KEY_CHARACTERS,
  MAX_KEY_ERRORS,
  MAX_KEY_READINGS,
  type CompiledKey,
  type Key,
  type KeyError,
  type KeyErrorReason,
} from "./key";
export { INDEPENDENT_READINGS, readings, type Reading } from "./normalise";
export {
  expandPattern,
  MAX_PATTERN_LENGTH,
  MAX_VARIANTS,
  type Expansion,
  type PatternErrorReason,
} from "./pattern";
