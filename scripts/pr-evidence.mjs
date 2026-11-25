#!/usr/bin/env node
// The evidence check of constitution C-18 (design D9, workflow-retro D2 and D4). Fails a
// pull request unless, for its head commit:
//   1. the description has the sections Problem, Solution, Requirements and Self-review and a
//      line `Change: <name>` naming a directory under openspec/changes/;
//   2. every ID under Requirements is defined in docs/product/ and named by a test;
//   3. openspec/changes/<name>/review.md (or the archived one) is a record in rounds whose
//      last round is approved, with every finding fixed or declined with a reason and a
//      severity (review-rounds design D2, D3; workflow-retro D6);
//   4. the hash the last round reviewed equals the hash of this commit's content (D1, D3);
//   5. the screenshot comment is for this commit, and a change under src/ui shows a visual
//      difference or the description says `Visual changes: none`;
//   6. metrics.json is for this commit and the comment shows every number;
//   7. the head commit is the archive commit of the change.
// Checks 5 and 6 do not apply to a pull request that changes no file a build or test reads.
// The release pull request implements no change and is exempt (bootstrap design D9).
// Usage: node scripts/pr-evidence.mjs [--metrics metrics.json] [--comparison comparison.json]
// Environment: GITHUB_REPOSITORY, PR_NUMBER, EVIDENCE_TOKEN, BOT_LOGIN, GITHUB_API_URL (optional).
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { releaseFiles, withoutCode } from "./changes.mjs";
import {
  appendSummary,
  isMain,
  parseNameStatus,
  readJson,
  requireEnv,
  sections,
} from "./common.mjs";
import { commentSha, rows } from "./evidence-comment.mjs";
import { createGithub } from "./github.mjs";
import { archiveOf, reviewHash } from "./review-hash.mjs";
import {
  changeNamedIn,
  messages,
  parseRecord,
  reviewLine,
  reviewProblems,
} from "./review-record.mjs";
import { checkTraceability } from "./traceability.mjs";

const requirementId = /\b[A-Z][A-Z0-9]*-\d{3}\b/g;
export const requiredSections = ["Problem", "Solution", "Requirements", "Self-review"];

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
/** An unticked task in any Markdown list: `- [ ]`, `* [ ]`, `+ [ ]`, `1. [ ]`, `1) [ ]`. */
const untickedTask = /^\s*(?:[-*+]|\d+[.)])\s+\[ \]/gm;

/**
 * Check 7: the head commit is the archive commit of the change (workflow-retro D1, D2).
 * Returns the conditions it does not meet.
 * @param {object} input
 * @param {string} input.change  the change the description names
 * @param {ReturnType<typeof archiveOf> & { blob: (path: string) => string | undefined,
 *   parentBlob: (path: string) => string | undefined } | undefined} input.archive  what the head
 *   commit archives: the files it changes, and the blob of a path at the head and at its parent
 * @param {boolean} input.inFlight  whether the change is still in flight at the head
 * @param {(path: string) => string | undefined} input.readFile  a file of the head commit
 */
export function archiveProblems({ change, archive, inFlight, readFile }) {
  if (archive?.change !== change)
    return [
      `the last commit does not archive \`${change}\`: when the review approves and validation passes, run \`openspec archive\` as the last commit (docs/process.md, step 6)`,
    ];
  const problems = [];
  const own = `${changesRoot}${change}/`;
  const archived = `${archiveRoot}${archive.directory}/`;
  const added = archive.files.filter(
    (file) => file.status === "A" && file.path.startsWith(archived),
  );
  // The capabilities whose living spec the archived delta specs may change.
  const capabilities = new Set(
    added
      .map((file) => /^specs\/([^/]+)\/spec\.md$/.exec(file.path.slice(archived.length))?.[1])
      .filter(Boolean),
  );
  const allowed = ({ status, path }) =>
    (status === "D" && path.startsWith(own)) ||
    (status === "A" && path.startsWith(archived)) ||
    (status !== "D" &&
      /^openspec\/specs\/[^/]+\/spec\.md$/.test(path) &&
      capabilities.has(path.split("/")[2])) ||
    (status !== "D" && path === "docs/roadmap.md");
  const outside = archive.files.filter((file) => !allowed(file)).map((file) => file.path);
  if (outside.length > 0)
    problems.push(
      `it changes more than the move of the change, the living specs of its delta specs and docs/roadmap.md: ${outside.join(", ")}`,
    );

  for (const { path } of added) {
    const name = path.slice(archived.length);
    if (name === "tasks.md") continue;
    const before = archive.parentBlob(`${own}${name}`);
    if (before === undefined) problems.push(`${path} is new: the archive commit only moves files`);
    else if (before !== archive.blob(path)) problems.push(`${path} differs from ${own}${name}`);
  }
  for (const { status, path } of archive.files)
    if (
      status === "D" &&
      path.startsWith(own) &&
      !added.some((file) => file.path === `${archived}${path.slice(own.length)}`)
    )
      problems.push(`${path} is deleted and not archived`);

  const tasks = readFile(`${archived}tasks.md`);
  const open = tasks?.match(untickedTask)?.length ?? 0;
  if (tasks === undefined) problems.push(`${archived}tasks.md does not exist`);
  else if (open > 0) problems.push(`${archived}tasks.md has ${open} unticked task(s)`);
  if (readFile(`${archived}review.md`) === undefined)
    problems.push(`${archived}review.md does not exist`);
  if (inFlight) problems.push(`${own} is still in flight after the archive`);
  return problems;
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

const productId = /\*\*([A-Z][A-Z0-9]*-\d{3})\b/g;

/** The requirement IDs a file of docs/product/ defines, written `**CHK-005` (D8). */
export function parseProductIds(markdown) {
  return [...markdown.matchAll(productId)].map((match) => match[1]);
}

/**
 * Runs the seven checks. Every input is plain data, gathered by `gather` in CI:
 * @param {object} input
 * @param {string} input.description  the pull request's body
 * @param {string} input.headSha  the commit this run checked out and measured
 * @param {string} [input.latestSha]  the pull request's head commit now, from the API
 * @param {string[]} input.changes  directory names under openspec/changes/, archive excluded
 * @param {Parameters<typeof archiveProblems>[0]["archive"]} [input.archive]  what the head
 *   commit archives, when it is an archive commit
 * @param {(path: string) => string | undefined} [input.readFile]  a file of the head commit
 * @param {Set<string>} input.productIds  requirement IDs defined in docs/product/
 * @param {Set<string>} input.testedIds  IDs named by `@req` in the app's tests
 * @param {(change: string) => string | undefined} input.readReview  review.md of a change
 * @param {(change: string) => string} input.contentHash  the review hash of the head commit
 *   for a change, as `pnpm review:hash` prints it
 * @param {string[]} input.changedFiles  of the whole pull request
 * @param {{ body: string } | undefined} input.comment  the bot's evidence comment
 * @param {object | undefined} input.metrics  metrics.json
 * @param {{ status: string }[] | undefined} input.comparison  comparison.json
 * @param {boolean} [input.release]  the release pull request, which is exempt
 * @returns {{ check: number, problem: string }[]}
 */
export function checkEvidence(input) {
  if (input.release) return [];
  const problems = [];
  const fail = (check, problem) => problems.push({ check, problem });

  // 1. Description
  const description = parseDescription(input.description);
  for (const name of description.missingSections)
    fail(1, `the description has no section "${name}"`);
  const change = description.change;
  if (!change) fail(1, "the description has no line `Change: <name>`");
  const known = change && (input.changes.includes(change) || input.archive?.change === change);
  if (change && !known) fail(1, `openspec/changes/${change}/ does not exist`);

  // 2. Requirements
  if (description.requirementIds.length === 0 && !description.noRequirements) {
    fail(2, "the Requirements section lists no requirement ID and does not say `none`");
  }
  for (const id of description.requirementIds) {
    if (!input.productIds.has(id)) fail(2, `${id} is not defined in docs/product/`);
    if (!input.testedIds.has(id)) fail(2, `${id} is named by no test (@req ${id})`);
  }

  // 3. Review record, and 4. reviewed content. Neither shows "passed" unless something was
  // read and compared.
  const review = known ? reviewOf(input, change) : undefined;
  if (!review) {
    fail(3, messages.noChangeRecord());
    fail(4, messages.noChangeContent());
  } else {
    for (const { check, problem } of reviewProblems(review)) fail(check, problem);
  }

  // 5. Screenshots, and 6. Numbers: not for a pull request that changes no file a build or
  // test reads, whose build and numbers are those of main. The check decides this itself and
  // does not trust the workflow (workflow-retro D4). Only a newer commit still fails check 5.
  if (input.latestSha && !sameCommit(input.latestSha, input.headSha)) {
    fail(
      5,
      `a newer commit ${input.latestSha.slice(0, 7)} was pushed; this run's evidence is for ${input.headSha.slice(0, 7)}`,
    );
  }
  if (!withoutCode(input.changedFiles)) {
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
  }

  // 7. Archive
  if (known) {
    for (const problem of archiveProblems({
      change,
      archive: input.archive,
      inFlight: input.changes.includes(change),
      readFile: input.readFile,
    }))
      fail(7, problem);
  }
  return problems;
}

/** Why a pull request is exempt from the checks, or undefined when it is not. */
export function exemption(input) {
  return input.release
    ? "the release pull request of release-please (bootstrap design D9) implements no change"
    : undefined;
}

/**
 * The Markdown of the job summary. `noCode` says that checks 5 and 6 did not apply.
 */
export function report(problems, { exempt, review, noCode = false } = {}) {
  if (exempt) return `### Evidence check (C-18)\n\nExempt: ${exempt}. The checks do not apply.\n`;
  const names = [
    "Description",
    "Requirements",
    "Review record",
    "Reviewed content",
    "Screenshots",
    "Numbers",
    "Archive",
  ];
  const lines = ["### Evidence check (C-18)", ""];
  if (review) lines.push(reviewLine(review), "");
  lines.push("| | Check | Result |", "| ---: | --- | --- |");
  names.forEach((name, index) => {
    const own = problems.filter((entry) => entry.check === index + 1);
    const notApplicable = noCode && (index === 4 || index === 5);
    const result =
      own.length > 0
        ? own.map((entry) => entry.problem).join("<br>")
        : notApplicable
          ? "not applicable: no file the build or tests read changed"
          : "passed";
    lines.push(`| ${index + 1} | ${name} | ${result} |`);
  });
  return `${lines.join("\n")}\n`;
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();
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
  const readFile = (path) =>
    existsSync(join(root, path)) ? readFileSync(join(root, path), "utf8") : undefined;
  const found = archiveOf(root, headSha);
  const blobAt = (ref) => (path) => {
    try {
      return git("rev-parse", "--verify", "--quiet", `${ref}:${path}`);
    } catch {
      return undefined;
    }
  };
  const archive = found && {
    ...found,
    blob: blobAt(headSha),
    parentBlob: blobAt(found.parent),
  };
  /** A change's directory at the head: in flight, or the one the head commit archives. */
  const directoryOf = (change) =>
    archive?.change === change
      ? `openspec/changes/archive/${archive.directory}`
      : `openspec/changes/${change}`;
  return {
    release: isReleasePullRequest({
      headRef: pull.head.ref ?? "",
      author: pull.user?.login,
      botLogin,
      changedFiles,
    }),
    archive,
    readFile,
    description: pull.body ?? "",
    headSha,
    latestSha: pull.head.sha,
    changes: existsSync(changesDir)
      ? readdirSync(changesDir, { withFileTypes: true })
          .filter((entry) => entry.isDirectory() && entry.name !== "archive")
          .map((entry) => entry.name)
      : [],
    productIds: new Set(
      readdirSync(join(root, "docs", "product"))
        .filter((name) => name.endsWith(".md"))
        .flatMap((name) =>
          parseProductIds(readFileSync(join(root, "docs", "product", name), "utf8")),
        ),
    ),
    testedIds: new Set(checkTraceability(root).tested),
    readReview: (change) => readFile(`${directoryOf(change)}/review.md`),
    // The same module and merge base (origin/main) as `pnpm review:hash` on a clone; at the
    // parent of an archive commit, where the change is still in flight.
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
    noCode: withoutCode(input.changedFiles),
    review:
      !exempt && change && (input.changes.includes(change) || input.archive?.change === change)
        ? reviewOf(input, change)
        : undefined,
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
