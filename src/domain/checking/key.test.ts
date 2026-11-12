import { describe, expect, it } from "vitest";
import {
  compileKey,
  MAX_KEY_CHARACTERS,
  MAX_KEY_PATTERN_CHARACTERS,
  MAX_KEY_READINGS,
  MAX_KEY_VARIANT_CHARACTERS,
  type Key,
} from "./key";

function keyOf(accept: readonly string[]): Key {
  const compiled = compileKey(accept);
  if (!compiled.ok) throw new Error(`invalid key: ${JSON.stringify(compiled.errors)}`);
  return compiled.key;
}

describe("compileKey", () => {
  it("@req CHK-002 does not build a key with one bad pattern and reports it", () => {
    expect(compileKey(["at home", "in (the house"])).toEqual({
      ok: false,
      errors: [{ index: 1, reason: "unclosed-group" }],
    });
  });

  it("@req CHK-002 reports every bad pattern with its index", () => {
    expect(compileKey(["is) late", "fine", "/ late"])).toEqual({
      ok: false,
      errors: [
        { index: 0, reason: "stray-character" },
        { index: 2, reason: "dangling-slash" },
      ],
    });
  });

  it("@req CHK-002 stops reading after twenty bad patterns", () => {
    const accept = Array.from({ length: 25 }, () => "she (is late");
    expect(compileKey(accept)).toEqual({
      ok: false,
      errors: Array.from({ length: 20 }, (_, index) => ({ index, reason: "unclosed-group" })),
    });
    expect(compileKey([...accept.slice(0, 19), "fine"])).toEqual({
      ok: false,
      errors: Array.from({ length: 19 }, (_, index) => ({ index, reason: "unclosed-group" })),
    });
  });

  describe("@req CHK-002 the size of a key", () => {
    const ten = "[a|b|c|d|e|f|g|h|i|j]";
    const fourThousand = `${ten} ${ten} ${ten} [a|b|c|d]`;

    it("@req CHK-002 accepts a key of exactly 4000 readings", () => {
      expect(MAX_KEY_READINGS).toBe(4000);
      expect(keyOf([fourThousand]).readings.size).toBe(MAX_KEY_READINGS);
    });

    it("@req CHK-002 reports a key of more than 4000 readings", () => {
      expect(compileKey([fourThousand, "one more"])).toEqual({
        ok: false,
        errors: [{ index: null, reason: "key-too-large" }],
      });
      expect(
        compileKey([
          "he's [a|b|c|d|e|f|g|h|i|j] [a|b|c|d|e|f|g|h|i|j] [a|b|c|d|e|f|g|h|i|j] [a|b]",
        ]),
      ).toEqual({
        ok: false,
        errors: [{ index: null, reason: "key-too-large" }],
      });
    });

    it("@req CHK-002 counts readings as they are produced, duplicates included", () => {
      const twice = compileKey([fourThousand, `${ten} ${ten} ${ten} [a|b|c|d]`]);
      expect(twice.ok).toBe(false);
    });

    it("@req CHK-002 refuses patterns of more than 20 000 characters together, unread", () => {
      expect(MAX_KEY_PATTERN_CHARACTERS).toBe(20_000);
      // An emoji is one character of two UTF-16 units, and reads as nothing.
      const forty = Array.from({ length: 40 }, () => "\u{1F600}".repeat(500));
      expect(compileKey(forty).ok).toBe(true);
      expect(compileKey(["she (is late", ...forty, "x"])).toEqual({
        ok: false,
        errors: [{ index: null, reason: "key-too-large" }],
      });
    });

    it("@req CHK-002 refuses variants of more than 100 000 characters together", () => {
      expect(MAX_KEY_VARIANT_CHARACTERS).toBe(100_000);
      // 4000 variants such as `a b c d .................`, of 8 + 17 characters each.
      expect(compileKey([`${fourThousand} ${".".repeat(17)}`]).ok).toBe(true);
      expect(compileKey([`${fourThousand} ${".".repeat(18)}`])).toEqual({
        ok: false,
        errors: [{ index: null, reason: "key-too-large" }],
      });
    });

    it("@req CHK-002 accepts readings of 20 000 characters and reports more", () => {
      expect(MAX_KEY_CHARACTERS).toBe(20_000);
      const forty = Array.from({ length: 40 }, (_, index) => `${index % 10}`.repeat(500));
      expect(compileKey(forty).ok).toBe(true);
      expect(compileKey([...forty, "b"])).toEqual({
        ok: false,
        errors: [{ index: null, reason: "key-too-large" }],
      });
    });

    it("@req CHK-002 stops at a key too large: later patterns are neither read nor reported", () => {
      expect(compileKey(["in (the house", fourThousand, "x", "at) home"])).toEqual({
        ok: false,
        errors: [
          { index: 0, reason: "unclosed-group" },
          { index: null, reason: "key-too-large" },
        ],
      });
    });

    it("@req CHK-002 counts the readings of a variant each time it is produced", () => {
      const twoHundredX = `[${Array.from({ length: 200 }, () => "x").join("|")}]`;
      expect(compileKey(Array.from({ length: 20 }, () => twoHundredX)).ok).toBe(true);
      expect(compileKey(Array.from({ length: 21 }, () => twoHundredX))).toEqual({
        ok: false,
        errors: [{ index: null, reason: "key-too-large" }],
      });
    });

    it("@req CHK-002 counts across patterns, so a later pattern can pass the limit", () => {
      expect(compileKey([fourThousand.replace("[a|b|c|d]", "[a|b|c]"), ten])).toEqual({
        ok: true,
        key: expect.anything(),
      });
      expect(compileKey([fourThousand, ten]).ok).toBe(false);
    });

    it("@req CHK-002 reports the reviewer's key of four 's as too large", () => {
      const pattern = `he's she's it's that's ${ten} ${ten} ${ten} [a|b|c|d]`;
      expect(compileKey([pattern])).toEqual({
        ok: false,
        errors: [{ index: null, reason: "key-too-large" }],
      });
    });
  });

  it("@req CHK-001 holds the readings of every variant of every pattern", () => {
    const key = keyOf(["at home", "he's [in|at] the house"]);
    expect([...key.readings.keys()]).toEqual([
      "athome",
      "heisinthehouse",
      "hehasinthehouse",
      "he'sinthehouse",
      "heisatthehouse",
      "hehasatthehouse",
      "he'satthehouse",
    ]);
    expect(key.readings.get("athome")).toEqual(new Set([2]));
    expect(key.acceptsBlank).toBe(false);
  });

  it("@req CHK-001 keeps every number of words a text is read with", () => {
    const key = keyOf(["a lot", "alot"]);
    expect(key.readings.get("alot")).toEqual(new Set([2, 1]));
    expect(key.byWordsAndLength.get(2)?.get(4)).toEqual(["alot"]);
    expect(key.byWordsAndLength.get(1)?.get(4)).toEqual(["alot"]);
  });

  it("@req CHK-001 indexes each reading once by its words and length", () => {
    const key = keyOf(["cat", "cat.", "dog", "[the|a] mouse"]);
    expect(key.byWordsAndLength.get(1)?.get(3)).toEqual(["cat", "dog"]);
    expect(key.byWordsAndLength.get(2)?.get(8)).toEqual(["themouse"]);
    expect(key.byWordsAndLength.get(2)?.get(6)).toEqual(["amouse"]);
  });

  it("@req CHK-008 accepts a blank when a variant reads as empty text", () => {
    expect(keyOf(["", "the"]).acceptsBlank).toBe(true);
    expect(keyOf(["(the)"]).acceptsBlank).toBe(true);
    expect(keyOf(["the"]).acceptsBlank).toBe(false);
  });

  it("@req CHK-001 builds a key that accepts nothing from an empty list", () => {
    const key = keyOf([]);
    expect(key.readings.size).toBe(0);
    expect(key.acceptsBlank).toBe(false);
  });
});
