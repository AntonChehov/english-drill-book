// The prepared key of an item (design D4).

import { readings } from "./normalise";
import { expandPattern, type PatternErrorReason } from "./pattern";

/** An invalid pattern of `accept`: its index in the list and why it is invalid (CHK-002). */
export interface PatternError {
  readonly index: number;
  readonly reason: PatternErrorReason;
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
  | { readonly ok: false; readonly errors: readonly PatternError[] };

/** Prepares the key of `accept`. If any pattern is invalid, every invalid one is reported. */
export function compileKey(accept: readonly string[]): CompiledKey {
  const errors: PatternError[] = [];
  const texts = new Map<string, Set<number>>();
  const byWordsAndLength = new Map<number, Map<number, string[]>>();

  for (const [index, pattern] of accept.entries()) {
    const expansion = expandPattern(pattern);
    if (!expansion.ok) {
      errors.push({ index, reason: expansion.error });
      continue;
    }
    for (const variant of expansion.variants) {
      for (const { text, words } of readings(variant)) {
        const counts = texts.get(text) ?? new Set<number>();
        texts.set(text, counts);
        if (counts.has(words)) continue;
        counts.add(words);
        const byLength = byWordsAndLength.get(words) ?? new Map<number, string[]>();
        byWordsAndLength.set(words, byLength);
        const sameLength = byLength.get(text.length) ?? [];
        byLength.set(text.length, sameLength);
        sameLength.push(text);
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    key: { readings: texts, byWordsAndLength, acceptsBlank: texts.has("") },
  };
}
