import { describe, expect, it } from "vitest";
import { coverageFromSummary, lighthouseFromManifest } from "./metrics.mjs";

describe("coverageFromSummary", () => {
  it("takes the percentages of the total", () => {
    const summary = {
      total: {
        lines: { total: 2, covered: 2, pct: 100 },
        statements: { pct: 100 },
        functions: { pct: 100 },
        branches: { total: 4, covered: 3, pct: 75 },
      },
      "src/domain/a.ts": { lines: { pct: 0 } },
    };
    expect(coverageFromSummary(summary)).toEqual({
      lines: 100,
      branches: 75,
      functions: 100,
      statements: 100,
    });
  });
});

const run = (performance, representative) => ({
  url: "http://127.0.0.1:4174/",
  isRepresentativeRun: representative,
  summary: { performance, accessibility: 1, "best-practices": 0.96, seo: 0.91 },
});

describe("lighthouseFromManifest", () => {
  it("takes the scores of the representative run as 0 to 100", () => {
    expect(lighthouseFromManifest([run(0.8, false), run(0.97, true), run(0.99, false)])).toEqual({
      performance: 97,
      accessibility: 100,
      "best-practices": 96,
      seo: 91,
    });
  });

  it("falls back to the first run and refuses an empty manifest", () => {
    expect(lighthouseFromManifest([run(0.5, false)]).performance).toBe(50);
    expect(() => lighthouseFromManifest([])).toThrow("lists no run");
  });
});
