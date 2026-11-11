import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  checkTraceability,
  isSpecFile,
  isTestFile,
  parseRequirements,
  parseTestedIds,
} from "./traceability.mjs";

const roots = [];

function repository(files) {
  const root = mkdtempSync(join(tmpdir(), "traceability-"));
  roots.push(root);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const spec = (...titles) =>
  titles.map((title) => `### Requirement: ${title}\n\nText.\n`).join("\n");

describe("parseRequirements", () => {
  it("takes the ID from the start of each requirement title", () => {
    expect(parseRequirements(spec("PROD-001 Single window", "CHK-012 Typos"))).toEqual({
      ids: ["PROD-001", "CHK-012"],
      untitled: [],
    });
  });

  it("reports a requirement title without an ID", () => {
    expect(parseRequirements(spec("Single window", "Window PROD-001")).untitled).toEqual([
      "Single window",
      "Window PROD-001",
    ]);
  });

  it("ignores other headings", () => {
    expect(parseRequirements("## Purpose\n#### Scenario: PROD-001 x\n")).toEqual({
      ids: [],
      untitled: [],
    });
  });
});

describe("parseTestedIds", () => {
  it("finds every @req tag", () => {
    expect(parseTestedIds('test("@req PROD-001 a", () => {}); // @req CHK-005\n')).toEqual([
      "PROD-001",
      "CHK-005",
    ]);
  });

  it("ignores IDs without the tag", () => {
    expect(parseTestedIds("PROD-001 @req lowercase-001")).toEqual([]);
  });
});

describe("file selection", () => {
  it("reads living specs and changes in flight, not archived changes", () => {
    expect(isSpecFile("openspec/specs/app-shell/spec.md")).toBe(true);
    expect(isSpecFile("openspec/changes/x/specs/app-shell/spec.md")).toBe(true);
    expect(isSpecFile("openspec/changes/archive/x/specs/app-shell/spec.md")).toBe(false);
    expect(isSpecFile("openspec/changes/x/design.md")).toBe(false);
  });

  it("reads unit and end-to-end tests", () => {
    expect(isTestFile("src/domain/a.test.ts")).toBe(true);
    expect(isTestFile("e2e/a.spec.ts")).toBe(true);
    expect(isTestFile("scripts/a.test.mjs")).toBe(true);
    expect(isTestFile("src/domain/a.ts")).toBe(false);
  });
});

describe("checkTraceability", () => {
  it("passes when every requirement is named by a test", () => {
    const root = repository({
      "openspec/specs/app-shell/spec.md": spec("PROD-001 Single window"),
      "openspec/changes/c/specs/app-shell/spec.md": spec("PROD-008 Addressable views"),
      "e2e/shell.spec.ts": 'test("@req PROD-001 window", () => {});',
      "src/ui/router.test.ts": 'it("@req PROD-008 address", () => {});',
    });
    expect(checkTraceability(root)).toEqual({
      required: ["PROD-001", "PROD-008"],
      tested: ["PROD-001", "PROD-008"],
      problems: [],
    });
  });

  it("fails when a requirement is named by no test", () => {
    const root = repository({
      "openspec/changes/c/specs/app-shell/spec.md": spec("PROD-001 Single window", "PROD-008 X"),
      "e2e/shell.spec.ts": 'test("@req PROD-001 window", () => {});',
    });
    expect(checkTraceability(root).problems).toEqual([
      "PROD-008 (openspec/changes/c/specs/app-shell/spec.md) is named by no test (@req PROD-008)",
    ]);
  });

  it("fails when a requirement title has no ID", () => {
    const root = repository({ "openspec/specs/a/spec.md": spec("Single window") });
    expect(checkTraceability(root).problems).toEqual([
      'openspec/specs/a/spec.md: requirement "Single window" has no ID at the start of its title',
    ]);
  });

  it("does not count an ID that is only mentioned in a source file", () => {
    const root = repository({
      "openspec/specs/a/spec.md": spec("PROD-001 Single window"),
      "src/ui/router.ts": "// @req PROD-001",
      "node_modules/x/a.test.ts": "// @req PROD-001",
    });
    expect(checkTraceability(root).problems).toHaveLength(1);
  });

  it("does not count tags in the tests of these scripts, which use them as fixtures", () => {
    const root = repository({
      "openspec/specs/a/spec.md": spec("PROD-001 Single window"),
      "scripts/x.test.mjs": 'it("@req PROD-001", () => {});',
    });
    expect(checkTraceability(root).problems).toHaveLength(1);
  });

  it("ignores archived changes and passes with no specification at all", () => {
    const root = repository({
      "openspec/changes/archive/old/specs/a/spec.md": spec("PROD-001 Single window"),
    });
    expect(checkTraceability(root).problems).toEqual([]);
  });
});
