import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  fetchPath,
  prune,
  publishPath,
  pullRequestDirectories,
  remoteUrl,
  updateBranch,
  authEnvironment,
} from "./evidence-branch.mjs";

let root;
let remote;

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function files(directory, contents) {
  mkdirSync(directory, { recursive: true });
  for (const [name, content] of Object.entries(contents))
    writeFileSync(join(directory, name), content);
  return directory;
}

/** The tree of the branch on the remote, as paths. */
function tree() {
  return git(remote, "ls-tree", "-r", "--name-only", "evidence").split("\n").filter(Boolean);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "evidence-branch-"));
  remote = join(root, "remote.git");
  git(root, "init", "--quiet", "--bare", remote);
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("the evidence branch", () => {
  it("starts as an orphan branch with a README on the first publish", () => {
    const commit = publishPath(remote, "pr-1/abc", files(join(root, "a"), { "x.png": "1" }));
    expect(tree()).toEqual(["README.md", "pr-1/abc/x.png"]);
    expect(git(remote, "rev-parse", "evidence")).toBe(commit);
    expect(git(remote, "rev-list", "--count", "evidence")).toBe("1");
    expect(git(remote, "log", "-1", "--format=%an", "evidence")).toBe(
      "english-drill-book-bot[bot]",
    );
  });

  it("replaces a path and keeps the others", () => {
    publishPath(remote, "main", files(join(root, "a"), { "old.png": "1", "metrics.json": "{}" }));
    publishPath(remote, "pr-1/abc", files(join(root, "b"), { "x.png": "1" }));
    publishPath(remote, "main", files(join(root, "c"), { "new.png": "2" }));
    expect(tree()).toEqual(["README.md", "main/new.png", "pr-1/abc/x.png"]);
  });

  it("commits nothing when the content is the same", () => {
    const from = files(join(root, "a"), { "x.png": "1" });
    const first = publishPath(remote, "main", from);
    expect(publishPath(remote, "main", from)).toBe(first);
    expect(git(remote, "rev-list", "--count", "evidence")).toBe("1");
  });

  it("starts again from the new tip when another job pushed first", () => {
    publishPath(remote, "main", files(join(root, "a"), { "x.png": "1" }));
    let raced = false;
    updateBranch(remote, "evidence: race", (directory) => {
      if (!raced) {
        raced = true;
        publishPath(remote, "pr-2/def", files(join(root, "b"), { "y.png": "2" }));
      }
      writeFileSync(join(directory, "race.txt"), "3");
    });
    expect(tree()).toEqual(["README.md", "main/x.png", "pr-2/def/y.png", "race.txt"]);
  });

  it("fetches a path with the commit it came from", () => {
    const commit = publishPath(remote, "main", files(join(root, "a"), { "x.png": "1" }));
    const into = join(root, "fetched");
    expect(fetchPath(remote, "main", into)).toBe(commit);
    expect(readFileSync(join(into, "x.png"), "utf8")).toBe("1");
  });

  it("fetches nothing before the branch exists or when the path is missing", () => {
    expect(fetchPath(remote, "main", join(root, "none"))).toBe("");
    expect(readdirSync(join(root, "none"))).toEqual([]);
    publishPath(remote, "pr-1/abc", files(join(root, "a"), { "x.png": "1" }));
    expect(fetchPath(remote, "main", join(root, "still-none"))).not.toBe("");
    expect(readdirSync(join(root, "still-none"))).toEqual([]);
  });

  it("refuses to publish a directory that does not exist", () => {
    expect(() => publishPath(remote, "main", join(root, "missing"))).toThrow("Nothing to publish");
  });

  it("prunes the directories of closed pull requests only", async () => {
    for (const number of [3, 4, 12]) {
      publishPath(remote, `pr-${number}/abc`, files(join(root, `p${number}`), { "x.png": "1" }));
    }
    publishPath(remote, "main", files(join(root, "m"), { "x.png": "1" }));
    const asked = [];
    const result = await prune(remote, async (number) => {
      asked.push(number);
      return number !== 4;
    });
    expect(asked).toEqual([3, 4, 12]);
    expect(result.removed).toEqual([3, 12]);
    expect(tree()).toEqual(["README.md", "main/x.png", "pr-4/abc/x.png"]);
  });

  it("prunes nothing before the branch exists", async () => {
    expect(await prune(remote, async () => true)).toEqual({ commit: "", removed: [] });
  });
});

describe("pullRequestDirectories", () => {
  it("lists pr-<number> directories only", () => {
    const directory = join(root, "tree");
    for (const name of ["pr-2", "pr-10", "main", "pr-x"])
      mkdirSync(join(directory, name), { recursive: true });
    writeFileSync(join(directory, "pr-5"), "a file");
    expect(pullRequestDirectories(directory)).toEqual([2, 10]);
  });
});

describe("remoteUrl", () => {
  it("is the repository over HTTPS, without credentials", () => {
    expect(remoteUrl({ EVIDENCE_TOKEN: "secret", GITHUB_REPOSITORY: "owner/repo" })).toBe(
      "https://github.com/owner/repo.git",
    );
  });

  it("can be replaced, and names what is missing", () => {
    expect(remoteUrl({ EVIDENCE_REMOTE: "/tmp/r.git" })).toBe("/tmp/r.git");
    expect(() => remoteUrl({})).toThrow("Set GITHUB_REPOSITORY");
  });
});

describe("authEnvironment", () => {
  it("passes the token to git as a header of the server's origin", () => {
    const environment = authEnvironment("secret", "https://github.com");
    expect(environment).toEqual({
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
      GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${Buffer.from("x-access-token:secret").toString("base64")}`,
    });
  });

  it("is what git reads as its configuration", () => {
    const value = execFileSync("git", ["config", "--get", "http.https://github.com/.extraheader"], {
      env: { ...process.env, ...authEnvironment("secret") },
      encoding: "utf8",
    }).trim();
    expect(value).toMatch(/^AUTHORIZATION: basic /);
  });
});
