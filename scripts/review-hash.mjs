#!/usr/bin/env node
// The hash of the diff a review reads: one SHA-256 over the text of
// `git diff` between the merge base with main and the head commit (three lines of context,
// renames as delete and add, binary files in full), with what depends on where the change sits
// taken out: the numbers of the hunk headers `@@ -a,b +c,d @@` and the `index` lines with the
// blob IDs. Whitespace counts, and so do the lines around a change, so a rebase onto a main
// that leaves the change's lines and their neighbours alone keeps the hash, and any other
// edit changes it. `review.md` and `tasks.md` of the change's own directory are left out: the
// record cannot hold its own hash, and ticking a task is not a change to review. When the head
// commit is the archive commit of the change, the change is hashed at that
// commit's parent, where it is still in flight, so the hash is the one the reviewer recorded.
// The reviewer runs this module as `pnpm review:hash`;
// scripts/pr-evidence.mjs imports it in CI, where the checkout has just fetched main.
// Usage: node scripts/review-hash.mjs [<change>] [--head <commit>] [--base <ref>] [--files]
//          [--offline]
//   <change>   the change under openspec/changes/; when omitted, the one in-flight change
//              whose directory the pull request touches
//   --files    also lists, on stderr, the files the diff changes
//   --offline  does not fetch main first, and warns that the hash may differ from CI's
// Without --offline or --base, main is fetched from origin first, as CI's checkout does; when
// that fails, nothing is printed.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";
import { isMain, parseNameStatus } from "./common.mjs";

/** How many hexadecimal characters of the hash a review record shows. */
export const shownLength = 12;

/** The two files of a change's directory that the hash leaves out. */
export function excludedFiles(change) {
  return [`openspec/changes/${change}/review.md`, `openspec/changes/${change}/tasks.md`];
}

function git(root, ...args) {
  return gitIn(root, process.env, ...args);
}

function gitIn(root, env, ...args) {
  return execFileSync("git", args, {
    cwd: root,
    env,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function resolves(root, ref) {
  try {
    git(root, "rev-parse", "--verify", "--quiet", `${ref}^{commit}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * The ref of main to take the merge base with: `origin/main`, which both a clone and the
 * checkout of CI (fetch-depth 0) have, else a local `main`.
 */
export function defaultBase(root) {
  for (const ref of ["origin/main", "main"]) if (resolves(root, ref)) return ref;
  throw new Error("Neither origin/main nor main exists here. Fetch main, then run this again.");
}

/** The paths that differ between the merge base of `base` and `head`, and `head`. */
export function changedPaths(root, { head = "HEAD", base = defaultBase(root) } = {}) {
  const mergeBase = git(root, "merge-base", base, head).trim();
  return git(root, "diff", "--name-only", "--no-renames", "-z", mergeBase, head)
    .split("\0")
    .filter(Boolean);
}

/** The changes in flight at `head`: the directories under openspec/changes/ but the archive. */
export function changesAt(root, head = "HEAD") {
  return git(root, "ls-tree", "-d", "-z", "--name-only", head, "openspec/changes/")
    .split("\0")
    .filter(Boolean)
    .map((path) => path.slice("openspec/changes/".length))
    .filter((name) => name && name !== "archive");
}

const archivedPath = /^openspec\/changes\/archive\/(\d{4}-\d{2}-\d{2}-[^/]+)\//;

/**
 * Whether `head` is the archive commit of a change: one parent, and its diff to that parent
 * adds files under `openspec/changes/archive/<date>-<name>/`.
 * @returns {{ change: string, directory: string, parent: string,
 *   files: { status: string, path: string }[] } | undefined}
 */
export function archiveOf(root, head = "HEAD") {
  const [, ...parents] = git(root, "rev-list", "--parents", "-n", "1", head).trim().split(" ");
  const [parent] = parents;
  if (parents.length !== 1 || !parent) return undefined;
  const files = parseNameStatus(
    git(root, "diff", "--name-status", "--no-renames", "-z", parent, head),
  );
  const directories = new Set(
    files
      .filter((file) => file.status === "A")
      .map((file) => archivedPath.exec(file.path)?.[1])
      .filter(Boolean),
  );
  if (directories.size !== 1) return undefined;
  const [directory] = directories;
  return { change: directory.slice("0000-00-00-".length), directory, parent, files };
}

/**
 * The hash of the diff a review of `change` reads at `head`; at the parent of `head` when
 * `head` archives the change. An empty diff hashes as `none`.
 * @returns {{ hash: string, short: string, files: string[] }}
 */
export function reviewHash(root, { change, head = "HEAD", base = defaultBase(root) }) {
  // A name that is not a change would hash its own review.md and tasks.md and never match.
  const archive = archiveOf(root, head);
  const at = archive?.change === change ? archive.parent : head;
  const changes = changesAt(root, at);
  if (!changes.includes(change))
    throw new Error(
      `There is no change \`${change}\` in openspec/changes/ at ${head}. The changes there: ${changes.join(", ") || "none"}.`,
    );
  const excluded = excludedFiles(change);
  const mergeBase = git(root, "merge-base", base, at).trim();
  // The same text on every machine: no user or system configuration (`diff.context`,
  // `diff.noprefix`, an external diff, colours), and the options the text depends on given.
  const diff = gitIn(
    root,
    { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" },
    "diff",
    "-U3",
    "--src-prefix=a/",
    "--dst-prefix=b/",
    "--no-ext-diff",
    "--no-color",
    "--no-renames",
    "--binary",
    mergeBase,
    at,
    "--",
    ".",
    ...excluded.map((path) => `:(exclude)${path}`),
  );
  const text = diff
    .split("\n")
    .filter((line) => !/^index [0-9a-f]+\.\.[0-9a-f]+( \d+)?$/.test(line))
    .map((line) => line.replace(/^@@ -\S+ \+\S+ @@/, "@@ @@"))
    .join("\n");
  const hash = diff === "" ? "none" : createHash("sha256").update(text).digest("hex");
  const files = changedPaths(root, { head: at, base }).filter((path) => !excluded.includes(path));
  return { hash, short: hash.slice(0, shownLength), files };
}

/** The in-flight change whose directory the pull request touches, when there is one. */
export function changeOfPaths(paths) {
  const names = new Set(
    paths
      .map((path) => /^openspec\/changes\/([^/]+)\//.exec(path)?.[1])
      .filter((name) => name && name !== "archive"),
  );
  return names.size === 1 ? [...names][0] : undefined;
}

/**
 * Fetches main from origin as CI's checkout does; throws when that fails. `again` is the
 * closing advice of the error.
 */
export function fetchMain(root, again = "Run this again online.") {
  try {
    git(root, "fetch", "--quiet", "origin", "+refs/heads/main:refs/remotes/origin/main");
  } catch (error) {
    throw new Error(
      `Could not fetch main from origin, so the hash may not be the one CI computes and is not printed: ${String(error.stderr ?? error.message).trim()}\n${again}`,
      { cause: error },
    );
  }
}

function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      head: { type: "string", default: "HEAD" },
      base: { type: "string" },
      files: { type: "boolean", default: false },
      offline: { type: "boolean", default: false },
    },
  });
  const root = git(process.cwd(), "rev-parse", "--show-toplevel").trim();
  // The merge base, and so the hash, depends on main: take the same main as CI (F3).
  if (values.base)
    console.warn(
      `Taken against ${values.base}, not the current origin/main of CI: the hash may differ from the one CI computes.`,
    );
  else if (values.offline)
    console.warn(
      "Not fetched: main is taken as this clone last saw it, so the hash may differ from the one CI computes. Run this again online before recording it.",
    );
  else fetchMain(root, "Run this again online, or with --offline to print it with that warning.");
  const base = values.base ?? defaultBase(root);
  const change =
    positionals[0] ??
    archiveOf(root, values.head)?.change ??
    changeOfPaths(changedPaths(root, { head: values.head, base }));
  if (!change)
    throw new Error(
      "This branch touches no change directory, or more than one. Name the change: pnpm review:hash <change>",
    );
  const result = reviewHash(root, { change, head: values.head, base });
  // A reviewer hashes what is committed; say so when tracked files differ from it.
  const excluded = excludedFiles(change);
  const uncommitted = git(root, "diff", "HEAD", "--name-only", "-z")
    .split("\0")
    .filter((path) => path && !excluded.includes(path));
  if (values.head === "HEAD" && uncommitted.length > 0)
    console.warn(
      `Not committed, so not in the hash: ${uncommitted.join(", ")}. Commit them and run this again.`,
    );
  if (values.files) for (const path of result.files) console.warn(path);
  process.stdout.write(`${result.short}\n`);
}

if (isMain(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
