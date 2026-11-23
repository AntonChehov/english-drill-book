#!/usr/bin/env node
// Which pull requests need the build (workflow-retro D3). A pull request whose files no
// build, unit test or end-to-end test reads, and the release pull request, run only the
// static checks and the evidence check. The workflow `checks.yml` runs this as its first job
// and reads the step output `code`. The evidence check decides again on its own diff
// (scripts/pr-evidence.mjs), so a wrong `false` here can make it fail but never pass.
// Environment: GITHUB_REPOSITORY, PR_NUMBER, HEAD_REF, GITHUB_TOKEN, GITHUB_API_URL (optional).
// Without PR_NUMBER (the main workflow) the answer is `true` without a request.
import { isMain, requireEnv, setOutput } from "./common.mjs";
import { createGithub } from "./github.mjs";

/** What the release pull request of release-please changes (bootstrap design D10). */
export const releaseFiles = ["CHANGELOG.md", "package.json", ".release-please-manifest.json"];

const directories = ["docs/", "openspec/", ".claude/"];
const rootFiles = ["README.md", "CLAUDE.md", "CHANGELOG.md", "LICENSE"];

/** The API lists at most this many files of a pull request; a pull request with that many counts as code. */
const listLimit = 3000;

/**
 * Whether every path is one that no build or test reads: documentation, OpenSpec, the
 * agents' own files and the Markdown files at the root. `contracts/`, `demo/`, `.github/`
 * and `package.json` count as code.
 */
export function withoutCode(paths) {
  return paths.every(
    (path) => directories.some((prefix) => path.startsWith(prefix)) || rootFiles.includes(path),
  );
}

/** Whether the build and the tests have to run for a pull request with these paths. */
export function needsBuild({ paths, headRef }) {
  if (withoutCode(paths)) return false;
  const release = headRef.startsWith("release-please--");
  return !(release && paths.every((path) => releaseFiles.includes(path)));
}

/**
 * Whether a pull request needs the build, from the files the API lists for it, a renamed
 * file by both its names. Unknown (3000 files or more) counts as code.
 */
export async function buildNeeded({ github, repository, number, headRef }) {
  const files = await github.paginate(`/repos/${repository}/pulls/${number}/files`);
  if (files.length >= listLimit) return true;
  const paths = files.flatMap((file) => [file.filename, file.previous_filename].filter(Boolean));
  return needsBuild({ paths, headRef });
}

async function main() {
  const number = process.env["PR_NUMBER"];
  const code =
    !number ||
    (await buildNeeded({
      github: createGithub({
        token: requireEnv("GITHUB_TOKEN"),
        apiUrl: process.env["GITHUB_API_URL"],
      }),
      repository: requireEnv("GITHUB_REPOSITORY"),
      number,
      headRef: process.env["HEAD_REF"] ?? "",
    }));
  console.log(
    code
      ? "Code changes, or not known: the build and the tests run."
      : "No file that a build or test reads: only the static checks and the evidence check run.",
  );
  setOutput("code", String(code));
}

if (isMain(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
