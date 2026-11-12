import { describe, expect, it } from "vitest";
import { invalidPacks, validPacks } from "./examples.fixture";
import { MAX_ERRORS, validatePack, type PackError } from "./validate";

interface ItemSpec {
  id: string;
  accept: string[];
  choices?: string[];
}

const items = (...specs: ItemSpec[]) => specs;
const exercise = (id: string, list: ItemSpec[]) => ({
  id,
  type: "items",
  task: "Answer.",
  items: list,
});
const unit = (id: string, exercises: unknown[]) => ({ id, title: `Unit ${id}`, exercises });

/** A small valid pack with the given units. */
function pack(units: unknown[]): Record<string, unknown> {
  return {
    kind: "pack",
    schemaVersion: 1,
    id: "test-pack",
    version: "1.0.0",
    title: "Test pack",
    language: "en",
    original: true,
    license: "CC-BY-4.0",
    units,
  };
}

const simple = () =>
  pack([
    unit("1", [exercise("1.1", items({ id: "1", accept: ["is"] }, { id: "2", accept: ["are"] }))]),
    unit("2", [exercise("2.1", items({ id: "1", accept: ["am"] }))]),
  ]);

function errorsOf(value: unknown): readonly PackError[] {
  const result = validatePack(value);
  return result.ok ? [] : result.errors;
}

/** Errors in the order of their paths, for values whose properties are not in schema order. */
const byPath = (errors: readonly PackError[]) =>
  errors.toSorted((a, b) => a.path.localeCompare(b.path));

describe("PACK-001 Validation of packs", () => {
  for (const [file, value] of validPacks) {
    it(`@req PACK-001 accepts the contract example ${file}`, () => {
      expect(validatePack(value)).toEqual({ ok: true, pack: value });
    });
  }

  it("@req PACK-001 refuses a second unit without a title at /units/1 with the rule required", () => {
    const value = simple();
    delete (value["units"] as Record<string, unknown>[])[1]!["title"];
    expect(errorsOf(value)).toEqual([{ path: "/units/1", rule: "required" }]);
  });

  it("@req PACK-001 reports errors in two exercises, each with its own path", () => {
    const value = pack([
      unit("1", [
        exercise("1.1", items({ id: "1", accept: ["is"] })),
        { id: "1.2", type: "items", task: "", items: [{ id: "1", accept: ["are"] }] },
        exercise("1.3", items({ id: "1 ", accept: ["am"] })),
      ]),
    ]);
    expect(errorsOf(value)).toEqual([
      { path: "/units/0/exercises/1/task", rule: "minLength" },
      { path: "/units/0/exercises/2/items/0/id", rule: "pattern" },
    ]);
  });

  for (const { name, pack: value, rule, path } of invalidPacks) {
    it(`@req PACK-001 @req PACK-002 refuses the contract example ${name} with ${rule} at "${path}"`, () => {
      expect(errorsOf(value)).toEqual([{ path, rule }]);
    });
  }

  it("@req PACK-001 refuses what is not an object, at the empty path", () => {
    for (const value of [null, [], "pack", 1, true, undefined]) {
      expect(errorsOf(value)).toEqual([{ path: "", rule: "type" }]);
    }
  });

  it("@req PACK-001 reports every missing property of an object", () => {
    expect(errorsOf({ kind: "pack" })).toEqual(
      Array.from({ length: 7 }, () => ({ path: "", rule: "required" })),
    );
  });

  it("@req PACK-001 escapes ~ and / in the path of a property the schema does not define", () => {
    expect(errorsOf({ ...simple(), "a/b~c": 1 })).toEqual([
      { path: "/a~1b~0c", rule: "additionalProperties" },
    ]);
  });

  it("@req PACK-001 checks the types of numbers, integers, booleans and arrays", () => {
    const value = {
      ...simple(),
      original: "yes",
      units: "none",
      source: { title: "T", edition: "1", year: 2000.5, authors: "A" },
    };
    expect(byPath(errorsOf(value))).toEqual(
      byPath([
        { path: "/original", rule: "type" },
        { path: "/source/year", rule: "type" },
        { path: "/source/authors", rule: "type" },
        { path: "/units", rule: "type" },
      ]),
    );
  });

  it("@req PACK-001 counts the length of a string in characters, not UTF-16 units", () => {
    expect(validatePack({ ...simple(), title: "😀".repeat(200) }).ok).toBe(true);
    expect(errorsOf({ ...simple(), title: "😀".repeat(201) })).toEqual([
      { path: "/title", rule: "maxLength" },
    ]);
  });

  it("@req PACK-001 checks migrations, documents and page references", () => {
    const value: Record<string, unknown> = {
      ...simple(),
      original: false,
      license: undefined,
      source: {
        title: "Book",
        edition: "2",
        isbn: "12",
        documents: [{ role: "book", sha256: "abc", pages: 0 }],
      },
      migrations: [{ fromMajor: -1, exercises: { "1.1": "1 1" }, items: { "1.1": { a: 2 } } }],
    };
    delete value["license"];
    (value["units"] as { pages?: unknown }[])[0]!.pages = [{ document: "book", from: 0, to: 1 }];
    expect(byPath(errorsOf(value))).toEqual(
      byPath([
        { path: "/source/isbn", rule: "pattern" },
        { path: "/source/documents/0/sha256", rule: "pattern" },
        { path: "/source/documents/0/pages", rule: "minimum" },
        { path: "/migrations/0/fromMajor", rule: "minimum" },
        { path: "/migrations/0/exercises/1.1", rule: "pattern" },
        { path: "/migrations/0/items/1.1/a", rule: "type" },
        { path: "/units/0/pages/0/from", rule: "minimum" },
      ]),
    );
  });

  it("@req PACK-001 checks text and open exercises by the rules of their type", () => {
    const value = pack([
      unit("1", [
        { id: "1.1", type: "text", task: "Rewrite.", model: "" },
        { id: "1.2", type: "open", task: "Write.", sample: 3 },
        { id: "1.3", type: "open", task: "Write.", model: "x" },
        "exercise",
      ]),
    ]);
    expect(errorsOf(value)).toEqual([
      { path: "/units/0/exercises/0/model", rule: "minLength" },
      { path: "/units/0/exercises/1/sample", rule: "type" },
      { path: "/units/0/exercises/2/model", rule: "additionalProperties" },
      { path: "/units/0/exercises/3", rule: "oneOf" },
    ]);
  });

  it(`@req PACK-001 stops after ${MAX_ERRORS} errors`, () => {
    const many = Array.from({ length: 150 }, (_, index) => ({ id: `${index} `, accept: ["("] }));
    const errors = errorsOf(pack([unit("1", [exercise("1.1", many)])]));
    expect(errors).toHaveLength(MAX_ERRORS);
    expect(errors.every(({ rule }) => rule === "pattern")).toBe(true);
  });

  it(`@req PACK-001 stops at ${MAX_ERRORS} errors in the semantic rules too`, () => {
    const many = Array.from({ length: 150 }, (_, index) => ({ id: `${index}`, accept: ["("] }));
    const errors = errorsOf(pack([unit("1", [exercise("1.1", many)])]));
    expect(errors).toHaveLength(MAX_ERRORS);
    expect(errors.every(({ rule }) => rule === "invalid-key")).toBe(true);
  });
});

describe("PACK-002 Semantic rules", () => {
  it("@req PACK-002 refuses a second unit of ID 3 at the path of its id with unique-unit-id", () => {
    const value = pack([
      unit("3", [exercise("3.1", items({ id: "1", accept: ["a"] }))]),
      unit("3", [exercise("3.2", items({ id: "1", accept: ["a"] }))]),
    ]);
    expect(errorsOf(value)).toEqual([{ path: "/units/1/id", rule: "unique-unit-id" }]);
  });

  it("@req PACK-002 refuses exercise 1.1 in units 1 and 2 with unique-exercise-id", () => {
    const value = pack([
      unit("1", [exercise("1.1", items({ id: "1", accept: ["a"] }))]),
      unit("2", [exercise("1.1", items({ id: "1", accept: ["a"] }))]),
    ]);
    expect(errorsOf(value)).toEqual([
      { path: "/units/1/exercises/0/id", rule: "unique-exercise-id" },
    ]);
  });

  it("@req PACK-002 accepts item IDs that repeat across exercises", () => {
    const list = items({ id: "1", accept: ["a"] }, { id: "2", accept: ["b"] });
    const value = pack([unit("1", [exercise("1.1", list), exercise("1.2", list)])]);
    expect(validatePack(value).ok).toBe(true);
  });

  it("@req PACK-002 refuses two items of ID 2 in one exercise with unique-item-id", () => {
    const value = pack([
      unit("1", [exercise("1.1", items({ id: "2", accept: ["a"] }, { id: "2", accept: ["b"] }))]),
    ]);
    expect(errorsOf(value)).toEqual([
      { path: "/units/0/exercises/0/items/1/id", rule: "unique-item-id" },
    ]);
  });

  it("@req PACK-002 refuses the pattern `she (is late` at its path with invalid-key", () => {
    const value = pack([
      unit("1", [exercise("1.1", items({ id: "1", accept: ["she is late", "she (is late"] }))]),
    ]);
    expect(errorsOf(value)).toEqual([
      { path: "/units/0/exercises/0/items/0/accept/1", rule: "invalid-key" },
    ]);
  });

  it("@req PACK-002 refuses a key too large as a whole at the path of accept", () => {
    const accept = Array.from({ length: 41 }, (_, index) =>
      `${"w".repeat(495)}${index}`.slice(0, 500),
    );
    const value = pack([unit("1", [exercise("1.1", items({ id: "1", accept }))])]);
    expect(errorsOf(value)).toEqual([
      { path: "/units/0/exercises/0/items/0/accept", rule: "invalid-key" },
    ]);
  });

  it("@req PACK-002 refuses the choices a and an with accept `the` with no-accepted-choice", () => {
    const value = pack([
      unit("1", [exercise("1.1", items({ id: "1", accept: ["the"], choices: ["a", "an"] }))]),
    ]);
    expect(errorsOf(value)).toEqual([
      { path: "/units/0/exercises/0/items/0/choices", rule: "no-accepted-choice" },
    ]);
  });

  it("@req PACK-002 accepts choices of which one is accepted, compared as answers are", () => {
    const value = pack([
      unit("1", [
        exercise("1.1", items({ id: "1", accept: ["is not"], choices: ["isn't", "aren't"] })),
      ]),
    ]);
    expect(validatePack(value).ok).toBe(true);
  });

  it("@req PACK-002 applies the semantic rules to the parts that have their shape", () => {
    const value = pack([
      unit("1", [
        exercise("1.1", items({ id: "1", accept: ["a"] })),
        { id: "1.2", type: "items", task: "T", items: [{ id: 7, accept: ["a", 5] }, "item"] },
        {
          id: "1.3",
          type: "items",
          task: "T",
          items: [{ id: "1", accept: ["a"], choices: [1, 2] }],
        },
        "exercise",
      ]),
      "unit",
      { id: 1, title: "No ID", exercises: "none" },
    ]);
    expect(errorsOf(value).map(({ rule }) => rule)).not.toContain("invalid-key");
    expect(errorsOf(value).map(({ rule }) => rule)).not.toContain("no-accepted-choice");
  });
});
