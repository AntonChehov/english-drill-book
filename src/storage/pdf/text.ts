// Loads pdf.js on demand and reads the text of a PDF (design D3, D4). pdf.js is imported
// dynamically, so it is a chunk of its own that the first screen does not load (C-06); its worker
// is a file of the app, served from the app's own origin (C-02).

// oxlint-disable-next-line import/default -- a `?url` import is Vite's: its default export is the URL (vite/client).
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { PageText } from "../../domain/books/types";
import { extractText } from "./extract";

/**
 * A file of the PDF library, the library or its worker, did not arrive: the network failed, not
 * the document. Nothing is remembered, so the next attempt loads the files again.
 */
export class PdfLibraryLoadError extends Error {
  constructor(what: string) {
    super(`The PDF library could not be loaded: ${what}`);
    this.name = "PdfLibraryLoadError";
  }
}

/**
 * Starts the worker of pdf.js and waits until it says it is ready. pdf.js could start it itself,
 * but when the file does not arrive it falls back to running the worker on the page and keeps
 * that failed set-up for the life of the page, so no later attempt could succeed (review of
 * `demo-books`, F1). A worker started here fails only this attempt.
 */
function startWorker(): Promise<Worker> {
  const worker = new Worker(workerUrl, { type: "module" });
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    worker.addEventListener(
      "message",
      (event: MessageEvent<{ action?: unknown } | null>) => {
        if (event.data?.action !== "ready") return;
        controller.abort();
        resolve(worker);
      },
      { signal: controller.signal },
    );
    worker.addEventListener(
      "error",
      () => {
        controller.abort();
        worker.terminate();
        reject(new PdfLibraryLoadError("its worker"));
      },
      { signal: controller.signal },
    );
  });
}

/**
 * Reads the text layer of every page of the PDF in `data`; the buffer is handed over. Throws
 * `PdfLibraryLoadError` when the library or its worker cannot be loaded, and pdf.js's own error
 * when the file cannot be read.
 */
export async function loadPdfText(data: Uint8Array): Promise<PageText[]> {
  let pdfjs: typeof import("pdfjs-dist");
  try {
    pdfjs = await import("pdfjs-dist");
  } catch {
    throw new PdfLibraryLoadError("its module");
  }
  const port = await startWorker();
  // The types of pdf.js 6.5 declare `port` as null only; the code takes a Worker there.
  const worker = new pdfjs.PDFWorker({ port: port as unknown as null });
  try {
    return await extractText(pdfjs, data, worker);
  } finally {
    worker.destroy();
    port.terminate();
  }
}
