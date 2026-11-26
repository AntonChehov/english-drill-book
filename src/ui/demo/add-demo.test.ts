/// <reference types="node" />
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import courseText from "../../../demo/course.text.json";
import drillsText from "../../../demo/drills.text.json";
import { StaticFileError } from "../../storage/static-files";
import { PdfLibraryLoadError } from "../../storage/pdf/text";
import { addDemo, DemoError, type DemoFailure } from "./add-demo";

const files = vi.hoisted(() => ({
  loadStaticFile: vi.fn<(path: string) => Promise<Uint8Array>>(),
}));
const text = vi.hoisted(() => ({
  loadPdfText: vi.fn<(bytes: Uint8Array) => Promise<unknown>>(),
}));
vi.mock("../../storage/static-files", async (original) => ({
  ...(await original<typeof import("../../storage/static-files")>()),
  loadStaticFile: files.loadStaticFile,
}));
vi.mock("../../storage/pdf/text", async (original) => ({
  ...(await original<typeof import("../../storage/pdf/text")>()),
  loadPdfText: text.loadPdfText,
}));

/** The PDFs published with the app, as the server gives them. */
const published = (path: string) =>
  new Uint8Array(readFileSync(new URL(`../../../public/${path}`, import.meta.url)));

/** The text of the PDFs as pdf.js reads it, in the order the demo books are read. */
const pages = [courseText, drillsText];

beforeEach(() => {
  files.loadStaticFile.mockReset().mockImplementation(async (path) => published(path));
  let read = 0;
  text.loadPdfText.mockReset().mockImplementation(async () => pages[read++]);
});

/** What adding the demo fails with. */
async function failureOf(): Promise<DemoFailure> {
  const error = await addDemo(() => undefined).catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(DemoError);
  return (error as DemoError).failure;
}

describe("addDemo", () => {
  it("@req PACK-003 reads both books into valid packs and says which book it is on", async () => {
    const progress: unknown[] = [];

    const packs = await addDemo((each) => progress.push(each));

    expect(packs.map((pack) => pack.id)).toEqual(["demo-course", "demo-drills"]);
    expect(progress).toEqual([
      { book: "Everyday Grammar: A Demo Course", index: 1, count: 2 },
      { book: "Everyday Grammar: Demo Drills", index: 2, count: 2 },
    ]);
    expect(files.loadStaticFile.mock.calls.map(([path]) => path)).toEqual([
      "demo/course.pdf",
      "demo/drills.pdf",
    ]);
  });

  it("@req PACK-003 a file the server did not give is a failure of the network, or of the server", async () => {
    files.loadStaticFile.mockRejectedValueOnce(new StaticFileError("x", { kind: "network" }));
    expect(await failureOf()).toEqual({ kind: "network", book: "Everyday Grammar: A Demo Course" });

    files.loadStaticFile
      .mockImplementationOnce(async (path) => published(path))
      .mockRejectedValueOnce(new StaticFileError("x", { kind: "status", status: 503 }));
    expect(await failureOf()).toEqual({
      kind: "status",
      book: "Everyday Grammar: Demo Drills",
      status: 503,
    });
  });

  it("@req PACK-003 a file that is not the one published with the app is refused before it is read", async () => {
    files.loadStaticFile.mockResolvedValueOnce(new Uint8Array([1, 2, 3]));

    expect(await failureOf()).toEqual({
      kind: "unreadable",
      book: "Everyday Grammar: A Demo Course",
    });
    expect(text.loadPdfText).not.toHaveBeenCalled();
  });

  it("@req PACK-003 a page that cannot hash the file says the address is not secure", async () => {
    vi.stubGlobal("crypto", {});
    try {
      expect(await failureOf()).toEqual({
        kind: "insecure",
        book: "Everyday Grammar: A Demo Course",
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("@req PACK-003 a PDF library that does not arrive is a failure of the network, one that cannot read the file is not", async () => {
    text.loadPdfText.mockReset().mockRejectedValueOnce(new PdfLibraryLoadError("its module"));
    expect(await failureOf()).toEqual({ kind: "network", book: "Everyday Grammar: A Demo Course" });

    text.loadPdfText.mockReset().mockRejectedValueOnce(new Error("bad PDF"));
    expect(await failureOf()).toEqual({
      kind: "unreadable",
      book: "Everyday Grammar: A Demo Course",
    });
  });

  it("@req PACK-001 text that does not read into the book is refused", async () => {
    text.loadPdfText.mockReset().mockResolvedValue([{ page: 1, lines: [] }]);

    expect(await failureOf()).toEqual({
      kind: "unreadable",
      book: "Everyday Grammar: A Demo Course",
    });
  });
});
