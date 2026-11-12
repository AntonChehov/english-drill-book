// The examples of contracts/examples against their schemas, read by a general JSON Schema
// validator (contracts/examples/README.md).
import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import exportSchema from "../../../contracts/export.schema.json";
import packSchema from "../../../contracts/pack.schema.json";
import programSchema from "../../../contracts/program.schema.json";
import { examples, invalidPacks } from "./examples.fixture";
import { SEMANTIC_RULES } from "./validate";

// strictRequired would refuse the `then` and `else` of the pack schema, which require properties
// defined at its top level, not in the branch itself.
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
const schemas: Record<string, ReturnType<typeof ajv.compile>> = {
  pack: ajv.compile(packSchema),
  program: ajv.compile(programSchema),
  export: ajv.compile(exportSchema),
};

const semantic: readonly string[] = SEMANTIC_RULES;

describe("contract examples", () => {
  const valid = Object.entries(examples).filter(([file]) => file.endsWith(".valid.json"));

  it("has valid examples of every schema and an invalid pack example for every rule", () => {
    expect(new Set(valid.map(([file]) => file.split(".")[0]))).toEqual(
      new Set(["pack", "program", "export"]),
    );
    expect(new Set(invalidPacks.map(({ rule }) => rule))).toEqual(
      new Set([
        ...SEMANTIC_RULES,
        "type",
        "const",
        "required",
        "additionalProperties",
        "pattern",
        "minLength",
        "maxLength",
        "minItems",
        "maxItems",
        "uniqueItems",
        "minimum",
        "maximum",
        "oneOf",
      ]),
    );
  });

  for (const [file, value] of valid) {
    it(`${file} validates against the schema of its kind`, () => {
      const kind = (value as { kind: string }).kind;
      const validate = schemas[kind]!;
      validate(value);
      expect(validate.errors ?? []).toEqual([]);
    });
  }

  for (const { name, pack, rule } of invalidPacks.filter((example) =>
    semantic.includes(example.rule),
  )) {
    it(`${name}.invalid.json breaks only the semantic rule ${rule}, which the schema cannot state`, () => {
      expect(schemas["pack"]!(pack)).toBe(true);
    });
  }

  for (const { name, pack, rule } of invalidPacks.filter(
    (example) => !semantic.includes(example.rule),
  )) {
    it(`${name}.invalid.json is refused by the schema for ${rule}`, () => {
      const validate = schemas["pack"]!;
      expect(validate(pack)).toBe(false);
      expect(validate.errors?.map((error) => error.keyword)).toContain(rule);
    });
  }

  it("lets an original pack name the documents it was read from (design D7)", () => {
    expect(schemas["pack"]!(examples["pack.documents.valid.json"])).toBe(true);
  });
});
