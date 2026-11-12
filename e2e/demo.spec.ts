import type { Request } from "@playwright/test";
import {
  addDemo,
  addedHeading,
  demoPdf,
  demoTitles,
  drillsPdf,
  failDemo,
  failedLoad,
  pdfLibraryFiles,
  retryButton,
  startButton,
} from "./demo";
import { expect, test } from "./fixtures";
import { addressOf } from "./views";

/** Reading both books may take at most this long (constitution C-06, design of `demo-books`). */
const readingBudget = 2000;

test.describe("PACK-003 The demo book", () => {
  test(
    "@req PACK-003 one action lists the course and the drill book with their units and exercises, asking for no file",
    { tag: "@demo" },
    async ({ page }) => {
      const fileChoosers: unknown[] = [];
      page.on("filechooser", (chooser) => fileChoosers.push(chooser));

      const elapsed = await addDemo(page);
      console.log(`Both demo books read in ${elapsed} ms`);
      test.info().annotations.push({ type: "reading time", description: `${elapsed} ms` });

      const books = page
        .getByRole("list")
        .first()
        .getByRole("listitem")
        .filter({
          has: page.getByRole("heading", { level: 3 }),
        });
      await expect(books).toHaveCount(2);
      for (const [index, title] of demoTitles.entries()) {
        const book = books.nth(index);
        await expect(book.getByRole("heading", { level: 3 })).toHaveText(title);
        await expect(book.getByRole("listitem")).toHaveText([
          "Раздел 1. To be: am, is, are — 3 упражнения",
          "Раздел 2. Present simple: I work, she works — 3 упражнения",
          "Раздел 3. A and an — 3 упражнения",
          "Раздел 4. There is and there are — 3 упражнения",
        ]);
      }
      expect(fileChoosers, "no file was asked for").toEqual([]);
      await expect(page.locator("input[type=file]")).toHaveCount(0);
      expect(elapsed, `both books are read within ${readingBudget} ms`).toBeLessThan(readingBudget);
    },
  );

  test(
    "@req PACK-003 adding the demo requests only the app's own origin",
    { tag: "@demo" },
    async ({ page, ownOrigin }) => {
      const requests: string[] = [];
      page.on("request", (request: Request) => requests.push(request.url()));

      await addDemo(page);

      expect(requests.filter((url) => new URL(url).origin !== ownOrigin)).toEqual([]);
      expect(requests.filter((url) => demoPdf.test(new URL(url).pathname))).toHaveLength(2);
      for (const file of pdfLibraryFiles()) {
        expect(
          requests.some((url) => url.endsWith(file)),
          `${file} was loaded`,
        ).toBe(true);
      }
    },
  );

  test(
    "@req PACK-003 a demo book that cannot be loaded is explained in Russian in place, with a way to try again",
    { tag: "@demo" },
    async ({ page, allowConsoleError }) => {
      const dialogs: string[] = [];
      page.on("dialog", async (dialog) => {
        dialogs.push(dialog.message());
        await dialog.dismiss();
      });

      await failDemo(page, allowConsoleError);

      const demo = page.getByRole("region", { name: "Демо-книги" });
      await expect(demo.getByRole("alert")).toHaveText(
        "Не удалось загрузить демо-книгу «Everyday Grammar: Demo Drills»: нет связи с сайтом. Проверьте подключение к интернету и попробуйте ещё раз.",
      );
      await expect(demo.getByRole("button", { name: "Попробовать ещё раз" })).toBeFocused();
      expect(dialogs, "no browser dialog").toEqual([]);

      await page.getByRole("link", { name: "О приложении" }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("О приложении");
    },
  );

  test(
    "@req PACK-003 a demo book the server refuses is explained with the error",
    { tag: "@demo" },
    async ({ page, allowConsoleError }) => {
      allowConsoleError(/status of 404|Failed to load resource/);
      await page.route(drillsPdf, (route) => route.fulfill({ status: 404, body: "Not found" }));
      await page.goto(addressOf("/"));
      await startButton(page).click();

      await expect(page.getByRole("alert")).toHaveText(
        "Сайт не отдал файл демо-книги «Everyday Grammar: Demo Drills» (ошибка 404). Попробуйте ещё раз немного позже.",
      );
    },
  );

  test(
    "@req PACK-001 @req PACK-003 a demo book that cannot be read is refused, not shown",
    { tag: "@demo" },
    async ({ page }) => {
      await page.route(drillsPdf, (route) =>
        route.fulfill({ contentType: "application/pdf", body: "%PDF-1.7 this is not a book" }),
      );
      await page.goto(addressOf("/"));
      await startButton(page).click();

      await expect(page.getByRole("alert")).toHaveText(
        "Демо-книгу «Everyday Grammar: Demo Drills» не удалось прочитать: файл повреждён или не той версии. Попробуйте ещё раз, а если не поможет, обновите страницу.",
      );
      await expect(page.getByRole("heading", { level: 3 })).toHaveCount(0);
    },
  );

  test(
    "@req PACK-003 trying again when the network is back adds the demo without reloading the page",
    { tag: "@demo" },
    async ({ page, allowConsoleError }) => {
      const navigations: string[] = [];
      await failDemo(page, allowConsoleError);
      await page.evaluate(() => {
        (window as unknown as { stillHere: boolean }).stillHere = true;
      });
      page.on("framenavigated", (frame) => navigations.push(frame.url()));

      await page.unroute(drillsPdf);
      await retryButton(page).click();

      await expect(addedHeading(page)).toBeVisible();
      await expect(page.getByRole("heading", { level: 3 })).toHaveText(demoTitles);
      expect(
        await page.evaluate(() => (window as unknown as { stillHere?: boolean }).stillHere),
      ).toBe(true);
      expect(navigations, "the page was not reloaded").toEqual([]);
    },
  );

  test(
    "@req PACK-003 the first screen requests no file of the PDF library and no demo book",
    { tag: "@demo" },
    async ({ page }) => {
      const requests: string[] = [];
      page.on("request", (request: Request) => requests.push(new URL(request.url()).pathname));
      const library = pdfLibraryFiles();
      expect(library.length, "the build has the PDF library").toBeGreaterThan(0);

      await page.goto(addressOf("/"));
      await expect(startButton(page)).toBeVisible();
      await page.waitForLoadState("load");

      const heavy = (path: string) =>
        demoPdf.test(path) || library.some((file) => path.endsWith(file));
      expect(requests.filter(heavy)).toEqual([]);

      await startButton(page).click();
      await expect(addedHeading(page)).toBeVisible();
      for (const file of [...library, "/demo/course.pdf", "/demo/drills.pdf"]) {
        expect(
          requests.some((path) => path.endsWith(file)),
          `${file} loads once asked for`,
        ).toBe(true);
      }
    },
  );

  test(
    "@req PACK-003 keyboard alone adds the demo, and tries again after a failure",
    { tag: "@demo" },
    async ({ page, allowConsoleError }) => {
      allowConsoleError(failedLoad);
      await page.route(drillsPdf, (route) => route.abort("internetdisconnected"));
      await page.goto(addressOf("/"));

      for (let presses = 0; presses < 10; presses++) {
        await page.keyboard.press("Tab");
        if (await startButton(page).evaluate((button) => button === document.activeElement)) break;
      }
      await expect(startButton(page)).toBeFocused();
      await page.keyboard.press("Enter");

      await expect(retryButton(page)).toBeFocused();
      await page.unroute(drillsPdf);
      await page.keyboard.press("Enter");

      await expect(addedHeading(page)).toBeFocused();
      await expect(page.getByRole("heading", { level: 3 })).toHaveText(demoTitles);
    },
  );

  test(
    "@req PACK-003 the demo stays added when the visitor goes to another view and back",
    { tag: "@demo" },
    async ({ page }) => {
      await addDemo(page);
      await page.getByRole("link", { name: "О приложении" }).click();
      await page.getByRole("link", { name: "На главную" }).click();
      await expect(addedHeading(page)).toBeVisible();

      await page.reload();
      await expect(startButton(page)).toBeVisible();
    },
  );
});
