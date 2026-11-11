#!/usr/bin/env node
// The orphan branch `evidence` holds what CI made for each commit of a pull request
// (`pr-<number>/<sha>/`) and for `main` (`main/`): screenshots, metrics.json and the
// comparison. Its raw URLs render in pull request comments (design D8).
//
// Usage:
//   node scripts/evidence-branch.mjs fetch   --path main --into <dir>
//   node scripts/evidence-branch.mjs publish --path pr-7/<sha> --from <dir>
//   node scripts/evidence-branch.mjs prune
// Environment: GITHUB_REPOSITORY, EVIDENCE_TOKEN (contents: write; pull requests: read for
// prune), GITHUB_SERVER_URL and GITHUB_API_URL (optional). EVIDENCE_REMOTE replaces the
// remote URL, for tests. The token reaches git through its environment, never the URL. Each command prints and sets the output `commit`: the commit of
// the branch it read or wrote.
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { isMain, requireEnv, setOutput } from "./common.mjs";
import { createGithub } from "./github.mjs";

export const branch = "evidence";
const defaultIdentity = {
  name: "english-drill-book-bot[bot]",
  email: "355375383+english-drill-book-bot[bot]@users.noreply.github.com",
};

const readme = `# Evidence

Made by CI, not by hand: screenshots and numbers of each pull request commit
(\`pr-<number>/<sha>/\`) and of \`main\` (\`main/\`). See design D8 of the change
\`bootstrap-app-and-ci\`. Directories of closed pull requests are pruned on a schedule.
`;

/** Extra environment of every git command: the credentials, set by `useToken`. */
let gitEnvironment = {};

/**
 * Authenticates git through its environment instead of the remote URL, so the token
 * never appears in a command line or in the message of a failed command.
 */
export function authEnvironment(token, serverUrl = "https://github.com") {
  const basic = Buffer.from(`x-access-token:${token}`).toString("base64");
  return {
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: `http.${new URL(serverUrl).origin}/.extraheader`,
    GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${basic}`,
  };
}

export function useToken(token, serverUrl) {
  gitEnvironment = authEnvironment(token, serverUrl);
}

function git(cwd, ...args) {
  return execFileSync("git", args, {
    cwd,
    env: { ...process.env, ...gitEnvironment },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

/** Checks the branch out into a new directory, or starts it there when it does not exist. */
export function checkout(remote) {
  const directory = mkdtempSync(join(process.env["RUNNER_TEMP"] ?? tmpdir(), "evidence-"));
  const exists = git(directory, "ls-remote", "--heads", remote, branch) !== "";
  if (exists) {
    git(
      directory,
      "clone",
      "--quiet",
      "--depth",
      "1",
      "--branch",
      branch,
      "--single-branch",
      remote,
      ".",
    );
  } else {
    git(directory, "init", "--quiet");
    git(directory, "remote", "add", "origin", remote);
    git(directory, "checkout", "--quiet", "--orphan", branch);
  }
  return { directory, exists };
}

function head(directory) {
  return git(directory, "rev-parse", "HEAD");
}

/**
 * Applies `change` to a fresh checkout, commits and pushes; when another job pushed
 * in between, starts again from the new tip. `change` must be safe to repeat.
 * Returns the commit pushed, or the tip when there was nothing to commit.
 */
export function updateBranch(
  remote,
  message,
  change,
  { attempts = 5, identity = defaultIdentity } = {},
) {
  for (let attempt = 1; ; attempt++) {
    const { directory, exists } = checkout(remote);
    try {
      if (!exists) writeFileSync(join(directory, "README.md"), readme);
      change(directory);
      git(directory, "add", "--all");
      if (exists && git(directory, "status", "--porcelain") === "") return head(directory);
      git(
        directory,
        "-c",
        `user.name=${process.env["GIT_AUTHOR_NAME"] ?? identity.name}`,
        "-c",
        `user.email=${process.env["GIT_AUTHOR_EMAIL"] ?? identity.email}`,
        "commit",
        "--quiet",
        "--message",
        message,
      );
      try {
        git(directory, "push", "--quiet", "origin", `HEAD:refs/heads/${branch}`);
        return head(directory);
      } catch (error) {
        if (attempt >= attempts) throw error;
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
}

/** Copies `path` of the branch into `into`; returns the branch's commit, or "" without one. */
export function fetchPath(remote, path, into) {
  mkdirSync(into, { recursive: true });
  const { directory, exists } = checkout(remote);
  try {
    if (!exists) return "";
    if (existsSync(join(directory, path))) cpSync(join(directory, path), into, { recursive: true });
    return head(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/** Replaces `path` of the branch with the contents of `from`. */
export function publishPath(remote, path, from) {
  if (!existsSync(from)) throw new Error(`Nothing to publish: ${from} does not exist.`);
  return updateBranch(remote, `evidence: ${path}`, (directory) => {
    rmSync(join(directory, path), { recursive: true, force: true });
    mkdirSync(join(directory, path), { recursive: true });
    cpSync(from, join(directory, path), { recursive: true });
  });
}

/** The pull request numbers that have a directory on the branch. */
export function pullRequestDirectories(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^pr-\d+$/.test(entry.name))
    .map((entry) => Number(entry.name.slice(3)))
    .toSorted((a, b) => a - b);
}

/** Removes the directories of pull requests for which `isClosed(number)` resolves true. */
export async function prune(remote, isClosed) {
  const { directory, exists } = checkout(remote);
  let closed;
  try {
    if (!exists) return { commit: "", removed: [] };
    closed = [];
    for (const number of pullRequestDirectories(directory)) {
      if (await isClosed(number)) closed.push(number);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
  const commit = updateBranch(
    remote,
    `evidence: prune closed pull requests ${closed.map((n) => `#${n}`).join(", ")}`,
    (checkoutDirectory) => {
      for (const number of closed) {
        rmSync(join(checkoutDirectory, `pr-${number}`), { recursive: true, force: true });
      }
    },
  );
  return { commit, removed: closed };
}

/** The repository's address, without credentials. */
export function remoteUrl(env = process.env) {
  if (env["EVIDENCE_REMOTE"]) return env["EVIDENCE_REMOTE"];
  const server = new URL(env["GITHUB_SERVER_URL"] ?? "https://github.com");
  return `${server.origin}/${requireEnv("GITHUB_REPOSITORY", env)}.git`;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { path: { type: "string" }, into: { type: "string" }, from: { type: "string" } },
  });
  const [command] = positionals;
  const remote = remoteUrl();
  if (!process.env["EVIDENCE_REMOTE"])
    useToken(requireEnv("EVIDENCE_TOKEN"), process.env["GITHUB_SERVER_URL"]);
  let commit;
  if (command === "fetch" && values.path && values.into) {
    commit = fetchPath(remote, values.path, values.into);
  } else if (command === "publish" && values.path && values.from) {
    commit = publishPath(remote, values.path, values.from);
  } else if (command === "prune") {
    const github = createGithub({
      token: requireEnv("EVIDENCE_TOKEN"),
      apiUrl: process.env["GITHUB_API_URL"],
    });
    const repository = requireEnv("GITHUB_REPOSITORY");
    const result = await prune(remote, async (number) => {
      const pull = await github.request("GET", `/repos/${repository}/pulls/${number}`);
      return pull.state === "closed";
    });
    console.log(`Removed: ${result.removed.map((n) => `pr-${n}`).join(", ") || "nothing"}`);
    commit = result.commit;
  } else {
    console.error(
      "Usage: evidence-branch.mjs fetch --path <path> --into <dir> | publish --path <path> --from <dir> | prune",
    );
    process.exitCode = 2;
    return;
  }
  setOutput("commit", commit);
  console.log(`commit=${commit}`);
}

if (isMain(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
