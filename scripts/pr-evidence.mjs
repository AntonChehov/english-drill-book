#!/usr/bin/env node
// The evidence check of constitution C-18 (design D9). Fails a pull request unless, for its
// head commit:
//   1. the description has the sections Problem, Solution, Requirements and Self-review and a
//      line `Change: <name>` naming a directory under openspec/changes/;
//   2. every ID under Requirements is in that change's delta specs and named by a test;
//   3. openspec/changes/<name>/review.md parses, with no open finding and no declined finding
//      without a reason;
//   4. every commit after the reviewed one fixes a finding or touches only the change's directory;
//   5. the screenshot comment is for this commit, and a change under src/ui shows a visual
//      difference or the description says `Visual changes: none`;
//   6. metrics.json is for this commit and the comment shows every number.
// Usage: node scripts/pr-evidence.mjs [--metrics metrics.json] [--comparison comparison.json]
// Environment: GITHUB_REPOSITORY, PR_NUMBER, EVIDENCE_TOKEN, BOT_LOGIN, GITHUB_API_URL (optional).
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { appendSummary, isMain, readJson, requireEnv } from "./common.mjs";
import { commentSha, rows } from "./evidence-comment.mjs";
import { createGithub } from "./github.mjs";
import { checkTraceability, parseRequirements } from "./traceability.mjs";

const requirementId = /\b[A-Z][A-Z0-9]*-\d{3}\b/g;
export const requiredSections = ["Problem", "Solution", "Requirements", "Self-review"];

/** Splits Markdown into sections by heading text: `## Problem` → { Problem: "..." }. */
export function sections(markdown, level) {
  const result = {};
  const heading = new RegExp(`^${"#".repeat(level)}\\s+(.+?)\\s*$`);
  let current;
  for (const line of (markdown ?? "").split(/\r?\n/)) {
    const match = heading.exec(line);
    if (match) {
      current = match[1];
      result[current] = "";
    } else if (current !== undefined) {
      result[current] += `${line}\n`;
    }
  }
  return result;
}

/** The parts of a pull request description that the check reads. */
export function parseDescription(body) {
  const found = {};
  for (const level of [2, 3]) {
    for (const [title, content] of Object.entries(sections(body, level))) found[title] ??= content;
  }
  const requirements = found["Requirements"] ?? "";
  return {
    missingSections: requiredSections.filter((name) => !(found[name] ?? "").trim()),
    change: /^Change:\s*`?([\w.-]+)`?\s*$/m.exec(body ?? "")?.[1],
    requirementIds: [...new Set(requirements.match(requirementId) ?? [])],
    noRequirements: /^\s*(-\s*)?none\.?\s*$/im.test(requirements),
    noVisualChanges: /^Visual changes:\s*none\.?\s*$/im.test(body ?? ""),
  };
}

/** Reads a review record in the format of design D9; `problems` lists what is malformed. */
export function parseReview(markdown) {
  const problems = [];
  const reviewedCommit = /^Reviewed commit:\s*`?([0-9a-f]{7,40})`?\s*$/m.exec(markdown)?.[1];
  if (!reviewedCommit) problems.push("review.md has no line `Reviewed commit: <sha>`");

  const top = sections(markdown, 2);
  const findingsText = top["Findings"];
  const findings = [];
  if (findingsText === undefined) {
    problems.push("review.md has no section `## Findings`");
  } else {
    const blocks = sections(findingsText, 3);
    const titles = Object.keys(blocks);
    if (titles.length === 0 && !/^\s*none\.?\s*$/i.test(findingsText)) {
      problems.push("`## Findings` lists no finding and does not say `none`");
    }
    for (const title of titles) {
      const field = (name) =>
        new RegExp(`^-\\s*${name}:\\s*(.*?)\\s*$`, "mi").exec(blocks[title])?.[1] ?? "";
      const outcome = field("Outcome");
      const reason = field("Reason");
      const finding = { title, where: field("Where"), outcome, reason };
      const fixed = /^fixed in\s+`?([0-9a-f]{7,40})`?/i.exec(outcome);
      if (fixed) {
        finding.fixedIn = fixed[1];
      } else if (/^declined$/i.test(outcome)) {
        finding.declined = true;
        if (!reason) problems.push(`finding "${title}" is declined without a reason`);
      } else {
        problems.push(`finding "${title}" has no outcome (fixed in <sha> or declined)`);
      }
      findings.push(finding);
    }
  }

  const coverage = top["Requirement coverage"];
  if (coverage === undefined) problems.push("review.md has no section `## Requirement coverage`");
  const outside = top["Outside the listed requirements"];
  if (!outside?.trim())
    problems.push("review.md has no section `## Outside the listed requirements` with content");
  const coveredIds = new Set(
    (coverage ?? "")
      .split("\n")
      .filter((line) => line.startsWith("|"))
      .flatMap((line) => line.split("|")[1]?.match(requirementId) ?? []),
  );
  return { reviewedCommit, findings, coveredIds, problems };
}

const sameCommit = (a, b) => a.startsWith(b) || b.startsWith(a);

/**
 * Runs the six checks. Every input is plain data, gathered by `gather` in CI:
 * @param {object} input
 * @param {string} input.description  the pull request's body
 * @param {string} input.headSha
 * @param {string[]} input.changes  directory names under openspec/changes/, archive excluded
 * @param {(change: string) => string[]} input.deltaSpecIds  requirement IDs of a change's delta specs
 * @param {Set<string>} input.testedIds  IDs named by `@req` in the app's tests
 * @param {(change: string) => string | undefined} input.readReview  review.md of a change
 * @param {{ sha: string, files: string[] }[]} input.commits  of the pull request, oldest first
 * @param {string[]} input.changedFiles  of the whole pull request
 * @param {{ body: string } | undefined} input.comment  the bot's evidence comment
 * @param {object | undefined} input.metrics  metrics.json
 * @param {{ status: string }[] | undefined} input.comparison  comparison.json
 * @returns {{ check: number, problem: string }[]}
 */
export function checkEvidence(input) {
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

  // 3. Review record
  let review;
  if (known) {
    const text = input.readReview(change);
    if (text === undefined) {
      fail(3, `openspec/changes/${change}/review.md does not exist`);
    } else {
      review = parseReview(text);
      for (const problem of review.problems) fail(3, problem);
      for (const id of description.requirementIds) {
        if (!review.coveredIds.has(id))
          fail(3, `review.md does not state where ${id} is implemented and tested`);
      }
    }
  }

  // 4. Nothing changed after the review but fixes and the record itself
  if (review?.reviewedCommit) {
    const index = input.commits.findIndex((commit) =>
      sameCommit(commit.sha, review.reviewedCommit),
    );
    if (index === -1) {
      fail(4, `the reviewed commit ${review.reviewedCommit} is not a commit of this pull request`);
    } else {
      const fixes = review.findings
        .filter((finding) => finding.fixedIn)
        .map((finding) => finding.fixedIn);
      for (const commit of input.commits.slice(index + 1)) {
        const isFix = fixes.some((fix) => sameCommit(commit.sha, fix));
        const onlyRecord = commit.files.every((file) =>
          file.startsWith(`openspec/changes/${change}/`),
        );
        if (!isFix && !onlyRecord) {
          fail(
            4,
            `commit ${commit.sha.slice(0, 7)} after the reviewed commit is neither a recorded fix nor limited to openspec/changes/${change}/`,
          );
        }
      }
    }
  }

  // 5. Screenshots
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

export function report(problems) {
  const names = [
    "Description",
    "Requirements",
    "Review record",
    "Commits after the review",
    "Screenshots",
    "Numbers",
  ];
  const lines = ["### Evidence check (C-18)", "", "| | Check | Result |", "| ---: | --- | --- |"];
  names.forEach((name, index) => {
    const own = problems.filter((entry) => entry.check === index + 1);
    lines.push(
      `| ${index + 1} | ${name} | ${own.length === 0 ? "passed" : own.map((entry) => entry.problem).join("<br>")} |`,
    );
  });
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
  metricsPath,
  comparisonPath,
}) {
  const pull = await github.request("GET", `/repos/${repository}/pulls/${number}`);
  const headSha = pull.head.sha;
  const base = git("merge-base", pull.base.sha, headSha);
  const commits = git("rev-list", "--reverse", `${base}..${headSha}`)
    .split("\n")
    .filter(Boolean)
    .map((sha) => ({
      sha,
      files: git("diff-tree", "--no-commit-id", "--name-only", "-r", "--root", sha)
        .split("\n")
        .filter(Boolean),
    }));
  const changesDir = join(root, "openspec", "changes");
  const comments = await github.paginate(`/repos/${repository}/issues/${number}/comments`);
  return {
    description: pull.body ?? "",
    headSha,
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
    commits,
    changedFiles: git("diff", "--name-only", base, headSha).split("\n").filter(Boolean),
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
    metricsPath: values.metrics,
    comparisonPath: values.comparison,
  });
  const problems = checkEvidence(input);
  const markdown = report(problems);
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
