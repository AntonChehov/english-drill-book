import { addedHeading, drillsPdf, failedLoad } from "./demo";
import { exerciseOf, expect, finishUnit1, openUnit, test, unitAddress, unitHeading } from "./study";
import { addressOf } from "./views";

test.describe("PROD-001 and PROD-008 hold for Study", () => {
  test(
    "@req PROD-001 every link on Study opens its destination in the same window",
    { tag: "@demo" },
    async ({ page, context }) => {
      await openUnit(page, "1");
      await page.getByRole("button", { name: "Все разделы" }).click();
      const links = page.getByRole("link");
      const count = await links.count();
      expect(count, "the top bar and the list of units").toBeGreaterThanOrEqual(7);
      await page.keyboard.press("Escape");

      for (let index = 0; index < count; index++) {
        await openUnit(page, "1");
        await page.getByRole("button", { name: "Все разделы" }).click();
        const link = links.nth(index);
        await expect(link).not.toHaveAttribute("target", /.+/);
        const href = await link.getAttribute("href");
        const popups: unknown[] = [];
        context.on("page", (opened) => popups.push(opened));
        await link.click();

        await expect(page).toHaveURL((url) => url.hash === href);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        expect(popups, "no other window or tab was opened").toHaveLength(0);
        expect(context.pages()).toHaveLength(1);
      }
    },
  );

  test(
    "@req PROD-008 reloading Study keeps the unit, and an address with an exercise opens the unit at it",
    { tag: "@demo" },
    async ({ page }) => {
      await page.goto(addressOf("/"));
      await page.getByRole("link", { name: "Раздел 3. A and an" }).first().click();
      await expect(unitHeading(page)).toHaveText("Раздел 3. A and an");
      const address = page.url();
      await expect(page).toHaveTitle("Раздел 3. A and an — English Drill Book");

      await page.reload();
      await expect(page).toHaveURL(address);
      await expect(unitHeading(page)).toHaveText("Раздел 3. A and an");

      await page.goto(`${unitAddress("3")}?ex=3.3`);
      await expect(exerciseOf(page, "3.3")).toBeInViewport();
    },
  );

  test(
    "@req PROD-008 the address of a demo unit in a clean profile says the demo is not added, and one action adds it and opens that unit",
    { tag: "@demo" },
    async ({ openCleanPage }) => {
      const page = await openCleanPage(`${unitAddress("3")}?ex=3.2`);

      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Демо-книги ещё не добавлены",
      );
      await expect(page).toHaveTitle(/^Демо-книги не добавлены — /);
      await expect(page.getByText("Everyday Grammar: A Demo Course")).toBeVisible();
      await page.getByRole("button", { name: "Добавить демо-книги и открыть раздел" }).click();

      await expect(unitHeading(page)).toHaveText("Раздел 3. A and an");
      await expect(exerciseOf(page, "3.2")).toBeInViewport();
      await page.getByRole("link", { name: "Сегодня" }).click();
      await expect(addedHeading(page)).toBeVisible();
    },
  );

  test(
    "@req PROD-008 a demo unit whose books cannot be fetched says why in place, and trying again opens it",
    { tag: "@demo" },
    async ({ openCleanPage }) => {
      const page = await openCleanPage("about:blank", [failedLoad]);
      await page.route(drillsPdf, (route) => route.abort("internetdisconnected"));
      await page.goto(unitAddress("2"));
      await page.getByRole("button", { name: "Добавить демо-книги и открыть раздел" }).click();

      await expect(page.getByRole("alert")).toContainText("нет связи с сайтом");
      await page.unroute(drillsPdf);
      await page.getByRole("button", { name: "Попробовать ещё раз" }).click();
      await expect(unitHeading(page)).toHaveText("Раздел 2. Present simple");
    },
  );

  test(
    "@req PROD-008 an unknown unit or book shows the not-found state in the frame",
    { tag: "@demo" },
    async ({ page }) => {
      for (const address of [unitAddress("9"), unitAddress("1", "no-such-book")]) {
        await page.goto(address);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText("Раздел не найден");
        await expect(page.getByRole("navigation", { name: "Разделы приложения" })).toBeVisible();
      }
    },
  );
});

test.describe("PROG-014 Today before programs", () => {
  test(
    "@req PROG-014 a unit chosen on the start screen opens Study for that unit",
    { tag: "@demo" },
    async ({ page }) => {
      await page.goto(addressOf("/"));
      await expect(addedHeading(page)).toBeVisible();
      await page.getByRole("link", { name: "Раздел 2. Present simple" }).nth(1).click();

      await expect(page).toHaveURL((url) => url.hash === "#/study/demo-drills/2");
      await expect(unitHeading(page)).toHaveText("Раздел 2. Present simple");
      await expect(page.getByText("Everyday Grammar: Demo Drills")).toBeVisible();
    },
  );

  test(
    "@req PROG-014 two exercises of unit 1 done show two of three and the book's total; unit 1 finished marks unit 2 to continue",
    { tag: "@demo" },
    async ({ page }) => {
      await openUnit(page, "1");
      await finishUnit1(page, false);
      await page.getByRole("link", { name: "Сегодня" }).click();

      const course = page.getByRole("listitem").filter({
        has: page.getByRole("heading", { name: "Everyday Grammar: A Demo Course" }),
      });
      const unit = (n: number) => course.getByRole("listitem").nth(n - 1);
      await expect(unit(1)).toContainText("сделано 2 из 3");
      await expect(course).toContainText("2 из 12 упражнений сделано");
      await expect(unit(1)).toContainText("продолжить");

      await unit(1).getByRole("link").click();
      await finishUnit1(page);
      await page.getByRole("link", { name: "Сегодня" }).click();
      await expect(unit(1)).toContainText("✓ сделано 3 из 3");
      await expect(unit(1)).not.toContainText("продолжить");
      await expect(unit(2)).toContainText("продолжить");
      await expect(course.getByText("продолжить")).toHaveCount(1);
    },
  );

  test(
    "@req PROG-014 the counts follow work done in another tab",
    { tag: "@demo" },
    async ({ page, context }) => {
      await page.goto(addressOf("/"));
      await expect(page.getByText("0 из 12 упражнений сделано")).toHaveCount(2);
      const other = await context.newPage();
      await openUnit(other, "1");
      await finishUnit1(other, false);

      await page.bringToFront();
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await expect(page.getByText("2 из 12 упражнений сделано")).toBeVisible();
    },
  );
});
