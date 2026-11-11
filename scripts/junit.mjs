#!/usr/bin/env node
// Reads JUnit reports of Vitest and Playwright (constitution C-19: test results in a
// machine-readable format, summarised on the pull request).
// Usage: node scripts/junit.mjs <title> <report.xml>...   appends a summary to the job summary
import { existsSync, readFileSync } from "node:fs";
import { appendSummary, isMain } from "./common.mjs";

const entities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decode(text) {
  return text.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi, (_, name) => {
    if (name[0] !== "#") return entities[name.toLowerCase()];
    const code =
      name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : Number(name.slice(1));
    return String.fromCodePoint(code);
  });
}

function attributes(tag) {
  const result = {};
  for (const [, name, value] of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) result[name] = decode(value);
  return result;
}

/** Totals over the `<testsuite>` elements of a report, and the tests that failed. */
export function parseJunit(xml) {
  const totals = { tests: 0, failed: 0, skipped: 0, passed: 0 };
  for (const [tag] of xml.matchAll(/<testsuite\s[^>]*>/g)) {
    const suite = attributes(tag);
    totals.tests += Number(suite.tests ?? 0);
    totals.failed += Number(suite.failures ?? 0) + Number(suite.errors ?? 0);
    totals.skipped += Number(suite.skipped ?? 0);
  }
  totals.passed = totals.tests - totals.failed - totals.skipped;

  const failures = [];
  for (const [, tag, body] of xml.matchAll(/<testcase(\s[^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g)) {
    if (body && /<(failure|error)[\s>]/.test(body)) {
      const testcase = attributes(tag);
      failures.push(
        testcase.classname ? `${testcase.classname} › ${testcase.name}` : testcase.name,
      );
    }
  }
  return { ...totals, failures };
}

/** Adds up the totals of several reports. */
export function sumResults(results) {
  const sum = { tests: 0, failed: 0, skipped: 0, passed: 0, failures: [] };
  for (const result of results) {
    for (const key of ["tests", "failed", "skipped", "passed"]) sum[key] += result[key];
    sum.failures.push(...result.failures);
  }
  return sum;
}

export function readJunit(paths) {
  const missing = paths.filter((path) => !existsSync(path));
  if (missing.length > 0) throw new Error(`JUnit report not found: ${missing.join(", ")}`);
  return sumResults(paths.map((path) => parseJunit(readFileSync(path, "utf8"))));
}

/** Markdown for the job summary. */
export function summaryMarkdown(title, result) {
  const status = result.failed > 0 ? "failed" : "passed";
  const lines = [
    `### ${title}: ${status}`,
    "",
    "| Tests | Passed | Failed | Skipped |",
    "| ---: | ---: | ---: | ---: |",
    `| ${result.tests} | ${result.passed} | ${result.failed} | ${result.skipped} |`,
  ];
  if (result.failures.length > 0) {
    lines.push("", "Failed:", ...result.failures.map((name) => `- ${name}`));
  }
  return `${lines.join("\n")}\n`;
}

function main() {
  const [title, ...paths] = process.argv.slice(2);
  if (!title || paths.length === 0) {
    console.error("Usage: node scripts/junit.mjs <title> <report.xml>...");
    process.exitCode = 2;
    return;
  }
  const markdown = summaryMarkdown(title, readJunit(paths));
  appendSummary(markdown);
  console.log(markdown);
}

if (isMain(import.meta.url)) main();
