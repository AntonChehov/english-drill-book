import type { Page } from "@playwright/test";
import {
  completeInStore,
  exerciseOf,
  expect,
  openUnit,
  pagesPanel,
  test,
  todayCard,
  unitHeading,
} from "./study";
import { addressOf } from "./views";

const steps = (page: Page) => page.getByRole("navigation", { name: "Шаги темы" });
const course = "1. Курс: правило и упражнения";
const drills = "2. Сборник упражнений: практика";
const pageOf = (page: Page, number: number) =>
  pagesPanel(page).getByRole("img", { name: `Страница ${number}`, exact: true });
const source = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

test.describe("PLAY-017 Two steps of a topic", () => {
  test("@req PLAY-017 the steps of a course unit, the way to the drills and back, and the topic after ›", async ({
    page,
  }) => {
    await openUnit(page, "1");
    await expect(steps(page)).toContainText("Тема: Глагол to be: am, is, are");
    await expect(steps(page).locator("[aria-current='step']")).toHaveText(`${course} сейчас`);
    await steps(page).getByRole("link", { name: drills }).focus();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL((url) => url.hash === "#/study/demo-drills/1?ex=1.1");
    await expect(unitHeading(page)).toHaveText(/Раздел 1\./);
    await expect(steps(page).locator("[aria-current='step']")).toHaveText(`${drills} сейчас`);
    await steps(page).getByRole("link", { name: course }).click();
    await expect(page).toHaveURL((url) => url.hash === "#/study/demo-course/1");

    await page.getByRole("button", { name: "Следующий раздел" }).click();
    await expect(steps(page)).toContainText("Тема: Present simple");
  });

  test("@req PLAY-017 the next step is offered once the last exercise of the course unit is done", async ({
    page,
  }) => {
    await page.goto(addressOf("/"));
    await completeInStore(page, ["demo-course/1.1", "demo-course/1.2"]);
    await openUnit(page, "1");
    const offer = page.getByRole("status").filter({ has: page.getByRole("link") });
    await expect(page.getByText("Курс по этой теме пройден")).toHaveCount(0);
    await expect(steps(page).getByRole("link", { name: drills })).toBeVisible();

    await exerciseOf(page, "1.3").getByRole("button", { name: "Выполнить упражнение" }).click();
    await expect(offer).toContainText(
      "Курс по этой теме пройден. Дальше — практика в сборнике упражнений.",
    );
    await offer.getByRole("link", { name: "Перейти к практике" }).click();
    await expect(page).toHaveURL((url) => url.hash === "#/study/demo-drills/1?ex=1.1");
  });
});

test.describe("PLAY-018 The course's pages beside the drills", () => {
  test("@req PLAY-018 the switch shows the course's pages and the drill book's again, by keyboard, by the number of an exercise, and after a reload", async ({
    page,
  }) => {
    await openUnit(page, "1", "demo-drills");
    await expect(pageOf(page, 2)).toBeVisible();
    await expect(source(page, "Сборник упражнений")).toHaveAttribute("aria-pressed", "true");
    await expect(source(page, "Курс: раздел 1")).toHaveAttribute("aria-pressed", "false");

    await source(page, "Курс: раздел 1").focus();
    await page.keyboard.press("Enter");
    await expect(pageOf(page, 3)).toBeVisible();
    await expect(pageOf(page, 4)).toBeVisible();
    await expect(pageOf(page, 2)).toHaveCount(0);
    await expect(source(page, "Курс: раздел 1")).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: "Упражнение 1.2", exact: true }).click();
    await expect(pageOf(page, 2)).toBeVisible();
    await expect(pageOf(page, 3)).toHaveCount(0);
    await expect(source(page, "Сборник упражнений")).toHaveAttribute("aria-pressed", "true");

    await source(page, "Курс: раздел 1").click();
    await source(page, "Сборник упражнений").click();
    await expect(pageOf(page, 2)).toBeVisible();

    await source(page, "Курс: раздел 1").click();
    await page.reload();
    await expect(pageOf(page, 2)).toBeVisible();
    await expect(source(page, "Сборник упражнений")).toHaveAttribute("aria-pressed", "true");

    await openUnit(page, "1");
    await expect(page.getByRole("group", { name: "Страницы" })).toHaveCount(0);
  });
});

test.describe("PROG-007 Today's topic opens Study", () => {
  test("@req PROG-007 Today opens the first unfinished step, and «Сегодня» leads back with the work counted", async ({
    page,
  }) => {
    await page.goto(addressOf("/"));
    await todayCard(page).getByRole("link", { name: "Открыть раздел" }).click();
    await expect(page).toHaveURL((url) => url.hash.startsWith("#/study/demo-course/1"));
    await expect(steps(page).locator("[aria-current='step']")).toHaveText(`${course} сейчас`);
    await page.getByRole("link", { name: "Сегодня" }).click();

    await completeInStore(page, ["demo-course/1.1", "demo-course/1.2", "demo-course/1.3"]);
    await todayCard(page).getByRole("link", { name: "Открыть раздел" }).click();
    await expect(page).toHaveURL((url) => url.hash === "#/study/demo-drills/1?ex=1.1");
    await expect(steps(page).locator("[aria-current='step']")).toHaveText(`${drills} сейчас`);

    await page.getByRole("link", { name: "Сегодня" }).click();
    await expect(todayCard(page)).toContainText("сделано 3 из 3");
  });
});
