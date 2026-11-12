import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { artifactPaths, coverageFromSummary, lighthouseFromManifest } from "./metrics.mjs";

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

describe("artifactPaths", () => {
  let directory;
  afterEach(() => directory && rmSync(directory, { recursive: true, force: true }));

  function artifacts(files) {
    directory = mkdtempSync(join(tmpdir(), "artifacts-"));
    for (const file of files) {
      mkdirSync(dirname(join(directory, file)), { recursive: true });
      writeFileSync(join(directory, file), "x");
    }
    return directory;
  }

  const complete = [
    "unit/unit-junit.xml",
    "unit/speed-junit.xml",
    "unit/coverage/coverage-summary.json",
    "size/metrics.json",
    "lighthouse/manifest.json",
    "e2e-webkit/e2e-webkit.xml",
    "e2e-chromium/e2e-chromium.xml",
    "dist/index.html",
  ];

  it("finds every report in the layout of a checks run", () => {
    const root = artifacts(complete);
    expect(artifactPaths(root)).toEqual({
      unit: [join(root, "unit/unit-junit.xml"), join(root, "unit/speed-junit.xml")],
      e2e: [join(root, "e2e-chromium/e2e-chromium.xml"), join(root, "e2e-webkit/e2e-webkit.xml")],
      coverage: join(root, "unit/coverage/coverage-summary.json"),
      lighthouse: join(root, "lighthouse/manifest.json"),
      size: join(root, "size/metrics.json"),
    });
  });

  it("names what is missing", () => {
    const root = artifacts(
      complete.filter((file) => !file.startsWith("lighthouse") && !file.startsWith("e2e")),
    );
    expect(() => artifactPaths(root)).toThrow(/lighthouse\/manifest\.json, .*e2e-\*/);
  });
});
