// Adding the demo books (PACK-003, design D8): each PDF is fetched from the app's own origin,
// its text read with pdf.js, the text read into a pack by the reader of the demo layout and the
// pack validated (PACK-001) before it is shown. This module is loaded only when the visitor asks
// for the demo, so neither it nor what it imports weighs on the first screen.

import { demoBooks } from "../../domain/books/demo/profiles";
import { readDemoBook } from "../../domain/books/demo/reader";
import type { Pack } from "../../domain/packs/types";
import { validatePack } from "../../domain/packs/validate";
import { sha256Hex } from "../../storage/digest";
import { loadPdfText } from "../../storage/pdf/text";
import { loadStaticFile, StaticFileError } from "../../storage/static-files";

/** Why the demo could not be added; `book` is the title of the book it happened with. */
export type DemoFailure =
  | { readonly kind: "network"; readonly book: string }
  | { readonly kind: "status"; readonly book: string; readonly status: number }
  | { readonly kind: "unreadable"; readonly book: string };

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

async function readBook(path: string, book: string, read: (bytes: Uint8Array) => Promise<Pack>) {
  let bytes: Uint8Array;
  try {
    bytes = await loadStaticFile(path);
  } catch (error) {
    if (error instanceof StaticFileError && error.failure.kind === "status") {
      throw new DemoError({ kind: "status", book, status: error.failure.status });
    }
    throw new DemoError({ kind: "network", book });
  }
  return read(bytes);
}

/** Fetches, reads and validates the demo books in turn and returns their packs. */
export async function addDemo(onProgress: (progress: DemoProgress) => void): Promise<Pack[]> {
  const packs: Pack[] = [];
  for (const [index, { file, profile }] of demoBooks.entries()) {
    const book = profile.title;
    onProgress({ book, index: index + 1, count: demoBooks.length });
    const pack = await readBook(file, book, async (bytes) => {
      const sha256 = await sha256Hex(new Uint8Array(bytes));
      let pages;
      try {
        pages = await loadPdfText(bytes);
      } catch (error) {
        // The library itself is a file of the app: without the network it does not arrive.
        if (error instanceof TypeError) throw new DemoError({ kind: "network", book });
        throw new DemoError({ kind: "unreadable", book });
      }
      const read = readDemoBook(profile, pages, { sha256, pages: pages.length });
      if (!read.ok) throw new DemoError({ kind: "unreadable", book });
      const validation = validatePack(read.pack);
      if (!validation.ok) throw new DemoError({ kind: "unreadable", book });
      return validation.pack;
    });
    packs.push(pack);
  }
  return packs;
}
