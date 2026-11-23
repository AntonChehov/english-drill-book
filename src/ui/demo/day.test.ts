import { afterEach, describe, expect, it } from "vitest";
import { localDay } from "./day";

const zone = process.env["TZ"];
afterEach(() => {
  process.env["TZ"] = zone;
});

describe("localDay", () => {
  it("@req PROG-009 the day of the device, not of UTC", () => {
    process.env["TZ"] = "Europe/Moscow";

    expect(localDay(new Date("2026-11-23T20:59:59.999Z"))).toBe("2026-11-23");
    expect(localDay(new Date("2026-11-23T22:30:00.000Z"))).toBe("2026-11-24");
  });

  it("@req PROG-009 months and days with two digits", () => {
    process.env["TZ"] = "UTC";

    expect(localDay(new Date("2027-01-05T00:00:00.000Z"))).toBe("2027-01-05");
  });
});
