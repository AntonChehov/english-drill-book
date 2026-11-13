import Ajv2020 from "ajv/dist/2020";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import exportSchema from "../../../contracts/export.schema.json";
import { AttemptError, newAttempt, type AttemptInput } from "./attempt";
import { checkInput, inputArb, pack, uuidOf } from "./attempts.fixture";

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
ajv.addSchema(exportSchema);
const validAttempt = ajv.getSchema(`${exportSchema.$id}#/$defs/attempt`)!;

/** The errors of the general validator for `value`; none when it is a valid attempt. */
function errorsOf(value: unknown) {
  return validAttempt(value) ? [] : validAttempt.errors;
}

describe("newAttempt", () => {
  it("@req DATA-002 builds a check attempt that is valid against the attempt of export.schema.json", () => {
    const attempt = newAttempt(checkInput(1, { "1": "ok", "2": "near" }));

    expect(errorsOf(attempt)).toEqual([]);
    expect(attempt).toEqual({
      id: uuidOf(1),
      at: "2026-11-13T09:00:01.000Z",
      pack: "demo-drills",
      packVersion: "1.0.0",
      exercise: "2.1",
      action: "check",
      answers: { "1": "answer 1", "2": "answer 2" },
      results: { "1": "ok", "2": "near" },
      complete: false,
    });
  });

  it("@req DATA-002 builds every action with its optional parts valid against the export format", () => {
    const override = newAttempt(
      checkInput(
        2,
        { "1": "ok" },
        { action: "override", overridden: { "2": "ok" }, corrects: uuidOf(1) },
      ),
    );
    const reveal = newAttempt(
      checkInput(3, {}, { action: "reveal", revealed: ["3", "3", "1"], complete: false }),
    );
    const text = newAttempt(
      checkInput(4, {}, { action: "mark-done", answers: { text: "A text of my own." } }),
    );
    const dismiss = newAttempt(checkInput(5, {}, { action: "dismiss-mistake", complete: false }));

    for (const attempt of [override, reveal, text, dismiss]) expect(errorsOf(attempt)).toEqual([]);
    expect(override.overridden).toEqual({ "2": "ok" });
    expect(override.corrects).toBe(uuidOf(1));
    expect(reveal.revealed).toEqual(["3", "1"]);
    expect(text.answers).toEqual({ text: "A text of my own." });
    expect(dismiss).not.toHaveProperty("revealed");
    expect(dismiss).not.toHaveProperty("overridden");
    expect(dismiss).not.toHaveProperty("corrects");
  });

  it("@req DATA-002 any attempt it builds from generated input is valid against the export format", () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        expect(errorsOf(newAttempt(input))).toEqual([]);
      }),
    );
  });

  it("@req DATA-002 copies what it is given, so a later change of the input does not reach the log", () => {
    const answers: Record<string, string> = { "1": "is" };
    const results: Record<string, "ok" | "bad"> = { "1": "ok" };
    const revealed = ["1"];
    const attempt = newAttempt(checkInput(6, results, { answers, revealed }));

    answers["1"] = "are";
    results["1"] = "bad";
    revealed.push("2");

    expect(attempt.answers).toEqual({ "1": "is" });
    expect(attempt.results).toEqual({ "1": "ok" });
    expect(attempt.revealed).toEqual(["1"]);
  });

  it.each<[string, Partial<AttemptInput>]>([
    ["id", { id: "not-a-uuid" }],
    ["id", { id: uuidOf(0xabc).toUpperCase() }],
    ["at", { at: "2026-11-13 09:00:00" }],
    ["at", { at: "2026-11-13T09:00:00.0001Z" }],
    ["pack", { pack: { ...pack, id: "Demo Drills" } }],
    ["pack", { pack: { ...pack, id: "a".repeat(65) } }],
    ["packVersion", { pack: { ...pack, version: "1.0" } }],
    ["exercise", { exercise: ".1" }],
    ["exercise", { exercise: "1".repeat(33) }],
    ["action", { action: "erase" as AttemptInput["action"] }],
    ["complete", { complete: "yes" as unknown as boolean }],
    ["answers", { answers: { "1": "a".repeat(10_001) } }],
    ["answers", { answers: { "1": 1 as unknown as string } }],
    ["results", { results: { "1": "fine" as "ok" } }],
    [
      "overridden",
      { action: "override", overridden: { "1": "near" as "ok" }, corrects: uuidOf(1) },
    ],
    ["corrects", { action: "override", overridden: { "1": "ok" }, corrects: "check-1" }],
    ["revealed", { revealed: ["two words"] }],
  ])("@req DATA-002 refuses a value of `%s` the export format would refuse", (field, change) => {
    const input = { ...checkInput(7, { "1": "ok" }), ...change };
    expect(() => newAttempt(input)).toThrow(new AttemptError(field));
    // The general validator agrees that such an attempt would be refused.
    const raw = {
      ...input,
      pack: input.pack.id,
      packVersion: input.pack.version,
    };
    expect(validAttempt(raw)).toBe(false);
  });

  it.each<[string, Partial<AttemptInput>]>([
    ["corrects", { action: "override", overridden: { "1": "ok" } }],
    ["overridden", { action: "override", corrects: uuidOf(1) }],
    ["overridden", { action: "check", overridden: { "1": "ok" } }],
    ["corrects", { action: "reveal", corrects: uuidOf(1) }],
  ])(
    "@req DATA-002 refuses what the app never writes though the format allows it: `%s` missing on an override or present on another action",
    (field, change) => {
      expect(() => newAttempt({ ...checkInput(8, { "1": "ok" }), ...change })).toThrow(
        new AttemptError(field),
      );
    },
  );
});
