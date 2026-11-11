import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseJunit, readJunit, summaryMarkdown, sumResults } from "./junit.mjs";

// Shaped like the reports of Vitest and Playwright.
const vitest = `<?xml version="1.0" encoding="UTF-8" ?>
<testsuites name="vitest tests" tests="3" failures="1" errors="0" time="0.01">
    <testsuite name="src/a.test.ts" tests="3" failures="1" errors="0" skipped="1" time="0.01">
        <testcase classname="src/a.test.ts" name="a &gt; works" time="0.001">
        </testcase>
        <testcase classname="src/a.test.ts" name="a &gt; &quot;breaks&quot; &#8212; &#x41;" time="0.001">
            <failure message="expected 1 to be 2" type="AssertionError">trace</failure>
        </testcase>
        <testcase classname="src/a.test.ts" name="a &gt; later" time="0">
            <skipped/>
        </testcase>
    </testsuite>
</testsuites>`;

const playwright = `<testsuites id="" name="" tests="4" failures="0" skipped="0" errors="1" time="3.3">
<testsuite name="app-shell.spec.ts" hostname="chromium" tests="2" failures="0" skipped="0" time="2.9" errors="1">
<testcase name="opens" classname="app-shell.spec.ts" time="1.0">
</testcase>
<testcase name="reloads" classname="app-shell.spec.ts" time="1.0">
<error message="timeout"/>
</testcase>
</testsuite>
<testsuite name="a11y.spec.ts" hostname="chromium" tests="2" failures="0" skipped="0" time="2.9" errors="0">
<testcase name="start" classname="a11y.spec.ts" time="1.0"/>
<testcase name="about" classname="a11y.spec.ts" time="1.0"/>
</testsuite>
</testsuites>`;

describe("parseJunit", () => {
  it("counts the tests of Vitest's report and names the failures", () => {
    expect(parseJunit(vitest)).toEqual({
      tests: 3,
      passed: 1,
      failed: 1,
      skipped: 1,
      failures: ['src/a.test.ts › a > "breaks" — A'],
    });
  });

  it("counts errors as failures in Playwright's report", () => {
    expect(parseJunit(playwright)).toEqual({
      tests: 4,
      passed: 3,
      failed: 1,
      skipped: 0,
      failures: ["app-shell.spec.ts › reloads"],
    });
  });
});

describe("reports together", () => {
  let directory;
  afterEach(() => directory && rmSync(directory, { recursive: true, force: true }));

  it("adds up several reports", () => {
    expect(sumResults([parseJunit(vitest), parseJunit(playwright)])).toMatchObject({
      tests: 7,
      passed: 4,
      failed: 2,
      skipped: 1,
    });
  });

  it("reads files and refuses a missing one", () => {
    directory = mkdtempSync(join(tmpdir(), "junit-"));
    writeFileSync(join(directory, "a.xml"), vitest);
    expect(readJunit([join(directory, "a.xml")]).tests).toBe(3);
    expect(() => readJunit([join(directory, "b.xml")])).toThrow("JUnit report not found");
  });
});

describe("summaryMarkdown", () => {
  it("shows the counts and lists failed tests", () => {
    const markdown = summaryMarkdown("Unit tests", parseJunit(vitest));
    expect(markdown).toContain("### Unit tests: failed");
    expect(markdown).toContain("| 3 | 1 | 1 | 1 |");
    expect(markdown).toContain('- src/a.test.ts › a > "breaks" — A');
  });

  it("says passed when nothing failed", () => {
    const result = { tests: 1, passed: 1, failed: 0, skipped: 0, failures: [] };
    expect(summaryMarkdown("E2E", result)).toMatch(/^### E2E: passed\n/);
  });
});
