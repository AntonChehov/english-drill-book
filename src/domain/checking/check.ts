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

/**
 * Where the words of `text`, a reading of the answer whose words are `words`, end; none if it is
 * not one. A word ending in `'s` or `'d` is matched as each of its readings in turn.
 */
function wordEnds(words: readonly string[], text: string): number[] | undefined {
  const ends: number[] = [];
  const walk = (from: number, at: number): boolean => {
    if (from === words.length) return at === text.length;
    for (const reading of wordReadings(words[from]!)) {
      const before = ends.length;
      let next = at;
      const fits = reading.every((part) => {
        if (!text.startsWith(part, next)) return false;
        next += part.length;
        ends.push(next);
        return true;
      });
      if (fits && walk(from + 1, next)) return true;
      ends.length = before;
    }
    return false;
  };
  return walk(0, 0) ? ends : undefined;
}

/**
 * Whether `text`, a reading of the answer whose words end at `ends`, one edit from `candidate`
 * with as many words, is a slip of the pen (CHK-006; design D1–D3 of `near-grammar`): the edit
 * falls inside a word of the key that is long enough, and is not the difference of an ending.
 * A letter inserted or removed next to the same letter can be placed at any of them: the edit is
 * a slip only if it is one in every word it could fall in, and where two words meet, in both.
 */
function isSlip(ends: readonly number[], text: string, candidate: string): boolean {
  const longer = candidate.length - text.length;
  let prefix = 0;
  while (prefix < text.length && text[prefix] === candidate[prefix]) prefix += 1;
  let suffix = 0;
  const shortest = Math.min(text.length, candidate.length);
  while (
    suffix < shortest &&
    text[text.length - 1 - suffix] === candidate[candidate.length - 1 - suffix]
  ) {
    suffix += 1;
  }
  // The places of the edit in the answer: a character replaced or removed at `lo` … `hi`, or one
  // inserted before it.
  const hi = prefix;
  const lo =
    longer === 0 ? hi : Math.min(hi, Math.max(0, text.length - suffix + Math.min(longer, 0)));
  let start = 0;
  for (const end of ends) {
    const touched = longer === 1 ? start <= hi && end >= lo : start <= hi && end > lo;
    if (touched) {
      const keyWord = candidate.slice(start, end + longer);
      const slip =
        keyWord.length >= NEAR_MIN_WORD_LENGTH && !differInEnding(keyWord, text.slice(start, end));
      if (!slip) return false;
    }
    if (start > hi) break;
    start = end;
  }
  return true;
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

  // The words of the answer, and where they end in a reading: found once, when first needed.
  let answerWords: string[] | undefined;
  for (const { text, words } of answerReadings) {
    if (text.length < NEAR_MIN_LENGTH) continue;
    const byLength = key.byWordsAndLength.get(words);
    if (byLength === undefined) continue;
    let ends: readonly number[] | null | undefined;
    for (let length = text.length - 1; length <= text.length + 1; length += 1) {
      for (const candidate of byLength.get(length) ?? []) {
        if (!isOneEditApart(text, candidate)) continue;
        answerWords ??= wordsOf(answer);
        // Without words, as for a dot inside a word, the edit cannot be placed: it stays `near`.
        ends ??= wordEnds(answerWords, text) ?? null;
        if (ends === null || isSlip(ends, text, candidate)) return "near";
      }
    }
  }
  return "bad";
}
