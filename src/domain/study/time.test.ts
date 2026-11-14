import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { instantOf, millisecondsOf, notEarlierThan } from "./time";

describe("times without a clock", () => {
  it("reads and writes times of the export format as milliseconds since 1970", () => {
    expect(millisecondsOf("1970-01-01T00:00:00Z")).toBe(0);
    expect(millisecondsOf("1970-01-01T00:00:01.5Z")).toBe(1500);
    expect(millisecondsOf("2026-11-13T09:30:00.250Z")).toBe(1_794_562_200_250);
    expect(millisecondsOf("1969-12-31T23:59:59.999Z")).toBe(-1);
    expect(millisecondsOf("yesterday")).toBeNaN();
    expect(instantOf(0)).toBe("1970-01-01T00:00:00.000Z");
    expect(instantOf(-1)).toBe("1969-12-31T23:59:59.999Z");
    expect(instantOf(1_794_562_200_250)).toBe("2026-11-13T09:30:00.250Z");
  });

  it("goes round trip over any millisecond from 1600 to 2400, leap days included", () => {
    expect(instantOf(millisecondsOf("2024-02-28T23:59:59.999Z") + 1)).toBe(
      "2024-02-29T00:00:00.000Z",
    );
    expect(instantOf(millisecondsOf("2100-02-28T23:59:59.999Z") + 1)).toBe(
      "2100-03-01T00:00:00.000Z",
    );
    expect(instantOf(millisecondsOf("2026-12-31T23:59:59.999Z") + 1)).toBe(
      "2027-01-01T00:00:00.000Z",
    );
    fc.assert(
      fc.property(fc.integer({ min: -11_676_096_000_000, max: 13_569_465_600_000 }), (ms) => {
        expect(millisecondsOf(instantOf(ms))).toBe(ms);
      }),
    );
  });

  it("@req PLAY-008 keeps a later time and moves an earlier or equal one just after the floor", () => {
    const floor = "2026-11-13T09:30:00.250Z";
    expect(notEarlierThan("2026-11-13T09:30:01Z", floor)).toBe("2026-11-13T09:30:01Z");
    expect(notEarlierThan(floor, floor)).toBe("2026-11-13T09:30:00.251Z");
    expect(notEarlierThan("2026-11-13T09:29:00.000Z", floor)).toBe("2026-11-13T09:30:00.251Z");
    expect(notEarlierThan("2026-11-13T09:30:00.25Z", "2026-11-13T09:30:00.2Z")).toBe(
      "2026-11-13T09:30:00.25Z",
    );
  });
});
