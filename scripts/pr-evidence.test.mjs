import { describe, expect, it } from "vitest";
import { sections } from "./common.mjs";
import { markerFor, renderComment } from "./evidence-comment.mjs";
import { messages } from "./review-record.mjs";
import {
  archiveProblems,
  checkEvidence,
  exemption,
  exemptions,
  isReleasePullRequest,
  parseDescription,
  parseNameStatus,
  report,
  reviewOf,
} from "./pr-evidence.mjs";

const head = "c".repeat(40);
const change = "bootstrap-app-and-ci";
/** The review hash of the head commit's content. */
const current = "8a04e6d2c517";
const earlier = "3f9c2a71b0de";

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

/** A record of two rounds: the first raises two findings, the second approves. */
const review = (overrides = {}) => {
  const parts = {
    title: "# Review\n",
    first: [
      "## Round 1",
      "",
      `Reviewed: ${earlier}`,
      "Verdict: changes requested",
      "",
      "### F1 Retry loop never ends",
      "",
      "- Where: scripts/evidence-branch.mjs:70",
      "- Problem: the loop has no limit.",
      "",
      "### F2 Rename a variable",
      "",
      "- Where: scripts/size.mjs:12",
      "- Problem: the name is vague.",
      "",
    ].join("\n"),
    last: [
      "## Round 2",
      "",
      `Reviewed: ${current}`,
      "Verdict: approved",
      "",
      "- F1: fixed",
      "- F2: declined — the name matches the design.",
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
    contentHash: (name) => (name === change ? current : "000000000000"),
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

  it("passes with a review of one round that has no findings", () => {
    const first = `## Round 1\n\nReviewed: ${current}\nVerdict: approved\n`;
    expect(problemsOf(withReview({ first, last: "" }))).toEqual([]);
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
      { check: 3, problem: messages.noRecord(change) },
      { check: 4, problem: messages.noRoundToCompare({ current, change }) },
    ]);
  });

  it("fails on a record in the format before rounds", () => {
    const old = `# Review\n\nReviewed commit: ${head}\n\n## Findings\n\nnone\n`;
    expect(problemsOf({ readReview: () => old })).toEqual([
      { check: 3, problem: messages.textBeforeRounds(`Reviewed commit: ${head}`) },
      { check: 3, problem: messages.unknownSection("Findings") },
      { check: 3, problem: messages.noRound() },
      { check: 4, problem: messages.noRoundToCompare({ current, change }) },
    ]);
  });

  it("fails on a problem of the record itself", () => {
    const last = `## Round 2\n\nReviewed: ${current}\nVerdict: approved\n\n- F1: fixed\n`;
    expect(problemsOf(withReview({ last }))).toEqual([
      { check: 3, problem: messages.notStated(2, "F2") },
    ]);
  });

  it("fails while the last round requests changes, and does not yet ask for coverage", () => {
    expect(problemsOf(withReview({ last: "", coverage: "", outside: "" }))).toEqual([
      { check: 3, problem: messages.changesRequested(1, ["F1", "F2"]) },
      {
        check: 4,
        problem: messages.stale({ round: 1, reviewed: earlier, current, change }),
      },
    ]);
  });

  it("fails when a listed requirement has no coverage row", () => {
    const coverage =
      "## Requirement coverage\n\n| ID | Implemented in | Test |\n| --- | --- | --- |\n| PROD-001 | a | b |\n";
    expect(problemsOf(withReview({ coverage }))).toEqual([
      { check: 3, problem: messages.notCovered("PROD-008") },
    ]);
  });

  it("fails without the coverage or the outside sections once approved", () => {
    expect(problemsOf(withReview({ coverage: "", outside: "" }))).toEqual([
      { check: 3, problem: messages.noCoverage() },
      { check: 3, problem: messages.noOutside() },
      { check: 3, problem: messages.notCovered("PROD-001") },
      { check: 3, problem: messages.notCovered("PROD-008") },
    ]);
  });
});

describe("4. reviewed content", () => {
  it("fails when the content changed after the last round, naming both hashes", () => {
    const changed = "1b2c3d4e5f60";
    expect(problemsOf({ contentHash: () => changed })).toEqual([
      {
        check: 4,
        problem: messages.stale({ round: 2, reviewed: current, current: changed, change }),
      },
    ]);
    expect(messages.stale({ round: 2, reviewed: current, current: changed, change })).toContain(
      `\`${current}\``,
    );
    expect(messages.stale({ round: 2, reviewed: current, current: changed, change })).toContain(
      `\`Reviewed: ${changed}\``,
    );
  });

  it("fails when the last round records no hash, naming that round's missing line (F7)", () => {
    const last = "## Round 2\n\nVerdict: approved\n\n- F1: fixed\n- F2: declined — fine.\n";
    expect(problemsOf(withReview({ last }))).toEqual([
      { check: 3, problem: messages.noHash(2) },
      { check: 4, problem: messages.lastRoundNoHash({ round: 2, current, change }) },
    ]);
  });

  it("fails, as check 3 does, when the description names no known change (F7)", () => {
    for (const line of ["", "Change: no-such\n"]) {
      const problems = problemsOf({ description: description({ change: line }) });
      expect(problems.filter((entry) => entry.check !== 1)).toEqual([
        { check: 3, problem: messages.noChangeRecord() },
        { check: 4, problem: messages.noChangeContent() },
      ]);
    }
    const markdown = report(problemsOf({ description: description({ change: "" }) }));
    expect(markdown).not.toContain("| 4 | Reviewed content | passed |");
    expect(markdown).not.toContain("| 3 | Review record | passed |");
  });
});

describe("the messages of checks 3 and 4", () => {
  // Checks 3 and 4 give no message but these, so testing each covers them all.
  const samples = {
    noRecord: [change],
    noRound: [],
    roundOrder: [3, 2],
    noHash: [2],
    noVerdict: [2],
    notAFinding: [1, "Notes"],
    raisedTwice: ["F2", 1, 2],
    unknownFinding: [2, "F7"],
    badOutcome: [2, "F1", "later"],
    outcomeInOwnRound: [1, "F1"],
    declinedWithoutReason: [2, "F2"],
    notFixedWithoutWhat: [2, "F1"],
    notStated: [3, "F1"],
    approvedButRaises: [2, ["F3"]],
    approvedButNotFixed: [2, ["F1"]],
    requestsWithoutCause: [2],
    changesRequested: [2, ["F1", "F3"]],
    noCoverage: [],
    noOutside: [],
    notCovered: ["PROD-001"],
    stale: [{ round: 2, reviewed: earlier, current, change }],
    noChangeRecord: [],
    noChangeContent: [],
    noRoundToCompare: [{ current, change }],
    lastRoundNoHash: [{ round: 2, current, change }],
    lastNotApproved: [2],
    unknownSection: ["Round 2 (again)"],
    repeatedSection: ["Requirement coverage"],
    textBeforeRounds: ["Notes `with` a | pipe"],
    repeatedLine: [2, "Verdict"],
    unknownLine: [2, "Looks good to me."],
    unknownHeading: [2, "#### F1 Hidden"],
    misplacedLine: [2, "under finding F1", "Verdict: approved"],
    repeatedNotes: [2],
    statedTwice: [2, "F1"],
    roundAfterClosing: [3],
    misplacedInClosing: ["Requirement coverage", "- F1: fixed"],
    headingInClosing: ["Outside the listed requirements", "### F2 Hidden"],
    unclosedFence: [12],
    htmlComment: [7],
  };

  it("are all sampled here", () => {
    expect(Object.keys(samples).toSorted()).toEqual(Object.keys(messages).toSorted());
  });

  for (const [name, args] of Object.entries(samples)) {
    const text = messages[name](...args);

    it(`name no particular skill: ${name}`, () => {
      // A skill is named only as "the review skill", never as code-review, /review and the like.
      expect(text).not.toMatch(/\w-review\b|\/review\b(?!\.md)/);
      expect(text.replaceAll("the review skill", "")).not.toMatch(/skill/i);
    });

    it(`keep placeholders in code, so that a summary does not render them as HTML: ${name}`, () => {
      expect(text.replaceAll(/`[^`]*`/g, "")).not.toMatch(/[<>|]/);
    });
  }
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
    expect(markdown).toContain("| 4 | Reviewed content | passed |");
    expect(markdown).toContain("| 6 | Numbers | passed |");
  });

  it("tells an incomplete review from an out-of-date one", () => {
    const stale = messages.stale({ round: 2, reviewed: earlier, current, change });
    const markdown = report(problemsOf({ contentHash: () => "1b2c3d4e5f60" }));
    expect(markdown).toContain("| 3 | Review record | passed |");
    expect(markdown).toContain(
      `| 4 | Reviewed content | ${messages.stale({ round: 2, reviewed: current, current: "1b2c3d4e5f60", change })} |`,
    );
    expect(stale).not.toContain("|");
  });

  it("shows the last round, its verdict and both hashes", () => {
    const state = reviewOf(input(), change);
    expect(report([], { review: state })).toContain(
      `Review: round 2, approved, read \`${current}\`; the content of this commit is \`${current}\`, the same.`,
    );
    expect(report([], { review: { ...state, current: "1b2c3d4e5f60" } })).toContain(
      "the content of this commit is `1b2c3d4e5f60`, different, so the review is out of date.",
    );
  });
});
