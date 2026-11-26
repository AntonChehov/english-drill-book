// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getStore } from "../storage";
import {
  buttonNamed,
  buttonsNamed,
  click,
  exerciseOf,
  flushPromises,
  freshStorage,
  markDoneElsewhere,
  mountStudy,
  seededStore,
  stubObservers,
  stubScreen,
  textOf,
  unitProgress,
  unitList,
  barForUnit,
  isHidden,
  pagesAlert,
} from "../testing/study.fixture";

// What the book's file gives: twelve pages of one size, which draw nothing.
const book = vi.hoisted(() => ({ broken: false }));
vi.mock("../../storage/pdf/render", () => ({
  openPdf: async () => ({
    get count() {
      if (book.broken) throw new Error("the file is damaged");
      return 12;
    },
    size: async () => ({ width: 595, height: 842 }),
    draw: async () => undefined,
    destroy: () => undefined,
  }),
}));

const drills = "/study/demo-drills/1";

beforeEach(async () => {
  book.broken = false;
  await freshStorage();
  stubObservers();
  stubScreen(false);
  vi.stubGlobal("fetch", async () => new Response(new Uint8Array([1])));
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  await seededStore();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const pagesShown = () =>
  [...document.querySelectorAll<HTMLElement>("[data-page]")].map((page) => page.dataset["page"]);

describe("opening a unit", () => {
  it("@req PLAY-001 shows the unit's title, its pages and its exercises in book order", async () => {
    await mountStudy(drills);

    expect(textOf(document.querySelector("h1")!)).toBe("Раздел 1. Глагол to be: am, is, are");
    expect([...document.querySelectorAll("[lang='en']")].map(textOf)).toContain(
      "Everyday Grammar: Demo Drills",
    );
    expect([...document.querySelectorAll("article h3")].map((heading) => textOf(heading))).toEqual([
      "Упражнение 1.1",
      "Упражнение 1.2",
      "Упражнение 1.3",
    ]);
    await vi.waitFor(() => expect(pagesShown()).toEqual(["2"]));
  });

  it("@req PLAY-011 the header says how many exercises of the unit are done", async () => {
    await markDoneElsewhere("demo-drills", "1.2");
    await mountStudy(drills);

    expect(unitProgress()).toContain("сделано 1 из 3");
    expect(textOf(exerciseOf("1.2"))).toContain("Сделано");
    expect(textOf(exerciseOf("1.1"))).toContain("Не начато");
  });

  it("@req PROD-008 names the tab after the unit", async () => {
    await mountStudy(drills);

    expect(document.title).toBe("Раздел 1. Глагол to be: am, is, are — English Drill Book");
  });

  it("@req PROD-008 an address with an exercise scrolls to it", async () => {
    const scroll = vi
      .spyOn(HTMLElement.prototype, "scrollIntoView")
      .mockImplementation(() => undefined);

    await mountStudy(`${drills}?ex=1.2`);

    await vi.waitFor(() => expect(scroll).toHaveBeenCalled());
    expect(scroll.mock.contexts[0]).toBe(exerciseOf("1.2"));
  });

  it("@req PROD-007 the unit's title takes the focus when the unit is opened from another screen", async () => {
    const { router } = await mountStudy("/study/demo-drills/2");

    await router.push(drills);

    await vi.waitFor(() => expect(document.activeElement).toBe(document.querySelector("h1")));
  });

  it("@req PROD-008 a unit that the book does not have is said not to exist, with a way home", async () => {
    await mountStudy("/study/demo-drills/9");

    expect(textOf(document.querySelector("h1")!)).toBe("Раздел не найден");
    expect(document.title).toBe("Раздел не найден — English Drill Book");
    expect(textOf(document.querySelector("a")!)).toBe("На главную");
  });

  it("@req PLAY-001 a unit of a book that is not stored is not found", async () => {
    await mountStudy("/study/some-other-book/1");

    expect(textOf(document.querySelector("h1")!)).toBe("Раздел не найден");
  });
});

describe("moving between units", () => {
  it("@req PLAY-001 steps to the next and the previous unit; none before the first", async () => {
    const { router } = await mountStudy(drills);
    expect(buttonNamed("Предыдущий раздел").disabled).toBe(true);

    await click(buttonNamed("Следующий раздел"));
    await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe("/study/demo-drills/2"));
    await vi.waitFor(() => expect(textOf(document.querySelector("h1")!)).toContain("Раздел 2"));
    await click(buttonNamed("Предыдущий раздел"));

    await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe(drills));
  });

  it("@req PLAY-001 the last unit has no next one", async () => {
    await mountStudy("/study/demo-drills/4");

    expect(buttonNamed("Следующий раздел").disabled).toBe(true);
  });

  it("@req PLAY-011 the list of units shows each one's done count and leads to it", async () => {
    await markDoneElsewhere("demo-drills", "1.1");
    const { router } = await mountStudy(drills);
    const toggle = buttonNamed("Все разделы ▾");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    await click(toggle);

    const items = [...unitList()!.querySelectorAll("li")].map((item) => textOf(item));
    expect(items).toHaveLength(4);
    expect(items[0]).toContain("Раздел 1. Глагол to be: am, is, are");
    expect(items[0]).toContain("сделано 1 из 3");
    expect(items[1]).toContain("сделано 0 из 3");
    const current = unitList()!.querySelector("[aria-current='page']");
    expect(textOf(current!)).toContain("Раздел 1.");
    (unitList()!.querySelectorAll("a")[2] as HTMLElement).click();
    await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe("/study/demo-drills/3"));
  });

  it("@req PROD-007 Escape closes the list of units and returns the focus to its button", async () => {
    await mountStudy(drills);
    const toggle = buttonNamed("Все разделы ▾");
    await click(toggle);

    unitList()!
      .querySelector("a")!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await flushPromises();

    expect(unitList()).toBeNull();
    expect(document.activeElement).toBe(toggle);
  });

  it("@req PROD-012 on a narrow screen the navigation of the unit is in the bar of the frame", async () => {
    stubScreen(true);
    const bar = barForUnit();

    await mountStudy(drills);

    expect(buttonNamed("Следующий раздел", bar)).toBeDefined();
    expect(buttonNamed("Все разделы ▾", bar)).toBeDefined();
    expect(textOf(bar)).toContain("Раздел 1");
    expect(buttonsNamed("Скрыть страницы")).toHaveLength(0);
    expect(buttonsNamed("Скрыть упражнения")).toHaveLength(0);
    expect(document.querySelector("[role='separator']")).toBeNull();
  });
});

describe("the two steps of a topic", () => {
  it("@req PLAY-017 names the step the learner is on and links to the other", async () => {
    await mountStudy(drills);

    const steps = document.querySelector("nav[aria-label='Шаги темы']")!;
    expect(textOf(steps)).toContain("Тема: Глагол to be: am, is, are");
    expect(textOf(steps.querySelector("[aria-current='step']")!)).toBe(
      "2. Сборник упражнений: практика сейчас",
    );
    const link = steps.querySelector("a")!;
    expect(textOf(link)).toBe("1. Курс: правило и упражнения");
    expect(link.getAttribute("href")).toBe("/study/demo-course/1");
  });

  it("@req PLAY-017 on a unit of the course the course is the step marked as current", async () => {
    await mountStudy("/study/demo-course/3");

    expect(textOf(document.querySelector("[aria-current='step']")!)).toContain(
      "1. Курс: правило и упражнения",
    );
  });

  it("@req PLAY-017 the course offers the practice once every exercise of the unit is done", async () => {
    await mountStudy("/study/demo-course/1");
    expect(document.body.textContent).not.toContain("Курс по этой теме пройден");

    for (const exercise of ["1.1", "1.2", "1.3"]) await markDoneElsewhere("demo-course", exercise);
    window.dispatchEvent(new Event("focus"));

    await vi.waitFor(() =>
      expect(document.body.textContent).toContain("Курс по этой теме пройден"),
    );
    const offer = [...document.querySelectorAll("a")].find(
      (link) => textOf(link) === "Перейти к практике",
    );
    expect(offer?.getAttribute("href")).toBe("/study/demo-drills/1?ex=1.1");
  });

  it("@req PLAY-018 the learner can show the pages of the course instead of the drill book's", async () => {
    await mountStudy(drills);
    await vi.waitFor(() => expect(pagesShown()).toEqual(["2"]));
    const own = buttonNamed("Сборник упражнений");
    const course = buttonNamed("Курс: раздел 1");
    expect(own.getAttribute("aria-pressed")).toBe("true");
    expect(course.getAttribute("aria-pressed")).toBe("false");

    await click(course);

    expect(course.getAttribute("aria-pressed")).toBe("true");
    expect(own.getAttribute("aria-pressed")).toBe("false");
    await vi.waitFor(() => expect(pagesShown()).toEqual(["2", "3", "4"]));
    await click(own);
    expect(own.getAttribute("aria-pressed")).toBe("true");
  });

  it("@req PLAY-018 the course has no switch of sources", async () => {
    await mountStudy("/study/demo-course/1");

    expect(buttonsNamed("Сборник упражнений")).toHaveLength(0);
  });
});

describe("the theory of a unit", () => {
  it("@req PLAY-020 shows the unit's explanation, open, above the exercises, with the English in it marked", async () => {
    await mountStudy(drills);

    const theory = document.querySelector("details")!;
    expect(theory.open).toBe(true);
    expect(textOf(theory.querySelector("summary")!)).toBe("Объяснение");
    expect(textOf(theory)).toContain("Упражнения на глагол be в настоящем времени");
    expect(theory.querySelector("em[lang='en']")).not.toBeNull();
    expect(
      theory.compareDocumentPosition(exerciseOf("1.1")) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("@req PLAY-020 a unit of the drills opens with its explanation open again each time", async () => {
    const { app } = await mountStudy(drills);
    document.querySelector("details")!.open = false;
    app.unmount();
    document.body.innerHTML = "";

    await mountStudy(drills);

    expect(document.querySelector("details")!.open).toBe(true);
  });
});

/** The zoom as the toolbar of the pages says it. */
const level = () => textOf(document.querySelector("[aria-label='Масштаб'] [role='status']")!);

describe("the panels", () => {
  it("@req DOC-002 zooms the pages in and out, to the width, and remembers the zoom of the book", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { app } = await mountStudy(drills);
    expect(level()).toBe("100 %");

    await click(buttonNamed("Увеличить"));
    await click(buttonNamed("Увеличить"));
    expect(level()).toBe("150 %");
    await click(buttonNamed("Уменьшить"));
    expect(level()).toBe("125 %");
    await vi.advanceTimersByTimeAsync(300);
    await vi.waitFor(async () =>
      expect(await (await getStore()).getSetting("pageZoom")).toEqual({ "demo-drills": 1.25 }),
    );
    app.unmount();
    document.body.innerHTML = "";
    await mountStudy(drills);
    await vi.waitFor(() => expect(level()).toBe("125 %"));

    await click(buttonNamed("По ширине"));
    expect(level()).toBe("100 %");
  });

  it("@req DOC-002 the zoom stops at the smallest and the largest step", async () => {
    await mountStudy(drills);

    for (let step = 0; step < 4; step++) await click(buttonNamed("Уменьшить"));
    expect(buttonNamed("Уменьшить").getAttribute("aria-disabled")).toBe("true");
    for (let step = 0; step < 9; step++) await click(buttonNamed("Увеличить"));

    expect(buttonNamed("Увеличить").getAttribute("aria-disabled")).toBe("true");
    expect(level()).toBe("300 %");
  });

  it("@req DOC-003 adds the page before and the page after the unit's pages, one at a time", async () => {
    await mountStudy(drills);
    await vi.waitFor(() => expect(pagesShown()).toEqual(["2"]));

    await click(buttonNamed("Следующая страница"));
    await vi.waitFor(() => expect(pagesShown()).toEqual(["2", "3"]));
    await click(buttonNamed("Предыдущая страница"));

    await vi.waitFor(() => expect(pagesShown()).toEqual(["1", "2", "3"]));
    expect(buttonsNamed("Предыдущая страница")).toHaveLength(0);
    // The button pressed is gone at the start of the book: the focus goes to the panel's heading.
    expect(document.activeElement?.tagName).toBe("H2");
    expect(textOf(document.activeElement!)).toBe("Страницы книги");
  });

  it("@req DOC-006 collapses the pages to a strip, restores them and moves the focus with each", async () => {
    await mountStudy(drills);

    await click(buttonNamed("Скрыть страницы"));
    const strip = buttonNamed("Показать страницы");
    expect(document.activeElement).toBe(strip);
    expect(isHidden(buttonNamed("Скрыть страницы"))).toBe(true);
    await vi.waitFor(async () =>
      expect(await (await getStore()).getSetting("collapsedPanel")).toBe("pages"),
    );

    await click(strip);

    expect(buttonsNamed("Показать страницы")).toHaveLength(0);
    expect(document.activeElement).toBe(buttonNamed("Скрыть страницы"));
    await vi.waitFor(async () =>
      expect(await (await getStore()).getSetting("collapsedPanel")).toBeUndefined(),
    );
  });

  it("@req DOC-006 collapses the exercises to a strip and restores them", async () => {
    await mountStudy(drills);

    await click(buttonNamed("Скрыть упражнения"));
    const strip = buttonNamed("Показать упражнения");
    expect(document.activeElement).toBe(strip);
    expect(isHidden(document.querySelector("section[aria-label='Упражнения']")!)).toBe(true);

    await click(strip);

    expect(document.activeElement).toBe(buttonNamed("Скрыть упражнения"));
    await vi.waitFor(async () =>
      expect(await (await getStore()).getSetting("collapsedPanel")).toBeUndefined(),
    );
  });

  it("@req DOC-006 the collapsed panel is remembered for the next time", async () => {
    const { app } = await mountStudy(drills);
    await click(buttonNamed("Скрыть страницы"));
    await vi.waitFor(async () =>
      expect(await (await getStore()).getSetting("collapsedPanel")).toBe("pages"),
    );
    app.unmount();
    document.body.innerHTML = "";

    await mountStudy(drills);

    await vi.waitFor(() => expect(buttonNamed("Показать страницы")).toBeDefined());
    await click(buttonNamed("Показать страницы"));
  });

  it("@req DOC-006 the border between the panels moves with the arrow keys and is remembered", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    await mountStudy(drills);
    const border = document.querySelector<HTMLElement>("[role='separator']")!;
    expect(border.getAttribute("aria-valuenow")).toBe("60");

    border.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true }),
    );
    await flushPromises();
    expect(border.getAttribute("aria-valuenow")).toBe("55");
    border.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Home", bubbles: true, cancelable: true }),
    );
    await flushPromises();

    expect(border.getAttribute("aria-valuenow")).toBe("30");
    await vi.advanceTimersByTimeAsync(300);
    await vi.waitFor(async () =>
      expect(await (await getStore()).getSetting("studySplit")).toBe(0.3),
    );
  });
});

describe("a part that fails", () => {
  it("@req PROD-011 a damaged book fails only the pages; the exercises stay in use, and trying again draws the part anew", async () => {
    book.broken = true;
    await mountStudy(drills);

    await vi.waitFor(() => expect(pagesAlert()).not.toBeNull());
    const alert = pagesAlert()!;
    expect(textOf(alert)).toContain("Не удалось показать эту часть");
    expect(exerciseOf("1.1")).toBeDefined();
    expect(textOf(document.querySelector("h1")!)).toContain("Раздел 1");
    book.broken = false;
    await click(buttonNamed("Попробовать снова"));

    await vi.waitFor(() => expect(pagesShown()).toEqual(["2"]));
    expect(pagesAlert()).toBeNull();
  });

  it("@req PROD-011 a read that fails says so with a button to read again", async () => {
    vi.spyOn(await getStore(), "getPacks").mockRejectedValueOnce(new Error("disk"));

    await mountStudy(drills);

    expect(textOf(document.querySelector("h1")!)).toBe("Не удалось открыть раздел");
    expect(document.querySelector("[role='alert']")!.textContent).toContain(
      "Не удалось прочитать данные",
    );
    await click(buttonNamed("Повторить"));
    await vi.waitFor(() => expect(textOf(document.querySelector("h1")!)).toContain("Раздел 1"));
  });
});
