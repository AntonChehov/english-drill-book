// The hand-written validator and contracts/pack.schema.json agree (design D6): on every example of
// the contract and on packs with one random defect, a general JSON Schema validator refuses a pack
// exactly when the app's validator reports an error of the schema. The semantic rules of PACK-002
// are beyond any schema, so they are left out of the comparison and tested on their own.
import Ajv2020 from "ajv/dist/2020";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import packSchema from "../../../contracts/pack.schema.json";
import { examples, validPacks } from "./examples.fixture";
import { SEMANTIC_RULES, validatePack } from "./validate";

// strictRequired would refuse the `then` and `else` of the schema; see contract.test.ts.
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
const schemaAccepts = ajv.compile(packSchema);
const semantic: readonly string[] = SEMANTIC_RULES;

/** True when the app's validator finds no error of the schema in `value`. */
function appAccepts(value: unknown): boolean {
  const result = validatePack(value);
  return result.ok || result.errors.every(({ rule }) => semantic.includes(rule));
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Path = (string | number)[];

/** The path of every value inside `value`, the value itself included. */
function paths(value: Json, at: Path = []): Path[] {
  const inside = Array.isArray(value)
    ? value.flatMap((item, index) => paths(item, [...at, index]))
    : value !== null && typeof value === "object"
      ? Object.entries(value).flatMap(([key, item]) => paths(item, [...at, key]))
      : [];
  return [at, ...inside];
}

type Defect =
  { kind: "replace"; value: Json } | { kind: "delete" } | { kind: "add"; key: string; value: Json };

/** A copy of `value` with one defect at `path`; a defect of the root replaces it. */
function withDefect(value: Json, path: Path, defect: Defect): Json {
  const copy = structuredClone(value);
  if (path.length === 0) return defect.kind === "replace" ? defect.value : copy;
  let parent: Json = copy;
  for (const step of path.slice(0, -1)) parent = (parent as Record<string | number, Json>)[step]!;
  const last = path.at(-1)!;
  const container = parent as Record<string | number, Json>;
  if (defect.kind === "replace") container[last] = defect.value;
  else if (defect.kind === "delete" && Array.isArray(parent)) parent.splice(last as number, 1);
  else if (defect.kind === "delete") delete container[last];
  else {
    const target = container[last];
    if (target !== null && typeof target === "object" && !Array.isArray(target)) {
      target[defect.key] = defect.value;
    } else {
      container[last] = defect.value;
    }
  }
  return copy;
}

/** Values near the limits of the schema, which random JSON rarely hits. */
const edgeValue: fc.Arbitrary<Json> = fc.constantFrom<Json>(
  "",
  " ",
  "a",
  "A b",
  "x".repeat(32),
  "x".repeat(33),
  "x".repeat(64),
  "x".repeat(65),
  "x".repeat(200),
  "x".repeat(201),
  "x".repeat(500),
  "x".repeat(501),
  "x".repeat(1000),
  "x".repeat(1001),
  "😀".repeat(200),
  "😀".repeat(201),
  "1.0.0",
  "01.0.0",
  "en",
  "en-GB",
  "EN",
  "pack",
  "items",
  "text",
  "open",
  "book",
  "a".repeat(64).replaceAll("a", "f"),
  "978-0-00-000000-2",
  "she (is late",
  0,
  -1,
  1,
  1.5,
  1799,
  1800,
  2100,
  2101,
  true,
  false,
  null,
  [],
  {},
  ["a", "a"],
  ["a", "b"],
  ["a", "b", "c", "d", "e", "f", "g", "h", "i"],
  [{ document: "book", from: 1, to: 1 }],
);

const json: fc.Arbitrary<Json> = fc.oneof(
  edgeValue,
  fc.jsonValue({ maxDepth: 2 }) as fc.Arbitrary<Json>,
);

const defect: fc.Arbitrary<Defect> = fc.oneof(
  fc.record({ kind: fc.constant("replace" as const), value: json }),
  fc.record({ kind: fc.constant("delete" as const) }),
  fc.record({
    kind: fc.constant("add" as const),
    key: fc.oneof(
      fc.constantFrom("pages", "theory", "license", "source", "prompt", "colour"),
      fc.string(),
    ),
    value: json,
  }),
);

const bases = validPacks.map(([, value]) => value as Json);

const lengths = [0, 1, 32, 33, 64, 65, 200, 201, 500, 501, 1000, 1001, 5000, 5001, 20000, 20001];
const numbers = [-1, 0, 1, 1799, 1800, 2100, 2101, 0.5];

/** A value of the same kind as `value` at each boundary the schema could draw for it. */
function nudges(value: Json): Json[] {
  if (typeof value === "number") return [...numbers, value - 1, value + 1, value + 0.5];
  if (typeof value === "string") {
    const pad = (length: number) => value.padEnd(length, "x").slice(0, length);
    return [...lengths.map(pad), value.toUpperCase(), `${value} `, `-${value}`, `${value}.`];
  }
  if (typeof value === "boolean") return [!value];
  if (Array.isArray(value)) return [[], [...value, ...value], value.slice(1)];
  if (value !== null) return [{}];
  return [];
}

describe("PACK-001 The validator and the schema agree", () => {
  for (const [file, value] of Object.entries(examples).filter(([name]) =>
    name.startsWith("pack."),
  )) {
    it(`@req PACK-001 agree on the contract example ${file}`, () => {
      expect(appAccepts(value)).toBe(schemaAccepts(value));
    });
  }

  it("@req PACK-001 agree when any one value of an example is moved to a boundary", () => {
    let compared = 0;
    for (const base of bases) {
      for (const path of paths(base)) {
        let target: Json = base;
        for (const step of path) target = (target as Record<string | number, Json>)[step]!;
        for (const value of nudges(target)) {
          const changed = withDefect(base, path, { kind: "replace", value });
          const at = { path: path.join("/"), value: JSON.stringify(value).slice(0, 80) };
          expect({ ...at, accepted: appAccepts(changed) }).toEqual({
            ...at,
            accepted: schemaAccepts(changed),
          });
          compared++;
        }
      }
    }
    expect(compared).toBeGreaterThan(1000);
  });

  it("@req PACK-001 agree on packs with one random defect", () => {
    const cases = fc
      .tuple(fc.constantFrom(...bases), fc.nat(), defect)
      .map(([base, index, change]) => {
        const all = paths(base);
        return withDefect(base, all[index % all.length]!, change);
      });
    fc.assert(
      fc.property(cases, (value) => {
        expect(appAccepts(value)).toBe(schemaAccepts(value));
      }),
      { numRuns: 1500 },
    );
  });

  it("@req PACK-001 the defects refuse some packs and keep others", () => {
    const verdicts = fc.sample(
      fc.tuple(fc.constantFrom(...bases), fc.nat(), defect).map(([base, index, change]) => {
        const all = paths(base);
        return schemaAccepts(withDefect(base, all[index % all.length]!, change));
      }),
      300,
    );
    expect(verdicts.filter(Boolean).length).toBeGreaterThan(20);
    expect(verdicts.filter((verdict) => !verdict).length).toBeGreaterThan(100);
  });
});
