import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { newAttempt, type Attempt } from "./attempt";
import { checkInput, inputArb, uuidOf } from "./attempts.fixture";
import { compareAttempts, deriveExercise, emptyExerciseState } from "./derive";

const check = (n: number, results: Record<string, "ok" | "near" | "bad">, more = {}) =>
  newAttempt(checkInput(n, results, more));

describe("deriveExercise", () => {
  it("@req DATA-003 an exercise with no attempt is not done and has no verdict", () => {
    expect(deriveExercise([])).toEqual(emptyExerciseState);
  });

  it("@req DATA-003 done stays done: a complete attempt followed by a wrong item", () => {
    const state = deriveExercise([
      check(1, { "1": "ok", "2": "ok" }),
      check(2, { "1": "ok", "2": "bad" }),
    ]);

    expect(state.done).toBe(true);
    expect(state.verdicts).toEqual({ "1": "ok", "2": "bad" });
  });

  it("@req DATA-003 keeps the latest verdict of each item, and items checked only earlier", () => {
    const state = deriveExercise([
      check(1, { "1": "bad", "2": "near", "3": "bad" }),
      check(2, { "1": "ok", "2": "bad" }),
    ]);

    expect(state).toEqual({
      done: false,
      verdicts: { "1": "ok", "2": "bad", "3": "bad" },
      overridden: {},
      revealed: [],
    });
  });

  it("@req DATA-003 records items set by hand and revealed, until a later check of the item", () => {
    const state = deriveExercise([
      check(1, { "1": "near", "2": "bad" }),
      check(
        2,
        { "1": "near", "2": "bad" },
        { action: "override", overridden: { "1": "ok", "2": "ok" }, corrects: uuidOf(1) },
      ),
      check(3, {}, { action: "reveal", revealed: ["3", "2"], complete: false }),
      check(4, { "2": "bad" }),
    ]);

    expect(state).toEqual({
      done: false,
      verdicts: { "1": "ok", "2": "bad" },
      overridden: { "1": "ok" },
      revealed: ["2", "3"],
    });
  });

  it("@req DATA-003 takes the attempts in time order whatever order they come in", () => {
    const first = check(1, { "1": "bad" });
    const second = check(2, { "1": "ok" });

    expect(deriveExercise([second, first]).verdicts).toEqual({ "1": "ok" });
  });

  it("@req DATA-003 a mark as done makes the exercise done", () => {
    const state = deriveExercise([check(1, {}, { action: "mark-done", complete: true })]);
    expect(state.done).toBe(true);
  });

  it("@req DATA-003 the state does not depend on how the same attempts are split between reads", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(inputArb, { selector: (input) => input.id, maxLength: 12 }),
        fc.nat(),
        (inputs, cut) => {
          const attempts = inputs.map(newAttempt).toSorted(compareAttempts);
          const at = attempts.length === 0 ? 0 : cut % (attempts.length + 1);
          const whole = deriveExercise(attempts);
          const split = deriveExercise(attempts.slice(at), deriveExercise(attempts.slice(0, at)));
          expect(split).toEqual(whole);
        },
      ),
    );
  });

  it("@req DATA-003 does not change the state it continues from", () => {
    const earlier = deriveExercise([check(1, { "1": "bad" })]);
    const copy = structuredClone(earlier);
    deriveExercise([check(2, { "1": "ok" }, { revealed: ["1"] })], earlier);
    expect(earlier).toEqual(copy);
  });
});

const at = (time: string, n = 1): Pick<Attempt, "at" | "id"> => ({ at: time, id: uuidOf(n) });

describe("compareAttempts", () => {
  it("@req DATA-003 orders by time, whatever the digits of the second", () => {
    expect(compareAttempts(at("2026-11-13T09:00:00Z"), at("2026-11-13T09:00:00.5Z"))).toBe(-1);
    expect(compareAttempts(at("2026-11-13T09:00:00.5Z"), at("2026-11-13T09:00:00.500Z"))).toBe(0);
    expect(compareAttempts(at("2026-11-13T09:00:01Z"), at("2026-11-13T09:00:00.999Z"))).toBe(1);
  });

  it("@req DATA-003 orders attempts of the same millisecond by id", () => {
    expect(compareAttempts(at("2026-11-13T09:00:00Z", 1), at("2026-11-13T09:00:00.000Z", 2))).toBe(
      -1,
    );
    expect(compareAttempts(at("2026-11-13T09:00:00Z", 2), at("2026-11-13T09:00:00Z", 1))).toBe(1);
    expect(compareAttempts(at("2026-11-13T09:00:00Z", 3), at("2026-11-13T09:00:00Z", 3))).toBe(0);
  });
});
