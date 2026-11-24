import { describe, expect, it } from "vitest";
import {
  clampSplit,
  clampZoom,
  DEFAULT_SPLIT,
  maxSplit,
  splitAfterKey,
  stepZoom,
  zoomLabel,
} from "./layout";

describe("the zoom of the pages panel", () => {
  it("@req DOC-002 steps up and down through 50 % to 300 % and stops at the ends", () => {
    expect(stepZoom(1, 1)).toBe(1.25);
    expect(stepZoom(1.25, 1)).toBe(1.5);
    expect(stepZoom(1.5, -1)).toBe(1.25);
    expect(stepZoom(2.5, 1)).toBe(3);
    expect(stepZoom(3, 1)).toBe(3);
    expect(stepZoom(0.5, -1)).toBe(0.5);
  });

  it("@req DOC-002 steps from a zoom that is between two steps to the next one", () => {
    expect(stepZoom(1.1, 1)).toBe(1.25);
    expect(stepZoom(1.1, -1)).toBe(1);
  });

  it("@req DOC-002 keeps a stored zoom within 50 % to 300 % and reads what is not a number as 100 %", () => {
    expect(clampZoom(4)).toBe(3);
    expect(clampZoom(0.1)).toBe(0.5);
    expect(clampZoom("2")).toBe(1);
    expect(clampZoom(Number.NaN)).toBe(1);
  });

  it("@req DOC-002 says the zoom in percent", () => {
    expect(zoomLabel(1)).toBe("100 %");
    expect(zoomLabel(1.25)).toBe("125 %");
    expect(zoomLabel(0.75)).toBe("75 %");
  });
});

describe("the split of Study", () => {
  it("@req DOC-006 moves by 5 % on the arrows and to the limits on Home and End", () => {
    expect(splitAfterKey(0.6, "ArrowRight")).toBe(0.65);
    expect(splitAfterKey(0.6, "ArrowLeft")).toBe(0.55);
    expect(splitAfterKey(0.6, "Home")).toBe(0.3);
    expect(splitAfterKey(0.6, "End")).toBe(0.75);
    expect(splitAfterKey(0.6, "a")).toBeUndefined();
  });

  it("@req DOC-006 stops at 30 % and 75 %", () => {
    expect(splitAfterKey(0.75, "ArrowRight")).toBe(0.75);
    expect(splitAfterKey(0.3, "ArrowLeft")).toBe(0.3);
    expect(splitAfterKey(0.72, "ArrowRight")).toBe(0.75);
  });

  it("@req DOC-006 keeps a stored split within the limits and reads what is not a number as the default", () => {
    expect(clampSplit(0.9)).toBe(0.75);
    expect(clampSplit(0.1)).toBe(0.3);
    expect(clampSplit(undefined)).toBe(DEFAULT_SPLIT);
  });

  it("@req DOC-006 holds the pages back so that the exercises keep 22 rem, and no more than 75 %", () => {
    // 16 px a rem: the exercises and the separator take 364 px.
    expect(maxSplit(1000, 16)).toBeCloseTo(0.636, 3);
    expect(maxSplit(1200, 16)).toBeCloseTo(0.697, 3);
    expect(maxSplit(2000, 16)).toBe(0.75);
    expect(maxSplit(0, 16), "a row that is not measured").toBe(0.75);
    expect(maxSplit(300, 16), "never below the least").toBe(0.3);
  });

  it("@req DOC-006 moves and stops at the most the row allows", () => {
    expect(splitAfterKey(0.6, "End", 0.64)).toBe(0.64);
    expect(splitAfterKey(0.6, "ArrowRight", 0.64)).toBe(0.64);
    expect(splitAfterKey(0.64, "ArrowRight", 0.64)).toBe(0.64);
    expect(clampSplit(0.7, 0.64)).toBe(0.64);
  });
});
