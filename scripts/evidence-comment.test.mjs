import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  commentSha,
  markerFor,
  numberRows,
  rawUrl,
  renderComment,
  reviewOfChange,
  rows,
  screenshotSection,
  upsertComment,
} from "./evidence-comment.mjs";

const sha = "0123456789abcdef0123456789abcdef01234567";

const metrics = {
  sha,
  tests: {
    unit: { tests: 31, passed: 31, failed: 0, skipped: 0 },
    e2e: { tests: 32, passed: 31, failed: 0, skipped: 1 },
  },
  coverage: { lines: 100, branches: 97.5, functions: 100, statements: 100 },
  size: { js: { gzip: 34_569 }, css: { gzip: 500 } },
  lighthouse: { performance: 99, accessibility: 100 },
  pipeline: { seconds: 150 },
};

const mainMetrics = {
  ...metrics,
  tests: { ...metrics.tests, unit: { tests: 30, passed: 30, failed: 0, skipped: 0 } },
  coverage: { ...metrics.coverage, branches: 100 },
  size: { js: { gzip: 33_000 }, css: { gzip: 500 } },
  pipeline: { seconds: 170 },
};

const urls = {
  before: (file) => `https://raw/main/${file}`,
  after: (file) => `https://raw/pr/${file}`,
};

describe("marker", () => {
  it("names the commit the comment belongs to", () => {
    expect(commentSha(`${markerFor(sha)}\n## Evidence`)).toBe(sha);
  });

  it("is found only at the start of the comment", () => {
    expect(commentSha(`Quoted:\n${markerFor(sha)}`)).toBeUndefined();
    expect(commentSha(undefined)).toBeUndefined();
  });
});

describe("numberRows", () => {
  it("shows each number for this pull request and main with the change", () => {
    const table = numberRows(metrics, mainMetrics).join("\n");
    expect(table).toContain(`| ${rows.unit} | 31 passed | 30 passed | +1 |`);
    expect(table).toContain(`| ${rows.e2e} | 31 passed, 1 skipped | 31 passed, 1 skipped | ±0 |`);
    expect(table).toContain(`| ${rows.branches} | 97.5 % | 100 % | −2.5 pt |`);
    expect(table).toContain(`| ${rows.js} | 34.57 kB | 33.00 kB | +1.57 kB |`);
    expect(table).toContain(`| ${rows.performance} | 99 | 99 | ±0 |`);
    expect(table).toContain(`| ${rows.duration} | 2 min 30 s | 2 min 50 s | −20 s |`);
  });

  it("leaves the change empty while main has no numbers", () => {
    const table = numberRows(metrics).join("\n");
    expect(table).toContain(`| ${rows.lines} | 100 % | — |  |`);
    expect(table).toContain(`| ${rows.duration} | 2 min 30 s | — |  |`);
  });

  it("shows a missing number as a dash and failed tests", () => {
    const failing = { tests: { unit: { tests: 2, passed: 1, failed: 1, skipped: 0 } } };
    const table = numberRows(failing).join("\n");
    expect(table).toContain(`| ${rows.unit} | 1 passed, 1 failed | — |  |`);
    expect(table).toContain(`| ${rows.performance} | — | — |  |`);
  });

  it("shows short durations in seconds", () => {
    expect(numberRows({ pipeline: { seconds: 42 } }).join("\n")).toContain("| 42 s |");
  });
});

describe("screenshotSection", () => {
  const comparison = [
    { file: "about-dark-390.png", status: "changed", share: 0.0123 },
    { file: "new-light-1280.png", status: "added" },
    { file: "start-light-1280.png", status: "unchanged", share: 0 },
    { file: "gone-light-1280.png", status: "removed" },
  ];

  it("shows changed views side by side and collapses unchanged ones", () => {
    const text = screenshotSection(comparison, urls).join("\n");
    expect(text).toContain("3 views: 1 changed, 1 new, 1 unchanged, 1 removed.");
    expect(text).toContain(
      '| `about-dark-390.png` (1.23 % of pixels) | <img src="https://raw/main/about-dark-390.png" alt="main" width="380"> | <img src="https://raw/pr/about-dark-390.png" alt="this pull request" width="380"> |',
    );
    expect(text).toContain("<details open><summary>New views (1)</summary>");
    expect(text).toContain("<details><summary>Unchanged views (1)</summary>");
    expect(text).toContain("Removed: `gone-light-1280.png`");
  });

  it("has no table when nothing changed", () => {
    const text = screenshotSection([comparison[2]], urls).join("\n");
    expect(text).not.toContain("| View |");
    expect(text).not.toContain("New views");
  });
});

describe("renderComment", () => {
  it("starts with the marker and links the run", () => {
    const body = renderComment({
      sha,
      metrics,
      mainMetrics,
      comparison: [],
      urls,
      runUrl: "https://github.com/o/r/actions/runs/1",
    });
    expect(body.startsWith(markerFor(sha))).toBe(true);
    expect(body).toContain("## Evidence for 0123456");
    expect(body).toContain("[this run](https://github.com/o/r/actions/runs/1)");
    for (const label of Object.values(rows)) expect(body).toContain(`| ${label} |`);
    expect(body).not.toContain("### Review");
  });

  it("shows the state of the review before the numbers", () => {
    const review = "Review: round 2, approved, read `8a04e6d2c517`; the content is the same.";
    const body = renderComment({ sha, metrics, mainMetrics, comparison: [], urls, review });
    expect(body).toContain(`### Review\n\n${review}\n\n### Numbers`);
  });
});

describe("reviewOfChange", () => {
  // A repository of its own: main, and a branch with a change, its record and a script.
  const root = mkdtempSync(join(tmpdir(), "evidence-comment-"));
  afterAll(() => rmSync(root, { recursive: true, force: true }));
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
  const git = (...args) =>
    execFileSync("git", args, { cwd: root, env, encoding: "utf8", stdio: "pipe" }).trim();
  const write = (path, text) => {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), text);
  };
  git("init", "--quiet", "--initial-branch=main");
  write("a.mjs", "a\n");
  git("add", "--all");
  git("commit", "--quiet", "--no-verify", "-m", "chore: start");
  git("switch", "--quiet", "-c", "feature");
  write("a.mjs", "a changed\n");
  write("openspec/changes/c/tasks.md", "- [x] 1.1\n");
  git("add", "--all");
  git("commit", "--quiet", "--no-verify", "-m", "feat: a");
  const head = git("rev-parse", "HEAD");

  it("shows nothing when no change is named or it does not exist", () => {
    expect(reviewOfChange(root, undefined, head)).toBeUndefined();
    expect(reviewOfChange(root, "missing", head)).toBeUndefined();
  });

  it("shows the record's last round against the hash of the commit's content", () => {
    expect(reviewOfChange(root, "c", head)).toMatch(
      /^Review: no record in `openspec\/changes\/c\/review\.md`; the content of this commit is `[0-9a-f]{12}`\.$/,
    );
    const current = /`([0-9a-f]{12})`\.$/.exec(reviewOfChange(root, "c", head) ?? "")?.[1];
    write(
      "openspec/changes/c/review.md",
      `## Round 1\n\nReviewed: ${current}\nVerdict: approved\n`,
    );
    expect(reviewOfChange(root, "c", head)).toBe(
      `Review: round 1, approved, read \`${current}\`; the content of this commit is \`${current}\`, the same.`,
    );
  });
});

function fakeGithub(comments) {
  const calls = [];
  return {
    calls,
    paginate: async () => comments,
    request: async (method, path, body) => {
      calls.push({ method, path, body });
      return { html_url: `https://github.com${path}` };
    },
  };
}

describe("upsertComment", () => {
  it("updates the bot's earlier evidence comment", async () => {
    const github = fakeGithub([
      { id: 1, user: { login: "someone" }, body: markerFor(sha) },
      { id: 2, user: { login: "bot[bot]" }, body: "Another comment" },
      { id: 3, user: { login: "bot[bot]" }, body: markerFor("abcdef0") },
    ]);
    await upsertComment(github, "o/r", 7, "bot[bot]", "new body");
    expect(github.calls).toEqual([
      { method: "PATCH", path: "/repos/o/r/issues/comments/3", body: { body: "new body" } },
    ]);
  });

  it("creates the comment when the bot has none, ignoring look-alikes by others", async () => {
    const github = fakeGithub([{ id: 1, user: { login: "someone" }, body: markerFor(sha) }]);
    await upsertComment(github, "o/r", 7, "bot[bot]", "body");
    expect(github.calls).toEqual([
      { method: "POST", path: "/repos/o/r/issues/7/comments", body: { body: "body" } },
    ]);
  });
});

it("builds raw URLs of the evidence branch at a fixed commit", () => {
  expect(rawUrl("o/r", "abc", "pr-7/def", "a.png")).toBe(
    "https://raw.githubusercontent.com/o/r/abc/pr-7/def/a.png",
  );
});
