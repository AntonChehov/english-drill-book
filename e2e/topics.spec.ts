import type { Page } from "@playwright/test";
import { test as clean } from "./fixtures";
import { completeInStore, expect, failNextPut, refusePuts, test, todayCard } from "./study";
import { addressOf } from "./views";

const group = (page: Page, level: string) => page.getByRole("region", { name: level });
const topicButton = (page: Page, title: string | RegExp) =>
  page.getByRole("button", { name: title });
const todayTitle = (page: Page) => todayCard(page).getByRole("heading", { level: 3 });

/** Seeds the course unit and two drills of topic 3, which pass it. */
const topic3Passed = [
  "demo-course/3.1",
  "demo-course/3.2",
  "demo-course/3.3",
  "demo-drills/3.1",
  "demo-drills/3.2",
];

test.describe("PROG-008 Topics", () => {
  test("@req PROG-008 @req PROG-005 topics by level with states and counts; choosing one by keyboard makes it today's topic", async ({
    page,
  }) => {
    await page.goto(addressOf("/"));
    await completeInStore(page, ["demo-course/1.1"]);
    await todayCard(page).getByRole("link", { name: "другая тема" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Темы");

    const a1 = group(page, "A1").getByRole("listitem");
    const a2 = group(page, "A2").getByRole("listitem");
    await expect(a1).toHaveCount(2);
    await expect(a2).toHaveCount(2);
    await expect(a1.nth(0)).toContainText("Глагол to be: am, is, are");
    await expect(a1.nth(0)).toContainText("в процессе");
    await expect(a1.nth(0)).toContainText("курс 1 из 3 · практика 0 из 2");
    await expect(a1.nth(0)).toContainText("тема дня");
    await expect(a1.nth(1)).toContainText("Present simple");
    await expect(a1.nth(1)).toContainText("не начата");
    await expect(a2.nth(0)).toContainText("Артикли a и an");
    await expect(a2.nth(1)).toContainText("There is и there are");

    await topicButton(page, /Артикли a и an/).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL((url) => url.hash === "#/");
    await expect(todayTitle(page)).toHaveText("Артикли a и an A2");
    await page.reload();
    await expect(todayTitle(page)).toHaveText("Артикли a и an A2");
  });

  test("@req PROG-008 @req PROG-005 a passed topic cannot be chosen, and a focus passed since gives way", async ({
    page,
  }) => {
    await page.goto(addressOf("/topics"));
    await topicButton(page, /Артикли a и an/).click();
    await expect(todayTitle(page)).toHaveText("Артикли a и an A2");

    await completeInStore(page, topic3Passed);
    await expect(todayTitle(page)).toHaveText("Глагол to be: am, is, are A1");

    await page.getByRole("link", { name: "Темы", exact: true }).click();
    const passed = group(page, "A2").getByRole("listitem").nth(0);
    await expect(passed).toContainText("✓ пройдена");
    await expect(passed.getByRole("button")).toHaveCount(0);
    await expect(topicButton(page, /There is и there are/)).toBeVisible();
  });

  test("@req PROG-008 a choice the browser refuses is said beside the topic and can be repeated", async ({
    page,
  }) => {
    await refusePuts(page);
    await page.goto(addressOf("/topics"));
    const present = topicButton(page, /Present simple/);
    await expect(present).toBeVisible();
    await failNextPut(page, "settings");
    await present.click();
    await expect(group(page, "A1").getByRole("alert")).toContainText("не удалось сохранить");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Темы");

    await present.click();
    await expect(todayTitle(page)).toHaveText("Present simple A1");
  });
});

clean.describe("PROG-008 Topics before the demo", () => {
  clean("@req PROG-008 a clean browser is told to add the demo on Today", async ({ page }) => {
    await page.goto(addressOf("/topics"));
    await expect(page.getByText("Темы появятся, когда вы добавите демо-книги")).toBeVisible();
    await page.getByRole("link", { name: "«Сегодня»" }).click();
    await expect(page.getByRole("button", { name: "Попробовать демо" })).toBeVisible();
  });
});
