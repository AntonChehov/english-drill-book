import type { Page } from "@playwright/test";
import { demoPdf, failedLoad } from "./demo";
import {
  answers11,
  checkButton,
  exerciseOf,
  expect,
  fill,
  openUnit,
  pagesPanel,
  rowOf,
  test,
  unitHeading,
} from "./study";

// Not through the panel: `evaluateAll` on a role inside a role crashes the page in Firefox.
const pagesOf = (page: Page) => page.getByRole("img", { name: /^Страница \d+$/ });
const drawnPages = (page: Page) => pagesPanel(page).locator("canvas[data-drawn]");

/** The numbers of the pages the panel shows, in the order it shows them. */
const numbersOf = async (page: Page) =>
  (
    await pagesOf(page).evaluateAll((all) => all.map((each) => each.getAttribute("aria-label")))
  ).map((label) => Number(label?.replace("Страница ", "")));

/** Where the top of page `number` is, in CSS pixels from the top of the window. */
const topOf = (page: Page, number: number) =>
  pagesPanel(page)
    .locator(`[data-page="${number}"]`)
    .evaluate((element) => element.getBoundingClientRect().top);

const offlineMessage = "Страницы демо-книги показываются только при подключении к интернету.";

test.describe("DOC-001 The pages of a unit", () => {
  test(
    "@req DOC-001 unit 3 shows its own pages and no other unit's, in the book's order, each drawn",
    { tag: "@demo" },
    async ({ page }) => {
      await openUnit(page, "2");
      const second = await numbersOf(page);
      await openUnit(page, "4");
      const fourth = await numbersOf(page);

      await openUnit(page, "3");
      await expect(drawnPages(page).first()).toBeVisible();
      const third = await numbersOf(page);

      expect(third.length).toBeGreaterThan(0);
      expect(third, "in the book's order").toEqual(third.toSorted((a, b) => a - b));
      expect(Math.min(...third), "after the pages of unit 2").toBeGreaterThan(Math.max(...second));
      expect(Math.max(...third), "before the pages of unit 4").toBeLessThan(Math.min(...fourth));

      // Every page is drawn once it is scrolled to, and holds its place before that.
      for (const number of third) {
        const canvas = pagesPanel(page).getByRole("img", {
          name: `Страница ${number}`,
          exact: true,
        });
        await canvas.scrollIntoViewIfNeeded();
        await expect(canvas).toHaveAttribute("data-drawn", "true");
        const drawn = await canvas.evaluate((element) => {
          const { width, height } = element as HTMLCanvasElement;
          return width > 0 && height > 0;
        });
        expect(drawn, `page ${number} has pixels`).toBe(true);
      }
    },
  );

  test(
    "@req DOC-001 the number of an exercise scrolls the pages to the page on which the exercise starts",
    { tag: "@demo" },
    async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width: 1280, height: 720 });
      await openUnit(page, "1");
      await expect(drawnPages(page).first()).toBeVisible();
      const [, last] = await numbersOf(page);
      if (last === undefined) throw new Error("Unit 1 has one page only");
      const viewport = page.viewportSize()?.height ?? 0;
      expect(await topOf(page, last), "the second page starts below the window").toBeGreaterThan(
        viewport / 2,
      );

      // The last exercise of the unit starts on its second page.
      await page.getByRole("button", { name: "Упражнение 1.3", exact: true }).click();

      await expect.poll(() => topOf(page, last)).toBeLessThan(viewport / 2);
      expect(await topOf(page, last)).toBeGreaterThan(-2);
      await expect(
        pagesPanel(page).getByRole("img", { name: `Страница ${last}`, exact: true }),
      ).toHaveAttribute("data-drawn", "true");
    },
  );

  test(
    "@req DOC-001 with the book already fetched, the first page of a unit is visible within 2 seconds",
    { tag: "@demo" },
    async ({ page }) => {
      await openUnit(page, "1");
      await expect(drawnPages(page).first()).toBeVisible();

      // Three openings and their median: one stall of a loaded machine is not the app's speed.
      // Timed in the page, from the press to each stage, so the test's own polling adds nothing.
      const openings: { heading: number; placed: number; drawn: number }[] = [];
      for (const unit of ["2", "3", "4"]) {
        openings.push(
          await page.evaluate(
            (title) =>
              new Promise<{ heading: number; placed: number; drawn: number }>((resolve) => {
                const started = performance.now();
                const at: Partial<Record<"heading" | "placed" | "drawn", number>> = {};
                const look = () => {
                  const elapsed = Math.round(performance.now() - started);
                  if (
                    at.heading === undefined &&
                    document.querySelector("h1")?.textContent?.trim().startsWith(title)
                  )
                    at.heading = elapsed;
                  if (
                    at.heading !== undefined &&
                    at.placed === undefined &&
                    document.querySelector('[aria-labelledby="pages-heading"] canvas')
                  )
                    at.placed = elapsed;
                  if (at.placed !== undefined && document.querySelector("canvas[data-drawn]")) {
                    at.drawn = elapsed;
                    observer.disconnect();
                    resolve({ heading: at.heading!, placed: at.placed, drawn: at.drawn });
                  }
                };
                const observer = new MutationObserver(look);
                observer.observe(document.body, {
                  subtree: true,
                  childList: true,
                  attributes: true,
                  characterData: true,
                });
                document
                  .querySelector<HTMLButtonElement>('button[aria-label="Следующий раздел"]')!
                  .click();
              }),
            `Раздел ${unit}.`,
          ),
        );
        await expect(unitHeading(page)).toHaveText(new RegExp(`Раздел ${unit}\\.`));
      }
      const times = openings.map(({ drawn }) => drawn);
      const median = times.toSorted((x, y) => x - y)[1] ?? Infinity;

      console.log(
        `The first page of the next unit (heading / pages placed / drawn, ms): ${openings
          .map(({ heading, placed, drawn }) => `${heading} / ${placed} / ${drawn}`)
          .join(", ")}`,
      );
      expect(median).toBeLessThan(2000);
    },
  );
});

test.describe("DOC-001 On a dense screen", () => {
  test.use({ deviceScaleFactor: 2 });

  test(
    "@req DOC-001 on a screen of two pixels per CSS pixel, a page is shown at once and then drawn sharp, at the screen's density",
    { tag: "@demo" },
    async ({ page }) => {
      await openUnit(page, "1");
      const canvas = drawnPages(page).first();
      await expect(canvas).toBeVisible();

      await expect
        .poll(() =>
          canvas.evaluate((element) => {
            const drawn = element as HTMLCanvasElement;
            return drawn.width / drawn.getBoundingClientRect().width;
          }),
        )
        .toBeGreaterThan(1.95);
    },
  );
});

test.describe("DOC-008 The demo needs a connection", () => {
  test(
    "@req DOC-008 the pages come from the app's own origin; offline the panel says the demo needs a connection, the exercises work, and repeating online shows the pages without a reload",
    { tag: "@demo" },
    async ({ page, allowConsoleError, ownOrigin }) => {
      allowConsoleError(failedLoad);
      const books: string[] = [];
      page.on("request", (request) => {
        if (demoPdf.test(request.url())) books.push(new URL(request.url()).origin);
      });
      await page.route(demoPdf, (route) => route.abort("internetdisconnected"));

      await openUnit(page, "1");

      const alert = pagesPanel(page).getByRole("alert");
      await expect(alert).toContainText(offlineMessage);
      await expect(pagesOf(page)).toHaveCount(0);

      // The exercises beside it are answered and checked as usual.
      const exercise = exerciseOf(page, "1.1");
      await fill(exercise, answers11);
      await checkButton(exercise).click();
      await expect(rowOf(exercise, "1")).toContainText("✓ Верно");
      await expect(exercise).toContainText("верно 8 из 8");

      // Back online: repeating shows the pages, the page not reloaded.
      const navigations: string[] = [];
      await page.evaluate(() => {
        (window as unknown as { stillHere: boolean }).stillHere = true;
      });
      page.on("framenavigated", (frame) => navigations.push(frame.url()));
      await page.unroute(demoPdf);
      await alert.getByRole("button", { name: "Повторить" }).click();

      await expect(drawnPages(page).first()).toBeVisible();
      await expect(pagesPanel(page).getByRole("alert")).toHaveCount(0);
      expect(
        await page.evaluate(() => (window as unknown as { stillHere?: boolean }).stillHere),
      ).toBe(true);
      expect(navigations, "the page was not reloaded").toEqual([]);
      expect(books.length, "the book was requested").toBeGreaterThan(0);
      expect(new Set(books), "from the app's own origin only").toEqual(new Set([ownOrigin]));
    },
  );
});
