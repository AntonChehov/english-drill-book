/// <reference types="node" />
// The reader's tests read demo/<book>.text.json, the text pdf.js takes from the committed PDFs.
// This test takes it again with the pinned pdf.js and fails when the two differ, so the fixture
// cannot drift from the files (design, Risks). `pnpm demo:build` rewrites the fixtures.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";
import type { PageText } from "../../domain/books/types";
import { extractText } from "./extract";

const root = new URL("../../../", import.meta.url);

const formatPage = ({ page, lines }: PageText) =>
  `  {\n    "page": ${page},\n    "lines": [\n${lines.map((line) => `      ${JSON.stringify(line)}`).join(",\n")}\n    ]\n  }`;

/** JSON with one printed line per line of the file, so that a change of layout reads as a diff. */
function formatPages(pages: readonly PageText[]): string {
  return `[\n${pages.map(formatPage).join(",\n")}\n]\n`;
}

describe("extractText", () => {
  for (const book of ["course", "drills"]) {
    it(`@req PACK-003 takes from public/demo/${book}.pdf the text of demo/${book}.text.json`, async () => {
      const bytes = readFileSync(fileURLToPath(new URL(`public/demo/${book}.pdf`, root)));
      const pages = await extractText(pdfjs, new Uint8Array(bytes));

      expect(pages.length).toBeGreaterThan(4);
      await expect(formatPages(pages)).toMatchFileSnapshot(
        fileURLToPath(new URL(`demo/${book}.text.json`, root)),
      );
    });
  }

  it("refuses a file that is not a PDF", async () => {
    const bytes = new TextEncoder().encode("not a PDF at all");
    await expect(extractText(pdfjs, bytes)).rejects.toThrow("Invalid PDF structure");
  });
});
