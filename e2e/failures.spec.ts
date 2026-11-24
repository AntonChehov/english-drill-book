import { expect, openUnit, pagesPanel, test } from "./study";
import { addressOf } from "./views";

const message = "Не удалось показать эту часть.";

test.describe("PROD-011 A failure stays in its part", () => {
  test("@req PROD-011 exercises that fail to draw say so in their column; the pages and the top bar stay usable, and trying again draws them", async ({
    page,
    allowConsoleError,
  }) => {
    allowConsoleError(/the exercises cannot be drawn/);
    // Drawing an exercise names its block by its number, which the test makes fail.
    await page.addInitScript(() => {
      const replaceAll = String.prototype.replaceAll;
      // oxlint-disable-next-line no-extend-native -- the test breaks drawing on purpose
      String.prototype.replaceAll = function (
        this: string,
        ...args: Parameters<typeof replaceAll>
      ) {
        const broken = (window as unknown as { breakExercises?: boolean }).breakExercises;
        if (broken && args[0] === ".") throw new Error("the exercises cannot be drawn");
        return replaceAll.apply(this, args);
      } as typeof replaceAll;
    });
    await page.goto(addressOf("/"));
    const breakExercises = (broken: boolean) =>
      page.evaluate((value) => {
        (window as unknown as { breakExercises: boolean }).breakExercises = value;
      }, broken);
    await breakExercises(true);
    await openUnit(page, "1");

    const failure = page.getByRole("alert").filter({ hasText: message });
    const exercises = page.getByRole("heading", { level: 2, name: "Упражнения" });
    await expect(failure).toBeVisible();
    await expect(exercises).toHaveCount(0);
    await expect(pagesPanel(page).locator("canvas[data-drawn]").first()).toBeVisible();

    // The top bar goes on working, and the screen comes back to the same failure.
    await page.getByRole("link", { name: "Темы" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Темы" })).toBeVisible();
    await page.goBack();
    await expect(failure).toBeVisible();

    await breakExercises(false);
    await failure.getByRole("button", { name: "Попробовать снова" }).click();
    await expect(failure).toHaveCount(0);
    await expect(exercises).toBeVisible();
  });
});
