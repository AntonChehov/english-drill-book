import { addDemo, failedLoad } from "./demo";
import { expect, test } from "./fixtures";
import {
  answers11,
  checkButton,
  completeInStore,
  exerciseOf,
  fill,
  pagesPanel,
  rowOf,
  todayCard,
  unitHeading,
} from "./study";

test.describe("PROD-003 Offline after the first load", () => {
  test("@req PROD-003 a reload (C-04) with no network opens Today with the stored books and progress, and a unit works", async ({
    page,
    context,
    allowConsoleError,
  }) => {
    allowConsoleError(failedLoad);
    await addDemo(page);
    await completeInStore(page, ["demo-course/1.1"]);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

    await context.setOffline(true);
    await page.reload();

    // The books and the progress are read from the store, not from the demo being offered again.
    const today = todayCard(page);
    await expect(today).toContainText("сделано 1 из 3");
    await expect(
      page.getByRole("heading", { level: 2, name: "Демо-книги добавлены" }),
    ).toBeVisible();

    await today.getByRole("link", { name: "Открыть раздел" }).click();
    await expect(unitHeading(page)).toHaveText(/Раздел 1\.\s/);
    await expect(pagesPanel(page).getByRole("alert")).toContainText(
      "Страницы демо-книги показываются только при подключении к интернету.",
    );

    // An answer is checked and kept: it is still there after another reload with no network.
    await fill(exerciseOf(page, "1.1"), answers11);
    await checkButton(exerciseOf(page, "1.1")).click();
    await expect(rowOf(exerciseOf(page, "1.1"), "1")).toContainText("✓ Верно");
    await page.reload();
    await expect(unitHeading(page)).toHaveText(/Раздел 1\.\s/);
    await expect(exerciseOf(page, "1.1")).toContainText("Сделано");
  });
});
