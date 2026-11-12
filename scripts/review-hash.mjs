#!/usr/bin/env node
// The hash of the content a review reads (review-rounds design D1): one SHA-256 over the
// files the pull request changes, that is the files that differ between the merge base with
// main and the head commit, each as its path, its mode and its git blob ID at the head (or
// `deleted`), sorted by path. `review.md` and `tasks.md` of the change's own directory are
// left out: the record cannot hold its own hash, and ticking a task is not a change to
// review. The reviewer runs this module as `pnpm review:hash`; scripts/pr-evidence.mjs
// imports it in CI, where the checkout has just fetched main.
// Usage: node scripts/review-hash.mjs [<change>] [--head <commit>] [--base <ref>] [--files]
//          [--offline]
//   <change>   the change under openspec/changes/; when omitted, the one in-flight change
//              whose directory the pull request touches
//   --files    also lists, on stderr, each hashed file with its mode and blob ID
//   --offline  does not fetch main first, and warns that the hash may differ from CI's
// Without --offline or --base, main is fetched from origin first, as CI's checkout does; when
// that fails, nothing is printed.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import { isMain } from "./common.mjs";

/** How many hexadecimal characters of the hash a review record shows. */
export const shownLength = 12;

/** The two files of a change's directory that the hash leaves out. */
export function excludedFiles(change) {
  return [`openspec/changes/${change}/review.md`, `openspec/changes/${change}/tasks.md`];
}

function git(root, ...args) {
  return execFileSync("git", args, {
    cwd: root,
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

/**
 * Modes and blob IDs of the given paths at `head`; a path absent there is `deleted`, with
 * no mode.
 */
function blobsAt(root, head, paths) {
  const objects = new Map();
  const listing = git(root, "ls-tree", "-r", "-z", "--full-tree", head);
  for (const entry of listing.split("\0").filter(Boolean)) {
    // `<mode> <type> <object>\t<path>`
    const tab = entry.indexOf("\t");
    const [mode, , blob] = entry.slice(0, tab).split(" ");
    objects.set(entry.slice(tab + 1), { mode, blob });
  }
  return paths.map((path) => ({ path, ...(objects.get(path) ?? { mode: "", blob: "deleted" }) }));
}

/** The hash of a list of `{ path, mode, blob }`, in full: 64 hexadecimal characters. */
export function hashEntries(entries) {
  const hash = createHash("sha256");
  for (const { path, mode, blob } of entries.toSorted((a, b) => (a.path < b.path ? -1 : 1)))
    hash.update(`${path}\0${mode}\0${blob}\0`);
  return hash.digest("hex");
}

/** The changes in flight at `head`: the directories under openspec/changes/ but the archive. */
export function changesAt(root, head = "HEAD") {
  return git(root, "ls-tree", "-d", "-z", "--name-only", head, "openspec/changes/")
    .split("\0")
    .filter(Boolean)
    .map((path) => path.slice("openspec/changes/".length))
    .filter((name) => name && name !== "archive");
}

/**
 * The hash of the content a review of `change` reads at `head`.
 * @returns {{ hash: string, short: string, files: { path: string, blob: string }[] }}
 */
export function reviewHash(root, { change, head = "HEAD", base = defaultBase(root) }) {
  // A name that is not a change would hash its own review.md and tasks.md and never match.
  const changes = changesAt(root, head);
  if (!changes.includes(change))
    throw new Error(
      `There is no change \`${change}\` in openspec/changes/ at ${head}. The changes there: ${changes.join(", ") || "none"}.`,
    );
  const excluded = excludedFiles(change);
  const paths = changedPaths(root, { head, base }).filter((path) => !excluded.includes(path));
  const files = blobsAt(root, head, paths);
  const hash = hashEntries(files);
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
  else {
    try {
      git(root, "fetch", "--quiet", "origin", "+refs/heads/main:refs/remotes/origin/main");
    } catch (error) {
      throw new Error(
        `Could not fetch main from origin, so the hash may not be the one CI computes and is not printed: ${String(error.stderr ?? error.message).trim()}\nRun this again online, or with --offline to print it with that warning.`,
        { cause: error },
      );
    }
  }
  const base = values.base ?? defaultBase(root);
  const change = positionals[0] ?? changeOfPaths(changedPaths(root, { head: values.head, base }));
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
  if (values.files)
    for (const { path, mode, blob } of result.files)
      console.warn(`${mode.padEnd(6)} ${blob.padEnd(40)}  ${path}`);
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
