// The verdict on an answer (CHK-005 – CHK-009; design D5).

import { isOneEditApart } from "./distance";
import type { Key } from "./key";
import { readings } from "./normalise";

export type Verdict = "ok" | "near" | "bad";

export interface CheckOptions {
  /** The options of an item with choices: then `near` does not apply (CHK-009). */
  readonly choices?: readonly string[];
}

/** The shortest reading of an answer that can be `near` (CHK-006). */
export const NEAR_MIN_LENGTH = 4;

const BLANK = /^\s*$/u;

/**
 * Checks an answer against a prepared key. `null` is no verdict: a blank answer to a key that
 * does not accept a blank (CHK-008).
 */
export function checkAnswer(key: Key, answer: string, options: CheckOptions = {}): Verdict | null {
  if (BLANK.test(answer)) return key.acceptsBlank ? "ok" : null;

  const answerReadings = readings(answer);
  if (answerReadings.some(({ text }) => key.readings.has(text))) return "ok";
  if (options.choices !== undefined) return "bad";

  for (const { text, words } of answerReadings) {
    if (text.length < NEAR_MIN_LENGTH) continue;
    const byLength = key.byWordsAndLength.get(words);
    if (byLength === undefined) continue;
    for (const length of [text.length - 1, text.length, text.length + 1]) {
      if (byLength.get(length)?.some((candidate) => isOneEditApart(text, candidate))) {
        return "near";
      }
    }
  }
  return "bad";
}
