// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadPdfText, PdfLibraryLoadError, startWorker } from "./text";

// The PDF library is replaced by one that reads a document of two pages with one line each.
const library = vi.hoisted(() => ({ destroyed: [] as string[] }));
vi.mock("pdfjs-dist", () => {
  class PDFWorker {
    destroy() {
      library.destroyed.push("worker");
    }
  }
  const page = {
    view: [0, 0, 595, 842],
    getTextContent: async () => ({
      items: [{ str: "Hello", transform: [10, 0, 0, 10, 50, 100], width: 30 }],
    }),
    cleanup: () => undefined,
  };
  return {
    PDFWorker,
    getDocument: () => ({
      promise: Promise.resolve({ numPages: 2, getPage: async () => page }),
      destroy: async () => {
        library.destroyed.push("task");
      },
    }),
  };
});

/** A worker that says what the test tells it to, once the page has started it. */
class FakeWorker {
  static made: FakeWorker[] = [];
  static script: "ready" | "error" | "other" = "ready";
  terminated = false;
  private readonly listeners = new Map<string, ((event: unknown) => void)[]>();

  constructor() {
    FakeWorker.made.push(this);
    queueMicrotask(() => {
      if (FakeWorker.script === "ready") this.say("message", { data: { action: "ready" } });
      else if (FakeWorker.script === "other") this.say("message", { data: null });
      else this.say("error", {});
    });
  }

  addEventListener(type: string, listener: (event: unknown) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  terminate() {
    this.terminated = true;
  }

  private say(type: string, event: unknown) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

beforeEach(() => {
  library.destroyed = [];
  FakeWorker.made = [];
  FakeWorker.script = "ready";
  vi.stubGlobal("Worker", FakeWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("startWorker", () => {
  it("@req DOC-004 gives the worker once it says it is ready", async () => {
    const worker = await startWorker();

    expect(worker).toBe(FakeWorker.made[0]);
    expect(FakeWorker.made[0]!.terminated).toBe(false);
  });

  it("@req DOC-008 a worker whose file does not arrive is ended and is a failure of the library", async () => {
    FakeWorker.script = "error";

    await expect(startWorker()).rejects.toBeInstanceOf(PdfLibraryLoadError);

    expect(FakeWorker.made[0]!.terminated).toBe(true);
  });

  it("@req DOC-004 waits through a message that is not the ready one", async () => {
    FakeWorker.script = "other";
    let settled = false;
    void startWorker().then(
      () => (settled = true),
      () => (settled = true),
    );

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(settled).toBe(false);
  });
});

describe("loadPdfText", () => {
  it("@req PACK-003 reads the lines of every page and lets go of the worker and the document", async () => {
    const pages = await loadPdfText(new Uint8Array([1]));

    expect(pages.map(({ page }) => page)).toEqual([1, 2]);
    expect(pages[0]!.lines.map(({ text }) => text)).toEqual(["Hello"]);
    expect(library.destroyed.toSorted()).toEqual(["task", "worker"]);
    expect(FakeWorker.made[0]!.terminated).toBe(true);
  });
});
