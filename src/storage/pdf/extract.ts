// The text layer of a PDF as pages of lines (design D3). The one place that reads what pdf.js
// reports; the library itself is passed in, so tests in Node can give the build made for Node.

import { linesFromRuns, type TextRun } from "../../domain/books/lines";
import type { PageText } from "../../domain/books/types";

export type PdfJs = Pick<typeof import("pdfjs-dist"), "getDocument">;

/** Coordinates are kept to a hundredth of a point, so the same file gives the same numbers. */
const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Reads every page of the PDF in `data`. pdf.js may take over the buffer, so the caller keeps
 * no use of it. Fonts are not loaded and nothing is fetched: only the text layer is read.
 */
export async function extractText(pdfjs: PdfJs, data: Uint8Array): Promise<PageText[]> {
  const task = pdfjs.getDocument({
    data,
    verbosity: 0,
    disableFontFace: true,
    useSystemFonts: false,
    useWasm: false,
    enableXfa: false,
    stopAtErrors: true,
  });
  try {
    const document = await task.promise;
    const pages: PageText[] = [];
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number);
      const top = page.view[3] ?? 0;
      const content = await page.getTextContent();
      const runs: TextRun[] = [];
      for (const item of content.items) {
        if (!("str" in item)) continue;
        const [, , c = 0, d = 0, x = 0, y = 0] = item.transform as number[];
        runs.push({
          text: item.str,
          x: round(x),
          y: round(top - y),
          width: round(item.width),
          size: round(Math.hypot(c, d)),
        });
      }
      pages.push({ page: number, lines: linesFromRuns(runs) });
      page.cleanup();
    }
    return pages;
  } finally {
    await task.destroy();
  }
}
