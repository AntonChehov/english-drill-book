import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { thirdPartyNotices } from "../vite.config.ts";

describe("thirdPartyNotices", () => {
  const notices = thirdPartyNotices(process.cwd());
  const { dependencies } = JSON.parse(readFileSync("package.json", "utf8"));

  it("names every runtime dependency with its version and licence", () => {
    for (const name of Object.keys(dependencies)) {
      const { version, license } = JSON.parse(
        readFileSync(`node_modules/${name}/package.json`, "utf8"),
      );
      expect(notices).toContain(`${name} ${version} (${license})`);
    }
  });

  it("carries the whole licence of pdf.js, Apache-2.0", () => {
    expect(notices).toContain(readFileSync("node_modules/pdfjs-dist/LICENSE", "utf8").trim());
    expect(notices).toContain("Apache License");
  });
});
