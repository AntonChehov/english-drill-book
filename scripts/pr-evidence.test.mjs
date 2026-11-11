import { describe, expect, it } from "vitest";
import { markerFor, renderComment } from "./evidence-comment.mjs";
import { checkEvidence, parseDescription, parseReview, report, sections } from "./pr-evidence.mjs";

const head = "c".repeat(40);
const reviewed = "a".repeat(40);
const fix = "b".repeat(40);
const change = "bootstrap-app-and-ci";
const changeDir = `openspec/changes/${change}`;

const description = (overrides = {}) => {
  const parts = {
    problem: "## Problem\n\nNothing builds yet.\n",
    solution: "## Solution\n\nA project and its pipeline.\n",
    requirements: "## Requirements\n\n- PROD-001\n- PROD-008\n",
    selfReview: "## Self-review\n\n- pnpm verify\n",
    change: `Change: ${change}\n`,
    extra: "",
    ...overrides,
  };
  return Object.values(parts).join("\n");
};

const review = (overrides = {}) => {
  const parts = {
    title: "# Review\n",
    reviewed: `Reviewed commit: ${reviewed}\n`,
    findings: [
      "## Findings",
      "",
      "### F1 Retry loop never ends",
      "- Where: scripts/evidence-branch.mjs:70",
      `- Outcome: fixed in ${fix.slice(0, 7)}`,
      "",
      "### F2 Rename a variable",
      "- Where: scripts/size.mjs:12",
      "- Outcome: declined",
      "- Reason: the name matches the design.",
      "",
    ].join("\n"),
    coverage: [
      "## Requirement coverage",
      "",
      "| ID | Implemented in | Test |",
      "| --- | --- | --- |",
      "| PROD-001 | src/ui/App.vue | e2e/app-shell.spec.ts |",
      "| PROD-008 | src/ui/router.ts | e2e/app-shell.spec.ts |",
      "",
    ].join("\n"),
    outside: "## Outside the listed requirements\n\nThe CI pipeline.\n",
    ...overrides,
  };
  return Object.values(parts).join("\n");
};

const metrics = {
  sha: head,
  tests: {
    unit: { tests: 1, passed: 1, failed: 0, skipped: 0 },
    e2e: { tests: 1, passed: 1, failed: 0, skipped: 0 },
  },
  coverage: { lines: 100, branches: 100 },
  size: { js: { gzip: 1 }, css: { gzip: 1 } },
  lighthouse: { performance: 100, accessibility: 100 },
};

const comparison = [{ file: "start-light-1280.png", status: "added" }];

const comment = (sha = head) => ({
  body: renderComment({
    sha,
    metrics,
    mainMetrics: {},
    comparison,
    urls: { before: (file) => file, after: (file) => file },
  }),
});

/** A pull request that passes every check; each test breaks one thing. */
function input(overrides = {}) {
  return {
    description: description(),
    headSha: head,
    changes: [change, "other-change"],
    deltaSpecIds: (name) => (name === change ? ["PROD-001", "PROD-008"] : ["CHK-001"]),
    testedIds: new Set(["PROD-001", "PROD-008", "CHK-001"]),
    readReview: (name) => (name === change ? review() : undefined),
    commits: [
      { sha: "1".repeat(40), files: ["src/ui/App.vue"] },
      { sha: reviewed, files: ["scripts/size.mjs"] },
      { sha: fix, files: ["scripts/evidence-branch.mjs"] },
      { sha: head, files: [`${changeDir}/review.md`, `${changeDir}/tasks.md`] },
    ],
    changedFiles: ["src/ui/App.vue", "scripts/size.mjs"],
    comment: comment(),
    metrics,
    comparison,
    ...overrides,
  };
}

const withReview = (overrides) => ({ readReview: () => review(overrides) });
const problemsOf = (overrides) => checkEvidence(input(overrides));
const checksOf = (overrides) => [...new Set(problemsOf(overrides).map((entry) => entry.check))];

describe("a complete pull request", () => {
  it("passes every check", () => {
    expect(problemsOf()).toEqual([]);
  });

  it("passes with a review that has no findings", () => {
    const commits = input().commits.filter((commit) => commit.sha !== fix);
    expect(problemsOf({ ...withReview({ findings: "## Findings\n\nnone\n" }), commits })).toEqual(
      [],
    );
  });

  it("passes without requirements when the description says none", () => {
    const text = description({ requirements: "## Requirements\n\nNone.\n" });
    expect(problemsOf({ description: text })).toEqual([]);
  });
});

describe("1. description", () => {
  for (const [section, key] of [
    ["Problem", "problem"],
    ["Solution", "solution"],
    ["Requirements", "requirements"],
    ["Self-review", "selfReview"],
  ]) {
    it(`fails without the section ${section}`, () => {
      const problems = problemsOf({ description: description({ [key]: "" }) });
      expect(problems).toContainEqual({
        check: 1,
        problem: `the description has no section "${section}"`,
      });
    });
  }

  it("fails on an empty section", () => {
    const problems = problemsOf({ description: description({ solution: "## Solution\n\n" }) });
    expect(problems).toContainEqual({
      check: 1,
      problem: 'the description has no section "Solution"',
    });
  });

  it("fails without a Change line", () => {
    expect(problemsOf({ description: description({ change: "" }) })).toContainEqual({
      check: 1,
      problem: "the description has no line `Change: <name>`",
    });
  });

  it("fails when the change does not exist", () => {
    expect(
      problemsOf({ description: description({ change: "Change: no-such\n" }) }),
    ).toContainEqual({
      check: 1,
      problem: "openspec/changes/no-such/ does not exist",
    });
  });
});

describe("2. requirements", () => {
  it("fails on an ID that is not in the change's delta specs", () => {
    const text = description({ requirements: "## Requirements\n\n- PROD-001\n- CHK-001\n" });
    expect(problemsOf({ description: text })).toContainEqual({
      check: 2,
      problem: `CHK-001 is not in the delta specs of ${change}`,
    });
  });

  it("fails on an ID that no test names", () => {
    expect(problemsOf({ testedIds: new Set(["PROD-001"]) })).toContainEqual({
      check: 2,
      problem: "PROD-008 is named by no test (@req PROD-008)",
    });
  });

  it("fails on a Requirements section with neither IDs nor none", () => {
    const text = description({ requirements: "## Requirements\n\nThe shell.\n" });
    expect(checksOf({ description: text })).toEqual([2]);
  });
});

describe("3. review record", () => {
  it("fails without review.md", () => {
    expect(problemsOf({ readReview: () => undefined })).toEqual([
      { check: 3, problem: `${changeDir}/review.md does not exist` },
    ]);
  });

  it("fails on a finding without an outcome", () => {
    const findings = "## Findings\n\n### F1 Open\n- Where: a.ts:1\n";
    expect(problemsOf(withReview({ findings }))).toContainEqual({
      check: 3,
      problem: 'finding "F1 Open" has no outcome (fixed in <sha> or declined)',
    });
  });

  it("fails on an outcome that is neither fixed nor declined", () => {
    const findings = "## Findings\n\n### F1 Open\n- Where: a.ts:1\n- Outcome: later\n";
    expect(checksOf(withReview({ findings }))).toContain(3);
  });

  it("fails on a declined finding without a reason", () => {
    const findings =
      "## Findings\n\n### F1 Style\n- Where: a.ts:1\n- Outcome: declined\n- Reason:\n";
    expect(problemsOf(withReview({ findings }))).toContainEqual({
      check: 3,
      problem: 'finding "F1 Style" is declined without a reason',
    });
  });

  it("fails without the reviewed commit", () => {
    expect(problemsOf(withReview({ reviewed: "" }))).toContainEqual({
      check: 3,
      problem: "review.md has no line `Reviewed commit: <sha>`",
    });
  });

  it("fails without the Findings section, or when it is empty", () => {
    expect(problemsOf(withReview({ findings: "" }))).toContainEqual({
      check: 3,
      problem: "review.md has no section `## Findings`",
    });
    expect(problemsOf(withReview({ findings: "## Findings\n\n" }))).toContainEqual({
      check: 3,
      problem: "`## Findings` lists no finding and does not say `none`",
    });
  });

  it("fails when a listed requirement has no coverage row", () => {
    const coverage =
      "## Requirement coverage\n\n| ID | Implemented in | Test |\n| --- | --- | --- |\n| PROD-001 | a | b |\n";
    expect(problemsOf(withReview({ coverage }))).toContainEqual({
      check: 3,
      problem: "review.md does not state where PROD-008 is implemented and tested",
    });
  });

  it("fails without the coverage or the outside sections", () => {
    const problems = problemsOf(withReview({ coverage: "", outside: "" })).map(
      (entry) => entry.problem,
    );
    expect(problems).toContain("review.md has no section `## Requirement coverage`");
    expect(problems).toContain(
      "review.md has no section `## Outside the listed requirements` with content",
    );
  });
});

describe("4. commits after the review", () => {
  it("fails on a commit after the review that is not a recorded fix", () => {
    const commits = [...input().commits, { sha: "d".repeat(40), files: ["src/ui/App.vue"] }];
    expect(problemsOf({ commits, headSha: "d".repeat(40) })).toContainEqual({
      check: 4,
      problem: `commit ddddddd after the reviewed commit is neither a recorded fix nor limited to ${changeDir}/`,
    });
  });

  it("fails when a commit touches the change's directory and code", () => {
    const commits = input().commits.map((commit) =>
      commit.sha === head ? { ...commit, files: [...commit.files, "src/ui/App.vue"] } : commit,
    );
    expect(checksOf({ commits })).toEqual([4]);
  });

  it("fails when the reviewed commit is not in the pull request", () => {
    const commits = input().commits.filter((commit) => commit.sha !== reviewed);
    expect(problemsOf({ commits })).toContainEqual({
      check: 4,
      problem: `the reviewed commit ${reviewed} is not a commit of this pull request`,
    });
  });
});

describe("5. screenshots", () => {
  it("fails without the evidence comment", () => {
    const problems = problemsOf({ comment: undefined });
    expect(problems).toContainEqual({
      check: 5,
      problem: "the evidence comment with the screenshots does not exist",
    });
  });

  it("fails when the comment belongs to an older commit", () => {
    expect(problemsOf({ comment: comment("e".repeat(40)) })).toContainEqual({
      check: 5,
      problem: "the evidence comment belongs to eeeeeee, not to the head commit",
    });
  });

  it("fails without screenshots", () => {
    expect(checksOf({ comparison: undefined })).toEqual([5]);
    expect(checksOf({ comparison: [] })).toEqual([5]);
  });

  it("fails when src/ui changed but no view differs and the description is silent", () => {
    const unchanged = [{ file: "start-light-1280.png", status: "unchanged", share: 0 }];
    expect(checksOf({ comparison: unchanged })).toEqual([5]);
  });

  it("passes such a change when the description says Visual changes: none", () => {
    const unchanged = [{ file: "start-light-1280.png", status: "unchanged", share: 0 }];
    const text = description({ extra: "Visual changes: none\n" });
    expect(problemsOf({ comparison: unchanged, description: text })).toEqual([]);
  });

  it("does not ask about visual changes when src/ui did not change", () => {
    const unchanged = [{ file: "start-light-1280.png", status: "unchanged", share: 0 }];
    expect(problemsOf({ comparison: unchanged, changedFiles: ["scripts/size.mjs"] })).toEqual([]);
  });
});

describe("6. numbers", () => {
  it("fails without metrics.json", () => {
    expect(problemsOf({ metrics: undefined })).toEqual([
      { check: 6, problem: "metrics.json does not exist" },
    ]);
  });

  it("fails when metrics.json belongs to another commit", () => {
    expect(problemsOf({ metrics: { ...metrics, sha: "e".repeat(40) } })).toEqual([
      { check: 6, problem: "metrics.json does not belong to the head commit" },
    ]);
  });

  for (const [name, broken] of [
    ["unit test results", { tests: { e2e: metrics.tests.e2e } }],
    ["end-to-end test results", { tests: { unit: metrics.tests.unit } }],
    ["coverage of src/domain", { coverage: undefined }],
    ["bundle sizes", { size: undefined }],
    ["Lighthouse scores", { lighthouse: {} }],
  ]) {
    it(`fails without ${name}`, () => {
      expect(problemsOf({ metrics: { ...metrics, ...broken } })).toEqual([
        { check: 6, problem: `metrics.json has no ${name}` },
      ]);
    });
  }

  it("fails when the comment does not show a number", () => {
    const body = comment().body.replace("| Lighthouse performance |", "| Lighthouse |");
    expect(problemsOf({ comment: { body } })).toEqual([
      { check: 6, problem: 'the evidence comment does not show "Lighthouse performance"' },
    ]);
  });
});

describe("parsing", () => {
  it("splits Markdown into sections of one heading level", () => {
    expect(sections("intro\n## A\none\n### A1\ntwo\n## B\nthree", 2)).toEqual({
      A: "one\n### A1\ntwo\n",
      B: "three\n",
    });
  });

  it("reads a description written with level-three headings and a quoted change name", () => {
    const text =
      "### Problem\nx\n### Solution\ny\n### Requirements\n- PROD-001\n### Self-review\nz\nChange: `c`\n";
    expect(parseDescription(text)).toMatchObject({
      missingSections: [],
      change: "c",
      requirementIds: ["PROD-001"],
    });
  });

  it("reads the findings of a review record", () => {
    expect(parseReview(review())).toMatchObject({
      reviewedCommit: reviewed,
      findings: [
        {
          title: "F1 Retry loop never ends",
          where: "scripts/evidence-branch.mjs:70",
          fixedIn: fix.slice(0, 7),
        },
        { title: "F2 Rename a variable", declined: true, reason: "the name matches the design." },
      ],
      problems: [],
    });
  });

  it("ignores the marker of a comment quoted inside another", () => {
    expect(checksOf({ comment: { body: `> ${markerFor(head)}` } })).toEqual([5]);
  });
});

describe("report", () => {
  it("lists every check with its result", () => {
    const markdown = report([{ check: 3, problem: "review.md does not exist" }]);
    expect(markdown).toContain("| 1 | Description | passed |");
    expect(markdown).toContain("| 3 | Review record | review.md does not exist |");
    expect(markdown).toContain("| 6 | Numbers | passed |");
  });
});
