// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StorageError } from "../../storage/db/errors";
import type { Pack } from "../../domain/packs/types";
import { demoState } from "../demo/state";
import { getStore } from "../storage";
import {
  buttonNamed,
  buttonsNamed,
  click,
  demoPacks,
  freshStorage,
  mountStudy,
  stubObservers,
  stubScreen,
  textOf,
} from "../testing/study.fixture";

// Adding the demo reads PDFs; here it gives the packs read, or fails, as each test says.
const adding = vi.hoisted(() => ({ run: undefined as undefined | (() => Promise<unknown>) }));
vi.mock("../demo/add-demo", () => ({
  addDemo: async (onProgress: (progress: unknown) => void) => {
    onProgress({ book: "Everyday Grammar: A Demo Course", index: 1, count: 2 });
    return adding.run?.();
  },
}));
vi.mock("../../storage/pdf/render", () => ({
  openPdf: async () => ({
    count: 12,
    size: async () => ({ width: 595, height: 842 }),
    draw: async () => undefined,
    destroy: () => undefined,
  }),
}));

const drills = "/study/demo-drills/1";

beforeEach(async () => {
  adding.run = async () => demoPacks;
  demoState.value = { phase: "loading" };
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

describe("a unit of the demo in a browser where the demo is not added", () => {
  it("@req PROD-008 says so, names the book and offers to add the demo and open the unit", async () => {
    await mountStudy(drills);

    expect(textOf(document.querySelector("h1")!)).toBe("Демо-книги ещё не добавлены");
    expect(document.title).toBe("Демо-книги не добавлены — English Drill Book");
    expect(textOf(document.querySelector("section")!)).toContain("«Everyday Grammar: Demo Drills»");
    expect(buttonNamed("Добавить демо-книги и открыть раздел")).toBeDefined();
    expect(textOf(document.querySelector("a")!)).toBe("На главную");
  });

  it("@req PROD-008 adding the demo opens the unit, takes the focus to its title and marks the demo as added", async () => {
    await mountStudy(drills);

    await click(buttonNamed("Добавить демо-книги и открыть раздел"));

    await vi.waitFor(() =>
      expect(textOf(document.querySelector("h1")!)).toBe("Раздел 1. Глагол to be: am, is, are"),
    );
    expect(document.activeElement).toBe(document.querySelector("h1"));
    expect(demoState.value.phase).toBe("added");
    expect(await (await getStore()).getPacks()).toHaveLength(2);
  });

  it("@req PACK-003 says which book is being read, and a second press while it is read does nothing", async () => {
    let finish: ((packs: Pack[]) => void) | undefined;
    const calls = vi.fn<() => void>();
    adding.run = () => {
      calls();
      return new Promise<Pack[]>((resolve) => (finish = resolve));
    };
    await mountStudy(drills);

    await click(buttonNamed("Добавить демо-книги и открыть раздел"));
    await click(buttonNamed("Добавить демо-книги и открыть раздел"));

    expect(document.querySelector("[role='status']")!.textContent).toBe(
      "Читаем книгу 1 из 2: «Everyday Grammar: A Demo Course»…",
    );
    expect(buttonNamed("Добавить демо-книги и открыть раздел").getAttribute("aria-disabled")).toBe(
      "true",
    );
    expect(calls).toHaveBeenCalledTimes(1);
    finish?.(demoPacks);
    await vi.waitFor(() => expect(textOf(document.querySelector("h1")!)).toContain("Раздел 1"));
  });

  it("@req PACK-003 a failure to load the books is said next to the button, which then offers to try again and succeeds", async () => {
    const { DemoError } =
      await vi.importActual<typeof import("../demo/add-demo")>("../demo/add-demo");
    adding.run = async () => {
      throw new DemoError({ kind: "network", book: "Everyday Grammar: A Demo Course" });
    };
    await mountStudy(drills);

    await click(buttonNamed("Добавить демо-книги и открыть раздел"));

    await vi.waitFor(() =>
      expect(textOf(document.querySelector("[role='alert']")!)).toContain("нет связи с сайтом"),
    );
    expect(buttonsNamed("Добавить демо-книги и открыть раздел")).toHaveLength(0);
    adding.run = async () => demoPacks;
    await click(buttonNamed("Попробовать ещё раз"));
    await vi.waitFor(() => expect(textOf(document.querySelector("h1")!)).toContain("Раздел 1"));
  });

  it("@req DATA-004 books read but not kept are not shown as added, and the reason is said", async () => {
    await mountStudy(drills);
    vi.spyOn(await getStore(), "putPacks").mockRejectedValueOnce(new StorageError("quota"));

    await click(buttonNamed("Добавить демо-книги и открыть раздел"));

    await vi.waitFor(() =>
      expect(textOf(document.querySelector("[role='alert']")!)).toContain(
        "на устройстве не хватает места",
      ),
    );
    expect(demoState.value.phase).not.toBe("added");
  });

  it("@req PROD-008 a unit of a book that is not a demo book is just not found", async () => {
    await mountStudy("/study/own-book/1");

    expect(textOf(document.querySelector("h1")!)).toBe("Раздел не найден");
  });
});
