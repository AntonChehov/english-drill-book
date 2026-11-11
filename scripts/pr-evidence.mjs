#!/usr/bin/env node
// The evidence check of constitution C-18 (design D9). Fails a pull request unless, for its
// head commit:
//   1. the description has the sections Problem, Solution, Requirements and Self-review and a
//      line `Change: <name>` naming a directory under openspec/changes/;
//   2. every ID under Requirements is in that change's delta specs and named by a test;
//   3. openspec/changes/<name>/review.md is a record in rounds whose last round is approved,
//      with every finding fixed or declined with a reason (review-rounds design D2, D3);
//   4. the hash the last round reviewed equals the hash of this commit's content (D1, D3);
//   5. the screenshot comment is for this commit, and a change under src/ui shows a visual
//      difference or the description says `Visual changes: none`;
//   6. metrics.json is for this commit and the comment shows every number.
// Two pull requests implement no change and are exempt: the release pull request
// (bootstrap design D9) and the archive pull request (pipeline-follow-ups design D1).
// Usage: node scripts/pr-evidence.mjs [--metrics metrics.json] [--comparison comparison.json]
// Environment: GITHUB_REPOSITORY, PR_NUMBER, EVIDENCE_TOKEN, BOT_LOGIN, GITHUB_API_URL (optional).
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { appendSummary, isMain, readJson, requireEnv, sections } from "./common.mjs";
import { commentSha, rows } from "./evidence-comment.mjs";
import { createGithub } from "./github.mjs";
import { reviewHash } from "./review-hash.mjs";
import { changeNamedIn, messages, parseRecord, reviewLine } from "./review-record.mjs";
import { checkTraceability, parseRequirements } from "./traceability.mjs";

const requirementId = /\b[A-Z][A-Z0-9]*-\d{3}\b/g;
export const requiredSections = ["Problem", "Solution", "Requirements", "Self-review"];

/** What the release pull request of release-please changes (design D10). */
export const releaseFiles = ["CHANGELOG.md", "package.json", ".release-please-manifest.json"];

/**
 * The release pull request implements no OpenSpec change: it only records a version and
 * the changelog generated from history. It is exempt when the bot opened it from a
 * release-please branch and it changes nothing else.
 */
export function isReleasePullRequest({ headRef, author, botLogin, changedFiles }) {
  return (
    headRef.startsWith("release-please--") &&
    author === botLogin &&
    changedFiles.length > 0 &&
    changedFiles.every((file) => releaseFiles.includes(file))
  );
}

const changesRoot = "openspec/changes/";
const archiveRoot = "openspec/changes/archive/";
/** An archived change's directory: the archive date, then the change's name. */
const archivedDirectory = /^\d{4}-\d{2}-\d{2}-(.+)$/;
/** An unticked task in any Markdown list: `- [ ]`, `* [ ]`, `+ [ ]`, `1. [ ]`, `1) [ ]`. */
const untickedTask = /^\s*(?:[-*+]|\d+[.)])\s+\[ \]/gm;

/**
 * The archive pull request implements no change either: it moves merged changes into
 * openspec/changes/archive/ and folds their delta specs into openspec/specs/
 * (pipeline-follow-ups design D1). Returns the conditions it does not meet; an empty list
 * means it is exempt.
 * @param {object} input
 * @param {string} input.headRef
 * @param {string | undefined} input.author
 * @param {string} input.botLogin
 * @param {{ status: string, path: string }[]} input.files  changed files, renames split into
 *   a deletion and an addition
 * @param {(path: string) => string | undefined} input.readFile  a file of the head commit
 * @param {(path: string) => boolean} input.exists  whether a path exists in the head commit
 */
export function archiveProblems({ headRef, author, botLogin, files, readFile, exists }) {
  const problems = [];
  if (author !== botLogin) problems.push(`it was opened by ${author}, not by the bot`);
  if (!headRef.startsWith("archive/"))
    problems.push(`its branch ${headRef} does not start with archive/`);

  const outside = files
    .map((file) => file.path)
    .filter(
      (path) =>
        !path.startsWith(changesRoot) &&
        !path.startsWith("openspec/specs/") &&
        path !== "docs/roadmap.md",
    );
  if (outside.length > 0)
    problems.push(
      `it changes files outside openspec/changes/, openspec/specs/ and docs/roadmap.md: ${outside.join(", ")}`,
    );

  // The changes it moves: new directories under the archive, named <date>-<change>.
  const archiveFiles = files.filter((file) => file.path.startsWith(archiveRoot));
  const moved = new Map();
  const touchedArchive = [];
  for (const file of archiveFiles) {
    const [directory, ...rest] = file.path.slice(archiveRoot.length).split("/");
    const name = archivedDirectory.exec(directory)?.[1];
    if (file.status !== "A" || rest.length === 0 || !name) touchedArchive.push(file.path);
    else moved.set(directory, name);
  }
  // A directory with any file that is not new already existed: it is an older archive.
  for (const path of touchedArchive) moved.delete(path.slice(archiveRoot.length).split("/")[0]);
  if (touchedArchive.length > 0)
    problems.push(
      `it edits or deletes what the archive already holds: ${touchedArchive.join(", ")}`,
    );
  const movedNames = new Set(moved.values());

  const inFlight = files.filter(
    (file) => file.path.startsWith(changesRoot) && !file.path.startsWith(archiveRoot),
  );
  const notMoved = inFlight
    .filter(
      (file) =>
        file.status !== "D" || !movedNames.has(file.path.slice(changesRoot.length).split("/")[0]),
    )
    .map((file) => file.path);
  if (notMoved.length > 0)
    problems.push(
      `it adds, edits or deletes files of a change it does not archive: ${notMoved.join(", ")}`,
    );

  // The capabilities whose living spec the archived delta specs may change.
  const capabilities = new Set(
    archiveFiles
      .map((file) =>
        /^openspec\/changes\/archive\/[^/]+\/specs\/([^/]+)\/spec\.md$/.exec(file.path),
      )
      .filter(Boolean)
      .map((match) => match[1]),
  );
  const specs = files.filter((file) => file.path.startsWith("openspec/specs/"));
  const unrelated = specs
    .filter((file) => file.status === "D" || !capabilities.has(file.path.split("/")[2]))
    .map((file) => file.path);
  if (unrelated.length > 0)
    problems.push(
      `it deletes living specs or changes ones no archived delta spec touches: ${unrelated.join(", ")}`,
    );

  if (moved.size === 0) problems.push("it moves no change into openspec/changes/archive/");
  for (const [directory, name] of moved) {
    const archived = `${archiveRoot}${directory}`;
    if (!inFlight.some((file) => file.path.startsWith(`${changesRoot}${name}/`)))
      problems.push(`${archived} is not moved from ${changesRoot}${name}/`);
    else if (exists(`${changesRoot}${name}`))
      problems.push(`${changesRoot}${name}/ is still in flight after the move`);
    const tasks = readFile(`${archived}/tasks.md`);
    const open = tasks?.match(untickedTask)?.length ?? 0;
    if (tasks === undefined) problems.push(`${archived}/tasks.md does not exist`);
    else if (open > 0) problems.push(`${archived}/tasks.md has ${open} unticked task(s)`);
    if (readFile(`${archived}/review.md`) === undefined)
      problems.push(`${archived}/review.md does not exist`);
  }
  return problems;
}

/** Parses `git diff --name-status --no-renames -z`: NUL-separated status and path pairs. */
export function parseNameStatus(output) {
  const fields = output.split("\0").filter(Boolean);
  const files = [];
  for (let index = 0; index + 1 < fields.length; index += 2)
    files.push({ status: fields[index], path: fields[index + 1] });
  return files;
}

/**
 * Whether the pull request is one of the two that implement no change, and, for a branch
 * under archive/, the conditions of the archive pull request it does not meet.
 */
export function exemptions({ headRef, author, botLogin, files, readFile, exists }) {
  const notArchive = archiveProblems({ headRef, author, botLogin, files, readFile, exists });
  return {
    release: isReleasePullRequest({
      headRef,
      author,
      botLogin,
      changedFiles: files.map((file) => file.path),
    }),
    archive: notArchive.length === 0,
    notArchive: headRef.startsWith("archive/") ? notArchive : [],
  };
}

/** Section contents by title; when a title repeats, its contents are joined. */
function byTitle(list) {
  const result = {};
  for (const { title, content } of list) result[title] = (result[title] ?? "") + content;
  return result;
}

/** The parts of a pull request description that the check reads. */
export function parseDescription(body) {
  const found = { ...byTitle(sections(body, 3)), ...byTitle(sections(body, 2)) };
  const requirements = found["Requirements"] ?? "";
  return {
    missingSections: requiredSections.filter((name) => !(found[name] ?? "").trim()),
    change: changeNamedIn(body),
    requirementIds: [...new Set(requirements.match(requirementId) ?? [])],
    noRequirements: /^\s*(-\s*)?none\.?\s*$/im.test(requirements),
    noVisualChanges: /^Visual changes:\s*none\.?\s*$/im.test(body ?? ""),
  };
}

const sameCommit = (a, b) => a.startsWith(b) || b.startsWith(a);

/**
 * The review record of a change, parsed, and the hash of the head commit's content.
 * @returns {{ change: string, record: ReturnType<typeof parseRecord> | undefined, current: string }}
 */
export function reviewOf(input, change) {
  const text = input.readReview(change);
  return {
    change,
    record: text === undefined ? undefined : parseRecord(text),
    current: input.contentHash(change),
  };
}

/**
 * Runs the six checks. Every input is plain data, gathered by `gather` in CI:
 * @param {object} input
 * @param {string} input.description  the pull request's body
 * @param {string} input.headSha  the commit this run checked out and measured
 * @param {string} [input.latestSha]  the pull request's head commit now, from the API
 * @param {string[]} input.changes  directory names under openspec/changes/, archive excluded
 * @param {(change: string) => string[]} input.deltaSpecIds  requirement IDs of a change's delta specs
 * @param {Set<string>} input.testedIds  IDs named by `@req` in the app's tests
 * @param {(change: string) => string | undefined} input.readReview  review.md of a change
 * @param {(change: string) => string} input.contentHash  the review hash of the head commit
 *   for a change, as `pnpm review:hash` prints it
 * @param {string[]} input.changedFiles  of the whole pull request
 * @param {{ body: string } | undefined} input.comment  the bot's evidence comment
 * @param {object | undefined} input.metrics  metrics.json
 * @param {{ status: string }[] | undefined} input.comparison  comparison.json
 * @param {boolean} [input.release]  the release pull request, which is exempt
 * @param {boolean} [input.archive]  the archive pull request, which is exempt
 * @returns {{ check: number, problem: string }[]}
 */
export function checkEvidence(input) {
  if (input.release || input.archive) return [];
  const problems = [];
  const fail = (check, problem) => problems.push({ check, problem });

  // 1. Description
  const description = parseDescription(input.description);
  for (const name of description.missingSections)
    fail(1, `the description has no section "${name}"`);
  const change = description.change;
  if (!change) fail(1, "the description has no line `Change: <name>`");
  else if (!input.changes.includes(change)) fail(1, `openspec/changes/${change}/ does not exist`);
  const known = change && input.changes.includes(change);

  // 2. Requirements
  if (description.requirementIds.length === 0 && !description.noRequirements) {
    fail(2, "the Requirements section lists no requirement ID and does not say `none`");
  }
  const deltaIds = new Set(known ? input.deltaSpecIds(change) : []);
  for (const id of description.requirementIds) {
    if (known && !deltaIds.has(id)) fail(2, `${id} is not in the delta specs of ${change}`);
    if (!input.testedIds.has(id)) fail(2, `${id} is named by no test (@req ${id})`);
  }

  // 3. Review record, and 4. reviewed content
  const review = known ? reviewOf(input, change) : undefined;
  if (review && review.record === undefined) {
    fail(3, messages.noRecord(change));
  } else if (review) {
    for (const problem of review.record.problems) fail(3, problem);
    if (review.record.last?.verdict === "approved") {
      for (const id of description.requirementIds) {
        if (!review.record.coveredIds.has(id)) fail(3, messages.notCovered(id));
      }
    }
  }
  const reviewed = review?.record?.last?.reviewed;
  if (review && !reviewed) {
    fail(4, messages.nothingToCompare({ current: review.current, change }));
  } else if (review && reviewed !== review.current) {
    fail(
      4,
      messages.stale({
        round: review.record.last.number,
        reviewed,
        current: review.current,
        change,
      }),
    );
  }

  // 5. Screenshots
  if (input.latestSha && !sameCommit(input.latestSha, input.headSha)) {
    fail(
      5,
      `a newer commit ${input.latestSha.slice(0, 7)} was pushed; this run's evidence is for ${input.headSha.slice(0, 7)}`,
    );
  }
  const commentFor = commentSha(input.comment?.body);
  if (!commentFor) fail(5, "the evidence comment with the screenshots does not exist");
  else if (!sameCommit(commentFor, input.headSha))
    fail(5, `the evidence comment belongs to ${commentFor.slice(0, 7)}, not to the head commit`);
  if (!input.comparison || input.comparison.length === 0) {
    fail(5, "there are no screenshots of this commit");
  } else if (input.changedFiles.some((file) => file.startsWith("src/ui/"))) {
    const differs = input.comparison.some((entry) => entry.status !== "unchanged");
    if (!differs && !description.noVisualChanges) {
      fail(
        5,
        "files under src/ui changed but no view differs from main; say `Visual changes: none` if that is intended",
      );
    }
  }

  // 6. Numbers
  const metrics = input.metrics;
  if (!metrics) {
    fail(6, "metrics.json does not exist");
  } else {
    if (!metrics.sha || !sameCommit(metrics.sha, input.headSha))
      fail(6, "metrics.json does not belong to the head commit");
    const required = {
      "unit test results": metrics.tests?.unit,
      "end-to-end test results": metrics.tests?.e2e,
      "coverage of src/domain": metrics.coverage?.lines,
      "bundle sizes": metrics.size?.js?.gzip,
      "Lighthouse scores": metrics.lighthouse?.performance,
    };
    for (const [name, value] of Object.entries(required)) {
      if (value === undefined) fail(6, `metrics.json has no ${name}`);
    }
  }
  if (commentFor) {
    for (const label of Object.values(rows)) {
      if (!input.comment.body.includes(`| ${label} |`))
        fail(6, `the evidence comment does not show "${label}"`);
    }
  }
  return problems;
}

/** Why a pull request is exempt from the six checks, or undefined when it is not. */
export function exemption(input) {
  if (input.release)
    return "the release pull request of release-please (bootstrap design D9) implements no change";
  if (input.archive)
    return "the archive pull request (pipeline-follow-ups design D1) implements no change";
  return undefined;
}

/**
 * The Markdown of the job summary. `notArchive` lists the conditions an `archive/` pull
 * request does not meet, so its author sees why it was judged by the six checks.
 */
export function report(problems, { exempt, notArchive = [], review } = {}) {
  if (exempt)
    return `### Evidence check (C-18)\n\nExempt: ${exempt}. The six checks do not apply.\n`;
  const names = [
    "Description",
    "Requirements",
    "Review record",
    "Reviewed content",
    "Screenshots",
    "Numbers",
  ];
  const lines = ["### Evidence check (C-18)", ""];
  if (review) lines.push(reviewLine(review), "");
  lines.push("| | Check | Result |", "| ---: | --- | --- |");
  names.forEach((name, index) => {
    const own = problems.filter((entry) => entry.check === index + 1);
    lines.push(
      `| ${index + 1} | ${name} | ${own.length === 0 ? "passed" : own.map((entry) => entry.problem).join("<br>")} |`,
    );
  });
  if (notArchive.length > 0) {
    lines.push("", "Not exempt as an archive pull request:", ...notArchive.map((p) => `- ${p}`));
  }
  return `${lines.join("\n")}\n`;
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();
}

function specFilesOf(root, change) {
  const directory = join(root, "openspec", "changes", change, "specs");
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { recursive: true })
    .map(String)
    .filter((path) => path.endsWith("spec.md"))
    .map((path) => join(directory, path));
}

/** Collects the inputs of `checkEvidence` from the checkout, the API and the run's files. */
export async function gather({
  root,
  github,
  repository,
  number,
  botLogin,
  headSha,
  metricsPath,
  comparisonPath,
}) {
  const pull = await github.request("GET", `/repos/${repository}/pulls/${number}`);
  const base = git("merge-base", pull.base.sha, headSha);
  const changesDir = join(root, "openspec", "changes");
  const comments = await github.paginate(`/repos/${repository}/issues/${number}/comments`);
  // Renames split into a deletion and an addition, so a file moved out of src/ui counts too.
  const files = parseNameStatus(git("diff", "--name-status", "--no-renames", "-z", base, headSha));
  const changedFiles = files.map((file) => file.path);
  return {
    ...exemptions({
      headRef: pull.head.ref ?? "",
      author: pull.user?.login,
      botLogin,
      files,
      readFile: (path) =>
        existsSync(join(root, path)) ? readFileSync(join(root, path), "utf8") : undefined,
      exists: (path) => existsSync(join(root, path)),
    }),
    description: pull.body ?? "",
    headSha,
    latestSha: pull.head.sha,
    changes: existsSync(changesDir)
      ? readdirSync(changesDir, { withFileTypes: true })
          .filter((entry) => entry.isDirectory() && entry.name !== "archive")
          .map((entry) => entry.name)
      : [],
    deltaSpecIds: (change) =>
      specFilesOf(root, change).flatMap(
        (path) => parseRequirements(readFileSync(path, "utf8")).ids,
      ),
    testedIds: new Set(checkTraceability(root).tested),
    readReview: (change) => {
      const path = join(changesDir, change, "review.md");
      return existsSync(path) ? readFileSync(path, "utf8") : undefined;
    },
    // The same module and merge base (origin/main) as `pnpm review:hash` on a clone.
    contentHash: (change) => reviewHash(root, { change, head: headSha }).short,
    changedFiles,
    comment: comments.find(
      (comment) => comment.user?.login === botLogin && commentSha(comment.body),
    ),
    metrics: existsSync(metricsPath) ? readJson(metricsPath) : undefined,
    comparison: existsSync(comparisonPath) ? readJson(comparisonPath) : undefined,
  };
}

async function main() {
  const { values } = parseArgs({
    options: {
      metrics: { type: "string", default: "metrics.json" },
      comparison: { type: "string", default: "comparison.json" },
    },
  });
  const github = createGithub({
    token: requireEnv("EVIDENCE_TOKEN"),
    apiUrl: process.env["GITHUB_API_URL"],
  });
  const input = await gather({
    root: process.cwd(),
    github,
    repository: requireEnv("GITHUB_REPOSITORY"),
    number: requireEnv("PR_NUMBER"),
    botLogin: requireEnv("BOT_LOGIN"),
    // The commit this run checked out and measured, not whatever the branch points at now.
    headSha: git("rev-parse", "HEAD"),
    metricsPath: values.metrics,
    comparisonPath: values.comparison,
  });
  const problems = checkEvidence(input);
  const exempt = exemption(input);
  const change = parseDescription(input.description).change;
  const markdown = report(problems, {
    exempt,
    notArchive: input.notArchive,
    review:
      !exempt && change && input.changes.includes(change) ? reviewOf(input, change) : undefined,
  });
  appendSummary(markdown);
  console.log(markdown);
  if (problems.length > 0) {
    console.error(`Evidence check failed for ${input.headSha}: ${problems.length} problem(s).`);
    process.exitCode = 1;
  }
}

if (isMain(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
