// What a reader gets from a PDF and what it gives back (design D3 of the change `demo-books`).

import type { Pack } from "../packs/types";

/** One line of text as printed: its words, where it starts and the size of its font. */
export interface Line {
  readonly text: string;
  /** Distance of the line's start from the left edge of the page, in points. */
  readonly x: number;
  /** Distance of the line's baseline from the top edge of the page, in points. */
  readonly y: number;
  /** Font size in points. */
  readonly size: number;
}

/** The text of one page, its lines from top to bottom and, on one line, from left to right. */
export interface PageText {
  /** Page number in the document, from 1. */
  readonly page: number;
  readonly lines: readonly Line[];
}

/** The document a pack is read from, as `source.documents` records it. */
export interface DocumentInfo {
  readonly sha256: string;
  readonly pages: number;
}

/**
 * What the app knows about one edition of a book without its text: how to name the pack and
 * which units and exercises the book must have (docs/product/02-content-packs.md, Terms).
 */
export interface BookProfile {
  /** The `id` of the pack it builds. */
  readonly id: string;
  /** The `version` of the pack it builds. */
  readonly version: string;
  readonly title: string;
  readonly language: string;
  readonly instructionLanguage: string;
  /** SPDX identifier, for a book written for this project. */
  readonly license: string;
  readonly source: {
    readonly title: string;
    readonly authors: readonly string[];
    readonly edition: string;
    readonly year: number;
  };
  /** The role of the document in `source.documents`. */
  readonly documentRole: string;
  /** Every unit of the book in order, with the number of its exercises. */
  readonly units: readonly { readonly id: string; readonly exercises: number }[];
}

/** Something the reader expected and did not find, or found where it should not be. */
export type ReadProblemKind =
  | "unit-missing"
  | "unit-repeated"
  | "unit-unexpected"
  | "exercise-missing"
  | "exercise-repeated"
  | "exercise-unexpected"
  | "exercise-empty"
  | "item-sequence"
  | "key-section-missing"
  | "key-missing"
  | "key-repeated"
  | "key-unexpected"
  | "key-mismatch";

export interface ReadProblem {
  readonly kind: ReadProblemKind;
  /** The unit or exercise concerned; empty for the book as a whole. */
  readonly id: string;
  /** The page where it was found, when it was found somewhere. */
  readonly page?: number;
}

export type ReadResult =
  | { readonly ok: true; readonly pack: Pack }
  | { readonly ok: false; readonly problems: readonly ReadProblem[] };
