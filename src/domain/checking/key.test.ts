import { describe, expect, it } from "vitest";
import { compileKey, type Key } from "./key";

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
