import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  changeOfPaths,
  changedPaths,
  defaultBase,
  excludedFiles,
  hashEntries,
  reviewHash,
  shownLength,
} from "./review-hash.mjs";

const change = "some-change";
const record = `openspec/changes/${change}/review.md`;
const tasks = `openspec/changes/${change}/tasks.md`;

// A repository of its own per test: no user configuration, a fixed clock (C-10).
const env = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: "test@example.com",
  GIT_AUTHOR_DATE: "2026-01-01T00:00:00Z",
  GIT_COMMITTER_DATE: "2026-01-01T00:00:00Z",
};

const roots = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/**
 * A repository with `main` and a branch `feature` that changes a script, adds a design and
 * the change's tasks and record.
 */
function repository() {
  const root = mkdtempSync(join(tmpdir(), "review-hash-"));
  roots.push(root);
  const git = (...args) =>
    execFileSync("git", args, { cwd: root, env, encoding: "utf8", stdio: "pipe" }).trim();
  const write = (path, text) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  };
  const commit = (message) => {
    git("add", "--all");
    git("commit", "--quiet", "--no-verify", "-m", message);
  };
  git("init", "--quiet", "--initial-branch=main");
  write("scripts/a.mjs", "a\n");
  write("scripts/b.mjs", "b\n");
  write("README.md", "readme\n");
  commit("chore: start");
  git("switch", "--quiet", "-c", "feature");
  write("scripts/a.mjs", "a changed\n");
  write(`openspec/changes/${change}/design.md`, "design\n");
  write(tasks, "- [ ] 1.1 Do\n");
  write(record, "# Review\n");
  commit("feat: change a");
  const hash = () => reviewHash(root, { change, base: "main" }).short;
  return { root, git, write, commit, hash };
}

describe("the review hash", () => {
  it("covers the changed files only, sorted, with their blob IDs, and is 12 characters long", () => {
    const repo = repository();
    const { files, short, hash } = reviewHash(repo.root, { change, base: "main" });
    expect(files.map((file) => file.path)).toEqual([
      `openspec/changes/${change}/design.md`,
      "scripts/a.mjs",
    ]);
    expect(files[1]?.blob).toBe(repo.git("rev-parse", "HEAD:scripts/a.mjs"));
    expect(short).toHaveLength(shownLength);
    expect(hash.startsWith(short)).toBe(true);
    expect(changedPaths(repo.root, { base: "main" })).toContain(record);
  });

  it("changes when a changed file is edited", () => {
    const repo = repository();
    const before = repo.hash();
    repo.write("scripts/a.mjs", "a fixed\n");
    repo.commit("fix: a");
    expect(repo.hash()).not.toBe(before);
  });

  it("changes when a file is added", () => {
    const repo = repository();
    const before = repo.hash();
    repo.write("scripts/c.mjs", "c\n");
    repo.commit("feat: c");
    expect(repo.hash()).not.toBe(before);
  });

  it("changes when a file is deleted, and counts it as deleted", () => {
    const repo = repository();
    const before = repo.hash();
    repo.git("rm", "--quiet", "scripts/b.mjs");
    repo.commit("refactor: drop b");
    expect(repo.hash()).not.toBe(before);
    const { files } = reviewHash(repo.root, { change, base: "main" });
    expect(files).toContainEqual({ path: "scripts/b.mjs", mode: "", blob: "deleted" });
  });

  it("changes when another change's record is edited", () => {
    const repo = repository();
    const before = repo.hash();
    repo.write("openspec/changes/other/review.md", "# Review\n");
    repo.commit("docs: other");
    expect(repo.hash()).not.toBe(before);
  });

  it("does not change when only the change's review.md or tasks.md is edited", () => {
    const repo = repository();
    const before = repo.hash();
    repo.write(record, "# Review\n\n## Round 1\n");
    repo.write(tasks, "- [x] 1.1 Do\n");
    repo.commit("docs: record the review");
    expect(repo.hash()).toBe(before);
  });

  it("does not change when a commit message is amended", () => {
    const repo = repository();
    const before = repo.hash();
    const commit = repo.git("rev-parse", "HEAD");
    repo.git("commit", "--quiet", "--amend", "--no-verify", "-m", "feat: change a, reworded");
    expect(repo.git("rev-parse", "HEAD")).not.toBe(commit);
    expect(repo.hash()).toBe(before);
  });

  it("does not change when the branch is brought up to date with a main that touched other files", () => {
    const repo = repository();
    const before = repo.hash();
    const reviewed = repo.git("rev-parse", "HEAD");
    repo.git("switch", "--quiet", "main");
    repo.write("README.md", "readme, edited on main\n");
    repo.write("scripts/d.mjs", "d\n");
    repo.commit("docs: readme");
    repo.git("switch", "--quiet", "feature");
    repo.git("merge", "--quiet", "--no-edit", "--no-verify", "main");
    expect(repo.hash()).toBe(before);
    repo.git("switch", "--quiet", "-c", "rebased", reviewed);
    repo.git("rebase", "--quiet", "main");
    expect(repo.hash()).toBe(before);
  });

  it("changes when the branch is brought up to date with a main that changed the same file", () => {
    const repo = repository();
    const before = repo.hash();
    repo.git("switch", "--quiet", "main");
    repo.write("scripts/b.mjs", "b, edited on main\n");
    repo.commit("fix: b");
    repo.git("switch", "--quiet", "feature");
    repo.write("scripts/b.mjs", "b changed\n");
    repo.commit("feat: change b");
    const reviewed = repo.hash();
    expect(reviewed).not.toBe(before);
    repo.git("merge", "--quiet", "--no-edit", "--no-verify", "-X", "ours", "main");
    expect(repo.hash()).toBe(reviewed);
    repo.git("switch", "--quiet", "main");
    repo.write("scripts/a.mjs", "a, edited on main\n");
    repo.commit("fix: a");
    repo.git("switch", "--quiet", "feature");
    repo.git("merge", "--quiet", "--no-edit", "--no-verify", "-X", "theirs", "main");
    expect(repo.hash()).not.toBe(reviewed);
  });

  it("is the same for any commit with the same content", () => {
    const repo = repository();
    const at = repo.git("rev-parse", "HEAD");
    expect(reviewHash(repo.root, { change, head: at, base: "main" }).short).toBe(repo.hash());
  });

  it("takes the merge base with origin/main when there is one, else with main", () => {
    const repo = repository();
    expect(defaultBase(repo.root)).toBe("main");
    repo.git("update-ref", "refs/remotes/origin/main", "main");
    expect(defaultBase(repo.root)).toBe("origin/main");
    repo.git("branch", "--quiet", "-m", "main", "trunk");
    repo.git("update-ref", "-d", "refs/remotes/origin/main");
    expect(() => defaultBase(repo.root)).toThrow("Fetch main");
  });
});

describe("hashEntries", () => {
  it("does not depend on the order of the entries", () => {
    const entries = [
      { path: "b", blob: "1" },
      { path: "a", blob: "deleted" },
    ];
    expect(hashEntries(entries)).toBe(hashEntries(entries.toReversed()));
    expect(hashEntries(entries)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("changeOfPaths", () => {
  it("finds the one in-flight change a branch touches", () => {
    expect(changeOfPaths(["src/a.ts", `openspec/changes/${change}/design.md`])).toBe(change);
    expect(changeOfPaths(["openspec/changes/archive/2026-01-01-old/review.md"])).toBeUndefined();
    expect(changeOfPaths(["openspec/changes/a/x.md", "openspec/changes/b/x.md"])).toBeUndefined();
    expect(excludedFiles(change)).toEqual([record, tasks]);
  });
});

const script = fileURLToPath(new URL("./review-hash.mjs", import.meta.url));
/** Runs `pnpm review:hash` as a reviewer would, in `cwd`. */
function command(cwd, ...args) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd, env, encoding: "utf8" });
  return { status: result.status, stdout: result.stdout.trim(), stderr: result.stderr };
}

/** A reviewer's clone of `repo` whose origin/main is behind main after main moved on. */
function staleClone(repo) {
  const clone = mkdtempSync(join(tmpdir(), "review-hash-clone-"));
  roots.push(clone);
  execFileSync("git", ["clone", "--quiet", repo.root, clone], { env, stdio: "pipe" });
  const git = (...args) =>
    execFileSync("git", args, { cwd: clone, env, encoding: "utf8", stdio: "pipe" }).trim();
  repo.git("switch", "--quiet", "main");
  repo.write("scripts/b.mjs", "b, edited on main\n");
  repo.commit("fix: b");
  repo.git("switch", "--quiet", "feature");
  repo.git("merge", "--quiet", "--no-edit", "--no-verify", "main");
  // Only the branch is brought over, as when someone else updated it with main.
  git("fetch", "--quiet", "origin", "+refs/heads/feature:refs/heads/updated");
  git("switch", "--quiet", "updated");
  expect(git("rev-parse", "origin/main")).not.toBe(repo.git("rev-parse", "main"));
  return { clone, git };
}

describe("round 1 of the review of review-rounds", () => {
  it("F6: the hash changes when only the mode of a changed file changes", () => {
    const repo = repository();
    const before = repo.hash();
    repo.git("update-index", "--chmod=+x", "scripts/a.mjs");
    repo.git("commit", "--quiet", "--no-verify", "-m", "chore: make a executable");
    expect(repo.hash()).not.toBe(before);
    const { files } = reviewHash(repo.root, { change, base: "main" });
    expect(files).toContainEqual(
      expect.objectContaining({ path: "scripts/a.mjs", mode: "100755" }),
    );
  });

  it("F4: a change that does not exist is refused, naming the ones that do", () => {
    const repo = repository();
    expect(() => reviewHash(repo.root, { change: "some-chang", base: "main" })).toThrow(
      "There is no change `some-chang` in openspec/changes/ at HEAD. The changes there: some-change.",
    );
    expect(() => reviewHash(repo.root, { change: "archive", base: "main" })).toThrow("archive");
    const result = command(repo.root, "some-chang", "--offline");
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("There is no change `some-chang`");
  });

  it("F3: the command fetches main first, so a stale origin/main gives the hash CI computes", () => {
    const repo = repository();
    const { clone, git } = staleClone(repo);
    const ci = repo.hash();
    const stale = reviewHash(clone, { change }).short;
    expect(stale).not.toBe(ci);
    expect(command(clone, change)).toMatchObject({ status: 0, stdout: ci });
    expect(git("rev-parse", "origin/main")).toBe(repo.git("rev-parse", "main"));
  });

  it("F3: without a fetch it prints nothing, unless told to work offline, and then warns", () => {
    const repo = repository();
    const { clone, git } = staleClone(repo);
    git("remote", "set-url", "origin", join(clone, "no-such-remote"));
    const refused = command(clone, change);
    expect(refused.status).toBe(1);
    expect(refused.stdout).toBe("");
    expect(refused.stderr).toContain("Could not fetch main from origin");
    const offline = command(clone, change, "--offline");
    expect(offline.status).toBe(0);
    expect(offline.stdout).toBe(reviewHash(clone, { change }).short);
    expect(offline.stderr).toContain("may differ from the one CI computes");
  });
});
