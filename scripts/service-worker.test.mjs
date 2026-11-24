import { describe, expect, it } from "vitest";
import { cachedFiles } from "../vite.config.ts";

describe("cachedFiles", () => {
  it("@req PROD-003 keeps the app and leaves out the demo books, the build's manifest and the worker", () => {
    expect(
      cachedFiles([
        "sw.js",
        "index.html",
        "favicon.svg",
        "demo/course.pdf",
        "demo/drills.pdf",
        ".vite/manifest.json",
        "assets/index-1.js",
        "assets/pdf.worker.min-1.mjs",
      ]),
    ).toEqual(["assets/index-1.js", "assets/pdf.worker.min-1.mjs", "favicon.svg", "index.html"]);
  });
});
