import { describe, expect, it } from "vitest";
import { deriveExercise, emptyExerciseState, type Attempt } from "../progress";
import { checkAttempt, markDoneAttempt, overrideAttempt, revealAttempt } from "./attempts";
import { prepareKeys } from "./grade";
import { contextOf, exerciseOf, itemsOf } from "./study.fixture";
import { continueAt, progressOf } from "./progress";
import { initialAnswers, judgedAnswers, viewOfExercise, type ItemsView } from "./view";

const exercise = itemsOf("1.3");
const keys = prepareKeys(exercise)!;
const all = {
  "1": "I am not tired",
  "2": "The bus is not late",
  "3": "We are not at home",
  "4": "My phone is not in my bag",
  "5": "Kofi and Nell are not friends",
};
const ctx = (n: number) => contextOf(n, exercise.id);

function itemsView(answers: Record<string, string>, log: readonly Attempt[]): ItemsView {
  const view = viewOfExercise(exercise, deriveExercise(log), answers, log);
  if (view.kind !== "items") throw new Error("not an items view");
  return view;
}

const verdictsOf = (view: ItemsView) => view.rows.map((row) => row.verdict);

describe("viewOfExercise of items", () => {
  it("@req PLAY-002 shows each item with its prompt, and its options when it has them", () => {
    const view = itemsView({}, []);
    expect(view.rows.map((row) => [row.id, row.prompt])).toEqual(
      exercise.items.map((item) => [item.id, item.prompt]),
    );
    const choices = viewOfExercise(itemsOf("1.2"), emptyExerciseState, {}, []);
    expect(choices.kind === "items" && choices.rows[0]?.choices).toEqual(["is", "are"]);
  });

  it("@req PLAY-003 @req PLAY-004 shows correct, almost and wrong, and nothing on a blank row; almost shows no key", () => {
    const answers = { "1": "I am not tired", "2": "The bus is not lote", "3": "We is home" };
    const log = [checkAttempt(ctx(1), exercise, keys, answers)];
    const view = itemsView(answers, log);

    expect(verdictsOf(view)).toEqual(["ok", "near", "bad", null, null]);
    expect(view.rows.every((row) => row.key === null)).toBe(true);
    expect(view.score).toEqual({ ok: 1, total: 5 });
    expect(view.status).toBe("in-progress");
  });

  it("@req PLAY-006 editing an answer clears that row's verdict and keeps the others", () => {
    const log = [checkAttempt(ctx(1), exercise, keys, all)];
    const view = itemsView({ ...all, "2": "The bus is not late!" }, log);

    expect(verdictsOf(view)).toEqual(["ok", null, "ok", "ok", "ok"]);
    expect(view.rows[1]?.change).toBeNull();
    expect(view.score).toEqual({ ok: 4, total: 5 });
  });

  it("@req PLAY-006 the next check judges the new answer", () => {
    const edited = { ...all, "2": "The bus is late" };
    const log = [
      checkAttempt(ctx(1), exercise, keys, all),
      checkAttempt(ctx(2), exercise, keys, edited),
    ];

    expect(verdictsOf(itemsView(edited, log))).toEqual(["ok", "bad", "ok", "ok", "ok"]);
  });

  it("@req PLAY-007 shows the key of a revealed item only, its patterns joined by или", () => {
    const multi = itemsOf("3.3");
    const log = [revealAttempt(contextOf(1, "3.3"), "1", {})];
    const view = viewOfExercise(multi, deriveExercise(log), {}, log) as ItemsView;

    expect(view.rows.map((row) => row.key)).toEqual([
      "Priya is a doctor или She is a doctor",
      ...Array<null>(9).fill(null),
    ]);
    expect(view.score).toBeNull();
  });

  it("@req PLAY-008 offers to count a wrong or almost row, to uncount a correct one, and to undo a change by hand", () => {
    const answers = { ...all, "2": "The bus is not lote", "3": "We is home" };
    const log = [checkAttempt(ctx(1), exercise, keys, answers)];
    log.push(overrideAttempt(ctx(2), exercise, log, "4", "bad")!);
    const view = itemsView(answers, log);

    expect(view.rows.map((row) => row.change)).toEqual([
      "uncount",
      "count",
      "count",
      "undo",
      "uncount",
    ]);
    expect(view.rows[3]).toMatchObject({ verdict: "bad", byHand: true });
    expect(view.rows.filter((row) => row.byHand)).toHaveLength(1);
  });

  it("@req PLAY-008 offers no change for a row judged by an earlier check than the latest", () => {
    const log = [
      checkAttempt(ctx(1), exercise, keys, all),
      checkAttempt(ctx(2), exercise, keys, { ...all, "1": "" }),
    ];
    const view = itemsView(all, log);

    expect(view.rows[0]).toMatchObject({ verdict: "ok", change: null });
    expect(view.rows[1]?.change).toBe("uncount");
  });

  it("@req PLAY-011 names the state: untouched, in progress when typed or tried, done", () => {
    expect(itemsView({}, []).status).toBe("untouched");
    expect(itemsView({ "1": "  " }, []).status).toBe("untouched");
    expect(itemsView({ "1": "I am" }, []).status).toBe("in-progress");
    expect(itemsView({}, [revealAttempt(ctx(1), "1", {})]).status).toBe("in-progress");
    expect(itemsView(all, [checkAttempt(ctx(1), exercise, keys, all)]).status).toBe("done");
  });

  it("@req PLAY-010 a done exercise answered wrongly later is still done, the row wrong", () => {
    const wrong = { ...all, "3": "We is home" };
    const log = [
      checkAttempt(ctx(1), exercise, keys, all),
      checkAttempt(ctx(2), exercise, keys, wrong),
    ];
    const view = itemsView(wrong, log);

    expect(view.status).toBe("done");
    expect(view.rows[2]?.verdict).toBe("bad");
  });
});

describe("the answers in the fields", () => {
  it("@req PLAY-005 restore the judged answers, replaced by the draft where there is one", () => {
    const log = [checkAttempt(ctx(1), exercise, keys, { "1": "I am not tired", "2": "x" })];
    const state = deriveExercise(log);

    expect(judgedAnswers(state, log)).toEqual({ "1": "I am not tired", "2": "x" });
    expect(initialAnswers(state, log, undefined)).toEqual({ "1": "I am not tired", "2": "x" });
    expect(initialAnswers(state, log, { "2": "The bus", "3": "We" })).toEqual({
      "1": "I am not tired",
      "2": "The bus",
      "3": "We",
    });
    expect(judgedAnswers(state, [])).toEqual({});
  });
});

describe("viewOfExercise of free exercises", () => {
  it("@req PLAY-013 an open exercise gives no verdict and its sample only once asked for", () => {
    const open = exerciseOf("4.3");
    const fresh = viewOfExercise(open, emptyExerciseState, { text: "There is a bed." }, []);
    expect(fresh).toMatchObject({
      kind: "free",
      status: "in-progress",
      sampleShown: false,
      done: false,
    });
    expect(fresh.kind === "free" && fresh.sample).toMatch(/^There is a bed/u);

    const log = [revealAttempt(contextOf(1, "4.3"), "text", {})];
    expect(viewOfExercise(open, deriveExercise(log), {}, log)).toMatchObject({ sampleShown: true });
  });

  it("@req PLAY-013 marked as done, it is done", () => {
    const log = [markDoneAttempt(contextOf(1, "4.3"), "There is a lamp.")];
    expect(viewOfExercise(exerciseOf("4.3"), deriveExercise(log), {}, log)).toMatchObject({
      status: "done",
      done: true,
    });
  });

  it("@req PLAY-013 a connected text is shown as open, its model as the sample, and so is an exercise without a key", () => {
    const text = viewOfExercise(exerciseOf("2.3"), emptyExerciseState, {}, []);
    expect(text).toMatchObject({ kind: "free", status: "untouched" });
    expect(text.kind === "free" && text.sample).toMatch(/^Omar lives/u);

    expect(viewOfExercise(exercise, emptyExerciseState, {}, [], true)).toMatchObject({
      kind: "free",
      sample: null,
    });
    const noSample = { ...exerciseOf("4.3"), sample: undefined } as never;
    expect(viewOfExercise(noSample, emptyExerciseState, {}, [])).toMatchObject({ sample: null });
  });
});

describe("progress of units", () => {
  it("@req PLAY-011 @req PROG-014 counts the done exercises and finds the first unit not finished", () => {
    const done = new Set(["1.1", "1.3"]);
    expect(progressOf(["1.1", "1.2", "1.3"], (id) => done.has(id))).toEqual({ done: 2, total: 3 });
    expect(
      continueAt([
        { done: 3, total: 3 },
        { done: 1, total: 3 },
        { done: 0, total: 3 },
      ]),
    ).toBe(1);
    expect(continueAt([{ done: 3, total: 3 }])).toBe(-1);
  });
});
