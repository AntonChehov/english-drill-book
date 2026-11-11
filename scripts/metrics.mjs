#!/usr/bin/env node
// Gathers the numbers of a pipeline run into metrics.json (constitution C-18, item 4):
// test results, coverage of src/domain and Lighthouse scores, next to the bundle sizes
// that scripts/size.mjs wrote there.
// Usage: node scripts/metrics.mjs --sha <commit> [--unit file.xml]... [--e2e file.xml]...
//          [--coverage coverage-summary.json] [--lighthouse manifest.json] [--duration seconds]
//          [--metrics metrics.json]
import { parseArgs } from "node:util";
import { isMain, mergeMetrics, readJson } from "./common.mjs";
import { readJunit } from "./junit.mjs";

/** Line, branch, function and statement coverage in percent from Vitest's json-summary. */
export function coverageFromSummary(summary) {
  const { total } = summary;
  return {
    lines: total.lines.pct,
    branches: total.branches.pct,
    functions: total.functions.pct,
    statements: total.statements.pct,
  };
}

/** Category scores, 0 to 100, of the run Lighthouse CI chose as representative. */
export function lighthouseFromManifest(manifest) {
  const run = manifest.find((entry) => entry.isRepresentativeRun) ?? manifest[0];
  if (!run) throw new Error("The Lighthouse manifest lists no run.");
  const scores = {};
  for (const category of ["performance", "accessibility", "best-practices", "seo"]) {
    if (typeof run.summary[category] === "number") {
      scores[category] = Math.round(run.summary[category] * 100);
    }
  }
  return scores;
}

function counts({ tests, passed, failed, skipped }) {
  return { tests, passed, failed, skipped };
}

function main() {
  const { values } = parseArgs({
    options: {
      sha: { type: "string" },
      unit: { type: "string", multiple: true, default: [] },
      e2e: { type: "string", multiple: true, default: [] },
      coverage: { type: "string" },
      lighthouse: { type: "string" },
      duration: { type: "string" },
      metrics: { type: "string", default: "metrics.json" },
    },
  });
  if (!values.sha) throw new Error("--sha is required: metrics belong to one commit.");

  const part = { sha: values.sha };
  const tests = {};
  if (values.unit.length > 0) tests.unit = counts(readJunit(values.unit));
  if (values.e2e.length > 0) tests.e2e = counts(readJunit(values.e2e));
  if (Object.keys(tests).length > 0) part.tests = tests;
  if (values.coverage) part.coverage = coverageFromSummary(readJson(values.coverage));
  if (values.lighthouse) part.lighthouse = lighthouseFromManifest(readJson(values.lighthouse));
  if (values.duration) part.pipeline = { seconds: Number(values.duration) };

  const metrics = mergeMetrics(values.metrics, part);
  console.log(JSON.stringify(metrics, null, 2));
}

if (isMain(import.meta.url)) main();
