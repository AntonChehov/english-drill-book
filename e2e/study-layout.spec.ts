import type { Locator, Page } from "@playwright/test";
import { addressOf } from "./views";
import {
  answers11,
  exerciseOf,
  expect,
  fieldOf,
  menuOf,
  openUnit,
  rowOf,
  test,
  unitHeading,
} from "./study";

const pagesPanel = (page: Page) => page.getByRole("region", { name: "Страницы книги" });
const exercisesPanel = (page: Page) => page.getByRole("region", { name: "Упражнения" });

test.describe("PROD-006 Layout by width", () => {
  test(
    "@req PROD-006 1280 px wide: the pages and the exercises are side by side",
    { tag: "@demo" },
    async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await openUnit(page, "1");
      const pages = (await pagesPanel(page).boundingBox())!;
      const exercises = (await exercisesPanel(page).boundingBox())!;

      expect(pages.x + pages.width).toBeLessThanOrEqual(exercises.x);
      expect(exercises.y).toBeLessThan(pages.y + pages.height);
      expect(pages.width).toBeGreaterThan(exercises.width);
      await expect(page.getByRole("button", { name: "К упражнениям" })).toBeHidden();
    },
  );

  test(
    "@req PROD-006 360 px wide: the pages and the exercises are stacked, both reachable, and nothing scrolls sideways",
    { tag: "@demo" },
    async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 });
      await openUnit(page, "1");
      await expect(page.locator("canvas[data-drawn]").first()).toBeVisible();
      const pages = (await pagesPanel(page).boundingBox())!;
      const exercises = (await exercisesPanel(page).boundingBox())!;

      expect(exercises.y).toBeGreaterThanOrEqual(pages.y + pages.height);
      const overflow = () =>
        page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
      expect(await overflow()).toBe(0);

      await page.getByRole("button", { name: "К упражнениям" }).click();
      await expect(page.getByRole("heading", { name: "Упражнения" })).toBeInViewport();
      await expect(page.getByRole("heading", { name: "Упражнения" })).toBeFocused();
      await fill11(page);
      await page.getByRole("button", { name: "Все разделы" }).click();
      expect(await overflow()).toBe(0);
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "К страницам" }).click();
      await expect(page.getByRole("img", { name: "Страница 3" })).toBeInViewport();
    },
  );
});

async function fill11(page: Page) {
  const exercise = exerciseOf(page, "1.1");
  await fieldOf(exercise, "1").fill("is");
  await exercise.getByRole("button", { name: "Проверить" }).click();
  await expect(rowOf(exercise, "1")).toContainText("Верно");
}

/** The focused element is marked: it has an outline of its own (C-07). */
async function expectFocusMarked(page: Page) {
  const marked = await page.evaluate(() => {
    const active = document.activeElement;
    if (!active || active === document.body) return "nothing is focused";
    const style = getComputedStyle(active);
    const width = Number.parseFloat(style.outlineWidth);
    return style.outlineStyle !== "none" && width >= 2
      ? true
      : `${active.tagName} ${active.textContent?.trim().slice(0, 40)} has no outline`;
  });
  expect(marked).toBe(true);
}

/** Presses Tab (or Shift+Tab) until `target` has the focus, checking each stop is marked. */
async function tabTo(page: Page, target: Locator, back = false, most = 60) {
  for (let presses = 0; presses < most; presses++) {
    await page.keyboard.press(back ? "Shift+Tab" : "Tab");
    await expectFocusMarked(page);
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error(`Not reached by ${back ? "Shift+Tab" : "Tab"} within ${most} presses`);
}

/** Whatever has the focus. */
const focused = (page: Page) => page.locator("*:focus");

test.describe("PROD-007 Keyboard", () => {
  test(
    "@req PROD-007 from the first field, the fields are visited in order by Tab, each with its row's menu after it, and Enter in the last checks the exercise",
    { tag: "@demo" },
    async ({ page }) => {
      await openUnit(page, "1");
      const exercise = exerciseOf(page, "1.1");
      await fieldOf(exercise, "1").focus();

      const visited: string[] = [];
      for (const [item, answer] of Object.entries(answers11)) {
        await expect(fieldOf(exercise, item)).toBeFocused();
        visited.push(item);
        await page.keyboard.type(answer);
        if (item === "8") break;
        await page.keyboard.press("Tab");
        await expect(menuOf(exercise, item)).toBeFocused();
        await page.keyboard.press("Tab");
      }
      expect(visited).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
      await page.keyboard.press("Enter");

      await expect(exercise).toContainText("✓ Сделано");
      await expect(fieldOf(exercise, "8")).toBeFocused();
      await expect(page.getByRole("status").filter({ hasText: "Упражнение 1.1" })).toHaveText(
        "Упражнение 1.1: верно 8 из 8. Упражнение сделано",
      );
      // After the last row's menu comes Проверить.
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await expect(exercise.getByRole("button", { name: "Проверить" })).toBeFocused();
    },
  );

  test(
    "@req PROD-007 by keyboard alone: open a unit from the start screen, answer and check, reveal an answer, change a verdict and go to the next unit, the focus always marked",
    { tag: "@demo" },
    async ({ page }) => {
      await page.goto(addressOf("/"));
      const unitLink = page.getByRole("link", { name: "Раздел 1. To be: am, is, are" }).first();
      await tabTo(page, unitLink);
      await page.keyboard.press("Enter");
      await expect(unitHeading(page)).toHaveText(/Раздел 1\./);
      await expect(unitHeading(page)).toBeFocused();

      // An exercise with options: arrows choose, Enter checks.
      const choices = exerciseOf(page, "1.2");
      const first = choices.getByRole("radio", { name: "is", exact: true }).first();
      await tabTo(page, first);
      await page.keyboard.press("ArrowRight");
      await expect(choices.getByRole("radio", { name: "are", exact: true }).first()).toBeChecked();
      await page.keyboard.press("Enter");
      await expect(rowOf(choices, "1")).toContainText("✓ Верно");

      // Reveal the answer of item 2 through its menu.
      await tabTo(page, menuOf(choices, "2"));
      await page.keyboard.press("Enter");
      await page.keyboard.press("Tab");
      await expect(focused(page)).toHaveText("Показать ответ");
      await page.keyboard.press("Enter");
      await expect(rowOf(choices, "2")).toContainText("Ответ: is");
      await expect(menuOf(choices, "2")).toBeFocused();

      // Count item 1 as wrong, by hand.
      await tabTo(page, menuOf(choices, "1"), true);
      await page.keyboard.press("Enter");
      // Its answer is not shown yet, so "Показать ответ" comes first in its menu.
      await tabTo(page, rowOf(choices, "1").getByRole("button", { name: "Не засчитывать" }));
      await page.keyboard.press("Enter");
      await expect(rowOf(choices, "1")).toContainText("Неверно · не засчитано вручную");

      // The next unit.
      await tabTo(page, page.getByRole("button", { name: "Следующий раздел" }), true);
      await page.keyboard.press("Enter");
      await expect(unitHeading(page)).toHaveText(/Раздел 2\./);
      await expect(unitHeading(page)).toBeFocused();
    },
  );
});
