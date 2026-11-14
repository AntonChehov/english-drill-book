// The book a pages panel draws from (design D8 of `study-screen`): the demo PDF is fetched from the
// app's own origin once and opened once, then reused by every unit. A failure is not kept, so
// repeating fetches it again, without reloading the page (DOC-008).

import { demoBooks } from "../../domain/books/demo/profiles";
import type { Pack, PageRef } from "../../domain/packs/types";
import { openPdf, type PdfPages } from "../../storage/pdf/render";
import { PdfLibraryLoadError } from "../../storage/pdf/text";
import { loadStaticFile, StaticFileError } from "../../storage/static-files";

export type { PdfPages };

/** Why the pages cannot be shown. */
export type PagesFailure =
  /** The book or the PDF library did not arrive: no connection (DOC-008). */
  | "offline"
  /** The file arrived and could not be drawn. */
  | "failed"
  /** The app has no file for this pack. */
  | "missing";

export class PagesError extends Error {
  constructor(readonly failure: PagesFailure) {
    super(`The pages cannot be shown: ${failure}`);
    this.name = "PagesError";
  }
}

const opened = new Map<string, Promise<PdfPages>>();

/** The file of the app that holds the pages of `pack`: a demo book's PDF. */
export function fileOf(pack: Pick<Pack, "id">): string | undefined {
  return demoBooks.find((book) => book.profile.id === pack.id)?.file;
}

async function open(file: string): Promise<PdfPages> {
  let bytes: Uint8Array;
  try {
    bytes = await loadStaticFile(file);
  } catch (error) {
    const offline = error instanceof StaticFileError && error.failure.kind === "network";
    throw new PagesError(offline ? "offline" : "failed");
  }
  try {
    return await openPdf(bytes);
  } catch (error) {
    throw new PagesError(error instanceof PdfLibraryLoadError ? "offline" : "failed");
  }
}

/** The opened book of `pack`, fetched and opened on first use. */
export function bookOf(pack: Pick<Pack, "id">): Promise<PdfPages> {
  const file = fileOf(pack);
  if (file === undefined) return Promise.reject(new PagesError("missing"));
  let book = opened.get(file);
  if (book === undefined) {
    book = open(file);
    opened.set(file, book);
    book.catch(() => opened.delete(file));
  }
  return book;
}

/** The page numbers of `pages`, in order, each once, in the document `role`. */
export function pageNumbers(pages: readonly PageRef[] | undefined, role = "book"): number[] {
  const numbers = new Set<number>();
  for (const { document, from, to } of pages ?? []) {
    if (document !== role) continue;
    for (let page = from; page <= to; page++) numbers.add(page);
  }
  return [...numbers].toSorted((a, b) => a - b);
}
