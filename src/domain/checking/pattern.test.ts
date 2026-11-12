import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { expandPattern, MAX_PATTERN_LENGTH, MAX_VARIANTS } from "./pattern";

function variantsOf(pattern: string): readonly string[] {
  const expansion = expandPattern(pattern);
  if (!expansion.ok) throw new Error(`${pattern} is invalid: ${expansion.error}`);
  return expansion.variants;
}

function errorOf(pattern: string): string {
  const expansion = expandPattern(pattern);
  if (expansion.ok) throw new Error(`${pattern} is valid`);
  return expansion.error;
}

describe("expandPattern", () => {
  describe("@req CHK-001 pattern syntax", () => {
    it("@req CHK-001 expands optional text with and without it", () => {
      expect(variantsOf("yes, (of course) I can")).toEqual(["yes, of course I can", "yes, I can"]);
    });

    it("@req CHK-001 expands an optional ending inside a word", () => {
      expect(variantsOf("two book(s)")).toEqual(["two books", "two book"]);
    });

    it("@req CHK-001 expands one of several", () => {
      expect(variantsOf("she [is|was] late")).toEqual(["she is late", "she was late"]);
    });

    it("@req CHK-001 expands an empty alternative", () => {
      expect(variantsOf("[the|] sugar")).toEqual(["the sugar", "sugar"]);
    });

    it("@req CHK-001 keeps a slash inside a word as text, in one variant", () => {
      expect(variantsOf("and/or")).toEqual(["and/or"]);
    });

    it("@req CHK-001 tries every split of a loose alternative covering several words", () => {
      const variants = variantsOf("we have / we've got a dog");
      expect(variants).toContain("we have a dog");
      expect(variants).toContain("we've got a dog");
    });

    it("@req CHK-001 tries a loose alternative covering one word", () => {
      const variants = variantsOf("a few / some people came");
      expect(variants).toContain("a few people came");
      expect(variants).toContain("some people came");
    });

    it("@req CHK-001 resolves a chain of loose alternatives from left to right", () => {
      expect(variantsOf("red / green / blue")).toEqual(["red", "blue", "green"]);
    });

    it("@req CHK-001 covers at most four words on each side of a loose alternative", () => {
      const variants = variantsOf("one two three four five / six seven eight nine ten");
      expect(variants).toContain("one six seven eight nine ten");
      expect(variants).toContain("one two three four five ten");
      expect(variants).not.toContain("six seven eight nine ten");
      expect(variants).not.toContain("one two three four five");
    });

    it("@req CHK-001 counts a word with a group as one word of a loose alternative", () => {
      expect(variantsOf("book(s) / [a|the] pen")).toEqual([
        "books pen",
        "book pen",
        "books",
        "book",
        "a pen",
        "the pen",
      ]);
    });

    it("@req CHK-001 reads an empty or blank pattern as the empty variant", () => {
      expect(variantsOf("")).toEqual([""]);
      expect(variantsOf("   ")).toEqual([""]);
    });

    it("@req CHK-001 keeps spaces inside a group and tidies them in the variant", () => {
      expect(variantsOf("a [ very  big |] cat")).toEqual(["a very big cat", "a cat"]);
    });

    it("@req CHK-001 accepts an empty group", () => {
      expect(variantsOf("a [] b ()")).toEqual(["a b"]);
    });

    it("@req CHK-001 removes duplicate variants and keeps their first order", () => {
      expect(variantsOf("[a|a|b]")).toEqual(["a", "b"]);
    });

    it("@req CHK-002 counts how many times each variant was produced", () => {
      expect(expandPattern("[a|a|b] (c)")).toEqual({
        ok: true,
        variants: ["a c", "a", "b c", "b"],
        produced: [2, 2, 1, 1],
      });
    });
  });

  describe("@req CHK-002 invalid patterns", () => {
    it("@req CHK-002 reports a pattern of more than 500 characters without reading it", () => {
      expect(MAX_PATTERN_LENGTH).toBe(500);
      expect(variantsOf("a".repeat(500))).toEqual(["a".repeat(500)]);
      expect(errorOf("a".repeat(501))).toBe("pattern-too-long");
      expect(errorOf(`(${"a".repeat(1000)}`)).toBe("pattern-too-long");
    });

    it("@req CHK-002 counts the length of a pattern in characters, as a pack does", () => {
      const letter = String.fromCodePoint(0x1df00);
      expect(variantsOf(letter.repeat(500))).toHaveLength(1);
      expect(errorOf(letter.repeat(501))).toBe("pattern-too-long");
    });

    it("@req CHK-002 reports an unclosed group", () => {
      expect(errorOf("she (is late")).toBe("unclosed-group");
      expect(errorOf("she [is|was late")).toBe("unclosed-group");
    });

    it("@req CHK-002 reports a nested group", () => {
      expect(errorOf("she [is (not)|was] late")).toBe("nested-group");
      expect(errorOf("she ((not) is) late")).toBe("nested-group");
    });

    it("@req CHK-002 reports a character outside its group", () => {
      for (const pattern of ["is) late", "is] late", "is | was", "(is|was)"]) {
        expect(errorOf(pattern)).toBe("stray-character");
      }
      expect(errorOf("[is)|was]")).toBe("stray-character");
      expect(errorOf("(is]) late")).toBe("stray-character");
    });

    it("@req CHK-002 reports a spaced slash inside a group", () => {
      for (const pattern of ["[a / b|c] d", "[c|a / b] d", "(a / b) d", "[/|c]", "( / )"]) {
        expect(errorOf(pattern)).toBe("stray-character");
      }
    });

    it("@req CHK-002 keeps an unspaced slash inside a group as text", () => {
      expect(variantsOf("[and/or|or] d")).toEqual(["and/or d", "or d"]);
      expect(variantsOf("(a/ b) c")).toEqual(["a/ b c", "c"]);
    });

    it("@req CHK-002 reports a slash with nothing beside it", () => {
      for (const pattern of ["/ late", "late /", "/", "early / / late"]) {
        expect(errorOf(pattern)).toBe("dangling-slash");
      }
    });

    it("@req CHK-002 reports twelve groups of two alternatives, 4096 variants", () => {
      expect(errorOf("(a) (b) (c) (d) (e) (f) (g) (h) (i) (j) (k) (l)")).toBe("too-many-variants");
    });

    it("@req CHK-002 accepts a pattern of exactly 4000 variants", () => {
      const pattern = "[a|b|c|d|e] [f|g|h|i|j] [k|l|m|n|o] (p) (q) (r) (s) (t)";
      expect(variantsOf(pattern)).toHaveLength(MAX_VARIANTS);
    });

    it("@req CHK-002 counts variants before removing duplicates", () => {
      const fourThousandOfOne = "[x|x|x|x|x] [y|y|y|y|y] [z|z|z|z|z] () () () () ()";
      expect(errorOf(`${fourThousandOfOne} ()`)).toBe("too-many-variants");
    });

    it("@req CHK-002 reports too many loose alternatives before expanding them", () => {
      const words = Array.from({ length: 13 }, (_, index) => `w${index}`);
      expect(variantsOf(words.slice(0, 12).join(" / ")).length).toBeGreaterThan(0);
      expect(errorOf(words.join(" / "))).toBe("too-many-variants");
    });

    it("@req CHK-002 counts each candidate of a loose alternative once", () => {
      const variants = variantsOf(
        "(a) (b) (c) (d) (e) (f) (g) one two three four / five six seven eight",
      );
      expect(variants).toHaveLength(128 * 8);
      expect(variantsOf("[a|b] [c|d|e] [f|g|h] [i|j|k|l|m|n|o] w x y z / p q r s")).toHaveLength(
        126 * 8,
      );
    });

    it("@req CHK-002 stops when loose alternatives and groups together pass the limit", () => {
      expect(errorOf("a b c d / e f g h (i) (j) (k) (l) (m) (n) (o) (p) (q) (r)")).toBe(
        "too-many-variants",
      );
    });
  });

  describe("@req CHK-002 never throws", () => {
    const special = fc.constantFrom("(", ")", "[", "]", "|", "/", " ", " / ", "a", "b", "'s");
    const patterns = fc.oneof(
      fc.array(special, { maxLength: 30 }).map((parts) => parts.join("")),
      fc.string({ unit: "binary", maxLength: 40 }),
    );

    it("@req CHK-002 expands any string to an error or to 1 – 4000 variants", () => {
      fc.assert(
        fc.property(patterns, (pattern) => {
          const expansion = expandPattern(pattern);
          const count = expansion.ok ? expansion.variants.length : 1;
          expect(count).toBeGreaterThanOrEqual(1);
          expect(count).toBeLessThanOrEqual(MAX_VARIANTS);
        }),
      );
    });
  });
});
