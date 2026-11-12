import { describe, expect, it } from "vitest";
import { linesFromRuns, type TextRun } from "./lines";

const run = (text: string, x: number, y: number, width = text.length * 5, size = 10): TextRun => ({
  text,
  x,
  y,
  width,
  size,
});

describe("linesFromRuns", () => {
  it("@req PACK-003 groups runs by baseline, top to bottom, and joins each line left to right", () => {
    const runs = [
      run("second", 10, 40),
      run("line", 50, 40.6),
      run("first", 20, 20),
      run("1.1", 0, 20, 15, 11),
    ];
    expect(linesFromRuns(runs)).toEqual([
      { text: "1.1 first", x: 0, y: 20, size: 11 },
      { text: "second line", x: 10, y: 40, size: 10 },
    ]);
  });

  it("joins runs that touch without a space and runs apart with one", () => {
    expect(linesFromRuns([run("isn", 0, 10, 15), run("'t", 15.5, 10, 5)])[0]!.text).toBe("isn't");
    expect(linesFromRuns([run("is", 0, 10, 10), run("not", 12, 10, 15)])[0]!.text).toBe("is not");
  });

  it("puts a space where a run of white space lies between two runs, however narrow", () => {
    const runs = [run("Example:", 0, 10, 40), run(" ", 40, 10, 0.5), run("There", 40.5, 10, 25)];
    expect(linesFromRuns(runs)[0]!.text).toBe("Example: There");
  });

  it("leaves out empty runs and lines of white space only, and collapses spaces", () => {
    const runs = [run("", 0, 5, 0), run("  ", 0, 10, 10), run(" a  b ", 0, 20, 30)];
    expect(linesFromRuns(runs)).toEqual([{ text: "a b", x: 0, y: 20, size: 10 }]);
  });

  it("takes the start of a line from its first printed run", () => {
    expect(linesFromRuns([run(" ", 0, 10, 20), run("text", 24, 10, 20)])).toEqual([
      { text: "text", x: 24, y: 10, size: 10 },
    ]);
  });

  it("returns no lines for no runs", () => {
    expect(linesFromRuns([])).toEqual([]);
  });
});
