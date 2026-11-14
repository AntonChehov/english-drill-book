import { describe, expect, it } from "vitest";
import type { ItemsExercise } from "../packs/types";
import { gradeExercise, prepareKeys } from "./grade";
import { itemsOf } from "./study.fixture";

const typedExercise = itemsOf("1.3");
const keys = prepareKeys(typedExercise)!;

describe("gradeExercise", () => {
  it("@req PLAY-003 grades every item that is not blank and leaves blank items without a verdict", () => {
    const grading = gradeExercise(typedExercise, keys, {
      "1": "I am not tired",
      "2": "The bus is late",
      "3": "We are at home",
      "4": "   ",
    });

    expect(grading.results).toEqual({ "1": "ok", "2": "bad", "3": "bad" });
    expect(grading.complete).toBe(false);
  });

  it("@req PLAY-004 a single mistyped letter in a long answer is almost, which is not correct", () => {
    const grading = gradeExercise(typedExercise, keys, {
      "1": "I am not tired",
      "2": "The bus is not late",
      "3": "We are not at home",
      "4": "My phone is not in my bag",
      "5": "Kofi and Nell are not frends",
    });

    expect(grading.results["5"]).toBe("near");
    expect(grading.complete).toBe(false);
  });

  it("@req PLAY-003 every item correct completes the exercise", () => {
    const grading = gradeExercise(typedExercise, keys, {
      "1": "I am not tired.",
      "2": "the bus is not late",
      "3": "We aren't at home",
      "4": "My phone is not in my bag",
      "5": "Kofi and Nell are not friends",
    });

    expect(Object.values(grading.results)).toEqual(["ok", "ok", "ok", "ok", "ok"]);
    expect(grading.complete).toBe(true);
  });

  it("@req PLAY-003 an option is right or wrong, never almost", () => {
    const choices = itemsOf("1.2");
    const grading = gradeExercise(choices, prepareKeys(choices)!, { "1": "is", "2": "is" });

    expect(grading.results).toEqual({ "1": "bad", "2": "ok" });
  });

  it("grades no item without a prepared key", () => {
    const grading = gradeExercise(typedExercise, new Map([["1", keys.get("1")!]]), {
      "2": "The bus is not late",
    });

    expect(grading.results).toEqual({});
    expect(grading.complete).toBe(false);
  });
});

describe("prepareKeys", () => {
  it("prepares the key of every item of a validated exercise", () => {
    expect([...keys.keys()]).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("gives nothing when a key cannot be prepared, so the exercise is shown as open", () => {
    const broken: ItemsExercise = {
      ...typedExercise,
      items: [{ id: "1", accept: ["(unclosed"] }],
    };

    expect(prepareKeys(broken)).toBeUndefined();
  });
});
