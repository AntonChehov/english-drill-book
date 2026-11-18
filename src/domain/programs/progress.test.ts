import { describe, expect, it } from "vitest";
import { demoProgram } from ".";
import { currentLevel, levelShares, todayTopic, topicProgress } from "./progress";
import type { Topic } from "./types";

const [t1, t2, t3, t4] = demoProgram.topics as [Topic, Topic, Topic, Topic];
const unit1 = ["1.1", "1.2", "1.3"];

/** Done: `pack/exercise` keys. */
const doneOf =
  (...keys: string[]) =>
  (pack: string, exercise: string) =>
    keys.includes(`${pack}/${exercise}`);

const course = (...ids: string[]) => ids.map((id) => `demo-course/${id}`);
const drills = (...ids: string[]) => ids.map((id) => `demo-drills/${id}`);

/** Shares and level of the demo program with `passed` topics. */
function levelOf(...passed: Topic[]) {
  const shares = levelShares(demoProgram.scale, demoProgram.topics, (topic) =>
    passed.includes(topic),
  );
  return { shares, ...currentLevel(shares, 0.9, 0.5) };
}

describe("topicProgress", () => {
  it("@req PROG-001 the lead unit alone is not enough", () => {
    const progress = topicProgress(t1, unit1, doneOf(...course(...unit1), ...drills("1.1")), 2);
    expect(progress).toEqual({
      lead: { done: 3, total: 3 },
      drills: { done: 1, needed: 2, total: 3 },
      passed: false,
      state: "started",
    });
  });

  it("@req PROG-001 two drills and the lead unit pass the topic", () => {
    const progress = topicProgress(
      t1,
      unit1,
      doneOf(...course(...unit1), ...drills("1.1", "1.3")),
      2,
    );
    expect(progress.passed).toBe(true);
    expect(progress.state).toBe("passed");
  });

  it("@req PROG-001 drills without the whole lead unit do not pass", () => {
    const progress = topicProgress(t1, unit1, doneOf(...course("1.1"), ...drills("1.1", "1.2")), 2);
    expect(progress.passed).toBe(false);
  });

  it("@req PROG-001 fewer supplements than the minimum: all of them are needed", () => {
    const one: Topic = { ...t1, supplements: t1.supplements.slice(0, 1) };
    const progress = topicProgress(one, unit1, doneOf(...course(...unit1), ...drills("1.1")), 2);
    expect(progress.drills).toEqual({ done: 1, needed: 1, total: 1 });
    expect(progress.passed).toBe(true);
  });

  it("@req PROG-001 a topic with no supplements passes on its lead unit", () => {
    const none: Topic = { ...t1, supplements: [] };
    expect(topicProgress(none, unit1, doneOf(...course(...unit1)), 2).passed).toBe(true);
  });

  it("@req PROG-001 nothing done is a new topic", () => {
    expect(topicProgress(t1, unit1, doneOf(), 2).state).toBe("new");
  });
});

describe("levelShares", () => {
  it("@req PROG-002 half of a level", () => {
    expect(levelOf(t1).shares).toEqual([
      { level: "A1", passed: 1, total: 2, share: 0.5 },
      { level: "A2", passed: 0, total: 2, share: 0 },
    ]);
  });

  it("@req PROG-002 a level without topics has share 1", () => {
    const shares = levelShares(["A1", "A2", "B1"], demoProgram.topics, () => false);
    expect(shares[2]).toEqual({ level: "B1", passed: 0, total: 0, share: 1 });
  });
});

describe("currentLevel", () => {
  it("@req PROG-003 below the scale with nothing passed", () => {
    expect(levelOf()).toMatchObject({ index: -1, plus: false });
  });

  it("@req PROG-003 a level reached", () => {
    expect(levelOf(t1, t2)).toMatchObject({ index: 0, plus: false });
  });

  it("@req PROG-003 a gap below stops the climb", () => {
    expect(levelOf(t1, t3, t4).index).toBe(-1);
  });

  it("@req PROG-004 half of the next level gives the plus", () => {
    expect(levelOf(t1, t2, t3)).toMatchObject({ index: 0, plus: true });
  });

  it("@req PROG-004 below with the plus", () => {
    expect(levelOf(t1)).toMatchObject({ index: -1, plus: true });
  });

  it("@req PROG-004 no plus at the top", () => {
    expect(levelOf(t1, t2, t3, t4)).toMatchObject({ index: 1, plus: false });
  });
});

describe("todayTopic", () => {
  it("@req PROG-005 the first topic not passed", () => {
    expect(todayTopic(demoProgram.topics, (topic) => topic === t1)).toBe(1);
  });

  it("@req PROG-005 a topic in progress before a passed one comes first", () => {
    expect(todayTopic(demoProgram.topics, (topic) => topic === t2)).toBe(0);
  });

  it("@req PROG-005 every topic passed: the program is complete", () => {
    expect(todayTopic(demoProgram.topics, () => true)).toBe(-1);
  });
});
