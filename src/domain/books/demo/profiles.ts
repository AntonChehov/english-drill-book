// The profiles of the two demo books (design D1). Their text is in public/demo/*.pdf, written for
// this project; a profile holds only what names the pack and the structure the book must have.

import type { BookProfile, DocumentInfo } from "../types";
import documents from "./documents.json";

/** A demo book: its profile, the file of the app it is read from and what that file must be. */
export interface DemoBook {
  readonly profile: BookProfile;
  /** Path of the PDF relative to the app's base address. */
  readonly file: string;
  /**
   * The SHA-256 and page count of the PDF published with the app, written by `pnpm demo:build`.
   * A fetched file that differs is not read (design D5).
   */
  readonly document: DocumentInfo;
}

const fourUnitsOfThree = ["1", "2", "3", "4"].map((id) => ({ id, exercises: 3 }));

const common = {
  version: "1.0.0",
  language: "en",
  instructionLanguage: "en",
  license: "CC-BY-4.0",
  documentRole: "book",
  units: fourUnitsOfThree,
} as const;

const source = { authors: ["English Drill Book project"], edition: "1", year: 2026 } as const;

export const demoCourse: DemoBook = {
  file: "demo/course.pdf",
  document: documents.course,
  profile: {
    ...common,
    id: "demo-course",
    title: "Everyday Grammar: A Demo Course",
    source: { ...source, title: "Everyday Grammar: A Demo Course" },
  },
};

export const demoDrills: DemoBook = {
  file: "demo/drills.pdf",
  document: documents.drills,
  profile: {
    ...common,
    id: "demo-drills",
    title: "Everyday Grammar: Demo Drills",
    source: { ...source, title: "Everyday Grammar: Demo Drills" },
  },
};

/** The demo books in the order they are added: the course, then the drill book. */
export const demoBooks: readonly DemoBook[] = [demoCourse, demoDrills];
