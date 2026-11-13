import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { newAttempt, type Attempt, type OverrideVerdict } from "./attempt";
import { checkInput, logArb, uuidOf } from "./attempts.fixture";
import { compareAttempts, deriveExercise, emptyExerciseState } from "./derive";

type Results = Record<string, "ok" | "near" | "bad">;

const check = (n: number, results: Results, more = {}) => newAttempt(checkInput(n, results, more));

/** The `n`-th attempt: an override of check `of` with these verdicts set by hand. */
const override = (
  n: number,
  of: number,
  overridden: Record<string, OverrideVerdict>,
  complete: boolean,
  results: Results = {},
) =>
  newAttempt(
    checkInput(n, results, { action: "override", corrects: uuidOf(of), overridden, complete }),
  );

/** What the screens read of a state, without the parts the fold continues from. */
const shown = ({
  done,
  doneAt,
  verdicts,
  overridden,
  revealed,
}: ReturnType<typeof deriveExercise>) => ({
  done,
  doneAt,
  verdicts,
  overridden,
  revealed,
});

const at = (n: number) => checkInput(n, {}).at;

describe("deriveExercise", () => {
  it("@req DATA-003 an exercise with no attempt is not done and has no verdict", () => {
    expect(deriveExercise([])).toEqual(emptyExerciseState);
  });

  it("@req DATA-003 done stays done: a complete check followed by a check with a wrong item", () => {
    const state = deriveExercise([
      check(1, { "1": "ok", "2": "ok" }),
      check(2, { "1": "ok", "2": "bad" }),
    ]);

    expect(state.done).toBe(true);
    expect(state.doneAt).toBe(at(1));
    expect(state.verdicts).toEqual({ "1": "ok", "2": "bad" });
  });

  it("@req DATA-003 keeps the latest verdict of each item, and items checked only earlier", () => {
    const state = deriveExercise([
      check(1, { "1": "bad", "2": "near", "3": "bad" }),
      check(2, { "1": "ok", "2": "bad" }),
    ]);

    expect(shown(state)).toEqual({
      done: false,
      doneAt: undefined,
      verdicts: { "1": "ok", "2": "bad", "3": "bad" },
      overridden: {},
      revealed: [],
    });
  });

  it("@req DATA-003 an override takes the completion back: counting as wrong an item of the completing check", () => {
    // The first failing input of review round 1, F1.
    const state = deriveExercise([
      check(1, { "1": "ok", "2": "ok" }),
      override(2, 1, { "1": "bad" }, false),
    ]);

    expect(shown(state)).toEqual({
      done: false,
      doneAt: undefined,
      verdicts: { "1": "bad", "2": "ok" },
      overridden: { "1": "bad" },
      revealed: [],
    });
  });

  it("@req DATA-003 an undo gives the completion back: the latest override no longer sets the item", () => {
    const state = deriveExercise([
      check(1, { "1": "ok", "2": "ok" }),
      override(2, 1, { "1": "bad" }, false),
      override(3, 1, {}, true),
    ]);

    expect(shown(state)).toEqual({
      done: true,
      doneAt: at(1),
      verdicts: { "1": "ok", "2": "ok" },
      overridden: {},
      revealed: [],
    });
  });

  it("@req DATA-003 counting the last wrong item as correct completes the exercise, at the time of its check", () => {
    const state = deriveExercise([
      check(1, { "1": "ok", "2": "near" }),
      check(2, { "1": "ok", "2": "bad" }),
      override(3, 1, { "2": "ok" }, true),
    ]);

    expect(state.done).toBe(true);
    expect(state.doneAt).toBe(at(1));
    // The later check still says what it said.
    expect(state.verdicts).toEqual({ "1": "ok", "2": "bad" });
    expect(state.overridden).toEqual({});
  });

  it("@req DATA-003 an override of an older check does not change what a later check said", () => {
    // The second failing input of review round 1, F1.
    const state = deriveExercise([
      check(1, { "1": "bad", "2": "bad" }),
      check(2, { "1": "ok", "2": "ok" }),
      override(3, 1, { "1": "ok" }, false, { "1": "bad", "2": "bad" }),
    ]);

    expect(state.verdicts).toEqual({ "1": "ok", "2": "ok" });
    expect(state.overridden).toEqual({});
    expect(state.done).toBe(true);
    expect(state.doneAt).toBe(at(2));
  });

  it("@req DATA-003 an item set by hand is marked for its latest check only", () => {
    const state = deriveExercise([
      check(1, { "1": "near", "2": "bad", "3": "ok" }),
      override(2, 1, { "1": "ok", "2": "ok" }, true),
      check(3, { "2": "bad" }),
    ]);

    expect(state.verdicts).toEqual({ "1": "ok", "2": "bad", "3": "ok" });
    expect(state.overridden).toEqual({ "1": "ok" });
    expect(state.doneAt).toBe(at(1));
  });

  it("@req DATA-003 an override that names no earlier check of the exercise is left out", () => {
    const unknown = check(
      2,
      {},
      { action: "override", corrects: uuidOf(99), overridden: { "1": "ok" }, revealed: ["1"] },
    );
    // Earlier than the check it names, so it corrects nothing.
    const early = override(1, 3, { "1": "ok" }, true);
    const state = deriveExercise([early, check(3, { "1": "bad" }), unknown]);

    expect(shown(state)).toEqual({
      done: false,
      doneAt: undefined,
      verdicts: { "1": "bad" },
      overridden: {},
      revealed: [],
    });
  });

  it("@req DATA-003 the date of the first completing check is kept when a later check completes too", () => {
    const state = deriveExercise([
      check(1, { "1": "ok" }),
      check(2, { "1": "bad" }),
      check(3, { "1": "ok" }),
    ]);
    expect(state.doneAt).toBe(at(1));
  });

  it("@req DATA-003 a mark as done makes the exercise done, at its first time", () => {
    const mark = (n: number) => check(n, {}, { action: "mark-done", complete: true });
    const state = deriveExercise([mark(5), mark(2), check(4, { text: "ok" })]);
    expect(state.done).toBe(true);
    expect(state.doneAt).toBe(at(2));
    expect(deriveExercise([check(1, { "1": "ok" }), mark(3)]).doneAt).toBe(at(1));
  });

  it("@req DATA-003 reveals are kept, and only checks give verdicts", () => {
    const state = deriveExercise([
      check(1, { "1": "near" }),
      check(2, { "2": "bad" }, { action: "reveal", revealed: ["3", "2"], complete: false }),
      check(3, { "1": "bad" }, { action: "dismiss-mistake", complete: false }),
    ]);

    expect(state.verdicts).toEqual({ "1": "near" });
    expect(state.revealed).toEqual(["2", "3"]);
  });

  it("@req DATA-003 item ids that name properties of every object are items like any other", () => {
    const results: Results = Object.fromEntries([
      ["constructor", "near"],
      ["toString", "ok"],
    ]);
    const byHand: Record<string, OverrideVerdict> = Object.fromEntries([["constructor", "ok"]]);
    const state = deriveExercise([check(1, results), override(2, 1, byHand, true)]);
    expect(state.verdicts).toEqual({ constructor: "ok", toString: "ok" });
    expect(state.overridden).toEqual({ constructor: "ok" });
    expect(deriveExercise([override(1, 2, {}, true)]).done).toBe(false);
  });

  it("@req DATA-003 takes the attempts in time order whatever order they come in", () => {
    const first = check(1, { "1": "bad" });
    const second = check(2, { "1": "ok" });

    expect(deriveExercise([second, first]).verdicts).toEqual({ "1": "ok" });
  });

  it("@req DATA-003 the state does not depend on how the same attempts are split between reads", () => {
    fc.assert(
      fc.property(logArb, fc.nat(), (inputs, cut) => {
        const attempts = inputs.map(newAttempt).toSorted(compareAttempts);
        const split = cut % (attempts.length + 1);
        const whole = deriveExercise(attempts);
        const continued = deriveExercise(
          attempts.slice(split),
          deriveExercise(attempts.slice(0, split)),
        );
        expect(continued).toEqual(whole);
      }),
    );
  });

  it("@req DATA-003 does not change the state it continues from", () => {
    const earlier = deriveExercise([check(1, { "1": "bad" })]);
    const copy = structuredClone(earlier);
    deriveExercise([override(2, 1, { "1": "ok" }, true), check(3, { "1": "ok" })], earlier);
    expect(earlier).toEqual(copy);
  });
});

const time = (value: string, n = 1): Pick<Attempt, "at" | "id"> => ({ at: value, id: uuidOf(n) });

describe("compareAttempts", () => {
  it("@req DATA-003 orders by time, whatever the digits of the second", () => {
    expect(compareAttempts(time("2026-11-13T09:00:00Z"), time("2026-11-13T09:00:00.5Z"))).toBe(-1);
    expect(compareAttempts(time("2026-11-13T09:00:00.5Z"), time("2026-11-13T09:00:00.500Z"))).toBe(
      0,
    );
    expect(compareAttempts(time("2026-11-13T09:00:01Z"), time("2026-11-13T09:00:00.999Z"))).toBe(1);
  });

  it("@req DATA-003 orders attempts of the same millisecond by id", () => {
    expect(
      compareAttempts(time("2026-11-13T09:00:00Z", 1), time("2026-11-13T09:00:00.000Z", 2)),
    ).toBe(-1);
    expect(compareAttempts(time("2026-11-13T09:00:00Z", 2), time("2026-11-13T09:00:00Z", 1))).toBe(
      1,
    );
    expect(compareAttempts(time("2026-11-13T09:00:00Z", 3), time("2026-11-13T09:00:00Z", 3))).toBe(
      0,
    );
  });
});
