import { describe, expect, it } from "vitest";
import { parseNameStatus, sections } from "./common.mjs";
import { markerFor, renderComment } from "./evidence-comment.mjs";
import { messages } from "./review-record.mjs";
import {
  archiveProblems,
  checkEvidence,
  exemption,
  isReleasePullRequest,
  parseDescription,
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
      "Severity: critical",
      "- Where: scripts/evidence-branch.mjs:70",
      "- Problem: the loop has no limit.",
      "",
      "### F2 Rename a variable",
      "",
      "Severity: minor",
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

const archived = `openspec/changes/archive/2026-11-12-${change}`;
const ticked = "# Tasks\n\n- [x] 1.1 Done\n- [x] 1.2 **(owner)** Merge\n";
/** What the head commit archives when it moves `change`, as `gather` reads it. */
const archiveCommit = (overrides = {}) => ({
  change,
  directory: `2026-11-12-${change}`,
  parent: "p".repeat(40),
  files: [
    { status: "D", path: `openspec/changes/${change}/tasks.md` },
    { status: "D", path: `openspec/changes/${change}/review.md` },
    { status: "D", path: `openspec/changes/${change}/specs/shell/spec.md` },
    { status: "A", path: `${archived}/tasks.md` },
    { status: "A", path: `${archived}/review.md` },
    { status: "A", path: `${archived}/specs/shell/spec.md` },
    { status: "M", path: "openspec/specs/shell/spec.md" },
    { status: "M", path: "docs/roadmap.md" },
  ],
  // The file of the same path name at the parent has the same blob, tasks.md aside.
  blob: (path) => `blob:${path.slice(archived.length)}`,
  parentBlob: (path) => `blob:${path.slice(`openspec/changes/${change}`.length)}`,
  ...overrides,
});
/** The files of the archive commit's head: the archived tasks and record. */
const archivedFiles = (path) =>
  ({ [`${archived}/tasks.md`]: ticked, [`${archived}/review.md`]: "# Review\n" })[path];

/** A pull request that passes every check; each test breaks one thing. */
function input(overrides = {}) {
  return {
    description: description(),
    headSha: head,
    changes: ["other-change"],
    archive: archiveCommit(),
    readFile: archivedFiles,
    deltaSpecIds: (name) => (name === change ? ["PROD-001", "PROD-008"] : ["CHK-001"]),
    testedIds: new Set(["PROD-001", "PROD-008", "CHK-001"]),
    readReview: (name) => (name === change ? review() : undefined),
    contentHash: (name) => (name === change ? current : "000000000000"),
    changedFiles: ["src/ui/App.vue", "scripts/size.mjs", `${archived}/review.md`],
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

  it("reads the delta specs and the record of the change from the archive", () => {
    const seen = [];
    problemsOf({
      deltaSpecIds: (name) => (seen.push(name), ["PROD-001", "PROD-008"]),
      readReview: (name) => (seen.push(name), review()),
    });
    expect(seen).toEqual([change, change]);
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

  it("fails when the change is neither in flight nor archived by the head commit", () => {
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
      { check: 3, problem: messages.noRound() },
      { check: 4, problem: messages.noRoundToCompare({ current, change }) },
    ]);
  });

  it("fails on a finding without a severity", () => {
    const first = review().split("\n## Round 2")[0].replace("Severity: critical\n", "");
    expect(problemsOf(withReview({ first }))).toEqual([
      { check: 3, problem: messages.noSeverity(1, "F1") },
    ]);
  });

  it("fails on a problem of the record itself", () => {
    const last = `## Round 2\n\nReviewed: ${current}\nVerdict: approved\n\n- F1: fixed\n`;
    expect(problemsOf(withReview({ last }))).toEqual([
      { check: 3, problem: messages.notStated(2, "F2") },
    ]);
  });

  it("fails while the last round requests changes", () => {
    expect(problemsOf(withReview({ last: "" }))).toEqual([
      { check: 3, problem: messages.changesRequested(1, ["F1", "F2"]) },
      {
        check: 4,
        problem: messages.stale({ round: 1, reviewed: earlier, current, change }),
      },
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
    stale: [{ round: 2, reviewed: earlier, current, change }],
    noChangeRecord: [],
    noChangeContent: [],
    noRoundToCompare: [{ current, change }],
    lastRoundNoHash: [{ round: 2, current, change }],
    lastNotApproved: [2],
    repeatedLine: [2, "Verdict"],
    statedTwice: [2, "F1"],
    noSeverity: [1, "F1"],
    repeatedSeverity: [1, "F1"],
    badSeverity: [1, "F1", "major `x` | y"],
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
  it("names its exemption in the report, and no other pull request has one", () => {
    expect(exemption({ release: true })).toContain("release pull request");
    expect(exemption({})).toBeUndefined();
    expect(report([], { exempt: exemption({ release: true }) })).toContain(
      "Exempt: the release pull request",
    );
  });

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

const problemsWith = (overrides) =>
  archiveProblems({
    change,
    archive: archiveCommit(),
    inFlight: false,
    readFile: archivedFiles,
    ...overrides,
  });
const withFile = (status, path) => ({
  archive: archiveCommit({ files: [...archiveCommit().files, { status, path }] }),
});

/** The files of an archived change with one more task, unticked. */
const withTask = (task) => (path) =>
  path.endsWith("tasks.md") ? `${ticked}${task} 1.3 Later\n` : "# Review\n";

describe("7. archive (workflow-retro D2)", () => {
  it("passes for the archive commit of the change", () => {
    expect(problemsWith({})).toEqual([]);
    expect(checksOf({})).toEqual([]);
  });

  it("fails before the archive commit, telling what to do, and keeps checks 1 to 4 as they were", () => {
    const problems = problemsOf({ archive: undefined, changes: [change, "other-change"] });
    expect(problems).toEqual([
      {
        check: 7,
        problem: `the last commit does not archive \`${change}\`: when the review approves and validation passes, run \`openspec archive\` as the last commit (docs/process.md, step 6)`,
      },
    ]);
  });

  it("fails when the last commit archives another change", () => {
    expect(
      problemsOf({ changes: [change], archive: archiveCommit({ change: "other-change" }) }),
    ).toContainEqual(expect.objectContaining({ check: 7 }));
  });

  it("fails when the commit changes a file other than the move, the living specs of the delta specs and the roadmap", () => {
    for (const [status, path] of [
      ["M", "scripts/pr-evidence.mjs"],
      ["M", "openspec/specs/other/spec.md"],
      ["D", "openspec/specs/shell/spec.md"],
      ["M", `openspec/changes/${change}/design.md`],
      ["A", "openspec/changes/archive/2026-01-01-old/review.md"],
      ["D", "docs/roadmap.md"],
    ]) {
      const named = problemsWith(withFile(status, path)).some((problem) => problem.includes(path));
      expect([path, named]).toEqual([path, true]);
    }
    const outside = problemsWith(withFile("M", "docs/constitution.md"));
    expect(outside).toEqual([
      "it changes more than the move of the change, the living specs of its delta specs and docs/roadmap.md: docs/constitution.md",
    ]);
  });

  it("fails when an archived file differs from the file it replaces, tasks.md excepted", () => {
    const edited = archiveCommit({
      blob: (path) =>
        path.endsWith("review.md") ? "edited" : `blob:${path.slice(archived.length)}`,
    });
    expect(problemsWith({ archive: edited })).toEqual([
      `${archived}/review.md differs from openspec/changes/${change}/review.md`,
    ]);
    const ticks = archiveCommit({ blob: (path) => (path.endsWith("tasks.md") ? "ticked" : "x") });
    expect(problemsWith({ archive: ticks })).not.toContainEqual(
      expect.stringContaining("tasks.md"),
    );
  });

  it("fails when the archive holds a file the change did not have, or drops one", () => {
    const added = withFile("A", `${archived}/notes.md`);
    expect(
      problemsWith({ ...added, archive: { ...added.archive, parentBlob: () => undefined } }),
    ).toContainEqual(`${archived}/notes.md is new: the archive commit only moves files`);
    const dropped = archiveCommit({
      files: archiveCommit().files.filter((file) => file.path !== `${archived}/review.md`),
    });
    expect(problemsWith({ archive: dropped })).toContainEqual(
      `openspec/changes/${change}/review.md is deleted and not archived`,
    );
  });

  for (const task of ["- [ ]", "* [ ]", "+ [ ]", "-  [ ]", "1. [ ]", "2) [ ]"]) {
    it(`fails when the archived tasks have an unticked task written "${task}"`, () => {
      expect(problemsWith({ readFile: withTask(task) })).toEqual([
        `${archived}/tasks.md has 1 unticked task(s)`,
      ]);
    });
  }

  it("fails without the archived record or tasks", () => {
    expect(
      problemsWith({ readFile: (path) => (path.endsWith("tasks.md") ? ticked : undefined) }),
    ).toEqual([`${archived}/review.md does not exist`]);
    expect(
      problemsWith({ readFile: (path) => (path.endsWith("review.md") ? "# Review\n" : undefined) }),
    ).toEqual([`${archived}/tasks.md does not exist`]);
  });

  it("fails when the change is still in flight at the head", () => {
    expect(problemsWith({ inFlight: true })).toEqual([
      `openspec/changes/${change}/ is still in flight after the archive`,
    ]);
  });

  it("is not asked when the description names no known change", () => {
    expect(checksOf({ description: description({ change: "" }), archive: undefined })).toEqual([
      1, 3, 4,
    ]);
  });
});

describe("a pull request without code (workflow-retro D4)", () => {
  const docsOnly = {
    changedFiles: ["docs/process.md", `${archived}/review.md`],
    comment: undefined,
    metrics: undefined,
    comparison: undefined,
  };

  it("needs neither screenshots nor numbers", () => {
    expect(problemsOf(docsOnly)).toEqual([]);
    expect(problemsOf({ ...docsOnly, changedFiles: [".claude/agents/reviewer.md"] })).toEqual([]);
  });

  it("still fails when a newer commit was pushed", () => {
    expect(problemsOf({ ...docsOnly, latestSha: "f".repeat(40) })).toEqual([
      {
        check: 5,
        problem: "a newer commit fffffff was pushed; this run's evidence is for ccccccc",
      },
    ]);
  });

  it("does not trust the workflow: a pull request with code and no evidence fails both checks", () => {
    expect(checksOf({ ...docsOnly, changedFiles: ["docs/process.md", "src/ui/App.vue"] })).toEqual([
      5, 6,
    ]);
    expect(checksOf({ ...docsOnly, changedFiles: [".github/workflows/checks.yml"] })).toEqual([
      5, 6,
    ]);
  });

  it("still judges the review and the archive", () => {
    expect(
      checksOf({
        ...docsOnly,
        contentHash: () => "1b2c3d4e5f60",
        changes: [change],
        archive: undefined,
      }),
    ).toEqual([4, 7]);
  });

  it("says in the report that checks 5 and 6 do not apply", () => {
    const markdown = report([], { noCode: true });
    expect(markdown).toContain(
      "| 5 | Screenshots | not applicable: no file the build or tests read changed |",
    );
    expect(markdown).toContain(
      "| 6 | Numbers | not applicable: no file the build or tests read changed |",
    );
    expect(markdown).toContain("| 7 | Archive | passed |");
    expect(report([{ check: 5, problem: "x" }], { noCode: true })).toContain(
      "| 5 | Screenshots | x |",
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
});

describe("report", () => {
  it("lists every check with its result", () => {
    const markdown = report([{ check: 3, problem: "review.md does not exist" }]);
    expect(markdown).toContain("| 1 | Description | passed |");
    expect(markdown).toContain("| 3 | Review record | review.md does not exist |");
    expect(markdown).toContain("| 4 | Reviewed content | passed |");
    expect(markdown).toContain("| 6 | Numbers | passed |");
    expect(markdown).toContain("| 7 | Archive | passed |");
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
