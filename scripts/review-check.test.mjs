import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkReview } from "./review-check.mjs";
import { reviewHash } from "./review-hash.mjs";

const change = "some-change";
const record = `openspec/changes/${change}/review.md`;
const env = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: "test@example.com",
};

const roots = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** A repository whose branch `feature` changes a script; the record is not written yet. */
function repository() {
  const root = mkdtempSync(join(tmpdir(), "review-check-"));
  roots.push(root);
  const git = (...args) =>
    execFileSync("git", args, { cwd: root, env, encoding: "utf8", stdio: "pipe" });
  const write = (path, text) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  };
  git("init", "--quiet", "--initial-branch=main");
  write("scripts/a.mjs", "a\n");
  git("add", "--all");
  git("commit", "--quiet", "--no-verify", "-m", "chore: start");
  git("switch", "--quiet", "-c", "feature");
  write("scripts/a.mjs", "a changed\n");
  write(`openspec/changes/${change}/tasks.md`, "- [ ] 1.1 Do\n");
  git("add", "--all");
  git("commit", "--quiet", "--no-verify", "-m", "feat: change a");
  const hash = () => reviewHash(root, { change, base: "main" }).short;
  const check = () => checkReview(root, change, { base: "main" });
  return { write, hash, check };
}

const approved = (hash) => `# Review\n\n## Round 1\n\nReviewed: ${hash}\nVerdict: approved\n`;

describe("review:check", () => {
  it("passes a record in form that read the current content", () => {
    const { write, hash, check } = repository();
    write(record, approved(hash()));
    expect(check()).toEqual([]);
  });

  it("names a record that breaks the form", () => {
    const { write, hash, check } = repository();
    write(record, approved(hash()).replace("Verdict: approved", "Verdict: fine"));
    expect(check()).toEqual([expect.stringMatching(/^Check 3: Round 1 has no line `Verdict/)]);
  });

  it("names a record whose hash is not the current one", () => {
    const { write, check } = repository();
    write(record, approved("000000000000"));
    expect(check()).toEqual([expect.stringMatching(/^Check 4: The review is out of date/)]);
  });

  it("names a missing record", () => {
    const { check } = repository();
    expect(check()).toEqual([
      expect.stringMatching(/^Check 3: There is no review record/),
      expect.stringMatching(/^Check 4: No content was compared/),
    ]);
  });
});
