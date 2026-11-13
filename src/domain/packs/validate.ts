// Validation of packs (PACK-001, PACK-002; design D6 of the change `demo-books`): the rules of
// contracts/pack.schema.json written out by hand, then the semantic rules. A general JSON Schema
// validator would cost about 40 kB gzip; the agreement of the two is tested with one.

import { checkAnswer, compileKey } from "../checking";
import type { Pack } from "./types";

/** Keywords of the schema an error can name. */
export type SchemaRule =
  | "type"
  | "const"
  | "required"
  | "additionalProperties"
  | "pattern"
  | "minLength"
  | "maxLength"
  | "minItems"
  | "maxItems"
  | "uniqueItems"
  | "minimum"
  | "maximum"
  | "oneOf";

export const SEMANTIC_RULES = [
  "unique-unit-id",
  "unique-exercise-id",
  "unique-item-id",
  "invalid-key",
  "no-accepted-choice",
] as const;

export type SemanticRule = (typeof SEMANTIC_RULES)[number];

export interface PackError {
  /** JSON pointer to the value that breaks the rule; for `required`, to the object. */
  readonly path: string;
  readonly rule: SchemaRule | SemanticRule;
}

/** The most errors reported; after that many, validation stops. */
export const MAX_ERRORS = 100;

export type Validation =
  | { readonly ok: true; readonly pack: Pack }
  | { readonly ok: false; readonly errors: readonly PackError[] };

class Errors {
  readonly list: PackError[] = [];

  add(path: string, rule: PackError["rule"]): void {
    if (this.list.length < MAX_ERRORS) this.list.push({ path, rule });
  }

  get full(): boolean {
    return this.list.length >= MAX_ERRORS;
  }
}

type Check = (value: unknown, path: string, errors: Errors) => void;

type JsonObject = { readonly [key: string]: unknown };

const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A JSON pointer token (RFC 6901). */
const token = (key: string | number) => String(key).replaceAll("~", "~0").replaceAll("/", "~1");

/** Length in code points, as JSON Schema counts it. */
const length = (text: string) => [...text].length;

// The checks below follow the keywords of contracts/pack.schema.json one by one.

function string(rules: { minLength?: number; maxLength?: number; pattern?: RegExp } = {}): Check {
  return (value, path, errors) => {
    if (typeof value !== "string") return errors.add(path, "type");
    const characters = length(value);
    if (rules.minLength !== undefined && characters < rules.minLength)
      errors.add(path, "minLength");
    if (rules.maxLength !== undefined && characters > rules.maxLength)
      errors.add(path, "maxLength");
    if (rules.pattern !== undefined && !rules.pattern.test(value)) errors.add(path, "pattern");
  };
}

function integer(rules: { minimum?: number; maximum?: number } = {}): Check {
  return (value, path, errors) => {
    if (typeof value !== "number" || !Number.isInteger(value)) return errors.add(path, "type");
    if (rules.minimum !== undefined && value < rules.minimum) errors.add(path, "minimum");
    if (rules.maximum !== undefined && value > rules.maximum) errors.add(path, "maximum");
  };
}

const boolean: Check = (value, path, errors) => {
  if (typeof value !== "boolean") errors.add(path, "type");
};

function constant(expected: string | number): Check {
  return (value, path, errors) => {
    if (value !== expected) errors.add(path, "const");
  };
}

function array(
  items: Check,
  rules: { minItems?: number; maxItems?: number; uniqueItems?: boolean } = {},
): Check {
  return (value, path, errors) => {
    if (!Array.isArray(value)) return errors.add(path, "type");
    if (rules.minItems !== undefined && value.length < rules.minItems) errors.add(path, "minItems");
    if (rules.maxItems !== undefined && value.length > rules.maxItems) errors.add(path, "maxItems");
    // Used only for arrays of strings, where equality is that of the strings.
    if (rules.uniqueItems && new Set(value).size !== value.length) errors.add(path, "uniqueItems");
    value.forEach((item, index) => {
      if (!errors.full) items(item, `${path}/${index}`, errors);
    });
  };
}

/**
 * An object with `properties`; any other property is checked by `additional`, or refused when
 * `additional` is false.
 */
function object(
  properties: Readonly<Record<string, Check>>,
  required: readonly string[],
  additional: Check | false = false,
): Check {
  return (value, path, errors) => {
    if (!isObject(value)) return errors.add(path, "type");
    for (const name of required) if (!Object.hasOwn(value, name)) errors.add(path, "required");
    for (const [name, property] of Object.entries(value)) {
      if (errors.full) return;
      const check = Object.hasOwn(properties, name) ? properties[name] : additional;
      if (check === false || check === undefined)
        errors.add(`${path}/${token(name)}`, "additionalProperties");
      else check(property, `${path}/${token(name)}`, errors);
    }
  };
}

const slug = string({ pattern: /^[a-z0-9]+(-[a-z0-9]+)*$/u, maxLength: 64 });
const localId = string({ pattern: /^[A-Za-z0-9][A-Za-z0-9._-]*$/u, maxLength: 32 });
const semver = string({ pattern: /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/u });
const languageTag = string({ pattern: /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/u });
const line = string({ minLength: 1, maxLength: 200 });
const sha256 = string({ pattern: /^[a-f0-9]{64}$/u });

const documentOf = object({ role: localId, title: line, sha256, pages: integer({ minimum: 1 }) }, [
  "role",
  "sha256",
  "pages",
]);

const source = object(
  {
    title: line,
    authors: array(line),
    publisher: line,
    edition: line,
    year: integer({ minimum: 1800, maximum: 2100 }),
    isbn: string({ pattern: /^[0-9Xx-]{10,17}$/u }),
    documents: array(documentOf),
  },
  ["title", "edition"],
);

const pageRef = object(
  { document: localId, from: integer({ minimum: 1 }), to: integer({ minimum: 1 }) },
  ["document", "from", "to"],
);
const pages = array(pageRef);

const migration = object(
  {
    fromMajor: integer({ minimum: 0 }),
    exercises: object({}, [], localId),
    items: object({}, [], object({}, [], localId)),
  },
  ["fromMajor", "exercises"],
);

const item = object(
  {
    id: localId,
    prompt: string({ maxLength: 1000 }),
    accept: array(string({ maxLength: 500 }), { minItems: 1 }),
    choices: array(string({ minLength: 1, maxLength: 200 }), {
      minItems: 2,
      maxItems: 8,
      uniqueItems: true,
    }),
  },
  ["id", "accept"],
);

const task = string({ minLength: 1, maxLength: 1000 });

const exerciseOfType: Readonly<Record<string, Check>> = {
  items: object(
    { id: localId, type: constant("items"), task, pages, items: array(item, { minItems: 1 }) },
    ["id", "type", "task", "items"],
  ),
  text: object(
    {
      id: localId,
      type: constant("text"),
      task,
      pages,
      prompt: string({ maxLength: 5000 }),
      model: string({ minLength: 1, maxLength: 5000 }),
    },
    ["id", "type", "task", "model"],
  ),
  open: object(
    {
      id: localId,
      type: constant("open"),
      task,
      pages,
      prompt: string({ maxLength: 5000 }),
      sample: string({ maxLength: 5000 }),
    },
    ["id", "type", "task"],
  ),
};

/**
 * `oneOf` of the three kinds of exercise. Each kind requires its own constant `type`, so a value
 * can match only the kind its `type` names: that one is checked, and any other value fails all.
 */
const exercise: Check = (value, path, errors) => {
  const type = isObject(value) ? value["type"] : undefined;
  const check =
    typeof type === "string" && Object.hasOwn(exerciseOfType, type)
      ? exerciseOfType[type]
      : undefined;
  if (check === undefined) errors.add(path, "oneOf");
  else check(value, path, errors);
};

const unit = object(
  {
    id: localId,
    title: line,
    theory: string({ maxLength: 20000 }),
    pages,
    exercises: array(exercise, { minItems: 1 }),
  },
  ["id", "title", "exercises"],
);

const packObject = object(
  {
    kind: constant("pack"),
    schemaVersion: constant(1),
    id: slug,
    version: semver,
    title: line,
    language: languageTag,
    instructionLanguage: languageTag,
    original: boolean,
    license: string({ minLength: 1, maxLength: 64 }),
    source,
    migrations: array(migration),
    units: array(unit, { minItems: 1 }),
  },
  ["kind", "schemaVersion", "id", "version", "title", "language", "original", "units"],
);

/** The schema's `if`/`then`/`else`: an original pack has a licence, any other a source. */
const provenance: Check = (value, path, errors) => {
  if (!isObject(value)) return;
  if (value["original"] === true && !Object.hasOwn(value, "license")) errors.add(path, "required");
  if (value["original"] === false && !Object.hasOwn(value, "source")) errors.add(path, "required");
};

const entries = (value: unknown, key: string): [string, JsonObject][] => {
  if (!isObject(value) || !Array.isArray(value[key])) return [];
  return value[key].flatMap((entry: unknown, index: number): [string, JsonObject][] =>
    isObject(entry) ? [[`/${key}/${index}`, entry]] : [],
  );
};

/** Reports every value of `id` met before, at the path of the later one. */
function unique(found: [string, JsonObject][], rule: SemanticRule, errors: Errors): void {
  const seen = new Set<string>();
  for (const [path, entry] of found) {
    const id = entry["id"];
    if (typeof id !== "string") continue;
    if (seen.has(id)) errors.add(`${path}/id`, rule);
    seen.add(id);
  }
}

/** PACK-002 (2) and (3): the key of an item builds, and accepts one of its choices. */
function checkKey(path: string, entry: JsonObject, errors: Errors): void {
  const accept = entry["accept"];
  if (!Array.isArray(accept) || !accept.every((pattern) => typeof pattern === "string")) return;
  const compiled = compileKey(accept);
  if (!compiled.ok) {
    for (const { index } of compiled.errors) {
      errors.add(index === null ? `${path}/accept` : `${path}/accept/${index}`, "invalid-key");
    }
    return;
  }
  const choices = entry["choices"];
  if (!Array.isArray(choices) || !choices.every((choice) => typeof choice === "string")) return;
  if (!choices.some((choice) => checkAnswer(compiled.key, choice, { choices }) === "ok")) {
    errors.add(`${path}/choices`, "no-accepted-choice");
  }
}

/** The semantic rules of PACK-002, on whatever parts of the value have the shape they need. */
function semantics(value: unknown, errors: Errors): void {
  const units = entries(value, "units");
  unique(units, "unique-unit-id", errors);
  const exercises = units.flatMap(([unitPath, entry]) =>
    entries(entry, "exercises").map(([path, found]): [string, JsonObject] => [
      `${unitPath}${path}`,
      found,
    ]),
  );
  unique(exercises, "unique-exercise-id", errors);
  for (const [exercisePath, entry] of exercises) {
    const found = entries(entry, "items").map(([path, candidate]): [string, JsonObject] => [
      `${exercisePath}${path}`,
      candidate,
    ]);
    unique(found, "unique-item-id", errors);
    for (const [path, candidate] of found) {
      if (errors.full) return;
      checkKey(path, candidate, errors);
    }
  }
}

/**
 * Validates a value as a pack: the schema, then the semantic rules. Every error is reported with
 * the JSON pointer of the value and the rule, up to `MAX_ERRORS`.
 */
export function validatePack(value: unknown): Validation {
  const errors = new Errors();
  packObject(value, "", errors);
  provenance(value, "", errors);
  if (!errors.full) semantics(value, errors);
  if (errors.list.length > 0) return { ok: false, errors: errors.list };
  return { ok: true, pack: value as Pack };
}
