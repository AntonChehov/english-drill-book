import { addDemo, databaseName, demoTitles, drillsPdf, failedLoad } from "./demo";
import { test as withoutDemo } from "./fixtures";
import { expect, openUnit, pagesPanel, test } from "./study";
import { addressOf } from "./views";

const message = "Не удалось показать эту часть.";

test.describe("PROD-011 A failure stays in its part", () => {
  test("@req PROD-011 exercises that fail to draw say so in their column; the pages and the top bar stay usable, and trying again draws them", async ({
    page,
    allowConsoleError,
  }) => {
    allowConsoleError(/the exercises cannot be drawn/);
    // Drawing an exercise names its block by its number: `base` in src/ui/study/ExerciseBlock.vue
    // calls `id.replaceAll(".", "-")`, and the test makes that call throw while the flag is on.
    // Nothing else may call `replaceAll(".", …)` while it is drawn, or this test breaks with it.
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
    // The column keeps its name, and the jump to it from the pages still lands on it.
    const column = page.getByRole("region", { name: "Упражнения" });
    await expect(column).toBeVisible();
    const wide = page.viewportSize();
    await page.setViewportSize({ width: 360, height: 800 }); // the jump links show on a narrow screen
    await page.getByRole("button", { name: "К упражнениям" }).click();
    await expect(column).toBeFocused();
    if (wide) await page.setViewportSize(wide);
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

  withoutDemo(
    "@req PROD-011 a stored book that no longer reads says so on its card; the other book and the rest of Today stay usable",
    async ({ page, allowConsoleError }) => {
      allowConsoleError(failedLoad);
      await addDemo(page);
      await page.evaluate(
        (name) =>
          new Promise<void>((resolve, reject) => {
            const request = indexedDB.open(name);
            request.addEventListener("error", () => reject(request.error));
            request.addEventListener("success", () => {
              const database = request.result;
              const transaction = database.transaction(["packs"], "readwrite");
              const packs = transaction.objectStore("packs");
              const drills = packs.get("demo-drills");
              drills.addEventListener("success", () => {
                packs.put({ ...(drills.result as object), units: [] });
              });
              transaction.addEventListener("complete", () => {
                database.close();
                resolve();
              });
            });
          }),
        databaseName,
      );
      // The book cannot be read again either, so its card stays as it is.
      await page.route(drillsPdf, (route) => route.abort("internetdisconnected"));

      await page.reload();

      const [course, drills] = demoTitles;
      const cards = page
        .getByRole("listitem")
        .filter({ has: page.getByRole("heading", { level: 3 }) });
      await expect(cards.filter({ hasText: drills })).toContainText("Книгу не удалось прочитать");
      await expect(cards.filter({ hasText: course })).not.toContainText(
        "Книгу не удалось прочитать",
      );
      await expect(cards.filter({ hasText: course }).getByRole("link").first()).toBeVisible();
      await page.getByRole("link", { name: "Темы" }).click();
      await expect(page.getByRole("heading", { level: 1, name: "Темы" })).toBeVisible();
    },
  );
});
