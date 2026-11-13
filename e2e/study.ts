import type { Browser, Locator, Page } from "@playwright/test";
import { addDemo, demoPdf, failedLoad } from "./demo";
import { expect, guardContext, test as base } from "./fixtures";
import { addressOf } from "./views";

type StorageState = Awaited<ReturnType<import("@playwright/test").BrowserContext["storageState"]>>;

/**
 * Study's tests start with the demo added (design of `study-screen`, C-19): each worker adds it
 * once, through the start screen, and every test starts from a copy of that browser's storage.
 */
export const test = base.extend<object, { demoAdded: StorageState }>({
  demoAdded: [
    async ({ browser }: { browser: Browser }, use, workerInfo) => {
      const baseURL = workerInfo.project.use.baseURL;
      if (!baseURL) throw new Error("baseURL is not configured");
      const context = await browser.newContext({ baseURL });
      const guard = await guardContext(context, new URL(baseURL).origin);
      const page = await context.newPage();
      await addDemo(page);
      const state = await context.storageState({ indexedDB: true });
      guard.assertClean();
      await context.close();
      await use(state);
    },
    { scope: "worker" },
  ],
  storageState: async ({ demoAdded }, use) => use(demoAdded),
});

export { expect };

export const unitAddress = (unit: string, book = "demo-course") =>
  addressOf(`/study/${book}/${unit}`);

/** Opens unit `unit` of the demo course and waits until its exercises are shown. */
export async function openUnit(page: Page, unit: string, book = "demo-course") {
  await page.goto(unitAddress(unit, book));
  await expect(unitHeading(page)).toHaveText(new RegExp(`Раздел ${unit}\\.\\s`));
}

export const unitHeading = (page: Page) => page.getByRole("heading", { level: 1 });

/** The block of exercise `id`. */
export const exerciseOf = (page: Page, id: string) =>
  page
    .getByRole("article")
    .filter({ has: page.getByRole("button", { name: `Упражнение ${id}`, exact: true }) });

/** The text field of item `item` of an exercise. */
export const fieldOf = (exercise: Locator, item: string) =>
  exercise.getByRole("textbox", { name: new RegExp(`^Пункт ${item}\\. `) });

/** The row of item `item` of an exercise. */
export const rowOf = (exercise: Locator, item: string) =>
  exercise.getByRole("listitem").nth(Number(item) - 1);

export const checkButton = (exercise: Locator) =>
  exercise.getByRole("button", { name: "Проверить" });

export const menuOf = (exercise: Locator, item: string) =>
  exercise.getByRole("button", { name: `Действия: пункт ${item}`, exact: true });

/** Opens the menu of a row and presses one of its actions. */
export async function rowAction(exercise: Locator, item: string, action: string) {
  await menuOf(exercise, item).click();
  await exercise
    .getByRole("group", { name: `Пункт ${item}`, exact: true })
    .getByRole("button", { name: action })
    .click();
}

/** Fills the fields of an exercise, item id → answer. */
export async function fill(exercise: Locator, answers: Record<string, string>) {
  for (const [item, answer] of Object.entries(answers)) await fieldOf(exercise, item).fill(answer);
}

/** The correct answers of exercise 1.1 of the demo course. */
export const answers11 = {
  "1": "is",
  "2": "am",
  "3": "are",
  "4": "is",
  "5": "are",
  "6": "is",
  "7": "are",
  "8": "am",
} as const;

/** The correct answers of exercise 1.3 of the demo course. */
export const answers13 = {
  "1": "I am not tired",
  "2": "The bus is not late",
  "3": "We are not at home",
  "4": "My phone is not in my bag",
  "5": "Kofi and Nell are not friends",
} as const;

/** The live region of Study. */
export const announced = (page: Page) => page.getByRole("status").filter({ hasNotText: /^$/ });

/**
 * Makes the browser refuse the next `times` attempts written to the log, as a disk that fails
 * would: `IDBObjectStore.add`, which only the log uses, throws. Runs before the app on every load.
 */
export async function refuseAttempts(page: Page) {
  await page.addInitScript(() => {
    const add = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (
      this: IDBObjectStore,
      ...args: [unknown, IDBValidKey?]
    ) {
      const state = window as unknown as { refusedWrites?: number };
      if ((state.refusedWrites ?? 0) > 0) {
        state.refusedWrites = (state.refusedWrites ?? 0) - 1;
        throw new DOMException("The write failed.", "UnknownError");
      }
      return add.apply(this, args);
    };
  });
}

/** Lets the next `times` writes of attempts fail (after `refuseAttempts`). */
export function failNextAttempts(page: Page, times = 1) {
  return page.evaluate((count) => {
    (window as unknown as { refusedWrites?: number }).refusedWrites = count;
  }, times);
}

/** The correct options of exercise 1.2 of the demo course. */
export const answers12 = {
  "1": "are",
  "2": "is",
  "3": "Are",
  "4": "is",
  "5": "are",
  "6": "am",
} as const;

/** Chooses the options of an exercise, item id → option. */
export async function choose(exercise: Locator, answers: Record<string, string>) {
  for (const [item, option] of Object.entries(answers)) {
    await exercise
      .getByRole("group", { name: new RegExp(`^Пункт ${item}\\. `) })
      .getByRole("radio", { name: option, exact: true })
      .check();
  }
}

/** Answers and checks exercises 1.1, 1.2 and, with `all`, 1.3 of the open unit 1 correctly. */
export async function finishUnit1(page: Page, all = true) {
  await fill(exerciseOf(page, "1.1"), answers11);
  await checkButton(exerciseOf(page, "1.1")).click();
  await choose(exerciseOf(page, "1.2"), answers12);
  await checkButton(exerciseOf(page, "1.2")).click();
  if (all) {
    await fill(exerciseOf(page, "1.3"), answers13);
    await checkButton(exerciseOf(page, "1.3")).click();
  }
  await expect(page.getByText(`сделано ${all ? 3 : 2} из 3`)).toBeVisible();
}

/** The pages panel of Study. */
export const pagesPanel = (page: Page) => page.getByRole("region", { name: "Страницы книги" });

/**
 * The states of Study for the accessibility check and the screenshots (design of `study-screen`,
 * C-07): each starts from the demo added and ends with unit 1 of the demo course on screen.
 */
export const studyStates = [
  {
    // Opened and not touched, its first page drawn.
    name: "study-untouched",
    reach: async (page: Page) => {
      await openUnit(page, "1");
      await expect(pagesPanel(page).locator("canvas[data-drawn]").first()).toBeVisible();
    },
  },
  {
    // Checked with each verdict, a blank row, an answer shown, a verdict changed by hand, and one
    // exercise done.
    name: "study-checked",
    reach: async (page: Page) => {
      await openUnit(page, "1");
      const done = exerciseOf(page, "1.1");
      await fill(done, answers11);
      await checkButton(done).click();
      await expect(done).toContainText("Сделано");
      const exercise = exerciseOf(page, "1.3");
      await fill(exercise, {
        "1": answers13["1"],
        "2": "The bus is not lates",
        "3": "We is home",
        "4": "My phone not in my bag",
      });
      await checkButton(exercise).click();
      await expect(rowOf(exercise, "3")).toContainText("✗ Неверно");
      await rowAction(exercise, "3", "Показать ответ");
      await expect(rowOf(exercise, "3")).toContainText("Ответ:");
      await rowAction(exercise, "4", "Засчитать");
      await expect(rowOf(exercise, "4")).toContainText("засчитано вручную");
      await menuOf(exercise, "2").click();
    },
  },
  {
    // A check the browser refused to keep (PLAY-006, DATA-004).
    name: "study-not-kept",
    reach: async (page: Page) => {
      await refuseAttempts(page);
      await openUnit(page, "1");
      const exercise = exerciseOf(page, "1.3");
      await fill(exercise, { "1": answers13["1"] });
      await failNextAttempts(page);
      await checkButton(exercise).click();
      await expect(exercise.getByRole("alert")).toBeVisible();
    },
  },
  {
    // The pages did not arrive: the demo needs a connection (DOC-008).
    name: "study-pages-offline",
    reach: async (page: Page, allowConsoleError: (pattern: RegExp) => void) => {
      allowConsoleError(failedLoad);
      await page.route(demoPdf, (route) => route.abort("internetdisconnected"));
      await openUnit(page, "1");
      await expect(pagesPanel(page).getByRole("alert")).toBeVisible();
    },
  },
] as const;
