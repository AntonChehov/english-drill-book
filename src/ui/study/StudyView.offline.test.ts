// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PdfLibraryLoadError } from "../../storage/pdf/text";
import {
  buttonNamed,
  buttonsNamed,
  click,
  demoPacks,
  exerciseOf,
  freshStorage,
  mountStudy,
  seededStore,
  stubObservers,
  stubScreen,
  textOf,
} from "../testing/study.fixture";

// The book is never opened in this file: a book once opened is kept by the app for the visit, so
// every test here starts with it not opened.
const book = vi.hoisted(() => ({ open: undefined as undefined | (() => Promise<unknown>) }));
vi.mock("../../storage/pdf/render", () => ({ openPdf: () => book.open!() }));

beforeEach(async () => {
  book.open = async () => {
    throw new Error("not drawn");
  };
  await freshStorage();
  stubObservers();
  stubScreen(false);
  vi.stubGlobal("fetch", async () => new Response(new Uint8Array([1])));
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const pagesAlert = () => document.querySelector(".pages-column [role='alert']");

describe("the pages when the book cannot be shown", () => {
  it("@req DOC-008 without a connection the panel says the demo needs one, offers to repeat, and the exercises work", async () => {
    await seededStore();
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("offline");
    });
    await mountStudy("/study/demo-drills/1");

    await vi.waitFor(() => expect(pagesAlert()).not.toBeNull());
    expect(textOf(pagesAlert()!)).toContain(
      "Страницы демо-книги показываются только при подключении к интернету.",
    );
    expect(buttonsNamed("Увеличить")).toHaveLength(0);
    await click(buttonNamed("Повторить", pagesAlert()!));
    await vi.waitFor(() => expect(pagesAlert()).not.toBeNull());
    expect(exerciseOf("1.1")).toBeDefined();
  });

  it("@req DOC-008 a library that did not arrive is also said as no connection", async () => {
    await seededStore();
    book.open = async () => {
      throw new PdfLibraryLoadError("worker");
    };
    await mountStudy("/study/demo-drills/1");

    await vi.waitFor(() => expect(textOf(pagesAlert()!)).toContain("только при подключении"));
  });

  it("@req PROD-011 a file that cannot be drawn is said so in the panel", async () => {
    await seededStore();
    vi.stubGlobal("fetch", async () => new Response("", { status: 500 }));
    await mountStudy("/study/demo-drills/1");

    await vi.waitFor(() =>
      expect(textOf(pagesAlert()!)).toBe("Не удалось показать страницы книги. Повторить"),
    );
  });

  it("@req PROD-011 a book the app has no file for says so and offers no repeat", async () => {
    const own = structuredClone(demoPacks[1]!);
    (own as { id: string }).id = "own-book";
    await seededStore([own]);
    await mountStudy("/study/own-book/1");

    await vi.waitFor(() =>
      expect(textOf(pagesAlert()!)).toBe("Страниц этой книги нет в приложении."),
    );
  });
});
