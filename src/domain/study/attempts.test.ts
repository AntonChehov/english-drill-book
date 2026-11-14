import { describe, expect, it } from "vitest";
import type { ItemsExercise } from "../packs/types";
import { deriveExercise, type Attempt } from "../progress";
import {
  checkAttempt,
  latestCheck,
  markDoneAttempt,
  overriddenOf,
  overrideAttempt,
  revealAttempt,
} from "./attempts";
import { prepareKeys } from "./grade";
import { contextOf, itemsOf } from "./study.fixture";
import { viewOfExercise } from "./view";

const exercise = itemsOf("1.3");
const keys = prepareKeys(exercise)!;
const all = {
  "1": "I am not tired",
  "2": "The bus is not late",
  "3": "We are not at home",
  "4": "My phone is not in my bag",
  "5": "Kofi and Nell are not friends",
};
const ctx = (n: number, at?: string) => contextOf(n, exercise.id, at);

/** The log after each step, and the state derived from it. */
function run(...steps: ((log: Attempt[]) => Attempt | undefined)[]) {
  const log: Attempt[] = [];
  for (const step of steps) {
    const attempt = step(log);
    if (attempt === undefined) throw new Error("no attempt");
    log.push(attempt);
  }
  return { log, state: deriveExercise(log) };
}

describe("checkAttempt", () => {
  it("@req PLAY-006 records the answers and the verdict of every graded item, and not the blank ones", () => {
    const attempt = checkAttempt(ctx(1), exercise, keys, { ...all, "2": "The bus late", "4": "" });

    expect(attempt).toMatchObject({
      action: "check",
      exercise: "1.3",
      pack: "demo-course",
      packVersion: "1.0.0",
      answers: { "1": all["1"], "2": "The bus late", "3": all["3"], "5": all["5"] },
      results: { "1": "ok", "2": "bad", "3": "ok", "5": "ok" },
      complete: false,
    });
  });

  it("@req PLAY-009 a check with every item correct makes the exercise done, dated by that check", () => {
    const { state } = run(() => checkAttempt(ctx(1), exercise, keys, all));

    expect(state.done).toBe(true);
    expect(state.doneAt).toBe(ctx(1).at);
  });

  it("@req PLAY-010 a later wrong answer leaves the exercise done and the row wrong", () => {
    const { state } = run(
      () => checkAttempt(ctx(1), exercise, keys, all),
      () => checkAttempt(ctx(2), exercise, keys, { ...all, "3": "We is home" }),
    );

    expect(state.done).toBe(true);
    expect(state.verdicts["3"]).toBe("bad");
  });
});

describe("revealAttempt", () => {
  it("@req PLAY-007 records that one item was revealed, with what was typed, before any check", () => {
    const { log, state } = run(() =>
      revealAttempt(ctx(1), "3", { "1": "I am not tired", "2": " " }),
    );

    expect(log[0]).toMatchObject({
      action: "reveal",
      answers: { "1": "I am not tired" },
      results: {},
      revealed: ["3"],
      complete: false,
    });
    expect(state.revealed).toEqual(["3"]);
    expect(state.done).toBe(false);
  });
});

describe("markDoneAttempt", () => {
  it("@req PLAY-009 marks an open exercise done with its text", () => {
    const open = contextOf(1, "4.3");
    const { log, state } = run(() => markDoneAttempt(open, "There is a bed."));

    expect(log[0]).toMatchObject({ action: "mark-done", answers: { text: "There is a bed." } });
    expect(state.done).toBe(true);
    expect(state.doneAt).toBe(open.at);
  });
});

describe("overrideAttempt", () => {
  const wrongOne = { ...all, "5": "Kofi and Nell is friends" };

  it("@req PLAY-008 counts a wrong answer as correct, and names the latest check", () => {
    const { log, state } = run(
      () => checkAttempt(ctx(1), exercise, keys, all),
      () => checkAttempt(ctx(2), exercise, keys, wrongOne),
      (sofar) => overrideAttempt(ctx(3), exercise, sofar, "5", "ok"),
    );

    expect(log[2]).toMatchObject({
      action: "override",
      corrects: log[1]!.id,
      overridden: { "5": "ok" },
      complete: true,
    });
    expect(state.verdicts["5"]).toBe("ok");
    expect(state.overridden).toEqual({ "5": "ok" });
  });

  it("@req PLAY-008 counts an accepted answer as wrong, and carries every change of the check", () => {
    const { log, state } = run(
      () => checkAttempt(ctx(1), exercise, keys, wrongOne),
      (sofar) => overrideAttempt(ctx(2), exercise, sofar, "5", "ok"),
      (sofar) => overrideAttempt(ctx(3), exercise, sofar, "1", "bad"),
    );

    expect(log[2]?.overridden).toEqual({ "5": "ok", "1": "bad" });
    expect(log[2]?.complete).toBe(false);
    expect(state.verdicts).toMatchObject({ "1": "bad", "5": "ok" });
    expect(overriddenOf(log)).toEqual({ "5": "ok", "1": "bad" });
  });

  it("@req PLAY-008 an undo removes the item from the set, and the app's verdict is back", () => {
    const { log, state } = run(
      () => checkAttempt(ctx(1), exercise, keys, wrongOne),
      (sofar) => overrideAttempt(ctx(2), exercise, sofar, "5", "ok"),
      (sofar) => overrideAttempt(ctx(3), exercise, sofar, "5", null),
    );

    expect(log[2]?.overridden).toEqual({});
    expect(state.verdicts["5"]).toBe("bad");
    expect(state.overridden).toEqual({});
  });

  it("@req PLAY-009 counting the last wrong item as correct completes the exercise", () => {
    const { state } = run(
      () => checkAttempt(ctx(1), exercise, keys, wrongOne),
      (sofar) => overrideAttempt(ctx(2), exercise, sofar, "5", "ok"),
    );

    expect(state.done).toBe(true);
    expect(state.doneAt).toBe(ctx(1).at);
  });

  it("@req PLAY-009 counting as wrong an item of the completing check takes it back, and an undo returns it", () => {
    const taken = run(
      () => checkAttempt(ctx(1), exercise, keys, all),
      (sofar) => overrideAttempt(ctx(2), exercise, sofar, "2", "bad"),
    );
    expect(taken.state.done).toBe(false);

    const returned = run(
      () => taken.log[0],
      () => taken.log[1],
      (sofar) => overrideAttempt(ctx(3), exercise, sofar, "2", null),
    );
    expect(returned.log[2]?.complete).toBe(true);
    expect(returned.state.done).toBe(true);
  });

  it("@req PLAY-009 an override whose clock is behind its check's comes a millisecond after it", () => {
    const behind = "2026-11-13T09:00:00.000Z";
    const { log, state } = run(
      () => checkAttempt(ctx(1, "2026-11-13T10:00:00.000Z"), exercise, keys, wrongOne),
      (sofar) => overrideAttempt(ctx(2, behind), exercise, sofar, "5", "ok"),
      (sofar) => overrideAttempt(ctx(3, behind), exercise, sofar, "1", "bad"),
    );

    expect(log[1]?.at).toBe("2026-11-13T10:00:00.001Z");
    expect(log[2]?.at).toBe("2026-11-13T10:00:00.002Z");
    expect(state.verdicts).toMatchObject({ "1": "bad", "5": "ok" });
    expect(state.done).toBe(false);
  });

  it("@req PLAY-008 offers nothing without a check, or for an item the latest check left blank", () => {
    expect(overrideAttempt(ctx(1), exercise, [], "1", "ok")).toBeUndefined();
    const { log } = run(() => checkAttempt(ctx(1), exercise, keys, { "1": "I am not tired" }));
    expect(overrideAttempt(ctx(2), exercise, log, "2", "ok")).toBeUndefined();
    expect(overriddenOf([])).toEqual({});
  });

  it("finds the latest check whatever order the log is given in", () => {
    const first = checkAttempt(ctx(1), exercise, keys, all);
    const second = checkAttempt(ctx(2), exercise, keys, wrongOne);
    const reveal = revealAttempt(ctx(3), "1", {});

    expect(latestCheck([second, reveal, first])).toBe(second);
    expect(latestCheck([reveal])).toBeUndefined();
  });
});

describe("an item whose key accepts a blank", () => {
  const blankable: ItemsExercise = {
    id: "9.1",
    type: "items",
    task: "Write the article if one is needed.",
    items: [
      { id: "1", prompt: "___ breakfast", accept: ["(the)"] },
      { id: "2", prompt: "___ moon", accept: ["the"] },
    ],
  };

  it("@req PLAY-003 is correct when left blank, judged with an empty answer, and shown so", () => {
    const check = checkAttempt(contextOf(1, "9.1"), blankable, prepareKeys(blankable)!, {
      "2": "the",
    });

    expect(check.answers).toEqual({ "1": "", "2": "the" });
    expect(check.results).toEqual({ "1": "ok", "2": "ok" });
    expect(check.complete).toBe(true);
    const view = viewOfExercise(blankable, deriveExercise([check]), { "2": "the" }, [check]);
    expect(view.kind === "items" && view.rows.map((row) => row.verdict)).toEqual(["ok", "ok"]);
    expect(overriddenOf([check])).toEqual({});
  });
});
