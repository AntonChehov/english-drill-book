import type { Page } from "@playwright/test";
import { pdfLibraryFiles, pdfWorker } from "./demo";
import {
  drawnPages,
  exerciseOf,
  expect,
  fieldOf,
  numbersOf,
  openUnit,
  pagesOf,
  pagesPanel,
  storedSetting,
  test,
  topOf,
  unitAddress,
} from "./study";
import { addressOf } from "./views";

const toolbar = (page: Page) => pagesPanel(page).getByRole("toolbar", { name: "Масштаб" });
const level = (page: Page) => toolbar(page).getByRole("status");
const zoomIn = (page: Page) => toolbar(page).getByRole("button", { name: "Увеличить" });
const zoomOut = (page: Page) => toolbar(page).getByRole("button", { name: "Уменьшить" });
const fit = (page: Page) => toolbar(page).getByRole("button", { name: "По ширине" });
const previousPage = (page: Page) =>
  pagesPanel(page).getByRole("button", { name: "Предыдущая страница" });
const nextPage = (page: Page) =>
  pagesPanel(page).getByRole("button", { name: "Следующая страница" });
const separator = (page: Page) =>
  page.getByRole("separator", { name: "Граница между страницами и упражнениями" });
const exercisesPanel = (page: Page) => page.getByRole("region", { name: "Упражнения" });

/** Presses a button without scrolling to it, as a pointer far from the pages' end would. */
const pressUnseen = (button: ReturnType<typeof previousPage>) =>
  button.evaluate((element) => (element as HTMLButtonElement).click());

/**
 * Presses `button` `times` times from within the page, one frame apart, so that a press does not
 * wait for the pages to be drawn again at the zoom before it (the last draw is the one that counts).
 */
const pressFrames = (button: ReturnType<typeof previousPage>, times: number) =>
  button.evaluate(async (element, count) => {
    for (let press = 0; press < count; press++) {
      (element as HTMLButtonElement).click();
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  }, times);

test.describe("DOC-002 Zoom", () => {
  test(
    "@req DOC-002 the pages are zoomed in and out, kept per book over a reload, and the book's own zoom is shown when another opens",
    { tag: "@demo" },
    async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await openUnit(page, "1");
      await expect(level(page)).toHaveText("100 %");
      await expect(fit(page)).toHaveAttribute("aria-pressed", "true");

      await zoomIn(page).click();
      await zoomIn(page).click();

      await expect(level(page)).toHaveText("150 %");
      await expect(fit(page)).toHaveAttribute("aria-pressed", "false");
      const panel = (await pagesPanel(page).boundingBox())!;
      const first = pagesOf(page).first();
      await expect
        .poll(async () => (await first.boundingBox())!.width)
        .toBeGreaterThan(panel.width);
      // Drawn again at the new width, not stretched.
      await expect
        .poll(() => first.evaluate((canvas) => (canvas as HTMLCanvasElement).width))
        .toBeGreaterThan(panel.width * 1.4);

      await expect.poll(() => storedSetting(page, "pageZoom")).toEqual({ "demo-course": 1.5 });
      await page.reload();
      await expect(level(page)).toHaveText("150 %");

      await openUnit(page, "1", "demo-drills");
      await expect(level(page)).toHaveText("100 %");
      await openUnit(page, "2");
      await expect(level(page)).toHaveText("150 %");

      await fit(page).click();
      await expect(level(page)).toHaveText("100 %");
      await expect(fit(page)).toHaveAttribute("aria-pressed", "true");
    },
  );

  test(
    "@req DOC-002 «Увеличить» is disabled at 300 % and «Уменьшить» at 50 %, and the toolbar works by keyboard",
    { tag: "@demo" },
    async ({ page }) => {
      await openUnit(page, "1");
      await zoomIn(page).focus();
      for (let presses = 0; presses < 2; presses++) await page.keyboard.press("Enter");
      await expect(level(page)).toHaveText("150 %");
      await pressFrames(zoomIn(page), 3);

      await expect(level(page)).toHaveText("300 %");
      await expect(zoomIn(page)).toBeDisabled();
      await expect(zoomIn(page), "the focus stays where it was").toBeFocused();
      await expect(zoomOut(page)).toBeEnabled();

      await pressFrames(zoomOut(page), 7);

      await expect(level(page)).toHaveText("50 %");
      await expect(zoomOut(page)).toBeDisabled();
    },
  );

  test(
    "@req DOC-002 the page at the top of the window stays there when the zoom changes",
    { tag: "@demo" },
    async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await openUnit(page, "1");
      await expect(drawnPages(page).first()).toBeVisible();
      await pagesPanel(page)
        .locator('[data-page="4"]')
        .evaluate((element) => element.scrollIntoView({ block: "start", behavior: "instant" }));
      await expect.poll(() => topOf(page, 4)).toBeGreaterThan(-2);
      const before = await topOf(page, 4);

      await zoomIn(page).click();
      await expect(level(page)).toHaveText("125 %");

      await expect.poll(async () => Math.abs((await topOf(page, 4)) - before)).toBeLessThan(3);
    },
  );

  test(
    "@req DOC-002 at 360 px a zoom scrolls inside the panel and the window never scrolls sideways",
    { tag: "@demo" },
    async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 });
      await openUnit(page, "1");
      await expect(drawnPages(page).first()).toBeVisible();
      await expect(pagesPanel(page).getByRole("button", { name: "Скрыть страницы" })).toHaveCount(
        0,
      );

      await zoomIn(page).click();
      await zoomIn(page).click();
      await zoomIn(page).click();
      await expect(level(page)).toHaveText("200 %");

      const overflow = await page.evaluate(() => ({
        window: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        panel: (() => {
          const view = document.querySelector<HTMLElement>(".pages .view")!;
          return view.scrollWidth - view.clientWidth;
        })(),
      }));
      expect(overflow.window, "the window").toBe(0);
      expect(overflow.panel, "the panel").toBeGreaterThan(0);
    },
  );
});

test.describe("DOC-003 A page before or after", () => {
  test(
    "@req DOC-003 each press adds one page, up to the book's first and last page, and the view stays on the page that was first",
    { tag: "@demo" },
    async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await openUnit(page, "1");
      await expect(drawnPages(page).first()).toBeVisible();
      expect(await numbersOf(page)).toEqual([3, 4]);

      await previousPage(page).click();
      expect(await numbersOf(page)).toEqual([2, 3, 4]);
      await expect.poll(() => topOf(page, 3)).toBeLessThan(720);
      expect(await topOf(page, 3), "the page that was first is still in view").toBeGreaterThan(-5);
      await previousPage(page).press("Enter");

      expect(await numbersOf(page)).toEqual([1, 2, 3, 4]);
      await expect(previousPage(page), "the book's first page").toHaveCount(0);
      await expect(pagesPanel(page).getByRole("heading", { name: "Страницы книги" })).toBeFocused();

      await nextPage(page).click();
      expect(await numbersOf(page)).toEqual([1, 2, 3, 4, 5]);
      // Pressed in the page up to the last page, which has no button: the pages far below are
      // not drawn, and each press does not wait for them.
      await page.evaluate(async () => {
        for (let press = 0; press < 100; press++) {
          const next = [...document.querySelectorAll("button")].find(
            (button) => button.textContent?.trim() === "Следующая страница",
          );
          if (next === undefined) return;
          next.click();
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
      });
      await expect(nextPage(page), "the book's last page").toHaveCount(0);
      const numbers = await numbersOf(page);
      expect(numbers.at(-1), "the book's last page").toBeGreaterThan(11);
      expect(numbers).toEqual(Array.from({ length: numbers.length }, (_, at) => at + 1));
    },
  );

  test("@req DOC-003 another unit shows only its own pages", { tag: "@demo" }, async ({ page }) => {
    await openUnit(page, "1");
    await expect(drawnPages(page).first()).toBeVisible();
    await nextPage(page).click();
    await previousPage(page).click();
    expect(await numbersOf(page)).toEqual([2, 3, 4, 5]);

    await page.getByRole("button", { name: "Следующий раздел" }).click();

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Раздел 2.");
    await expect.poll(() => numbersOf(page)).toEqual([5, 6]);
    await expect(previousPage(page)).toBeVisible();
  });
});

test.describe("DOC-004 Only the shown pages", () => {
  test(
    "@req DOC-004 a page added far below is not drawn until it is scrolled near",
    { tag: "@demo" },
    async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await openUnit(page, "1");
      await expect(drawnPages(page).first()).toBeVisible();

      for (let added = 0; added < 3; added++) await pressUnseen(nextPage(page));

      expect(await numbersOf(page)).toEqual([3, 4, 5, 6, 7]);
      const far = pagesPanel(page).getByRole("img", { name: "Страница 7", exact: true });
      await expect(far).not.toHaveAttribute("data-drawn", "true");
      expect(await far.evaluate((canvas) => (canvas as HTMLCanvasElement).width)).toBe(300);

      await far.scrollIntoViewIfNeeded();
      await expect(far).toHaveAttribute("data-drawn", "true");
    },
  );

  test(
    "@req DOC-004 the first page of a unit is drawn within 2 seconds of opening it, in the median of three openings, in each demo book",
    { tag: "@demo" },
    async ({ page, browserName }) => {
      // WebKit is not a target of the app; its speed is technical debt (docs/tech-debt.md).
      test.skip(browserName === "webkit", "the time is not held on WebKit");
      const medians: Record<string, number> = {};
      for (const book of ["demo-course", "demo-drills"]) {
        await openUnit(page, "1", book);
        await expect(drawnPages(page).first()).toBeVisible();
        const times: number[] = [];
        for (const unit of ["2", "3", "4"]) {
          // Timed in the page, from the press to the mark the panel makes, so polling adds nothing.
          times.push(
            await page.evaluate(
              () =>
                new Promise<number>((resolve) => {
                  const started = performance.now();
                  const observer = new PerformanceObserver((list) => {
                    const mark = list.getEntries().find((entry) => entry.name === "first-page");
                    if (mark === undefined) return;
                    observer.disconnect();
                    resolve(Math.round(mark.startTime - started));
                  });
                  observer.observe({ type: "mark" });
                  document
                    .querySelector<HTMLButtonElement>('button[aria-label="Следующий раздел"]')!
                    .click();
                }),
            ),
          );
          await expect(page.getByRole("heading", { level: 1 })).toContainText(`Раздел ${unit}.`);
        }
        medians[book] = times.toSorted((x, y) => x - y)[1]!;
      }
      console.log(`The first page of a unit, median of three, ms: ${JSON.stringify(medians)}`);
      for (const median of Object.values(medians)) expect(median).toBeLessThan(2000);
    },
  );
});

test.describe("DOC-005 The PDF library", () => {
  test(
    "@req DOC-005 Today with the demo added loads no file of the PDF library, and opening a unit loads it and its worker from the app's own origin",
    { tag: "@demo" },
    async ({ page, ownOrigin }) => {
      const requests: string[] = [];
      page.on("request", (request) => requests.push(request.url()));
      const library = pdfLibraryFiles();
      expect(library.length, "the build has the PDF library").toBeGreaterThan(0);
      const heavy = (url: string) =>
        library.some((file) => url.endsWith(file)) || pdfWorker.test(new URL(url).pathname);

      await page.goto(addressOf("/"));
      await expect(page.getByRole("region", { name: "Цель" })).toBeVisible();
      await page.waitForLoadState("load");
      expect(requests.filter(heavy), "before a unit is opened").toEqual([]);

      await page.goto(unitAddress("1"));
      await expect(drawnPages(page).first()).toBeVisible();
      for (const file of library) {
        expect(
          requests.some((url) => url.endsWith(file)),
          `${file} loads once a unit is opened`,
        ).toBe(true);
      }
      expect(
        requests.some((url) => pdfWorker.test(new URL(url).pathname)),
        "the worker",
      ).toBe(true);
      expect(
        requests.filter(heavy).filter((url) => new URL(url).origin !== ownOrigin),
        "only from the app's own origin",
      ).toEqual([]);
    },
  );
});

test.describe("DOC-009 Selectable text", () => {
  test(
    "@req DOC-009 a word of a page double-clicked is selected, and the text layer is hidden from screen readers",
    { tag: "@demo" },
    async ({ page }) => {
      await openUnit(page, "1");
      // Not through the panel's role: `evaluateAll` inside a role crashes Firefox (see `pagesOf`).
      const spans = page.locator('[data-page="3"] .text-layer span');
      await expect(spans.first()).toBeAttached();
      const texts = await spans.evaluateAll((all) => all.map((span) => span.textContent ?? ""));
      const at = texts.findIndex((text) => /^[A-Za-z]{3,}\b/u.test(text));
      expect(at, "a span that starts with a word").toBeGreaterThanOrEqual(0);
      const word = /^[A-Za-z]+/u.exec(texts[at]!)![0];

      await spans.nth(at).dblclick({ position: { x: 3, y: 3 } });

      const selected = await page.evaluate(() => getSelection()?.toString().trim());
      expect(selected).toBe(word);
      await expect(pagesPanel(page).locator(".text-layer").first()).toHaveAttribute(
        "aria-hidden",
        "true",
      );
      expect(await pagesOf(page).count(), "each page is one image to a screen reader").toBe(2);
    },
  );
});

test.describe("DOC-006 The split", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test(
    "@req DOC-006 the arrow keys, Home and End move the separator by 5 % between 30 % and 75 %, and the split is kept over a reload",
    { tag: "@demo" },
    async ({ page }) => {
      // Wide enough for the pages to take 75 % and the exercises to keep 22 rem.
      await page.setViewportSize({ width: 1800, height: 800 });
      await openUnit(page, "1");
      await expect(separator(page)).toHaveAttribute("aria-valuenow", "60");
      await expect(separator(page)).toHaveAttribute("aria-valuemin", "30");
      await expect(separator(page)).toHaveAttribute("aria-valuemax", "75");
      const wide = (await pagesPanel(page).boundingBox())!.width;

      await separator(page).focus();
      await page.keyboard.press("ArrowRight");
      await expect(separator(page)).toHaveAttribute("aria-valuenow", "65");
      await expect
        .poll(async () => (await pagesPanel(page).boundingBox())!.width)
        .toBeGreaterThan(wide + 40);
      await page.keyboard.press("ArrowLeft");
      await page.keyboard.press("ArrowLeft");
      await expect(separator(page)).toHaveAttribute("aria-valuenow", "55");

      await page.keyboard.press("End");
      await expect(separator(page)).toHaveAttribute("aria-valuenow", "75");
      await page.keyboard.press("ArrowRight");
      await expect(separator(page)).toHaveAttribute("aria-valuenow", "75");
      expect(
        (await exercisesPanel(page).boundingBox())!.width,
        "the exercises keep their width",
      ).toBeGreaterThanOrEqual(350);

      await page.keyboard.press("Home");
      await expect(separator(page)).toHaveAttribute("aria-valuenow", "30");
      await page.keyboard.press("ArrowRight");
      await expect(separator(page)).toHaveAttribute("aria-valuenow", "35");

      await expect.poll(() => storedSetting(page, "studySplit")).toBe(0.35);
      await page.reload();
      await expect(separator(page)).toHaveAttribute("aria-valuenow", "35");
    },
  );

  test(
    "@req DOC-006 on a row too narrow for 75 % the separator says and keeps what the layout has, and the exercises keep 22 rem",
    { tag: "@demo" },
    async ({ page }) => {
      await page.setViewportSize({ width: 1100, height: 800 });
      await openUnit(page, "1");
      const most = Number(await separator(page).getAttribute("aria-valuemax"));
      expect(most, "less than 75").toBeLessThan(75);
      expect(most, "more than 30").toBeGreaterThan(30);

      await separator(page).focus();
      await page.keyboard.press("End");

      await expect(separator(page)).toHaveAttribute("aria-valuenow", String(most));
      await expect.poll(() => storedSetting(page, "studySplit")).toBeLessThan((most + 1) / 100);
      const row = (await separator(page).evaluate(
        (element) => element.parentElement!.getBoundingClientRect().width,
      ))!;
      const pages = (await pagesPanel(page).boundingBox())!.width;
      expect(Math.abs((pages / row) * 100 - most), "the layout is what is said").toBeLessThan(1.5);
      expect((await exercisesPanel(page).boundingBox())!.width).toBeGreaterThanOrEqual(350);

      // One press back is seen at once, not after a few that lower a value nobody sees.
      await page.keyboard.press("ArrowLeft");
      const back = Number(await separator(page).getAttribute("aria-valuenow"));
      expect(back).toBeLessThan(most);
      await expect
        .poll(async () => (await pagesPanel(page).boundingBox())!.width)
        .toBeLessThan(pages - 20);
    },
  );

  test(
    "@req DOC-006 the separator is dragged with the pointer",
    { tag: "@demo" },
    async ({ page }) => {
      await openUnit(page, "1");
      await expect(drawnPages(page).first()).toBeVisible();
      const before = (await separator(page).boundingBox())!;
      const y = before.y + before.height / 2;
      const x = before.x + before.width / 2;

      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x - 150, y, { steps: 6 });
      await page.mouse.up();

      const after = (await separator(page).boundingBox())!;
      expect(before.x - after.x).toBeGreaterThan(140);
      expect(Number(await separator(page).getAttribute("aria-valuenow"))).toBeLessThan(50);
      await expect
        .poll(async () => Number(await storedSetting(page, "studySplit")))
        .toBeLessThan(0.5);
      // The pages are drawn again at their new width.
      await expect
        .poll(async () => {
          const panel = (await pagesPanel(page).boundingBox())!.width;
          const canvas = await drawnPages(page)
            .first()
            .evaluate((element) => (element as HTMLCanvasElement).width);
          return Math.abs(canvas - panel);
        })
        .toBeLessThan(4);
    },
  );

  test(
    "@req DOC-006 «Скрыть страницы» collapses the pages to a strip with «Показать страницы», which has the focus; the state is kept, and restoring returns the focus",
    { tag: "@demo" },
    async ({ page }) => {
      await openUnit(page, "1");
      await pagesPanel(page).getByRole("button", { name: "Скрыть страницы" }).focus();
      await page.keyboard.press("Enter");

      const show = page.getByRole("button", { name: "Показать страницы" });
      await expect(show).toBeFocused();
      await expect(pagesPanel(page)).toBeHidden();
      await expect(separator(page)).toBeHidden();
      expect((await show.boundingBox())!.width).toBeCloseTo(44, -1);
      expect((await exercisesPanel(page).boundingBox())!.width).toBeGreaterThan(800);
      await expect.poll(() => storedSetting(page, "collapsedPanel")).toBe("pages");

      await page.reload();
      await expect(show).toBeVisible();
      await expect(pagesPanel(page)).toBeHidden();

      await show.focus();
      await page.keyboard.press("Enter");
      await expect(pagesPanel(page).getByRole("button", { name: "Скрыть страницы" })).toBeFocused();
      await expect(separator(page)).toBeVisible();
      await expect(drawnPages(page).first()).toBeVisible();
      await expect.poll(() => storedSetting(page, "collapsedPanel")).toBeUndefined();
    },
  );

  test(
    "@req DOC-006 «Скрыть упражнения» collapses the exercises, with what was typed kept, and restoring returns the focus",
    { tag: "@demo" },
    async ({ page }) => {
      await openUnit(page, "1");
      await fieldOf(exerciseOf(page, "1.1"), "1").fill("is");
      await page.getByRole("button", { name: "Скрыть упражнения" }).focus();
      await page.keyboard.press("Enter");

      const show = page.getByRole("button", { name: "Показать упражнения" });
      await expect(show).toBeFocused();
      await expect(exercisesPanel(page)).toBeHidden();
      await expect.poll(() => storedSetting(page, "collapsedPanel")).toBe("exercises");

      await page.keyboard.press("Enter");
      await expect(page.getByRole("button", { name: "Скрыть упражнения" })).toBeFocused();
      await expect(fieldOf(exerciseOf(page, "1.1"), "1")).toHaveValue("is");
    },
  );

  test(
    "@req DOC-006 only one panel is collapsed: hiding the exercises restores the pages, and the number of an exercise restores a collapsed pages panel",
    { tag: "@demo" },
    async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await openUnit(page, "1");
      await pagesPanel(page).getByRole("button", { name: "Скрыть страницы" }).click();
      await expect(pagesPanel(page)).toBeHidden();

      await page.getByRole("button", { name: "Скрыть упражнения" }).click();
      await expect(pagesPanel(page)).toBeVisible();
      await expect(exercisesPanel(page)).toBeHidden();

      await page.getByRole("button", { name: "Показать упражнения" }).click();
      await pagesPanel(page).getByRole("button", { name: "Скрыть страницы" }).click();
      await page.getByRole("button", { name: "Упражнение 1.3", exact: true }).click();

      await expect(pagesPanel(page)).toBeVisible();
      await expect(separator(page)).toBeVisible();
    },
  );

  test(
    "@req DOC-006 below 1024 px there is no separator and no way to hide a panel, whatever was kept",
    { tag: "@demo" },
    async ({ page }) => {
      await openUnit(page, "1");
      await pagesPanel(page).getByRole("button", { name: "Скрыть страницы" }).click();
      await expect.poll(() => storedSetting(page, "collapsedPanel")).toBe("pages");

      await page.setViewportSize({ width: 800, height: 800 });

      await expect(pagesPanel(page)).toBeVisible();
      await expect(exercisesPanel(page)).toBeVisible();
      await expect(separator(page)).toHaveCount(0);
      await expect(page.getByRole("button", { name: /^(Скрыть|Показать) /u })).toHaveCount(0);
    },
  );
});
