// The prepared key of an item (design D4).

import { readings, type Reading } from "./normalise";
import { expandPattern, type PatternErrorReason } from "./pattern";

/** The most readings the patterns of a key may give together, counted as they are produced. */
export const MAX_KEY_READINGS = 4000;

/** The most characters those readings may have together, after normalisation. */
export const MAX_KEY_CHARACTERS = 20_000;

/** The most invalid patterns that are reported; after that many the rest of the key is not read. */
export const MAX_KEY_ERRORS = 20;

export type KeyErrorReason = PatternErrorReason | "key-too-large";

/**
 * Why a key cannot be built (CHK-002): an invalid pattern, with its index in `accept`, or a key
 * too large as a whole, with the index `null`.
 */
export interface KeyError {
  readonly index: number | null;
  readonly reason: KeyErrorReason;
}

/** The readings of every variant of every pattern, prepared once and checked many times. */
export interface Key {
  /** Text of a reading → the numbers of words it has been read with. */
  readonly readings: ReadonlyMap<string, ReadonlySet<number>>;
  /** Number of words → length of the text → the texts, for the search of `near`. */
  readonly byWordsAndLength: ReadonlyMap<number, ReadonlyMap<number, readonly string[]>>;
  /** Some variant reads as empty text, so a blank answer is correct (CHK-001, CHK-008). */
  readonly acceptsBlank: boolean;
}

export type CompiledKey =
  | { readonly ok: true; readonly key: Key }
  | { readonly ok: false; readonly errors: readonly KeyError[] };

/**
 * Prepares the key of `accept`. Readings and their characters are counted across all patterns
 * as they are produced, duplicates included; the moment the key passes a limit, all work stops:
 * later patterns are neither expanded nor reported. Reading also stops after the twentieth
 * invalid pattern. So preparing is bounded: at most 4000 valid and 20 invalid patterns of at
 * most 500 characters are read.
 */
export function compileKey(accept: readonly string[]): CompiledKey {
  const errors: KeyError[] = [];
  const texts = new Map<string, Set<number>>();
  const byWordsAndLength = new Map<number, Map<number, string[]>>();
  // A variant produced again, in the same pattern or another, is read only once.
  const read = new Map<
    string,
    { readonly readings: readonly Reading[]; readonly characters: number }
  >();
  let produced = 0;
  let characters = 0;

  const store = ({ text, words }: Reading): void => {
    const counts = texts.get(text) ?? new Set<number>();
    texts.set(text, counts);
    if (counts.has(words)) return;
    counts.add(words);
    const byLength = byWordsAndLength.get(words) ?? new Map<number, string[]>();
    byWordsAndLength.set(words, byLength);
    const sameLength = byLength.get(text.length) ?? [];
    byLength.set(text.length, sameLength);
    sameLength.push(text);
  };

  for (const [index, pattern] of accept.entries()) {
    const expansion = expandPattern(pattern);
    if (!expansion.ok) {
      errors.push({ index, reason: expansion.error });
      if (errors.length === MAX_KEY_ERRORS) return { ok: false, errors };
      continue;
    }
    for (const [at, variant] of expansion.variants.entries()) {
      const times = expansion.produced[at] ?? 1;
      let found = read.get(variant);
      if (found === undefined) {
        const all = readings(variant);
        found = { readings: all, characters: all.reduce((sum, { text }) => sum + text.length, 0) };
        read.set(variant, found);
      }
      produced += times * found.readings.length;
      characters += times * found.characters;
      if (produced > MAX_KEY_READINGS || characters > MAX_KEY_CHARACTERS) {
        return { ok: false, errors: [...errors, { index: null, reason: "key-too-large" }] };
      }
      // Once a pattern is invalid the key is not built; only its size is still counted.
      if (errors.length === 0) for (const reading of found.readings) store(reading);
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    key: { readings: texts, byWordsAndLength, acceptsBlank: texts.has("") },
  };
}
