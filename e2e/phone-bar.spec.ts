import type { Page } from "@playwright/test";
import { exerciseOf, expect, fieldOf, finishUnit1, openUnit, test, unitHeading } from "./study";
import { addressOf } from "./views";

const phone = { width: 360, height: 740 };
const bar = (page: Page) => page.getByRole("banner");
const scrollTo = (page: Page, y: number) => page.evaluate((to) => window.scrollTo(0, to), y);

/** The bar is out of view: its bottom edge is above the window. */
async function expectAway(page: Page) {
  await expect
    .poll(async () => (await bar(page).boundingBox())!.y + (await bar(page).boundingBox())!.height)
    .toBeLessThanOrEqual(0);
}

async function expectInView(page: Page) {
  await expect.poll(async () => (await bar(page).boundingBox())!.y).toBeGreaterThanOrEqual(0);
}

test.describe("PROD-012 The compact bar and the mark of a finished unit", () => {
  test("@req PROD-012 at 360 px the bar leaves on a scroll down, returns on a scroll up and when focused by keyboard", async ({
    page,
  }) => {
    await page.setViewportSize(phone);
    await openUnit(page, "1");
    await expectInView(page);

    await scrollTo(page, 900);
    await expectAway(page);
    await scrollTo(page, 700);
    await expectInView(page);

    await scrollTo(page, 1500);
    await expectAway(page);
    await page.keyboard.press("Tab");
    await expect(bar(page).getByRole("link", { name: "English Drill Book" })).toBeFocused();
    await expectInView(page);
    // While focus is inside the bar it stays; once it leaves, the scroll hides it again.
    await scrollTo(page, 1800);
    await expectInView(page);
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    await scrollTo(page, 2000);
    await expectAway(page);
    await scrollTo(page, 0);
    await expectInView(page);
  });

  test("@req PROD-012 a field scrolled to the top edge from below stays clear of the bar that returns", async ({
    page,
  }) => {
    await page.setViewportSize(phone);
    await openUnit(page, "1");
    await scrollTo(page, 5000);
    await expectAway(page);

    // A browser that scrolls a focused field to the top edge (Shift+Tab) scrolls upwards, so the bar
    // comes back over the top of the window; `scrollIntoView` does the same in every browser.
    const field = fieldOf(exerciseOf(page, "1.1"), "1");
    await field.evaluate((element) => element.scrollIntoView({ block: "start" }));
    await expectInView(page);
    const barBottom = async () => {
      const box = (await bar(page).boundingBox())!;
      return box.y + box.height;
    };
    await expect
      .poll(async () => (await field.boundingBox())!.y)
      .toBeGreaterThanOrEqual(await barBottom());
  });

  test("@req PROD-012 the bar stays while the list of units is open", async ({ page }) => {
    await page.setViewportSize(phone);
    await openUnit(page, "1");
    await scrollTo(page, 100);
    await bar(page).getByRole("button", { name: "Все разделы" }).click();
    await scrollTo(page, 1200);

    await expectInView(page);
    await expect(bar(page).getByRole("link", { name: /^Раздел 2\./ })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    await scrollTo(page, 1600);
    await expectAway(page);
  });

  test("@req PROD-012 with reduced motion the bar goes without sliding", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize(phone);
    await openUnit(page, "1");

    await expect(bar(page)).toHaveCSS("transition-duration", "0s");
    await scrollTo(page, 900);
    await expectAway(page);
  });

  test("@req PROD-012 at 1280 px the top bar stays where it is and the unit's header keeps its navigation", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openUnit(page, "1");
    await scrollTo(page, 600);

    await expect(bar(page)).toHaveCSS("position", "static");
    await expect(bar(page).getByRole("button")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Следующий раздел" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Все разделы" })).toBeVisible();
  });

  test("@req PROD-012 at 360 px the unit's navigation is in the bar, and › goes to the next unit", async ({
    page,
  }) => {
    await page.setViewportSize(phone);
    await openUnit(page, "1");

    await expect(bar(page).getByRole("button", { name: "Предыдущий раздел" })).toBeDisabled();
    await expect(bar(page).getByText("Раздел 1", { exact: true })).toBeVisible();
    await expect(bar(page).getByRole("button", { name: "Все разделы" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Следующий раздел" })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Все разделы" })).toHaveCount(1);

    await bar(page).getByRole("button", { name: "Следующий раздел" }).click();
    await expect(unitHeading(page)).toHaveText(/Раздел 2\./);
    await expect(bar(page).getByText("Раздел 2", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Следующий раздел" })).toHaveCount(1);
  });

  test("@req PROD-012 finishing the last exercise draws the mark in the bar and the list, and it stays on the card", async ({
    page,
  }) => {
    await page.setViewportSize(phone);
    await openUnit(page, "1");
    await finishUnit1(page, false);
    await expect(bar(page).getByText("выполнено")).toHaveCount(0);

    await finishUnit1(page);
    await expect(exerciseOf(page, "1.3")).toContainText("Сделано");
    const mark = bar(page).locator(".mark");
    await expect(mark).toHaveClass(/drawing/);
    await expect(mark).toBeVisible();
    await expect(mark.getByText("выполнено")).toBeAttached();

    await bar(page).getByRole("button", { name: "Все разделы" }).click();
    const first = bar(page).getByRole("link", { name: /^Раздел 1\./ });
    await expect(first).toContainText("выполнено");
    await expect(bar(page).getByRole("link", { name: /^Раздел 2\./ })).not.toContainText(
      "выполнено",
    );

    await page.reload();
    await expect(bar(page).locator(".mark")).toBeVisible();
    await expect(bar(page).locator(".mark")).not.toHaveClass(/drawing/);

    await page.goto(addressOf("/"));
    const card = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("link", { name: /^Раздел 1\. Глагол/ }) })
      .first();
    await expect(card).toContainText("выполнено");
    await expect(card.locator(".mark")).not.toHaveClass(/drawing/);
  });
});
