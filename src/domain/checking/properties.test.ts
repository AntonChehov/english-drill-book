import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { checkAnswer, compileKey, expandPattern, type Key, type Verdict } from "./index";

// Pieces of invented text, chosen to meet every rule of normalisation.
const PIECES = [
  "cat",
  "Dog",
  "he's",
  "I'd",
  "don't",
  "can't",
  "cannot",
  "won't",
  "Anna's",
  "we've",
  "ёж",
  "Дом",
  "and/or",
  "yes,",
  "well...",
  "?",
  "a",
  "'yes'",
  "'Anna",
  "boys'",
  "'tis",
] as const;

const piece = fc.constantFrom(...PIECES);
const group = fc.oneof(
  piece.map((text) => `(${text})`),
  fc
    .array(fc.oneof(piece, fc.constant("")), { minLength: 1, maxLength: 3 })
    .map((alternatives) => `[${alternatives.join("|")}]`),
);
const word = fc
  .tuple(
    fc.array(fc.oneof({ weight: 3, arbitrary: piece }, { weight: 1, arbitrary: group }), {
      minLength: 1,
      maxLength: 2,
    }),
    fc.constantFrom("", "'", "\u2018"),
  )
  .map(([segments, quote]) => {
    const text = segments.join("");
    // Sometimes in single quotation marks, ASCII or typographic.
    return quote === "" ? text : `${quote}${text}${quote === "'" ? "'" : "\u2019"}`;
  });

/** A valid pattern: words, some joined by a loose alternative. */
const pattern = fc
  .array(fc.tuple(word, fc.boolean()), { minLength: 1, maxLength: 6 })
  .map((words) =>
    words
      .map(([text, slashAfter], index) =>
        slashAfter && index < words.length - 1 ? `${text} /` : text,
      )
      .join(" "),
  )
  .filter((text) => compileKey([text]).ok);

function keyOf(text: string): Key {
  const compiled = compileKey([text]);
  if (!compiled.ok) throw new Error(`invalid key: ${text}`);
  return compiled.key;
}

function variantsOf(text: string): readonly string[] {
  const expansion = expandPattern(text);
  return expansion.ok ? expansion.variants : [];
}

/** A pattern with an answer: one of its variants, that variant with one letter changed, or other text. */
const patternAndAnswer = pattern.chain((text) =>
  fc.tuple(
    fc.constant(text),
    fc.oneof(
      fc.constantFrom(...variantsOf(text)),
      fc
        .tuple(fc.constantFrom(...variantsOf(text)), fc.nat(), fc.constantFrom("x", "о", ""))
        .map(([variant, at, letter]) => {
          const index = variant.length === 0 ? 0 : at % variant.length;
          return variant.slice(0, index) + letter + variant.slice(index + 1);
        }),
      fc.array(piece, { minLength: 1, maxLength: 5 }).map((pieces) => pieces.join(" ")),
    ),
  ),
);

const BLANK = /^\s*$/u;

const VERDICT_KEEPING_CHANGES: readonly [string, (answer: string) => string][] = [
  ["upper case", (answer) => answer.toUpperCase()],
  ["lower case", (answer) => answer.toLowerCase()],
  ["doubled spaces", (answer) => answer.replaceAll(" ", "  ")],
  ["a final full stop", (answer) => `${answer}.`],
  ["a final question mark", (answer) => `${answer}?`],
  ["a final ellipsis", (answer) => `${answer}…`],
  ["typographic apostrophes", (answer) => answer.replaceAll("'", String.fromCodePoint(0x2019))],
];

describe("properties of the checker", () => {
  it("@req CHK-012 every variant of a generated pattern is ok against it", () => {
    fc.assert(
      fc.property(pattern, (text) => {
        const key = keyOf(text);
        for (const variant of variantsOf(text)) {
          expect(checkAnswer(key, variant)).toBe("ok");
        }
      }),
    );
  });

  it("@req CHK-003 case, spaces, final punctuation and apostrophes never change a verdict", () => {
    fc.assert(
      fc.property(patternAndAnswer, ([text, answer]) => {
        fc.pre(!BLANK.test(answer));
        const key = keyOf(text);
        const expected = checkAnswer(key, answer);
        for (const [, change] of VERDICT_KEEPING_CHANGES) {
          expect(checkAnswer(key, change(answer))).toBe(expected);
        }
      }),
    );
  });

  it("@req CHK-013 the same key and answer give the same verdict twice and in any order", () => {
    fc.assert(
      fc.property(fc.array(patternAndAnswer, { minLength: 1, maxLength: 8 }), (pairs) => {
        const checks = pairs.map(([text, answer]) => ({ key: keyOf(text), answer }));
        const first: (Verdict | null)[] = checks.map(({ key, answer }) => checkAnswer(key, answer));
        const reversed = checks.toReversed().map(({ key, answer }) => checkAnswer(key, answer));
        const again = checks.map(({ key, answer }) => checkAnswer(key, answer));
        expect(reversed.toReversed()).toEqual(first);
        expect(again).toEqual(first);
      }),
    );
  });

  it("@req CHK-013 a key prepared twice gives the same verdicts", () => {
    fc.assert(
      fc.property(patternAndAnswer, ([text, answer]) => {
        expect(checkAnswer(keyOf(text), answer)).toBe(checkAnswer(keyOf(text), answer));
      }),
    );
  });

  it("@req CHK-012 a key near the limits accepts its variants, or is refused as too large", () => {
    const alternatives = fc
      .array(fc.constantFrom("a", "b", "c", "d", "e", "f", "g", "h"), {
        minLength: 2,
        maxLength: 8,
      })
      .map((letters) => `[${letters.join("|")}]`);
    const large = fc
      .tuple(
        fc.array(fc.constantFrom("he's", "I'd", "'yes'", "abcdefghij"), { maxLength: 8 }),
        fc.array(alternatives, { minLength: 2, maxLength: 5 }),
      )
      .map(([words, groups]) => [...words, ...groups].join(" "))
      .filter((text) => expandPattern(text).ok);
    fc.assert(
      fc.property(large, (text) => {
        const compiled = compileKey([text]);
        const errors = compiled.ok ? [] : compiled.errors;
        const verdicts = compiled.ok
          ? variantsOf(text).map((variant) => checkAnswer(compiled.key, variant))
          : [];
        expect(errors.filter(({ reason }) => reason !== "key-too-large")).toEqual([]);
        expect(verdicts.filter((verdict) => verdict !== "ok")).toEqual([]);
      }),
      { numRuns: 60 },
    );
  });

  it("@req CHK-002 preparing a key and checking never throw, whatever the strings", () => {
    const text = fc.oneof(
      fc.string({ unit: "binary", maxLength: 30 }),
      fc
        .array(fc.constantFrom("(", ")", "[", "]", "|", " / ", " ", "'s", "'d", "a"), {
          maxLength: 20,
        })
        .map((parts) => parts.join("")),
    );
    fc.assert(
      fc.property(fc.array(text, { maxLength: 4 }), text, (accept, answer) => {
        const compiled = compileKey(accept);
        const verdict = compiled.ok ? checkAnswer(compiled.key, answer) : null;
        expect([null, "ok", "near", "bad"]).toContain(verdict);
      }),
    );
  });
});
