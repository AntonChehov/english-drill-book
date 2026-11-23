import type { Locator, Page } from "@playwright/test";
import { addedHeading, startButton } from "./demo";
import { test as clean } from "./fixtures";
import {
  completeInStore,
  expect,
  failNextPut,
  goalCard,
  refusePuts,
  test,
  todayCard,
  topic1Passed,
  unitHeading,
} from "./study";
import { addressOf } from "./views";

test.describe("PROG-006 What Today shows", () => {
  test(
    "@req PROG-006 @req PROG-005 a fresh start shows the goal, the level below A1 and topic 1",
    { tag: "@demo" },
    async ({ page }) => {
      await page.goto(addressOf("/"));
      const goal = goalCard(page);
      await expect(goal).toContainText("Ваш уровень: ниже A1");
      await expect(goal).toContainText("A1 → A2");
      await expect(goal.getByText("пройдено 0 из 2 тем")).toHaveCount(2);
      const today = todayCard(page);
      await expect(today.getByRole("heading", { level: 3 })).toHaveText(
        "Глагол to be: am, is, are A1",
      );
      await expect(today).toContainText("не начата");
      await expect(today).toContainText("сделано 0 из 3");
      await expect(today).toContainText("сделано 0 из 2 нужных");
      await expect(today).toContainText("Для зачёта темы достаточно 2 из 3.");
    },
  );

  test(
    "@req PROG-006 @req PROG-005 a passed topic moves Today to topic 2 and the level to почти A1",
    { tag: "@demo" },
    async ({ page }) => {
      await page.goto(addressOf("/"));
      await completeInStore(page, topic1Passed);
      const goal = goalCard(page);
      await expect(goal).toContainText("Ваш уровень: почти A1");
      await expect(goal.getByRole("listitem").first()).toContainText("пройдено 1 из 2 тем");
      await expect(todayCard(page).getByRole("heading", { level: 3 })).toHaveText(
        "Present simple A1",
      );
    },
  );

  test(
    "@req PROG-006 the steps lead to Study in the same window",
    { tag: "@demo" },
    async ({ page }) => {
      await page.goto(addressOf("/"));
      const today = todayCard(page);
      await today.getByRole("link", { name: "Открыть раздел" }).click();
      await expect(page).toHaveURL((url) => url.hash === "#/study/demo-course/1?ex=1.1");
      await expect(unitHeading(page)).toHaveText(/Раздел 1\./);

      await page.getByRole("link", { name: "Сегодня" }).click();
      await today.getByRole("link", { name: "Упражнение 1.2, не сделано" }).click();
      await expect(page).toHaveURL((url) => url.hash === "#/study/demo-course/1?ex=1.2");

      await page.getByRole("link", { name: "Сегодня" }).click();
      await today.getByRole("link", { name: "Упр. 1.2, не сделано" }).click();
      await expect(page).toHaveURL((url) => url.hash === "#/study/demo-drills/1?ex=1.2");
      await expect(page.getByText("Everyday Grammar: Demo Drills")).toBeVisible();
    },
  );

  test(
    "@req PROG-006 done is told by a sign and the name, shares by text, and links are reached by Tab",
    { tag: "@demo" },
    async ({ page }) => {
      await page.goto(addressOf("/"));
      await completeInStore(page, ["demo-course/1.1", "demo-course/1.2"]);
      const today = todayCard(page);
      const done = today.getByRole("link", { name: "Упражнение 1.1, сделано" });
      await expect(done).toContainText("✓");
      await expect(
        today.getByRole("link", { name: "Упражнение 1.3, не сделано" }),
      ).not.toContainText("✓");
      await expect(today).toContainText("в процессе");

      await today.getByRole("link", { name: "Открыть раздел" }).focus();
      await page.keyboard.press("Tab");
      await expect(done).toBeFocused();
    },
  );
});

test.describe("PROG-006 Where the topic goes on", () => {
  test(
    "@req PROG-006 the main action opens the first exercise not done, the drills once the course unit is done",
    { tag: "@demo" },
    async ({ page }) => {
      await page.goto(addressOf("/"));
      await completeInStore(page, ["demo-course/1.1"]);
      const open = todayCard(page).getByRole("link", { name: "Открыть раздел" });
      await expect(open).toHaveAttribute("href", "#/study/demo-course/1?ex=1.2");

      await completeInStore(page, ["demo-course/1.2", "demo-course/1.3", "demo-drills/1.1"]);
      await expect(open).toHaveAttribute("href", "#/study/demo-drills/1?ex=1.2");
    },
  );

  test(
    "@req PROG-006 more drills done than needed read as enough",
    { tag: "@demo" },
    async ({ page }) => {
      await page.goto(addressOf("/"));
      await completeInStore(page, ["demo-drills/1.1", "demo-drills/1.2", "demo-drills/1.3"]);
      const today = todayCard(page);
      await expect(today).toContainText("сделано 2 из 2 нужных");
      await expect(today).toContainText("сделано 0 из 3");
    },
  );
});

test.describe("PROG-005 Today's topic", () => {
  test(
    "@req PROG-005 every topic passed: Today says the program is complete",
    { tag: "@demo" },
    async ({ page }) => {
      await page.goto(addressOf("/"));
      await completeInStore(page);
      await page.reload();
      await expect(todayCard(page)).toContainText("Программа пройдена: все темы зачтены.");
      await expect(todayCard(page).getByRole("heading", { level: 3 })).toHaveCount(0);
      await expect(goalCard(page)).toContainText("Ваш уровень: A2");
    },
  );
});

test.describe("PROG-013 One active program", () => {
  test(
    "@req PROG-013 @req PROG-014 with the demo books the program is shown above the book cards, also after a reload",
    { tag: "@demo" },
    async ({ page }) => {
      await page.goto(addressOf("/"));
      await expect(goalCard(page)).toBeVisible();
      await page.reload();
      await expect(goalCard(page)).toBeVisible();
      await expect(todayCard(page)).toBeVisible();
      const program = await todayCard(page).boundingBox();
      const books = await addedHeading(page).boundingBox();
      expect(program!.y).toBeLessThan(books!.y);
    },
  );
});

clean.describe("PROG-013 No books, no program", () => {
  clean(
    "@req PROG-013 a clean browser shows only the demo offer",
    { tag: "@demo" },
    async ({ page }) => {
      await page.goto(addressOf("/"));
      await expect(startButton(page)).toBeVisible();
      await expect(goalCard(page)).toHaveCount(0);
      await expect(todayCard(page)).toHaveCount(0);
    },
  );
});

const checklist = (page: Page) => page.getByRole("region", { name: "Другие дела дня" });

test.describe("PROG-009 The daily checklist", () => {
  test("@req PROG-009 @req PROG-006 a tick is kept for the day and the next day starts empty", async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date("2026-11-23T10:00:00"));
    await page.goto(addressOf("/"));
    const blocks = checklist(page).getByRole("checkbox");
    await expect(blocks).toHaveCount(3);
    await expect(checklist(page).getByRole("checkbox", { checked: true })).toHaveCount(0);

    const read = checklist(page).getByRole("checkbox", {
      name: "Прочитать страницу текста на английском",
    });
    await read.click();
    await expect(read).toBeChecked();
    await page.reload();
    await expect(read).toBeChecked();
    await expect(checklist(page).getByRole("checkbox", { checked: true })).toHaveCount(1);

    await page.clock.setFixedTime(new Date("2026-11-24T10:00:00"));
    await page.reload();
    await expect(blocks).toHaveCount(3);
    await expect(read).not.toBeChecked();
  });

  test("@req PROG-009 two ticks in quick succession are both kept", async ({ page }) => {
    await page.goto(addressOf("/"));
    const boxes = checklist(page).getByRole("checkbox");
    await expect(boxes).toHaveCount(3);
    // Both changes in one task, so that the second is made before the first is written.
    await boxes.first().evaluate((first) => {
      const all = first.closest("ul")!.querySelectorAll("input");
      all[0]!.click();
      all[2]!.click();
    });
    await expect(boxes.nth(0)).toBeChecked();
    await expect(boxes.nth(2)).toBeChecked();
    await page.reload();
    await expect(boxes.nth(0)).toBeChecked();
    await expect(boxes.nth(1)).not.toBeChecked();
    await expect(boxes.nth(2)).toBeChecked();
  });

  test("@req PROG-009 a tick the browser refuses is not shown, said beside the list, and can be repeated", async ({
    page,
  }) => {
    await refusePuts(page);
    await page.goto(addressOf("/"));
    const listen = checklist(page).getByRole("checkbox", { name: /Послушать/ });
    await expect(listen).toBeVisible();
    await failNextPut(page, "days");
    await listen.click();
    await expect(checklist(page).getByRole("alert")).toContainText("не удалось сохранить");
    await expect(listen).not.toBeChecked();

    await listen.click();
    await expect(listen).toBeChecked();
    await expect(checklist(page).getByRole("alert")).toHaveCount(0);
  });

  test("@req PROG-006 the checklist stays when the program is complete", async ({ page }) => {
    await page.goto(addressOf("/"));
    await completeInStore(page);
    await expect(todayCard(page)).toContainText("Программа пройдена");
    await expect(checklist(page).getByRole("checkbox")).toHaveCount(3);
  });
});

const background = (locator: Locator) =>
  locator.evaluate((element) => getComputedStyle(element).backgroundColor);

test.describe("PROG-018 Today answers the pointer", () => {
  test("@req PROG-018 a rung and a step are highlighted under the pointer, with no tooltip", async ({
    page,
  }) => {
    await page.goto(addressOf("/"));
    const rungs = goalCard(page).getByRole("listitem");
    const steps = todayCard(page).locator(".step");
    await expect(rungs).toHaveCount(2);
    const plain = await background(rungs.nth(1));

    await rungs.nth(0).hover();
    await expect.poll(() => background(rungs.nth(0))).not.toBe(plain);
    expect(await background(rungs.nth(1))).toBe(plain);

    await steps.nth(1).hover();
    await expect.poll(() => background(steps.nth(1))).not.toBe(await background(steps.nth(0)));
    await expect.poll(() => background(rungs.nth(0))).toBe(plain);

    await expect(page.getByRole("tooltip")).toHaveCount(0);
    for (const card of [goalCard(page), todayCard(page)]) {
      await expect(card.locator("[title]")).toHaveCount(0);
    }
  });
});
