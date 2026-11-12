import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { isOneEditApart } from "./distance";

/** The plain Levenshtein distance, to compare the shortcut with. */
function levenshtein(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
      current.push(Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, substitution));
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}

describe("isOneEditApart", () => {
  it("@req CHK-006 is true for one character replaced, inserted or removed", () => {
    expect(isOneEditApart("beautiful", "beatiful")).toBe(true);
    expect(isOneEditApart("beatiful", "beautiful")).toBe(true);
    expect(isOneEditApart("cat", "cut")).toBe(true);
    expect(isOneEditApart("cats", "cat")).toBe(true);
    expect(isOneEditApart("cat", "scat")).toBe(true);
    expect(isOneEditApart("", "a")).toBe(true);
  });

  it("@req CHK-006 is false for equal strings", () => {
    expect(isOneEditApart("cat", "cat")).toBe(false);
    expect(isOneEditApart("", "")).toBe(false);
  });

  it("@req CHK-006 is false for two edits or more", () => {
    expect(isOneEditApart("know", "no")).toBe(false);
    expect(isOneEditApart("cat", "dog")).toBe(false);
    expect(isOneEditApart("abc", "bca")).toBe(false);
    expect(isOneEditApart("ab", "ba")).toBe(false);
    expect(isOneEditApart("abcd", "axcy")).toBe(false);
    expect(isOneEditApart("abc", "xabcd")).toBe(false);
  });

  it("@req CHK-006 agrees with the Levenshtein distance being exactly 1", () => {
    const text = fc.string({ unit: fc.constantFrom("a", "b", "c"), maxLength: 7 });
    fc.assert(
      fc.property(text, text, (a, b) => {
        expect(isOneEditApart(a, b)).toBe(levenshtein(a, b) === 1);
      }),
      { numRuns: 2000 },
    );
  });

  it("@req CHK-006 agrees with the distance on long strings that differ late or early", () => {
    const base = fc.string({ unit: fc.constantFrom("a", "b"), minLength: 60, maxLength: 300 });
    const edit = fc.tuple(fc.nat(), fc.constantFrom("a", "b", "c"), fc.nat({ max: 2 }));
    const long = fc.tuple(base, fc.array(edit, { maxLength: 3 })).map(([text, edits]) => {
      let edited = text;
      for (const [at, character, kind] of edits) {
        const index = at % (edited.length + 1);
        const removed = kind === 0 ? 0 : 1;
        edited =
          edited.slice(0, index) + (kind === 1 ? "" : character) + edited.slice(index + removed);
      }
      return [text, edited] as const;
    });
    fc.assert(
      fc.property(long, ([a, b]) => {
        expect(isOneEditApart(a, b)).toBe(levenshtein(a, b) === 1);
        expect(isOneEditApart(b, a)).toBe(levenshtein(a, b) === 1);
      }),
      { numRuns: 300 },
    );
  });

  it("@req CHK-006 agrees with the distance on strings one edit apart", () => {
    const edited = fc
      .tuple(
        fc.string({ unit: fc.constantFrom("a", "b", "c"), maxLength: 8 }),
        fc.nat(),
        fc.constantFrom("a", "b", "c"),
        fc.constantFrom("insert", "remove", "replace"),
      )
      .map(([text, at, character, edit]) => {
        const index = text.length === 0 ? 0 : at % text.length;
        const kept = edit === "insert" ? text.slice(index) : text.slice(index + 1);
        return [text, text.slice(0, index) + (edit === "remove" ? "" : character) + kept] as const;
      });
    fc.assert(
      fc.property(edited, ([a, b]) => {
        expect(isOneEditApart(a, b)).toBe(levenshtein(a, b) === 1);
      }),
    );
  });
});
