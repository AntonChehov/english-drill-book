// Draws the pages of a PDF on canvases (DOC-001, DOC-005; design D8 of `study-screen`). pdf.js is
// loaded on demand, as for reading text, and its worker is started by the app (`text.ts`), so a
// worker that did not arrive fails only this attempt and a later one can succeed.

import { loadPdfLibrary, startWorker } from "./text";

/** The size of a page at 100 %, in CSS pixels. */
export interface PageSize {
  readonly width: number;
  readonly height: number;
}

/** An opened PDF whose pages can be drawn; open as long as the app may show it. */
export interface PdfPages {
  /** The number of pages. */
  readonly count: number;
  /** The size of page `number` (from 1). */
  size(number: number): Promise<PageSize>;
  /**
   * Draws page `number` on `canvas`, `width` CSS pixels wide at the device's `ratio` of pixels.
   * Settles when the page is drawn; rejects when `signal` aborts first.
   */
  draw(
    number: number,
    canvas: HTMLCanvasElement,
    width: number,
    ratio: number,
    signal?: AbortSignal,
  ): Promise<void>;
  /** Closes the document and stops its worker. */
  destroy(): void;
}

/**
 * Opens the PDF in `data` for drawing; the buffer is handed over. Throws `PdfLibraryLoadError`
 * when the library or its worker cannot be loaded, and pdf.js's own error when the file cannot be
 * read.
 */
export async function openPdf(data: Uint8Array): Promise<PdfPages> {
  const pdfjs = await loadPdfLibrary();
  const port = await startWorker();
  // The types of pdf.js 6.5 declare `port` as null only; the code takes a Worker there.
  const worker = new pdfjs.PDFWorker({ port: port as unknown as null });
  const task = pdfjs.getDocument({
    data,
    worker,
    verbosity: 0,
    useWasm: false,
    enableXfa: false,
    disableWorkerRendering: true,
  });
  const stop = () => {
    void task.destroy();
    worker.destroy();
    port.terminate();
  };
  let document: Awaited<typeof task.promise>;
  try {
    document = await task.promise;
  } catch (error) {
    stop();
    throw error;
  }

  return {
    count: document.numPages,

    async size(number) {
      const { width, height } = (await document.getPage(number)).getViewport({ scale: 1 });
      return { width, height };
    },

    async draw(number, canvas, width, ratio, signal) {
      signal?.throwIfAborted();
      const page = await document.getPage(number);
      signal?.throwIfAborted();
      const scale = (width * ratio) / page.getViewport({ scale: 1 }).width;
      const viewport = page.getViewport({ scale });
      // Drawn off screen first, so the canvas never shows a half-drawn or blank page.
      const drawing = canvas.ownerDocument.createElement("canvas");
      drawing.width = Math.floor(viewport.width);
      drawing.height = Math.floor(viewport.height);
      const render = page.render({ canvas: drawing, viewport });
      const cancel = () => render.cancel();
      signal?.addEventListener("abort", cancel, { once: true });
      try {
        await render.promise;
      } finally {
        signal?.removeEventListener("abort", cancel);
      }
      canvas.width = drawing.width;
      canvas.height = drawing.height;
      canvas.getContext("2d")?.drawImage(drawing, 0, 0);
    },

    destroy: stop,
  };
}
