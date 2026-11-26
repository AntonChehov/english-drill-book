import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PageRef } from "../../domain/packs/types";
import { StaticFileError } from "../../storage/static-files";

const render = vi.hoisted(() => ({ openPdf: vi.fn<(bytes: Uint8Array) => Promise<unknown>>() }));
const files = vi.hoisted(() => ({
  loadStaticFile: vi.fn<(path: string) => Promise<Uint8Array>>(),
}));
vi.mock("../../storage/pdf/render", () => render);
vi.mock("../../storage/static-files", async (original) => ({
  ...(await original<typeof import("../../storage/static-files")>()),
  loadStaticFile: files.loadStaticFile,
}));

// The book kept for the visit is module state: each test starts with it unopened.
let pages: typeof import("./pages");
let PdfLibraryLoadError: typeof import("../../storage/pdf/text").PdfLibraryLoadError;

beforeEach(async () => {
  vi.resetModules();
  pages = await import("./pages");
  ({ PdfLibraryLoadError } = await import("../../storage/pdf/text"));
  render.openPdf.mockReset();
  files.loadStaticFile.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const demo = { id: "demo-drills" };
const document = { count: 3 };

describe("the book of a pages panel", () => {
  it("@req DOC-004 is fetched and opened once and shared by every unit that asks for it", async () => {
    files.loadStaticFile.mockResolvedValue(new Uint8Array([1]));
    render.openPdf.mockResolvedValue(document);

    const [first, second] = await Promise.all([pages.bookOf(demo), pages.bookOf(demo)]);

    expect(first).toBe(document);
    expect(second).toBe(document);
    expect(await pages.bookOf(demo)).toBe(document);
    expect(files.loadStaticFile).toHaveBeenCalledTimes(1);
    expect(files.loadStaticFile.mock.calls[0]![0]).toMatch(/drills\.pdf$/);
    expect(render.openPdf).toHaveBeenCalledTimes(1);
  });

  it("@req DOC-008 a failure to fetch is not kept: asking again fetches again", async () => {
    files.loadStaticFile.mockRejectedValueOnce(new StaticFileError("x", { kind: "network" }));
    files.loadStaticFile.mockResolvedValue(new Uint8Array([1]));
    render.openPdf.mockResolvedValue(document);

    await expect(pages.bookOf(demo)).rejects.toMatchObject({ failure: "offline" });
    expect(await pages.bookOf(demo)).toBe(document);

    expect(files.loadStaticFile).toHaveBeenCalledTimes(2);
  });

  it("@req DOC-008 an answer of the server with an error is a book that cannot be shown, not one that is offline", async () => {
    files.loadStaticFile.mockRejectedValue(
      new StaticFileError("x", { kind: "status", status: 404 }),
    );

    await expect(pages.bookOf(demo)).rejects.toMatchObject({ failure: "failed" });
  });

  it("@req DOC-008 a PDF library that did not arrive is offline; a file that cannot be read is failed", async () => {
    files.loadStaticFile.mockResolvedValue(new Uint8Array([1]));
    render.openPdf.mockRejectedValueOnce(new PdfLibraryLoadError("worker"));
    render.openPdf.mockRejectedValueOnce(new Error("damaged"));

    await expect(pages.bookOf(demo)).rejects.toMatchObject({ failure: "offline" });
    await expect(pages.bookOf(demo)).rejects.toMatchObject({ failure: "failed" });
  });

  it("@req DOC-001 a book the app has no file for is missing, and nothing is fetched", async () => {
    expect(pages.fileOf({ id: "own-book" })).toBeUndefined();

    await expect(pages.bookOf({ id: "own-book" })).rejects.toMatchObject({ failure: "missing" });

    expect(files.loadStaticFile).not.toHaveBeenCalled();
  });
});

const ref = (from: number, to: number, role = "book"): PageRef => ({ document: role, from, to });

describe("the page numbers of a unit", () => {
  it("@req DOC-001 lists each page of the ranges once, in order", () => {
    expect(pages.pageNumbers([ref(5, 6), ref(2, 3), ref(3, 4)])).toEqual([2, 3, 4, 5, 6]);
  });

  it("@req DOC-001 takes only the pages of the document asked for", () => {
    const given = [ref(1, 2), ref(7, 8, "keys")];

    expect(pages.pageNumbers(given)).toEqual([1, 2]);
    expect(pages.pageNumbers(given, "keys")).toEqual([7, 8]);
  });

  it("@req DOC-001 a unit with no pages has none", () => {
    expect(pages.pageNumbers(undefined)).toEqual([]);
  });
});
