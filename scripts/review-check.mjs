#!/usr/bin/env node
// Checks 3 and 4 of the evidence check, run locally (workflow-retro-2 V3): the form of
// openspec/changes/<name>/review.md and whether its last round read the content of the
// committed branch, without the GitHub API. The reviewer runs it before finishing a round,
// the mechanic before every push.
// Usage: pnpm review:check <change>   prints each problem, exits 1 on any
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isMain } from "./common.mjs";
import { defaultBase, fetchMain, reviewHash } from "./review-hash.mjs";
import { parseRecord, recordPath, reviewProblems } from "./review-record.mjs";

/** The problems of checks 3 and 4 for the change at `root`, as messages. */
export function checkReview(root, change, { base = defaultBase(root) } = {}) {
  const path = join(root, recordPath(change));
  const text = existsSync(path) ? readFileSync(path, "utf8") : undefined;
  const record = text === undefined ? undefined : parseRecord(text);
  const { short } = reviewHash(root, { change, base });
  return reviewProblems({ change, record, current: short }).map(
    ({ check, problem }) => `Check ${check}: ${problem}`,
  );
}

function main() {
  const change = process.argv[2];
  if (!change) throw new Error("Name the change: pnpm review:check <change>");
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  fetchMain(root);
  const problems = checkReview(root, change);
  for (const problem of problems) console.error(problem);
  if (problems.length > 0) process.exitCode = 1;
  else console.log(`The review record of ${change} is in form and read the current content.`);
}

if (isMain(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
