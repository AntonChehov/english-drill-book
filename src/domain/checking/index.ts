// The answer checker (capability `answer-checking`): pure functions, no dependency on the UI.

export { checkAnswer, NEAR_MIN_LENGTH, type CheckOptions, type Verdict } from "./check";
export { isOneEditApart } from "./distance";
export { compileKey, type CompiledKey, type Key, type PatternError } from "./key";
export { INDEPENDENT_READINGS, readings, type Reading } from "./normalise";
export { expandPattern, MAX_VARIANTS, type Expansion, type PatternErrorReason } from "./pattern";
