import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { mergeMetrics, readMetrics } from "./common.mjs";
import { formatKb, gzipSize, initialFiles, laterFiles, measure } from "./size.mjs";

const manifest = {
  "index.html": {
    file: "assets/index.js",
    isEntry: true,
    css: ["assets/index.css"],
    imports: ["_shared.js"],
    dynamicImports: ["src/pdf.ts"],
  },
  "_shared.js": { file: "assets/shared.js", css: ["assets/shared.css"], imports: ["index.html"] },
  "src/pdf.ts": { file: "assets/pdf.js", isDynamicEntry: true, css: ["assets/pdf.css"] },
};

describe("initialFiles", () => {
  it("takes the entries and their static imports with their CSS", () => {
    expect(initialFiles(manifest)).toEqual({
      js: ["assets/index.js", "assets/shared.js"],
      css: ["assets/index.css", "assets/shared.css"],
    });
  });

  it("leaves out chunks that load on demand", () => {
    expect(initialFiles(manifest).js).not.toContain("assets/pdf.js");
  });

  it("ignores an import missing from the manifest", () => {
    expect(initialFiles({ a: { file: "a.js", isEntry: true, imports: ["gone"] } }).js).toEqual([
      "a.js",
    ]);
  });
});

describe("laterFiles", () => {
  it("lists the chunks that load on demand and the scripts they use, not the initial ones", () => {
    const withWorker = {
      ...manifest,
      "src/pdf.ts": {
        ...manifest["src/pdf.ts"],
        assets: ["assets/worker.mjs", "assets/font.woff2"],
      },
    };
    expect(laterFiles(withWorker)).toEqual(["assets/pdf.js", "assets/worker.mjs"]);
  });

  it("lists nothing when everything loads with the first screen", () => {
    expect(laterFiles({ a: { file: "a.js", isEntry: true } })).toEqual([]);
  });
});

describe("measure", () => {
  const files = { js: ["a.js", "b.js"], css: ["a.css"] };
  const contents = { "a.js": "x".repeat(5000), "b.js": "let y = 1;", "a.css": "body{}" };
  const read = (file) => Buffer.from(contents[file]);

  it("sums raw and gzipped sizes per kind", () => {
    const { size, over } = measure(files, read);
    expect(size.js.bytes).toBe(5010);
    expect(size.js.gzip).toBe(gzipSize(read("a.js")) + gzipSize(read("b.js")));
    expect(size.css).toEqual({
      files: ["a.css"],
      bytes: 6,
      gzip: gzipSize(read("a.css")),
      budget: 20_000,
    });
    expect(size.js.budget).toBe(120_000);
    expect(over).toEqual([]);
  });

  it("reports each budget exceeded", () => {
    const { over } = measure(files, read, { js: 0.01, css: 20 });
    expect(over).toHaveLength(1);
    expect(over[0]).toMatch(/^js: .* gzip is over the budget of 0\.01 kB$/);
  });

  it("allows a size equal to the budget", () => {
    const gzip = gzipSize(read("a.css"));
    expect(measure({ js: [], css: ["a.css"] }, read, { js: 1, css: gzip / 1000 }).over).toEqual([]);
  });
});

describe("metrics.json", () => {
  let directory;
  afterEach(() => rmSync(directory, { recursive: true, force: true }));

  it("keeps the parts written by other jobs", () => {
    directory = mkdtempSync(join(tmpdir(), "size-"));
    const path = join(directory, "metrics.json");
    writeFileSync(path, JSON.stringify({ sha: "abc", size: { old: true } }));
    mergeMetrics(path, { size: { js: 1 } });
    expect(readMetrics(path)).toEqual({ sha: "abc", size: { js: 1 } });
  });
});

it("formats kilobytes", () => {
  expect(formatKb(34_990)).toBe("34.99 kB");
});
