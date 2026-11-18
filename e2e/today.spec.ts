import type { Page } from "@playwright/test";
import { addedHeading, startButton } from "./demo";
import { test as clean } from "./fixtures";
import {
  checkButton,
  exerciseOf,
  expect,
  fill,
  finishUnit1,
  openUnit,
  test,
  unitHeading,
} from "./study";
import { addressOf } from "./views";

/** The correct answers of exercises 1.1 and 1.2 of the demo drill book. */
const drills = {
  "1.1": {
    "1": "Are you ready",
    "2": "Is the museum open",
    "3": "Are your parents at home",
    "4": "Is Nell your sister",
    "5": "Is it far from here",
    "6": "Are we late",
  },
  "1.2": {
    "1": "Yes, I am",
    "2": "No, he isn't",
    "3": "Yes, it is",
    "4": "No, they aren't",
    "5": "No, you aren't",
    "6": "Yes, it is",
  },
} as const;

const goalCard = (page: Page) => page.getByRole("region", { name: "Цель" });
const todayCard = (page: Page) => page.getByRole("region", { name: "Сегодня" });

/** Passes topic 1: unit 1 of the course and drills 1.1 and 1.2. */
async function passTopic1(page: Page) {
  await openUnit(page, "1");
  await finishUnit1(page);
  await openUnit(page, "1", "demo-drills");
  for (const id of ["1.1", "1.2"] as const) {
    const exercise = exerciseOf(page, id);
    await fill(exercise, drills[id]);
    await checkButton(exercise).click();
    await expect(exercise).toContainText("Сделано");
  }
  await page.getByRole("link", { name: "Сегодня" }).click();
}

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
      await passTopic1(page);
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
      await expect(page).toHaveURL((url) => url.hash === "#/study/demo-course/1");
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
      await openUnit(page, "1");
      await finishUnit1(page, false);
      await page.getByRole("link", { name: "Сегодня" }).click();
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

test.describe("PROG-005 Today's topic", () => {
  test(
    "@req PROG-005 every topic passed: Today says the program is complete",
    { tag: "@demo" },
    async ({ page }) => {
      // Doing all 24 exercises through Study would take long: the log gets a mark as done for
      // each, as Study writes it, and the store derives their states from it on the next read.
      await page.goto(addressOf("/"));
      await expect(goalCard(page)).toBeVisible();
      await page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const open = indexedDB.open("english-drill-book");
          open.addEventListener("success", () => resolve(open.result));
          open.addEventListener("error", () => reject(open.error));
        });
        const tx = db.transaction("attempts", "readwrite");
        for (const pack of ["demo-course", "demo-drills"]) {
          for (const unit of [1, 2, 3, 4]) {
            for (const n of [1, 2, 3]) {
              tx.objectStore("attempts").add({
                id: crypto.randomUUID(),
                at: new Date(Date.UTC(2026, 10, 18)).toISOString(),
                pack,
                packVersion: "1.1.0",
                exercise: `${unit}.${n}`,
                action: "mark-done",
                answers: {},
                results: {},
                complete: true,
              });
            }
          }
        }
        await new Promise((resolve, reject) => {
          tx.addEventListener("complete", resolve);
          tx.addEventListener("error", () => reject(tx.error));
        });
        db.close();
      });
      await page.reload();
      await expect(todayCard(page)).toContainText("Программа пройдена: все темы зачтены.");
      await expect(todayCard(page).getByRole("heading", { level: 3 })).toHaveCount(0);
      await expect(goalCard(page)).toContainText("Ваш уровень: A2");
    },
  );
});

test.describe("PROG-013 One active program", () => {
  test(
    "@req PROG-013 with the demo books the program is shown above the book cards, also after a reload",
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
