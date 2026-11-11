import { describe, expect, it } from "vitest";
import { markerFor, renderComment } from "./evidence-comment.mjs";
import {
  archiveProblems,
  checkEvidence,
  exemption,
  exemptions,
  isReleasePullRequest,
  parseDescription,
  parseNameStatus,
  parseReview,
  report,
  sections,
} from "./pr-evidence.mjs";

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

  it("fails on an open finding that shares its title with a fixed one", () => {
    const findings = `## Findings\n\n### Missing test\n- Where: a.ts:1\n\n### Missing test\n- Where: b.ts:1\n- Outcome: fixed in ${fix.slice(0, 7)}\n`;
    expect(problemsOf(withReview({ findings }))).toContainEqual({
      check: 3,
      problem: 'finding "Missing test" has no outcome (fixed in <sha> or declined)',
    });
  });

  it("does not take the next line as an empty reason", () => {
    const findings =
      "## Findings\n\n### F1 Style\n- Where: a.ts:1\n- Outcome: declined\n- Reason:\nnext line\n";
    expect(problemsOf(withReview({ findings }))).toContainEqual({
      check: 3,
      problem: 'finding "F1 Style" is declined without a reason',
    });
  });

  it("fails on a fix that is not a commit of the pull request", () => {
    const findings = "## Findings\n\n### F1 Bug\n- Where: a.ts:1\n- Outcome: fixed in deadbeef\n";
    expect(problemsOf(withReview({ findings }))).toContainEqual({
      check: 3,
      problem:
        'finding "F1 Bug" names the fix deadbeef, which is not a commit of this pull request',
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

  it("fails when a newer commit was pushed during the run", () => {
    expect(problemsOf({ latestSha: "f".repeat(40) })).toEqual([
      {
        check: 5,
        problem: "a newer commit fffffff was pushed; this run's evidence is for ccccccc",
      },
    ]);
    expect(problemsOf({ latestSha: head })).toEqual([]);
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
    expect(sections("intro\n## A\none\n### A1\ntwo\n## B\nthree\n## A\nfour", 2)).toEqual([
      { title: "A", content: "one\n### A1\ntwo\n" },
      { title: "B", content: "three\n" },
      { title: "A", content: "four\n" },
    ]);
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

describe("the release pull request", () => {
  const release = {
    headRef: "release-please--branches--main",
    author: "bot[bot]",
    botLogin: "bot[bot]",
    changedFiles: ["CHANGELOG.md", "package.json", ".release-please-manifest.json"],
  };

  it("is exempt from the checks", () => {
    expect(isReleasePullRequest(release)).toBe(true);
    expect(checkEvidence({ release: true })).toEqual([]);
  });

  it("is not exempt when it changes anything else, comes from another branch or author", () => {
    expect(
      isReleasePullRequest({ ...release, changedFiles: ["CHANGELOG.md", "src/ui/App.vue"] }),
    ).toBe(false);
    expect(isReleasePullRequest({ ...release, headRef: "feat/x" })).toBe(false);
    expect(isReleasePullRequest({ ...release, author: "someone" })).toBe(false);
    expect(isReleasePullRequest({ ...release, changedFiles: [] })).toBe(false);
  });
});

/** The files of an archived change that has a review record and no tasks. */
const noTasks = (path) => (path.endsWith("review.md") ? "# Review\n" : undefined);
/** In the head commit of a complete move, the change's old directory is gone. */
const nothingInFlight = () => false;

describe("the archive pull request", () => {
  const archived = "openspec/changes/archive/2026-11-12-some-change";
  const ticked = "# Tasks\n\n- [x] 1.1 Done\n- [x] 1.2 **(owner)** Merge\n";
  const archive = (overrides = {}) => ({
    headRef: "archive/some-change",
    author: "bot[bot]",
    botLogin: "bot[bot]",
    files: [
      { status: "D", path: "openspec/changes/some-change/tasks.md" },
      { status: "D", path: "openspec/changes/some-change/review.md" },
      { status: "D", path: "openspec/changes/some-change/specs/shell/spec.md" },
      { status: "A", path: `${archived}/tasks.md` },
      { status: "A", path: `${archived}/review.md` },
      { status: "A", path: `${archived}/specs/shell/spec.md` },
      { status: "M", path: "openspec/specs/shell/spec.md" },
      { status: "M", path: "docs/roadmap.md" },
    ],
    readFile: (path) =>
      ({ [`${archived}/tasks.md`]: ticked, [`${archived}/review.md`]: "# Review\n" })[path],
    exists: nothingInFlight,
    ...overrides,
  });
  /** Ticked tasks and a review record wherever they are read. */
  const complete = (path) => (path.endsWith("tasks.md") ? ticked : "# Review\n");
  const withFile = (status, path) => ({ files: [...archive().files, { status, path }] });

  /**
   * Builds the pull request as `gather` does: one unmet condition, so it is not exempt and
   * the six checks judge it (here they fail on the missing description and comment).
   */
  const judged = (overrides) => {
    const { archive: exempt, notArchive } = exemptions(archive(overrides));
    expect(exempt).toBe(false);
    expect(notArchive).toHaveLength(1);
    expect(checksOf({ archive: exempt, description: "", comment: undefined })).toEqual(
      expect.arrayContaining([1, 5]),
    );
    return notArchive[0];
  };

  it("is exempt from the checks when it meets every condition", () => {
    expect(archiveProblems(archive())).toEqual([]);
    const result = exemptions(archive());
    expect(result).toEqual({ release: false, archive: true, notArchive: [] });
    expect(checkEvidence({ ...input({ description: "", comment: undefined }), ...result })).toEqual(
      [],
    );
  });

  it("is judged when someone else opened it", () => {
    expect(judged({ author: "someone" })).toBe("it was opened by someone, not by the bot");
  });

  it("is judged when its branch is not an archive/ branch, without listing why", () => {
    expect(archiveProblems(archive({ headRef: "chore/archive" }))).toEqual([
      "its branch chore/archive does not start with archive/",
    ]);
    expect(exemptions(archive({ headRef: "chore/archive" }))).toMatchObject({
      archive: false,
      notArchive: [],
    });
  });

  it("is judged when it changes a file outside openspec/changes/, openspec/specs/ and the roadmap", () => {
    expect(judged(withFile("M", "scripts/pr-evidence.mjs"))).toBe(
      "it changes files outside openspec/changes/, openspec/specs/ and docs/roadmap.md: scripts/pr-evidence.mjs",
    );
    expect(judged(withFile("M", "docs/constitution.md"))).toContain("docs/constitution.md");
    expect(judged(withFile("M", "openspec/config.yaml"))).toContain("openspec/config.yaml");
  });

  it("is judged when it starts, edits or deletes a change it does not archive", () => {
    const message = "it adds, edits or deletes files of a change it does not archive: ";
    expect(judged(withFile("A", "openspec/changes/next/tasks.md"))).toBe(
      `${message}openspec/changes/next/tasks.md`,
    );
    expect(judged(withFile("M", "openspec/changes/next/design.md"))).toContain("next/design.md");
    expect(judged(withFile("D", "openspec/changes/next/tasks.md"))).toContain("next/tasks.md");
    expect(judged(withFile("M", "openspec/changes/some-change/tasks.md"))).toContain(
      "some-change/tasks.md",
    );
  });

  it("is judged when it edits or deletes what the archive already holds", () => {
    const old = "openspec/changes/archive/2026-01-01-old/review.md";
    expect(judged(withFile("M", old))).toBe(
      `it edits or deletes what the archive already holds: ${old}`,
    );
    expect(judged(withFile("D", old))).toContain(old);
    expect(judged(withFile("A", "openspec/changes/archive/notes.md"))).toContain("notes.md");
  });

  it("is judged when it adds to an older archived change instead of moving one", () => {
    const old = "openspec/changes/archive/2026-01-01-old";
    const files = [
      { status: "A", path: `${old}/note.md` },
      { status: "M", path: "docs/roadmap.md" },
    ];
    expect(judged({ files, readFile: complete })).toBe(
      `${old} is not moved from openspec/changes/old/`,
    );
  });

  it("is judged when the change is still in flight after the move", () => {
    expect(judged({ exists: (path) => path === "openspec/changes/some-change" })).toBe(
      "openspec/changes/some-change/ is still in flight after the move",
    );
  });

  it("is judged when it deletes a living spec or changes one no archived delta spec touches", () => {
    const message = "it deletes living specs or changes ones no archived delta spec touches: ";
    expect(judged(withFile("M", "openspec/specs/other/spec.md"))).toBe(
      `${message}openspec/specs/other/spec.md`,
    );
    const files = archive().files.map((file) =>
      file.path === "openspec/specs/shell/spec.md" ? { ...file, status: "D" } : file,
    );
    expect(judged({ files })).toBe(`${message}openspec/specs/shell/spec.md`);
  });

  /** An archived change's files with one more task, unticked. */
  const withTask = (task) => (path) =>
    path.endsWith("tasks.md") ? `${ticked}${task} 1.3 Later\n` : "# Review\n";
  const noReview = (path) => (path.endsWith("tasks.md") ? ticked : undefined);

  for (const task of ["- [ ]", "* [ ]", "+ [ ]", "-  [ ]", "1. [ ]", "2) [ ]"]) {
    it(`is judged when an archived change has an unticked task written "${task}"`, () => {
      expect(judged({ readFile: withTask(task) })).toBe(
        `${archived}/tasks.md has 1 unticked task(s)`,
      );
    });
  }

  it("is judged when an archived change has no review record or no tasks", () => {
    expect(judged({ readFile: noReview })).toBe(`${archived}/review.md does not exist`);
    expect(judged({ readFile: noTasks })).toBe(`${archived}/tasks.md does not exist`);
  });

  it("is judged when it moves no change into the archive", () => {
    const files = [{ status: "M", path: "docs/roadmap.md" }];
    expect(judged({ files })).toBe("it moves no change into openspec/changes/archive/");
  });

  it("names its exemption in the report", () => {
    expect(exemption({ archive: true })).toContain("archive pull request");
    expect(exemption({ release: true })).toContain("release pull request");
    expect(exemption({})).toBeUndefined();
    expect(report([], { exempt: exemption({ archive: true }) })).toContain(
      "Exempt: the archive pull request",
    );
  });

  it("lists in the report why an archive/ branch is not exempt", () => {
    const markdown = report([{ check: 1, problem: "x" }], {
      notArchive: ["it was opened by someone, not by the bot"],
    });
    expect(markdown).toContain(
      "Not exempt as an archive pull request:\n- it was opened by someone, not by the bot",
    );
  });
});

describe("the changed files", () => {
  it("are read from NUL-separated git output, with names git would quote", () => {
    expect(parseNameStatus("D\0openspec/a b.md\0A\0src/ui/Ünï.vue\0")).toEqual([
      { status: "D", path: "openspec/a b.md" },
      { status: "A", path: "src/ui/Ünï.vue" },
    ]);
    expect(parseNameStatus("")).toEqual([]);
  });

  it("make the release pull request exempt through the same wiring", () => {
    const files = [
      { status: "M", path: "CHANGELOG.md" },
      { status: "M", path: "package.json" },
    ];
    expect(
      exemptions({
        headRef: "release-please--branches--main",
        author: "bot[bot]",
        botLogin: "bot[bot]",
        files,
        readFile: noTasks,
        exists: nothingInFlight,
      }),
    ).toMatchObject({ release: true, archive: false, notArchive: [] });
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
