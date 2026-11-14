import type { Page } from "@playwright/test";
import { databaseOf } from "./demo";
import {
  answers11,
  checkButton,
  exerciseOf,
  expect,
  fieldOf,
  fill,
  openUnit,
  rowOf,
  test,
  unitHeading,
} from "./study";

/** The window regains the focus: Study reads the unit again (design D6 of `study-screen`). */
const regainFocus = (page: Page) => page.evaluate(() => window.dispatchEvent(new Event("focus")));

const draftsOf = async (page: Page) => (await databaseOf(page)).stores["drafts"]?.length ?? 0;

/**
 * Makes the browser refuse to write drafts while `window.draftsRefused` is true: `put` on the
 * store `drafts` throws. Runs before the app on every load.
 */
async function refuseDrafts(page: Page) {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (
      this: IDBObjectStore,
      ...args: [unknown, IDBValidKey?]
    ) {
      const state = window as unknown as { draftsRefused?: boolean };
      if (this.name === "drafts" && state.draftsRefused === true) {
        throw new DOMException("The write failed.", "UnknownError");
      }
      return put.apply(this, args);
    };
  });
}

const setDraftsRefused = (page: Page, refused: boolean) =>
  page.evaluate((value) => {
    (window as unknown as { draftsRefused?: boolean }).draftsRefused = value;
  }, refused);

test.describe("Study is read again", () => {
  test(
    "@req DATA-012 @req PLAY-011 an exercise checked in another tab is shown as done, with its verdicts, when the window regains focus",
    { tag: "@demo" },
    async ({ page, context }) => {
      await openUnit(page, "1");
      await expect(page.getByText("сделано 0 из 3")).toBeVisible();

      const other = await context.newPage();
      await openUnit(other, "1");
      await fill(exerciseOf(other, "1.1"), answers11);
      await checkButton(exerciseOf(other, "1.1")).click();
      await expect(exerciseOf(other, "1.1")).toContainText("Сделано");

      await page.bringToFront();
      await regainFocus(page);

      const exercise = exerciseOf(page, "1.1");
      await expect(page.getByText("сделано 1 из 3")).toBeVisible();
      await expect(exercise).toContainText("Сделано");
      await expect(exercise).toContainText("верно 8 из 8");
      await expect(fieldOf(exercise, "8")).toHaveValue(answers11["8"]);
      await expect(rowOf(exercise, "8")).toContainText("✓ Верно");
    },
  );

  test(
    "@req DATA-012 with a field of another exercise focused and typed in, coming back shows what the other tab did, and the typing stays",
    { tag: "@demo" },
    async ({ page, context }) => {
      await openUnit(page, "1");
      const typed = exerciseOf(page, "1.3");
      await fieldOf(typed, "1").fill("I am not");
      await expect.poll(() => draftsOf(page)).toBe(1);
      await expect(fieldOf(typed, "1")).toBeFocused();

      const other = await context.newPage();
      await openUnit(other, "1");
      await fill(exerciseOf(other, "1.1"), answers11);
      await checkButton(exerciseOf(other, "1.1")).click();
      await expect(exerciseOf(other, "1.1")).toContainText("Сделано");

      await page.bringToFront();
      await regainFocus(page);

      await expect(page.getByText("сделано 1 из 3")).toBeVisible();
      await expect(exerciseOf(page, "1.1")).toContainText("Сделано");
      await expect(fieldOf(exerciseOf(page, "1.1"), "1")).toHaveValue(answers11["1"]);
      await expect(fieldOf(typed, "1")).toHaveValue("I am not");
      await expect(fieldOf(typed, "1")).toBeFocused();
    },
  );

  test(
    "@req DATA-012 with a field of the same exercise focused, coming back shows the other tab's check, and the text of that field stays",
    { tag: "@demo" },
    async ({ page, context }) => {
      await openUnit(page, "1");
      const exercise = exerciseOf(page, "1.1");
      await fieldOf(exercise, "3").fill("ar");
      await expect.poll(() => draftsOf(page)).toBe(1);
      await expect(fieldOf(exercise, "3")).toBeFocused();

      const other = await context.newPage();
      await openUnit(other, "1");
      await fill(exerciseOf(other, "1.1"), answers11);
      await checkButton(exerciseOf(other, "1.1")).click();
      await expect(exerciseOf(other, "1.1")).toContainText("Сделано");

      await page.bringToFront();
      await regainFocus(page);

      await expect(page.getByText("сделано 1 из 3")).toBeVisible();
      await expect(exercise).toContainText("Сделано");
      await expect(fieldOf(exercise, "1")).toHaveValue(answers11["1"]);
      await expect(fieldOf(exercise, "8")).toHaveValue(answers11["8"]);
      await expect(fieldOf(exercise, "3")).toHaveValue("ar");
      await expect(fieldOf(exercise, "3")).toBeFocused();
    },
  );

  test(
    "@req PLAY-006 a reread that began before a check does not take the result of the check back",
    { tag: "@demo" },
    async ({ page }) => {
      await openUnit(page, "1");
      const exercise = exerciseOf(page, "1.1");
      await fill(exercise, answers11);
      await unitHeading(page).click();
      await expect.poll(() => draftsOf(page)).toBe(1);

      // The focus comes at the press and the click at the release: both in one task.
      await checkButton(exercise).evaluate((button) => {
        window.dispatchEvent(new Event("focus"));
        (button as HTMLButtonElement).click();
      });

      await expect(exercise).toContainText("верно 8 из 8");
      // Long enough for the reread to end: what it read is older than the check.
      await page.waitForTimeout(500);
      await expect(exercise).toContainText("Сделано");
      await expect(exercise).toContainText("верно 8 из 8");
      await expect(rowOf(exercise, "1")).toContainText("✓ Верно");
      await expect(page.getByText("сделано 1 из 3")).toBeVisible();
    },
  );

  test(
    "@req PLAY-005 answers whose draft could not be saved stay in their fields when the window regains focus, and are saved once the browser allows",
    { tag: "@demo" },
    async ({ page }) => {
      await refuseDrafts(page);
      await openUnit(page, "1");
      await setDraftsRefused(page, true);
      const exercise = exerciseOf(page, "1.1");
      await fill(exercise, { "1": "is", "2": "am" });
      await unitHeading(page).click();
      await expect(page.getByText("Не удалось сохранить черновик")).toBeVisible();

      await regainFocus(page);
      // Long enough for the reread to end: the store holds no draft.
      await page.waitForTimeout(500);
      await expect(fieldOf(exercise, "1")).toHaveValue("is");
      await expect(fieldOf(exercise, "2")).toHaveValue("am");
      await expect(page.getByText("Не удалось сохранить черновик")).toBeVisible();

      // Allowed again: the next reread writes the draft, with no keystroke.
      await setDraftsRefused(page, false);
      await regainFocus(page);
      await expect(page.getByText("Не удалось сохранить черновик")).toHaveCount(0);
      await expect.poll(() => draftsOf(page)).toBe(1);

      await page.reload();
      await expect(unitHeading(page)).toBeVisible();
      await expect(fieldOf(exercise, "1")).toHaveValue("is");
      await expect(fieldOf(exercise, "2")).toHaveValue("am");
    },
  );
});
