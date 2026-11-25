import { describe, expect, it } from "vitest";
import { elapsedSeconds, verdict } from "./duration.mjs";

describe("duration", () => {
  it("measures from the start of the run", () => {
    expect(elapsedSeconds("2026-11-11T10:00:00Z", new Date("2026-11-11T10:02:30.4Z"))).toBe(150);
  });

  it("is within the budget up to four minutes", () => {
    expect(verdict(240)).toMatchObject({ over: false });
    expect(verdict(240).markdown).toContain("4 min 0 s");
    expect(verdict(241)).toMatchObject({ over: true });
    expect(verdict(241).markdown).toContain("over the budget of 4 minutes");
  });
});
