import { describe, expect, it } from "vitest";
import { countOf, type PluralForms } from "./plural";

const exercises: PluralForms = ["упражнение", "упражнения", "упражнений"];

describe("countOf", () => {
  it("uses the form of one after 1, 21, 101, but not after 11", () => {
    for (const count of [1, 21, 101, 1001])
      expect(countOf(count, exercises)).toBe(`${count} упражнение`);
    expect(countOf(11, exercises)).toBe("11 упражнений");
  });

  it("uses the form of few after 2 to 4 and 22 to 24, but not after 12 to 14", () => {
    for (const count of [2, 3, 4, 22, 34, 102])
      expect(countOf(count, exercises)).toBe(`${count} упражнения`);
    for (const count of [12, 13, 14, 112])
      expect(countOf(count, exercises)).toBe(`${count} упражнений`);
  });

  it("uses the form of many after 0 and 5 to 20", () => {
    for (const count of [0, 5, 9, 10, 15, 20, 25, 100]) {
      expect(countOf(count, exercises)).toBe(`${count} упражнений`);
    }
  });
});
