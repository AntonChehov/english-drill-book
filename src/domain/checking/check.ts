// The verdict on an answer (CHK-005 – CHK-009; design D5).

import { isOneEditApart } from "./distance";
import type { Key } from "./key";
import { readings, wordsOf } from "./normalise";

export type Verdict = "ok" | "near" | "bad";

export interface CheckOptions {
  /** The options of an item with choices: then `near` does not apply (CHK-009). */
  readonly choices?: readonly string[];
}

/** The shortest reading of an answer that can be `near` (CHK-006). */
export const NEAR_MIN_LENGTH = 4;

/** The shortest word of the key a slip inside which is `near`: shorter ones are grammar (CHK-006). */
export const NEAR_MIN_WORD_LENGTH = 4;

/** Endings of English verbs and nouns: a word differing only in one of them is grammar (CHK-006). */
const ENDINGS = ["", "s", "es", "d", "ed"] as const;

/** Whether `a` and `b` are one stem with two different endings of `ENDINGS`. */
function differInEnding(a: string, b: string): boolean {
  return ENDINGS.some(
    (own) =>
      a.endsWith(own) &&
      ENDINGS.some((other) => other !== own && b === a.slice(0, a.length - own.length) + other),
  );
}

/** The ways a word ending in `'s` or `'d` is read: as written, or as two words (CHK-003). */
function wordReadings(word: string): readonly (readonly string[])[] {
  const base = word.slice(0, -2);
  if (word.endsWith("'s")) return [[word], [base, "is"], [base, "has"]];
  if (word.endsWith("'d"))
    return [
      [base, "would"],
      [base, "had"],
    ];
  return [[word]];
}

/** The words of `text`, a reading of the answer whose words are `words`; none if it is not one. */
function alignWords(
  words: readonly string[],
  text: string,
  from = 0,
  at = 0,
): string[] | undefined {
  if (from === words.length) return at === text.length ? [] : undefined;
  for (const reading of wordReadings(words[from]!)) {
    const joined = reading.join("");
    if (!text.startsWith(joined, at)) continue;
    const rest = alignWords(words, text, from + 1, at + joined.length);
    if (rest !== undefined) return [...reading, ...rest];
  }
  return undefined;
}

/**
 * Whether a reading `text` of `answer`, one edit from `candidate` with as many words, is a slip of
 * the pen (CHK-006; design D1–D3 of `near-grammar`): the edit falls inside a word of the key that
 * is long enough, and is not the difference of an ending. An edit where two words meet could
 * belong to either: it is a slip only if it is one for both.
 */
function isSlip(answer: string, text: string, candidate: string): boolean {
  const words = alignWords(wordsOf(answer), text);
  // Not reached: every reading is the answer's words with `'s` and `'d` read one of their ways.
  if (words === undefined) return true;
  let at = 0;
  while (at < text.length && text[at] === candidate[at]) at += 1;
  const longer = candidate.length - text.length;
  let start = 0;
  const changed: { start: number; end: number }[] = [];
  for (const word of words) {
    const end = start + word.length;
    // An inserted character where two words meet, or after the last, may belong to the one before.
    if ((at >= start && at < end) || (longer === 1 && at === end)) changed.push({ start, end });
    start = end;
  }
  return changed.every(({ start: from, end }) => {
    const keyWord = candidate.slice(from, end + longer);
    return (
      keyWord.length >= NEAR_MIN_WORD_LENGTH && !differInEnding(keyWord, text.slice(from, end))
    );
  });
}

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
        if (isOneEditApart(text, candidate) && isSlip(answer, text, candidate)) return "near";
      }
    }
  }
  return "bad";
}
