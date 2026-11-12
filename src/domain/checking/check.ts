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

/**
 * The longest answer that is read, in UTF-16 code units as typed. A longer one is `bad` without
 * being normalised or compared (CHK-007), so a check stays within the time of CHK-014.
 */
export const MAX_ANSWER_LENGTH = 1000;

const BLANK = /^\s*$/u;

/**
 * Checks an answer against a prepared key. `null` is no verdict: a blank answer to a key that
 * does not accept a blank (CHK-008).
 */
export function checkAnswer(key: Key, answer: string, options: CheckOptions = {}): Verdict | null {
  if (BLANK.test(answer)) return key.acceptsBlank ? "ok" : null;
  if (answer.length > MAX_ANSWER_LENGTH) return "bad";

  const answerReadings = readings(answer);
  if (answerReadings.some(({ text }) => key.readings.has(text))) return "ok";
  if (options.choices !== undefined) return "bad";

  for (const { text, words } of answerReadings) {
    if (text.length < NEAR_MIN_LENGTH) continue;
    const byLength = key.byWordsAndLength.get(words);
    if (byLength === undefined) continue;
    for (let length = text.length - 1; length <= text.length + 1; length += 1) {
      for (const candidate of byLength.get(length) ?? []) {
        if (isOneEditApart(text, candidate)) return "near";
      }
    }
  }
  return "bad";
}
