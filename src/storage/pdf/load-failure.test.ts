import { describe, expect, it, vi } from "vitest";
import { loadPdfLibrary, PdfLibraryLoadError } from "./text";

// The module of the PDF library is not there.
vi.mock("pdfjs-dist", () => {
  throw new Error("not found");
});

describe("loadPdfLibrary", () => {
  it("@req DOC-008 a library that does not arrive is a failure of the library", async () => {
    await expect(loadPdfLibrary()).rejects.toBeInstanceOf(PdfLibraryLoadError);
  });
});
