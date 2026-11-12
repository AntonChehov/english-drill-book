// Adding the demo books (PACK-003, design D8): each PDF is fetched from the app's own origin and
// checked to be the file published with the app; its text is read with pdf.js, read into a pack
// by the reader of the demo layout and the pack validated (PACK-001) before it is shown. This
// module is loaded only when the visitor asks for the demo, so neither it nor what it imports
// weighs on the first screen.

import { demoBooks, type DemoBook } from "../../domain/books/demo/profiles";
import { readDemoBook } from "../../domain/books/demo/reader";
import type { PageText } from "../../domain/books/types";
import type { Pack } from "../../domain/packs/types";
import { validatePack } from "../../domain/packs/validate";
import { DigestUnavailableError, sha256Hex } from "../../storage/digest";
import { loadPdfText, PdfLibraryLoadError } from "../../storage/pdf/text";
import { loadStaticFile, StaticFileError } from "../../storage/static-files";

/** Why the demo could not be added; `book` is the title of the book it happened with. */
export type DemoFailure =
  /** A file of the app, the book or the PDF library, did not arrive. */
  | { readonly kind: "network"; readonly book: string }
  /** The server answered the request for the book with an error. */
  | { readonly kind: "status"; readonly book: string; readonly status: number }
  /** The file is not the published book, or it could not be read into a valid pack. */
  | { readonly kind: "unreadable"; readonly book: string }
  /** The browser cannot check the file here: the page is not in a secure context. */
  | { readonly kind: "insecure"; readonly book: string };

export class DemoError extends Error {
  constructor(readonly failure: DemoFailure) {
    super(`The demo book "${failure.book}" could not be added: ${failure.kind}`);
    this.name = "DemoError";
  }
}

/** Which book is being read: its title, its place and how many there are. */
export interface DemoProgress {
  readonly book: string;
  readonly index: number;
  readonly count: number;
}

async function fetchBook({ file }: DemoBook, book: string): Promise<Uint8Array<ArrayBuffer>> {
  try {
    return new Uint8Array(await loadStaticFile(file));
  } catch (error) {
    if (error instanceof StaticFileError && error.failure.kind === "status") {
      throw new DemoError({ kind: "status", book, status: error.failure.status });
    }
    throw new DemoError({ kind: "network", book });
  }
}

/** Refuses a file that is not the one published with the app, before any of it is read. */
async function checkDocument(bytes: Uint8Array<ArrayBuffer>, { document }: DemoBook, book: string) {
  let sha256: string;
  try {
    sha256 = await sha256Hex(bytes);
  } catch (error) {
    if (error instanceof DigestUnavailableError) throw new DemoError({ kind: "insecure", book });
    throw error;
  }
  if (sha256 !== document.sha256) throw new DemoError({ kind: "unreadable", book });
}

async function textOf(bytes: Uint8Array, book: string): Promise<PageText[]> {
  try {
    return await loadPdfText(bytes);
  } catch (error) {
    if (error instanceof PdfLibraryLoadError) throw new DemoError({ kind: "network", book });
    throw new DemoError({ kind: "unreadable", book });
  }
}

/** Fetches, checks, reads and validates the demo books in turn and returns their packs. */
export async function addDemo(onProgress: (progress: DemoProgress) => void): Promise<Pack[]> {
  const packs: Pack[] = [];
  for (const [index, demo] of demoBooks.entries()) {
    const book = demo.profile.title;
    onProgress({ book, index: index + 1, count: demoBooks.length });
    const bytes = await fetchBook(demo, book);
    await checkDocument(bytes, demo, book);
    const pages = await textOf(bytes, book);
    const read = readDemoBook(demo.profile, pages, demo.document);
    if (!read.ok) throw new DemoError({ kind: "unreadable", book });
    const validation = validatePack(read.pack);
    if (!validation.ok) throw new DemoError({ kind: "unreadable", book });
    packs.push(validation.pack);
  }
  return packs;
}
