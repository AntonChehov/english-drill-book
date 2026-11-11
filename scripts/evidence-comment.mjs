#!/usr/bin/env node
// Writes the one sticky comment of a pull request that shows its evidence (C-18, items 2 – 4):
// the state of the review, the numbers against `main` and the screenshots, changed views side
// by side.
// Usage: node scripts/evidence-comment.mjs --metrics metrics.json --main-metrics main/metrics.json
//          --comparison comparison.json --evidence-commit <sha> --evidence-path pr-7/<sha>
//          --main-commit <sha> [--change <name>] [--dry-run]
// The change is read from the pull request's description unless --change names it.
// Environment: GITHUB_REPOSITORY, PR_NUMBER, EVIDENCE_TOKEN, BOT_LOGIN, GITHUB_SERVER_URL,
// GITHUB_RUN_ID (optional, for the link to the run).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { isMain, readJson, requireEnv } from "./common.mjs";
import { createGithub } from "./github.mjs";
import { reviewHash } from "./review-hash.mjs";
import { changeNamedIn, parseRecord, recordPath, reviewLine } from "./review-record.mjs";
import { formatKb } from "./size.mjs";

export const marker = "<!-- pr-evidence";

/** The first line of the comment, which names the commit it belongs to. */
export function markerFor(sha) {
  return `${marker} sha=${sha} -->`;
}

/** The commit a comment belongs to, or undefined when it is not an evidence comment. */
export function commentSha(body) {
  return /^<!-- pr-evidence sha=([0-9a-f]{7,40}) -->/.exec(body ?? "")?.[1];
}

/** Row labels of the numbers table; scripts/pr-evidence.mjs requires each of them. */
export const rows = {
  unit: "Unit tests",
  e2e: "End-to-end tests",
  lines: "Coverage of src/domain, lines",
  branches: "Coverage of src/domain, branches",
  js: "Initial JavaScript, gzip",
  css: "Initial CSS, gzip",
  performance: "Lighthouse performance",
  accessibility: "Lighthouse accessibility",
  duration: "Pipeline duration",
};

function signed(value, unit = "") {
  if (value === 0) return `±0${unit}`;
  return `${value > 0 ? "+" : "−"}${Math.abs(Number(value.toFixed(2)))}${unit}`;
}

function tests(result) {
  if (!result) return "—";
  const parts = [`${result.passed} passed`];
  if (result.failed) parts.push(`${result.failed} failed`);
  if (result.skipped) parts.push(`${result.skipped} skipped`);
  return parts.join(", ");
}

function duration(seconds) {
  if (seconds === undefined) return "—";
  const minutes = Math.floor(seconds / 60);
  return minutes > 0 ? `${minutes} min ${Math.round(seconds % 60)} s` : `${Math.round(seconds)} s`;
}

const percent = (value) => `${value} %`;
const points = (now, before) => signed(now - before, " pt");
const kilobytes = (now, before) => signed((now - before) / 1000, " kB");
const passedTests = (now, before) => signed(now.passed - before.passed);
const plain = (now, before) => signed(now - before);
const seconds = (now, before) => signed(Math.round(now - before), " s");

/** What each row shows: where the number is in metrics.json, how to print it and its change. */
const numberDefinitions = [
  [rows.unit, (m) => m.tests?.unit, tests, passedTests],
  [rows.e2e, (m) => m.tests?.e2e, tests, passedTests],
  [rows.lines, (m) => m.coverage?.lines, percent, points],
  [rows.branches, (m) => m.coverage?.branches, percent, points],
  [rows.js, (m) => m.size?.js?.gzip, formatKb, kilobytes],
  [rows.css, (m) => m.size?.css?.gzip, formatKb, kilobytes],
  [rows.performance, (m) => m.lighthouse?.performance, String, plain],
  [rows.accessibility, (m) => m.lighthouse?.accessibility, String, plain],
  [rows.duration, (m) => m.pipeline?.seconds, duration, seconds],
];

/** One row per number: this pull request, main, and the change. */
export function numberRows(current, previous = {}) {
  const lines = ["| | This pull request | main | Change |", "| --- | ---: | ---: | ---: |"];
  for (const [label, pick, show, change] of numberDefinitions) {
    const now = pick(current);
    const before = pick(previous);
    const delta = now === undefined || before === undefined ? "" : change(now, before);
    const cell = (value) => (value === undefined ? "—" : show(value));
    lines.push(`| ${label} | ${cell(now)} | ${cell(before)} | ${delta} |`);
  }
  return lines;
}

function image(url, alt) {
  return `<img src="${url}" alt="${alt}" width="380">`;
}

/** The screenshot section: changed views side by side, the others collapsed. */
export function screenshotSection(comparison, urls) {
  const by = (status) => comparison.filter((entry) => entry.status === status);
  const changed = by("changed");
  const added = by("added");
  const unchanged = by("unchanged");
  const removed = by("removed");
  const lines = [
    `${comparison.length - removed.length} views: ${changed.length} changed, ${added.length} new, ${unchanged.length} unchanged, ${removed.length} removed.`,
  ];
  if (changed.length > 0) {
    lines.push("", "| View | main | This pull request |", "| --- | --- | --- |");
    for (const { file, share } of changed) {
      lines.push(
        `| \`${file}\` (${(share * 100).toFixed(2)} % of pixels) | ${image(urls.before(file), "main")} | ${image(urls.after(file), "this pull request")} |`,
      );
    }
  }
  const gallery = (title, entries, open) => {
    if (entries.length === 0) return;
    lines.push("", `<details${open ? " open" : ""}><summary>${title}</summary>`, "");
    for (const { file } of entries)
      lines.push(`\`${file}\``, "", image(urls.after(file), file), "");
    lines.push("</details>");
  };
  gallery(`New views (${added.length})`, added, true);
  gallery(`Unchanged views (${unchanged.length})`, unchanged, false);
  if (removed.length > 0) {
    lines.push("", `Removed: ${removed.map(({ file }) => `\`${file}\``).join(", ")}`);
  }
  return lines;
}

/** The whole comment for the head commit of a pull request. */
export function renderComment({ sha, metrics, mainMetrics, comparison, urls, runUrl, review }) {
  return [
    markerFor(sha),
    `## Evidence for ${sha.slice(0, 7)}`,
    "",
    `Made by CI from the production build of \`${sha}\`${runUrl ? ` in [this run](${runUrl})` : ""}. A new commit replaces it.`,
    "",
    ...(review ? ["### Review", "", review, ""] : []),
    "### Numbers",
    "",
    ...numberRows(metrics, mainMetrics),
    "",
    "### Screenshots",
    "",
    ...screenshotSection(comparison, urls),
    "",
  ].join("\n");
}

/**
 * The line on the review of `change` at `sha`: its last round, verdict and hash, and the
 * hash of the commit's content. Undefined when no change is named or it does not exist.
 */
export function reviewOfChange(root, change, sha) {
  if (!change || !existsSync(join(root, "openspec", "changes", change))) return undefined;
  const path = join(root, recordPath(change));
  return reviewLine({
    change,
    record: existsSync(path) ? parseRecord(readFileSync(path, "utf8")) : undefined,
    current: reviewHash(root, { change, head: sha }).short,
  });
}

/** Creates the comment, or updates the bot's earlier one. Returns the comment's URL. */
export async function upsertComment(github, repository, number, botLogin, body) {
  const comments = await github.paginate(`/repos/${repository}/issues/${number}/comments`);
  const previous = comments.find(
    (comment) => comment.user?.login === botLogin && commentSha(comment.body),
  );
  const saved = previous
    ? await github.request("PATCH", `/repos/${repository}/issues/comments/${previous.id}`, { body })
    : await github.request("POST", `/repos/${repository}/issues/${number}/comments`, { body });
  return saved.html_url;
}

export function rawUrl(repository, commit, path, file) {
  return `https://raw.githubusercontent.com/${repository}/${commit}/${path}/${file}`;
}

async function main() {
  const { values } = parseArgs({
    options: {
      metrics: { type: "string", default: "metrics.json" },
      "main-metrics": { type: "string" },
      comparison: { type: "string", default: "comparison.json" },
      "evidence-commit": { type: "string" },
      "evidence-path": { type: "string" },
      "main-commit": { type: "string", default: "" },
      change: { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
  });
  const repository = requireEnv("GITHUB_REPOSITORY");
  const metrics = readJson(values.metrics);
  const mainMetricsPath = values["main-metrics"];
  const mainMetrics =
    mainMetricsPath && existsSync(mainMetricsPath) ? readJson(mainMetricsPath) : {};
  const evidenceCommit = values["evidence-commit"];
  const evidencePath = values["evidence-path"];
  if (!evidenceCommit || !evidencePath)
    throw new Error("--evidence-commit and --evidence-path are required.");
  const server = process.env["GITHUB_SERVER_URL"] ?? "https://github.com";
  const runId = process.env["GITHUB_RUN_ID"];

  const github = values["dry-run"]
    ? undefined
    : createGithub({ token: requireEnv("EVIDENCE_TOKEN"), apiUrl: process.env["GITHUB_API_URL"] });
  const number = values["dry-run"] ? undefined : requireEnv("PR_NUMBER");
  const change =
    values.change ??
    (github
      ? changeNamedIn((await github.request("GET", `/repos/${repository}/pulls/${number}`)).body)
      : undefined);
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();

  const body = renderComment({
    sha: metrics.sha,
    metrics,
    mainMetrics,
    comparison: readJson(values.comparison),
    urls: {
      after: (file) => rawUrl(repository, evidenceCommit, evidencePath, file),
      before: (file) => rawUrl(repository, values["main-commit"], "main", file),
    },
    runUrl: runId ? `${server}/${repository}/actions/runs/${runId}` : undefined,
    review: reviewOfChange(root, change, metrics.sha),
  });
  if (!github) {
    console.log(body);
    return;
  }
  const url = await upsertComment(github, repository, number, requireEnv("BOT_LOGIN"), body);
  console.log(`Evidence comment: ${url}`);
}

if (isMain(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
