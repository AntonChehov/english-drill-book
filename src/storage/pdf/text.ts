// Loads pdf.js on demand and reads the text of a PDF (design D3, D4). pdf.js is imported
// dynamically, so it is a chunk of its own that the first screen does not load (C-06); its worker
// is a file of the app, served from the app's own origin (C-02).

// oxlint-disable-next-line import/default -- a `?url` import is Vite's: its default export is the URL (vite/client).
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { PageText } from "../../domain/books/types";
import { extractText } from "./extract";

/** Reads the text layer of every page of the PDF in `data`; the buffer is handed over. */
export async function loadPdfText(data: Uint8Array): Promise<PageText[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  return extractText(pdfjs, data);
}
