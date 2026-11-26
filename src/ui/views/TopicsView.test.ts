// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StorageError } from "../../storage/db/errors";
import { getStore } from "../storage";
import {
  click,
  demoChecked,
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

beforeEach(async () => {
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

/** The topic, a button or, once passed, plain text, whose title is `title`. */
const topicNamed = (title: string): HTMLElement => {
  const found = [...document.querySelectorAll<HTMLElement>(".topic")].find(
    (each) => each.querySelector(".title")?.textContent === title,
  );
  if (found === undefined) throw new Error(`No topic ${title}`);
  return found;
};

/** Opens Topics first, as after a reload on that address. */
async function openTopics() {
  const mounted = await mountApp("/topics");
  await demoChecked();
  return mounted;
}

describe("Topics", () => {
  it("@req PROG-008 with no demo added says where the topics come from", async () => {
    await openTopics();

    expect(textOf(document.querySelector("h1")!)).toBe("Темы");
    expect(textOf(document.querySelector(".lead")!)).toBe(
      "Темы появятся, когда вы добавите демо-книги на экране «Сегодня».",
    );
    expect(document.querySelector(".lead a")?.getAttribute("href")).toBe("/");
    expect(document.querySelector(".topic")).toBeNull();
  });

  it("@req PROG-008 lists every topic by level in order, with its state and counts, when opened first", async () => {
    await seededStore();

    await openTopics();

    // The topic of the day is known once the stored focus is read.
    await vi.waitFor(() =>
      expect(topicNamed("Глагол to be: am, is, are").querySelector(".tag")?.textContent).toBe(
        "тема дня",
      ),
    );
    expect([...document.querySelectorAll("section h2")].map(textOf)).toEqual(["A1", "A2"]);
    expect([...document.querySelectorAll(".topic .title")].map(textOf)).toHaveLength(4);
    const first = topicNamed("Глагол to be: am, is, are");
    expect(textOf(first.querySelector(".state")!)).toBe("не начата");
    expect(textOf(first.querySelector(".counts")!)).toBe("курс 0 из 3 · практика 0 из 2");
    expect(textOf(first.querySelector(".where")!)).toBe("раздел 1");
    expect(first.tagName).toBe("BUTTON");
    expect(document.querySelectorAll(".tag")).toHaveLength(1);
  });

  it("@req PROG-008 choosing a topic makes it today's and returns to Today", async () => {
    await seededStore();
    const { router } = await openTopics();
    await vi.waitFor(() => expect(document.querySelector(".topic")).not.toBeNull());

    await click(topicNamed("Present simple"));

    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe("/"));
    expect(await (await getStore()).getSetting("focusTopic")).toBe("t2");
    await vi.waitFor(() =>
      expect(textOf(document.querySelector(".today h3")!)).toContain("Present simple"),
    );
  });

  it("@req PROG-008 a topic passed cannot be chosen", async () => {
    await seededStore();
    for (const exercise of ["1.1", "1.2", "1.3"]) await markDoneElsewhere("demo-course", exercise);
    for (const exercise of ["1.1", "1.2"]) await markDoneElsewhere("demo-drills", exercise);

    const { router } = await openTopics();

    await vi.waitFor(() =>
      expect(textOf(topicNamed("Глагол to be: am, is, are").querySelector(".state")!)).toBe(
        "✓ пройдена",
      ),
    );
    const passed = topicNamed("Глагол to be: am, is, are");
    expect(passed.tagName).toBe("DIV");
    await click(passed);
    expect(router.currentRoute.value.path).toBe("/topics");
    await vi.waitFor(() =>
      expect(topicNamed("Present simple").querySelector(".tag")?.textContent).toBe("тема дня"),
    );
  });

  it("@req DATA-004 a choice that could not be kept is said beside the topic and the screen stays", async () => {
    const store = await seededStore();
    vi.spyOn(store, "putSetting").mockRejectedValueOnce(new StorageError("failed"));
    const { router } = await openTopics();
    await vi.waitFor(() => expect(document.querySelector(".topic")).not.toBeNull());

    await click(topicNamed("Present simple"));

    await vi.waitFor(() =>
      expect(textOf(document.querySelector('[role="alert"]')!)).toBe(
        "Выбор темы не удалось сохранить. Попробуйте ещё раз.",
      ),
    );
    expect(router.currentRoute.value.path).toBe("/topics");
    expect(topicNamed("Present simple").nextElementSibling?.getAttribute("role")).toBe("alert");
  });

  it("@req DATA-012 follows the demo cleared in another tab", async () => {
    await seededStore();
    await openTopics();
    await vi.waitFor(() => expect(document.querySelector(".topic")).not.toBeNull());

    await clearSiteData();
    window.dispatchEvent(new Event("focus"));

    await vi.waitFor(() => expect(document.querySelector(".topic")).toBeNull());
    expect(document.querySelector(".lead")?.textContent).toContain("Темы появятся");
  });
});
