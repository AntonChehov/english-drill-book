// Generators and builders of attempts for tests; the answers are invented.

import * as fc from "fast-check";
import type { Verdict } from "../checking";
import type { AttemptAction, AttemptInput, OverrideVerdict } from "./attempt";

export const pack = { id: "demo-drills", version: "1.0.0" } as const;

/** A UUID in lower case built from a number, for attempts written by hand. */
export function uuidOf(n: number): string {
  const hex = n.toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${hex}`;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** The time `seconds` after a fixed moment, as the export format writes it. */
export function instantOf(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `2026-11-13T${pad(9 + Math.floor(minutes / 60))}:${pad(minutes % 60)}:${pad(seconds % 60)}.000Z`;
}

/** An input for `newAttempt` of a check, with the given results and options. */
export function checkInput(
  n: number,
  results: Record<string, Verdict>,
  more: Partial<AttemptInput> = {},
): AttemptInput {
  return {
    id: uuidOf(n),
    at: instantOf(n),
    pack,
    exercise: "2.1",
    action: "check",
    answers: Object.fromEntries(Object.keys(results).map((item) => [item, `answer ${item}`])),
    results,
    complete: Object.values(results).every((verdict) => verdict === "ok"),
    ...more,
  };
}

const hex = (length: number) =>
  fc.string({ unit: fc.constantFrom(..."0123456789abcdef"), minLength: length, maxLength: length });

export const uuidArb = fc
  .tuple(hex(8), hex(4), hex(4), hex(4), hex(12))
  .map((parts) => parts.join("-"));

const two = (max: number) => fc.integer({ min: 0, max }).map((n) => String(n).padStart(2, "0"));

export const instantArb = fc
  .tuple(
    fc.integer({ min: 2026, max: 2030 }),
    two(12),
    two(28),
    two(23),
    two(59),
    two(59),
    fc.constantFrom("", ".5", ".25", ".125"),
  )
  .map(([year, month, day, hour, minute, second, fraction]) => {
    return `${year}-${month}-${day}T${hour}:${minute}:${second}${fraction}Z`;
  });

const itemArb = fc.constantFrom("1", "2", "3", "4", "text");
const verdictArb = fc.constantFrom<Verdict>("ok", "near", "bad");
const overrideArb = fc.constantFrom<OverrideVerdict>("ok", "bad");
const actionArb = fc.constantFrom<AttemptAction>(
  "check",
  "override",
  "reveal",
  "mark-done",
  "dismiss-mistake",
);

/**
 * Any input `newAttempt` accepts, for one exercise of one pack: an override names a check (here
 * any UUID) and carries its verdicts set by hand; no other action carries either.
 */
export const inputArb: fc.Arbitrary<AttemptInput> = fc
  .record({
    id: uuidArb,
    at: instantArb,
    pack: fc.constant(pack),
    exercise: fc.constant("2.1"),
    action: actionArb,
    answers: fc.dictionary(itemArb, fc.string({ maxLength: 40 })),
    results: fc.dictionary(itemArb, verdictArb),
    overridden: fc.dictionary(itemArb, overrideArb),
    corrects: uuidArb,
    revealed: fc.option(fc.array(itemArb, { maxLength: 4 }), { nil: undefined }),
    complete: fc.boolean(),
  })
  .map(({ overridden, corrects, revealed, ...input }) => ({
    ...input,
    ...(input.action === "override" && { overridden, corrects }),
    ...(revealed !== undefined && { revealed }),
  }));

/**
 * A log of one exercise: generated attempts whose overrides correct, by `pick`, one of the
 * checks of the log, or now and then a check that is not in it.
 */
export const logArb: fc.Arbitrary<AttemptInput[]> = fc
  .tuple(
    fc.uniqueArray(inputArb, { selector: (input) => input.id, maxLength: 14 }),
    fc.array(fc.nat(), { minLength: 14, maxLength: 14 }),
  )
  .map(([inputs, picks]) => {
    const checks = inputs.filter((input) => input.action === "check").map((input) => input.id);
    return inputs.map((input, index) => {
      const pick = picks[index] ?? 0;
      if (input.action !== "override" || checks.length === 0 || pick % 5 === 0) return input;
      return { ...input, corrects: checks[pick % checks.length]! };
    });
  });
