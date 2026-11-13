// An attempt of the progress log (DATA-002, decision 0003, design D2 of the change `storage`): the
// attempt of contracts/export.schema.json, so that an export is the log as it is. The id and the
// time are passed in by the caller: the domain has no clock and no randomness (C-08).

import type { Verdict } from "../checking";
import type { Pack } from "../packs/types";

/** What the learner did: the actions of the export format. */
export type AttemptAction = "check" | "override" | "reveal" | "mark-done" | "dismiss-mistake";

/** A verdict the learner sets by hand (PLAY-008). */
export type OverrideVerdict = "ok" | "bad";

/** `$defs.attempt` of contracts/export.schema.json. */
export interface Attempt {
  /** UUID in lower case; the merge key for import and sync. */
  readonly id: string;
  /** UTC, ISO 8601, at most milliseconds: `2026-11-13T09:30:00.000Z`. */
  readonly at: string;
  readonly pack: string;
  readonly packVersion: string;
  readonly exercise: string;
  readonly action: AttemptAction;
  /** Item id → answer as typed; text and open exercises use the single key `text`. */
  readonly answers: Readonly<Record<string, string>>;
  /** Item id → verdict for every checked item. */
  readonly results: Readonly<Record<string, Verdict>>;
  /** Item id → verdict set by hand; present on override attempts. */
  readonly overridden?: Readonly<Record<string, OverrideVerdict>>;
  /** For an override: the id of the check attempt whose verdicts it changes. */
  readonly corrects?: string;
  /** Items whose answer was revealed. */
  readonly revealed?: readonly string[];
  /** True when this attempt makes the exercise done (PLAY-009). */
  readonly complete: boolean;
}

/** What `newAttempt` builds an attempt from. */
export interface AttemptInput {
  readonly id: string;
  readonly at: string;
  readonly pack: Pick<Pack, "id" | "version">;
  readonly exercise: string;
  readonly action: AttemptAction;
  readonly answers: Readonly<Record<string, string>>;
  readonly results: Readonly<Record<string, Verdict>>;
  readonly overridden?: Readonly<Record<string, OverrideVerdict>>;
  readonly corrects?: string;
  readonly revealed?: readonly string[];
  readonly complete: boolean;
}

/** The longest answer the export format keeps. */
export const MAX_ANSWER_CHARACTERS = 10_000;

// The patterns of contracts/export.schema.json, `$defs`.
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const instant = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,3})?Z$/u;
const slug = /^[a-z0-9]+(-[a-z0-9]+)*$/u;
const localId = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const semver = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/u;

const actions: ReadonlySet<string> = new Set<AttemptAction>([
  "check",
  "override",
  "reveal",
  "mark-done",
  "dismiss-mistake",
]);
const verdicts: ReadonlySet<string> = new Set<Verdict>(["ok", "near", "bad"]);
const overrideVerdicts: ReadonlySet<string> = new Set<OverrideVerdict>(["ok", "bad"]);

/** A value that the export format would refuse; nothing was built. */
export class AttemptError extends RangeError {
  constructor(readonly field: string) {
    super(`The attempt's ${field} is not what the export format allows`);
    this.name = "AttemptError";
  }
}

const isLocalId = (value: string) => value.length <= 32 && localId.test(value);
const isSlug = (value: string) => value.length <= 64 && slug.test(value);

function ensure(valid: boolean, field: string): void {
  if (!valid) throw new AttemptError(field);
}

/** A plain copy of a record whose every value passes `valid`. */
function copyRecord<T>(
  record: Readonly<Record<string, T>>,
  valid: (value: T) => boolean,
  field: string,
): Record<string, T> {
  const entries = Object.entries(record);
  ensure(
    entries.every(([, value]) => valid(value)),
    field,
  );
  return Object.fromEntries(entries);
}

/**
 * Builds the attempt the log appends: a fresh copy of what it is given, `revealed` without
 * repeats, optional parts only when given. Throws `AttemptError` naming the first field the
 * export format would refuse, so whatever it returns is valid against the attempt of
 * `contracts/export.schema.json`.
 */
export function newAttempt(input: AttemptInput): Attempt {
  ensure(uuid.test(input.id), "id");
  ensure(instant.test(input.at), "at");
  ensure(isSlug(input.pack.id), "pack");
  ensure(semver.test(input.pack.version), "packVersion");
  ensure(isLocalId(input.exercise), "exercise");
  ensure(actions.has(input.action), "action");
  ensure(typeof input.complete === "boolean", "complete");
  const answers = copyRecord(
    input.answers,
    (answer) => typeof answer === "string" && answer.length <= MAX_ANSWER_CHARACTERS,
    "answers",
  );
  const results = copyRecord(input.results, (verdict) => verdicts.has(verdict), "results");

  const attempt: {
    -readonly [K in keyof Attempt]: Attempt[K];
  } = {
    id: input.id,
    at: input.at,
    pack: input.pack.id,
    packVersion: input.pack.version,
    exercise: input.exercise,
    action: input.action,
    answers,
    results,
    complete: input.complete,
  };
  if (input.overridden !== undefined) {
    attempt.overridden = copyRecord(
      input.overridden,
      (verdict) => overrideVerdicts.has(verdict),
      "overridden",
    );
  }
  if (input.corrects !== undefined) {
    ensure(uuid.test(input.corrects), "corrects");
    attempt.corrects = input.corrects;
  }
  if (input.revealed !== undefined) {
    ensure(input.revealed.every(isLocalId), "revealed");
    attempt.revealed = [...new Set(input.revealed)];
  }
  return attempt;
}
