import type { Page } from "@playwright/test";
import { addedHeading, databaseName, startButton } from "./demo";
import { test as clean } from "./fixtures";
import { expect, test, unitHeading } from "./study";
import { addressOf } from "./views";

const goalCard = (page: Page) => page.getByRole("region", { name: "Цель" });
const todayCard = (page: Page) => page.getByRole("region", { name: "Сегодня" });

/**
 * Makes exercises done without going through Study, which is slow on WebKit (C-19): for each
 * exercise of the stored packs named in `only` (`pack/exercise`), or for every one, the log gets
 * the attempt Study writes when it is done (a check with every item right, or for an exercise
 * shown as open a mark as done). The store derives their states from it once the page reloads.
 */
async function completeInStore(page: Page, only?: readonly string[]) {
  await expect(goalCard(page)).toBeVisible();
  await page.evaluate(
    async ({ name, chosen }) => {
      interface StoredPack {
        id: string;
        version: string;
        units: {
          exercises: { id: string; type: string; items?: { id: string; accept: string[] }[] }[];
        }[];
      }
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open(name);
        open.addEventListener("success", () => resolve(open.result));
        open.addEventListener("error", () => reject(open.error));
      });
      const tx = db.transaction(["packs", "attempts"], "readwrite");
      const read = tx.objectStore("packs").getAll();
      read.addEventListener("success", () => {
        for (const pack of read.result as StoredPack[]) {
          for (const exercise of pack.units.flatMap((unit) => unit.exercises)) {
            if (chosen !== undefined && !chosen.includes(`${pack.id}/${exercise.id}`)) continue;
            const items = exercise.type === "items" ? (exercise.items ?? []) : undefined;
            tx.objectStore("attempts").add({
              id: crypto.randomUUID(),
              at: "2026-11-18T09:00:00.000Z",
              pack: pack.id,
              packVersion: pack.version,
              exercise: exercise.id,
              action: items ? "check" : "mark-done",
              answers: items
                ? Object.fromEntries(items.map((item) => [item.id, item.accept[0]]))
                : { text: "" },
              results: items ? Object.fromEntries(items.map((item) => [item.id, "ok"])) : {},
              complete: true,
            });
          }
        }
      });
      await new Promise((resolve, reject) => {
        tx.addEventListener("complete", resolve);
        tx.addEventListener("error", () => reject(tx.error));
      });
      db.close();
    },
    { name: databaseName, chosen: only },
  );
  await page.reload();
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
      await page.goto(addressOf("/"));
      await completeInStore(page, [
        "demo-course/1.1",
        "demo-course/1.2",
        "demo-course/1.3",
        "demo-drills/1.1",
        "demo-drills/1.2",
      ]);
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
