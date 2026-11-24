import type { Locator, Page } from "@playwright/test";
import { demoTitles } from "./demo";
import { expect, openUnit, pagesPanel, test, unitHeading } from "./study";
import { addressOf, plainViews } from "./views";

/** The language of the nearest element that names one, which is the language the text is in. */
const languageOf = (text: Locator) =>
  text.first().evaluate((element) => element.closest("[lang]")?.getAttribute("lang") ?? null);

const interfacePages = plainViews.filter((view) => view.name !== "not-found");

async function expectRussianInterface(page: Page, path: string) {
  await page.goto(addressOf(path));
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
}

test.describe("PROD-004 Languages", () => {
  test("@req PROD-004 every view is in Russian, with the English of the books marked", async ({
    page,
  }) => {
    for (const view of interfacePages) await expectRussianInterface(page, view.path);

    await openUnit(page, "1");
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");

    // The book's own English is marked, wherever the app shows it.
    const [course] = demoTitles;
    expect(await languageOf(page.locator(".book", { hasText: course }))).toBe("en");
    expect(await languageOf(page.getByText("Complete the sentences with am, is or are."))).toBe(
      "en",
    );
    expect(await languageOf(page.getByText("My name ___ Marta."))).toBe("en");
    expect(await languageOf(page.locator(".theory-body em", { hasText: "am" }))).toBe("en");

    // The interface text around it stays Russian: the heading and the name of a page.
    expect(await languageOf(unitHeading(page))).toBe("ru");
    const canvas = pagesPanel(page).locator("canvas").first();
    await expect(canvas).toHaveAttribute("aria-label", /^Страница \d+$/);
    expect(await languageOf(canvas)).toBe("ru");

    await page.goto(addressOf("/"));
    for (const title of demoTitles) {
      const card = page.getByRole("heading", { level: 3, name: title });
      await expect(card.locator('[lang="en"]')).toHaveText(title);
    }
    expect(await languageOf(page.getByRole("heading", { level: 2 }).first())).toBe("ru");
  });
});
