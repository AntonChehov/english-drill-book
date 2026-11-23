import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildNeeded, needsBuild, releaseFiles, withoutCode } from "./changes.mjs";

describe("withoutCode", () => {
  it("is true for documentation, OpenSpec, .claude and the Markdown files at the root", () => {
    expect(withoutCode(["docs/process.md", "docs/process/validator-prompt.md"])).toBe(true);
    expect(withoutCode(["openspec/changes/x/tasks.md", "openspec/specs/a/spec.md"])).toBe(true);
    expect(withoutCode([".claude/agents/reviewer.md"])).toBe(true);
    expect(withoutCode(["README.md", "CLAUDE.md", "CHANGELOG.md", "LICENSE"])).toBe(true);
  });

  it("is false when one file is code, and for what a build or test reads", () => {
    expect(withoutCode(["docs/process.md", "src/ui/App.vue"])).toBe(false);
    for (const path of [
      "contracts/pack.schema.json",
      "demo/books/a.pdf",
      ".github/workflows/checks.yml",
      "package.json",
      "docs-extra/a.md",
      "src/README.md",
      ".claudeish/a",
    ])
      expect({ path, result: withoutCode([path]) }).toEqual({ path, result: false });
  });
});

describe("needsBuild", () => {
  it("is false for a pull request without code", () => {
    expect(needsBuild({ paths: ["docs/roadmap.md"], headRef: "docs/roadmap" })).toBe(false);
  });

  it("is false for the release branch with its three files", () => {
    expect(needsBuild({ paths: releaseFiles, headRef: "release-please--branches--main" })).toBe(
      false,
    );
  });

  it("is true for the release files on another branch, and for one more file of code", () => {
    expect(needsBuild({ paths: releaseFiles, headRef: "feat/x" })).toBe(true);
    expect(
      needsBuild({
        paths: [...releaseFiles, "src/main.ts"],
        headRef: "release-please--branches--main",
      }),
    ).toBe(true);
  });
});

/** A client whose list endpoint gives `files`. */
const listing = (files) => ({
  paginate: async (path) => (path === "/repos/o/r/pulls/7/files" ? files : []),
});
const ask = (files, headRef = "chore/x") =>
  buildNeeded({ github: listing(files), repository: "o/r", number: "7", headRef });

describe("buildNeeded", () => {
  it("reads the files of the pull request, both names of a renamed one", async () => {
    expect(await ask([{ filename: "docs/a.md" }])).toBe(false);
    expect(await ask([{ filename: "docs/b.md", previous_filename: "src/b.md" }])).toBe(true);
    expect(await ask([{ filename: "src/a.ts" }])).toBe(true);
  });

  it("counts a list that may be cut off as code", async () => {
    const files = Array.from({ length: 3000 }, (_, index) => ({ filename: `docs/${index}.md` }));
    expect(await ask(files)).toBe(true);
    expect(await ask(files.slice(1))).toBe(false);
  });
});

describe("the command", () => {
  it("sets code=true without a pull request number and without a request", () => {
    const directory = mkdtempSync(join(tmpdir(), "changes-"));
    try {
      const output = join(directory, "output");
      const env = { ...process.env, GITHUB_OUTPUT: output };
      delete env["PR_NUMBER"];
      const result = spawnSync(
        process.execPath,
        [fileURLToPath(new URL("./changes.mjs", import.meta.url))],
        { env, encoding: "utf8" },
      );
      expect(result.status).toBe(0);
      expect(readFileSync(output, "utf8")).toBe("code=true\n");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
