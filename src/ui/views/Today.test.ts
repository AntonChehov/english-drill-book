// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StorageError } from "../../storage/db/errors";
import { DemoError } from "../demo/add-demo";
import { getStore } from "../storage";
import {
  buttonNamed,
  buttonsNamed,
  click,
  demoChecked,
  flushPromises,
  demoPacks,
  clearSiteData,
  freshStorage,
  markDoneElsewhere,
  mountApp,
  resetApp,
  seededStore,
  stubObservers,
  stubScreen,
  textOf,
} from "../testing/study.fixture";

// Adding the demo reads PDFs; here it gives the packs, or fails, as each test says.
const adding = vi.hoisted(() => ({
  run: undefined as unknown as ReturnType<typeof vi.fn<() => Promise<unknown>>>,
}));
vi.mock("../demo/add-demo", async (original) => ({
  ...(await original<typeof import("../demo/add-demo")>()),
  addDemo: async (onProgress: (progress: unknown) => void) => {
    onProgress({ book: "Everyday Grammar: A Demo Course", index: 1, count: 2 });
    return adding.run();
  },
}));

beforeEach(async () => {
  adding.run = vi.fn<() => Promise<unknown>>(async () => demoPacks);
  resetApp();
  await freshStorage();
  stubObservers();
  stubScreen(false);
});

afterEach(() => {
  resetApp();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** The start screen, once it has read the store. */
async function openToday(): Promise<void> {
  await mountApp("/");
  await demoChecked();
}

const heading = (name: string) =>
  [...document.querySelectorAll("h1, h2, h3")].find((each) => textOf(each) === name);

const alertText = () => textOf(document.querySelector('[role="alert"]')!);

/** The checkbox of the daily block named `title`. */
const blockNamed = (title: string): HTMLInputElement => {
  const label = [...document.querySelectorAll("label")].find((each) => textOf(each) === title);
  return label!.querySelector("input")!;
};

describe("Today with no demo added", () => {
  it("@req PROD-002 offers the demo and says own books come in a later version", async () => {
    await openToday();

    expect(textOf(document.querySelector("h1")!)).toBe("English Drill Book");
    expect(heading("Демо-книги")).toBeDefined();
    expect(buttonsNamed("Попробовать демо")).toHaveLength(1);
    expect(document.body.textContent).toContain("она появится в следующей версии");
    expect(heading("Цель")).toBeUndefined();
  });

  it("@req PACK-003 adding the demo says which book is read, then shows both books and stores them", async () => {
    let finish: ((packs: unknown) => void) | undefined;
    adding.run.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    await openToday();

    await click(buttonNamed("Попробовать демо"));

    expect(textOf(document.querySelector('[role="status"]')!)).toBe(
      "Читаем книгу 1 из 2: «Everyday Grammar: A Demo Course»…",
    );
    expect(buttonNamed("Попробовать демо").getAttribute("aria-disabled")).toBe("true");
    await click(buttonNamed("Попробовать демо"));
    expect(adding.run).toHaveBeenCalledTimes(1);

    finish?.(demoPacks);
    await vi.waitFor(() => expect(heading("Демо-книги добавлены")).toBeDefined());
    expect(document.body.textContent).toContain("Обе книги прочитаны и сохранены в этом браузере");
    expect(textOf(document.querySelector('[role="status"]')!)).toBe("");
    const stored = (await (await getStore()).getPacks()) as { id: string }[];
    expect(stored.map((pack) => pack.id)).toEqual(demoPacks.map((pack) => pack.id));
    expect(document.body.textContent).toContain("Everyday Grammar: A Demo Course");
    expect(document.body.textContent).toContain("Everyday Grammar: Demo Drills");
    expect(document.body.textContent).not.toContain("она появится в следующей версии");
  });

  it("@req PROG-014 once the demo is added the focus moves to Today and the program is shown above the books", async () => {
    await openToday();

    await click(buttonNamed("Попробовать демо"));

    await vi.waitFor(() => expect(heading("Сегодня")).toBeDefined());
    expect(document.activeElement).toBe(heading("Сегодня"));
    const names = [...document.querySelectorAll("h2")].map(textOf);
    expect(names.indexOf("Цель")).toBeLessThan(names.indexOf("Сегодня"));
    expect(names.indexOf("Сегодня")).toBeLessThan(names.indexOf("Демо-книги добавлены"));
    expect(names).toContain("Другие дела дня");
    expect(textOf(document.querySelector(".level")!)).toMatch(/^Ваш уровень: /);
    expect(textOf(document.querySelector(".action.open")!)).toBe("Открыть раздел");
  });
});

describe("a failure to add the demo", () => {
  it("@req PROD-011 is said in place with a way to try again, and the focus stays on the button", async () => {
    adding.run.mockRejectedValueOnce(
      new DemoError({ kind: "status", book: "Drills", status: 404 }),
    );
    await openToday();

    await click(buttonNamed("Попробовать демо"));

    expect(alertText()).toContain("Сайт не отдал файл демо-книги «Drills» (ошибка 404)");
    expect(document.activeElement).toBe(buttonNamed("Попробовать ещё раз"));
    expect(heading("Цель")).toBeUndefined();

    await click(buttonNamed("Попробовать ещё раз"));

    await vi.waitFor(() => expect(heading("Демо-книги добавлены")).toBeDefined());
    expect(document.querySelector('[role="alert"]')).toBeNull();
  });

  it("@req DATA-004 books read but not kept are not shown as added, and trying again only stores them", async () => {
    const store = await getStore();
    vi.spyOn(store, "putPacks").mockRejectedValueOnce(new StorageError("quota"));
    await openToday();

    await click(buttonNamed("Попробовать демо"));

    expect(alertText()).toContain("на устройстве не хватает места");
    expect(heading("Демо-книги добавлены")).toBeUndefined();

    await click(buttonNamed("Попробовать ещё раз"));

    await vi.waitFor(() => expect(heading("Демо-книги добавлены")).toBeDefined());
    expect(adding.run).toHaveBeenCalledTimes(1);
    expect(await store.getPacks()).toHaveLength(2);
  });

  it("@req PROD-011 a store that cannot be read leaves the demo to be added", async () => {
    const store = await getStore();
    vi.spyOn(store, "getPacks").mockRejectedValueOnce(new Error("disk"));

    await openToday();

    expect(buttonsNamed("Попробовать демо")).toHaveLength(1);
    expect(document.querySelector('[role="alert"]')).toBeNull();
  });
});

describe("Today with the demo stored", () => {
  it("@req DATA-001 shows the books as added at once when the page is opened, without taking the focus", async () => {
    await seededStore();

    await openToday();

    await vi.waitFor(() => expect(heading("Демо-книги добавлены")).toBeDefined());
    expect(heading("Сегодня")).toBeDefined();
    expect(buttonsNamed("Попробовать демо")).toHaveLength(0);
    expect(document.activeElement).not.toBe(heading("Сегодня"));
    expect(adding.run).not.toHaveBeenCalled();
  });

  it("@req DATA-012 shows the demo as not added when another tab cleared the books", async () => {
    await seededStore();
    await openToday();
    await vi.waitFor(() => expect(heading("Демо-книги добавлены")).toBeDefined());

    // The site's data is cleared: the browser's storage is empty again.
    await clearSiteData();
    window.dispatchEvent(new Event("focus"));

    await vi.waitFor(() => expect(buttonsNamed("Попробовать демо")).toHaveLength(1));
    expect(heading("Цель")).toBeUndefined();
  });

  it("@req PROD-011 a stored book that fails validation is read again from its PDF by itself", async () => {
    await seededStore([demoPacks[0]!, { id: demoPacks[1]!.id, version: "0" } as never]);

    await openToday();

    await vi.waitFor(() => expect(heading("Демо-книги добавлены")).toBeDefined());
    expect(adding.run).toHaveBeenCalledTimes(1);
    expect(document.activeElement).not.toBe(heading("Сегодня"));
  });

  it("@req PROD-011 when the book cannot be read again, its card says so and the other book is shown", async () => {
    adding.run.mockRejectedValue(new DemoError({ kind: "unreadable", book: "Drills" }));
    await seededStore([demoPacks[0]!, { id: demoPacks[1]!.id, version: "0" } as never]);

    await openToday();

    await vi.waitFor(() => expect(buttonsNamed("Попробовать ещё раз")).toHaveLength(1));
    expect(document.body.textContent).toContain("Книгу не удалось прочитать");
    expect(document.body.textContent).toContain("Everyday Grammar: A Demo Course");
    expect(alertText()).toContain("файл повреждён или не той версии");
  });
});

describe("the program of Today", () => {
  it("@req PROG-006 shows today's topic with its course exercises and drills as links into Study", async () => {
    await seededStore();

    await openToday();

    await vi.waitFor(() => expect(heading("Сегодня")).toBeDefined());
    const open = document.querySelector<HTMLAnchorElement>(".action.open")!;
    expect(open.getAttribute("href")).toMatch(/^\/study\/demo-course\/\d+\?ex=/);
    const chips = [...document.querySelectorAll<HTMLAnchorElement>(".chip")];
    expect(chips.some((chip) => chip.getAttribute("aria-label")?.startsWith("Упражнение "))).toBe(
      true,
    );
    expect(chips.some((chip) => chip.getAttribute("aria-label")?.startsWith("Упр. "))).toBe(true);
    expect(document.body.textContent).toContain("не начата");
  });

  it("@req PROG-006 marks the done exercises, and the next topic is today's once the topic is passed", async () => {
    await seededStore();
    await openToday();
    await vi.waitFor(() => expect(heading("Сегодня")).toBeDefined());
    const topic = textOf(document.querySelector(".today h3")!);
    const labels = [...document.querySelectorAll(".chip")].map((chip) =>
      chip.getAttribute("aria-label")!,
    );
    resetApp();

    // Every exercise the topic lists, in the course and in the drills, is done elsewhere.
    for (const label of labels) {
      const [, kind, exercise] = /^(Упражнение|Упр\.) (\S+),/.exec(label)!;
      await markDoneElsewhere(kind === "Упр." ? "demo-drills" : "demo-course", exercise!);
    }
    await openToday();

    await vi.waitFor(() => expect(textOf(document.querySelector(".today h3")!)).not.toBe(topic));
  });
});

describe("the checklist of the day", () => {
  // The day is fixed: a run across midnight must not look for the tick under another day.
  const today = "2026-03-10";

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 2, 10, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("@req PROG-009 keeps a tick for the day and shows it again when the page is opened", async () => {
    await seededStore();
    await openToday();
    await vi.waitFor(() => expect(heading("Другие дела дня")).toBeDefined());
    const box = document.querySelector<HTMLInputElement>('.checklist input[type="checkbox"]')!;
    const title = textOf(box.closest("label")!);

    box.checked = true;
    box.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(async () =>
      expect((await (await getStore()).getDayTicks(today)).length).toBe(1),
    );
    resetApp();
    await openToday();

    await vi.waitFor(() => expect(blockNamed(title).checked).toBe(true));
  });

  it("@req PROG-009 takes a tick off again", async () => {
    const store = await seededStore();
    await store.putDayTicks(today, ["listen"]);
    await openToday();
    await vi.waitFor(() => expect(heading("Другие дела дня")).toBeDefined());
    const box = blockNamed("Послушать английскую речь 10 минут");
    await vi.waitFor(() => expect(box.checked).toBe(true));

    box.checked = false;
    box.dispatchEvent(new Event("change", { bubbles: true }));

    await vi.waitFor(async () => expect(await store.getDayTicks(today)).toHaveLength(0));
    expect(box.checked).toBe(false);
  });

  it("@req DATA-004 a tick that could not be kept is not shown, and the failure is said", async () => {
    await seededStore();
    await openToday();
    await vi.waitFor(() => expect(heading("Другие дела дня")).toBeDefined());
    const store = await getStore();
    vi.spyOn(store, "putDayTicks").mockRejectedValueOnce(new StorageError("failed"));
    const box = document.querySelector<HTMLInputElement>('.checklist input[type="checkbox"]')!;

    box.checked = true;
    box.dispatchEvent(new Event("change", { bubbles: true }));
    await flushPromises();

    await vi.waitFor(() =>
      expect(alertText()).toBe("Отметку не удалось сохранить. Попробуйте ещё раз."),
    );
    expect(box.checked).toBe(false);
  });
});
