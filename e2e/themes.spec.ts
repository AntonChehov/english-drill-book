import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { failNextPut, refusePuts } from "./study";
import { addressOf, themes } from "./views";

const background = { light: "rgb(244, 245, 247)", dark: "rgb(17, 19, 24)" } as const;

for (const theme of themes) {
  test(`the ${theme} theme follows the system setting`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto(addressOf("/"));

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("body")).toHaveCSS("background-color", background[theme]);
  });
}

const group = (page: Page) => page.getByRole("radiogroup", { name: "Оформление" });

test.describe("PROD-005 The choice of a theme", () => {
  test("@req PROD-005 «Тёмная» is applied at once and kept over a reload, from the first screen", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(addressOf("/about"));
    await expect(group(page).getByRole("radio", { name: "Как в системе" })).toBeChecked();

    await group(page).getByRole("radio", { name: "Тёмная" }).check();
    await expect(page.locator("body")).toHaveCSS("background-color", background.dark);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    // The theme is on the page before the app has drawn anything.
    await page.addInitScript(() => {
      new MutationObserver((_, observer) => {
        if (document.getElementById("app")?.hasChildNodes()) {
          (window as unknown as { themeAtFirstScreen: string | null }).themeAtFirstScreen =
            document.documentElement.getAttribute("data-theme");
          observer.disconnect();
        }
      }).observe(document, { childList: true, subtree: true });
    });
    await page.reload();
    await expect(group(page).getByRole("radio", { name: "Тёмная" })).toBeChecked();
    await expect(page.locator("body")).toHaveCSS("background-color", background.dark);
    expect(
      await page.evaluate(
        () => (window as unknown as { themeAtFirstScreen: string }).themeAtFirstScreen,
      ),
    ).toBe("dark");
  });

  test("@req PROD-005 «Светлая» wins over a dark system, also after a reload", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(addressOf("/about"));
    await expect(page.locator("body")).toHaveCSS("background-color", background.dark);

    await group(page).getByRole("radio", { name: "Светлая" }).check();
    await expect(page.locator("body")).toHaveCSS("background-color", background.light);
    await page.reload();
    await expect(page.locator("body")).toHaveCSS("background-color", background.light);

    await group(page).getByRole("radio", { name: "Как в системе" }).check();
    await expect(page.locator("body")).toHaveCSS("background-color", background.dark);
  });

  test("@req PROD-005 a choice the store refuses is applied and said beside the group", async ({
    page,
  }) => {
    await refusePuts(page);
    await page.goto(addressOf("/about"));
    await expect(group(page)).toBeVisible();

    await failNextPut(page, "settings");
    await group(page).getByRole("radio", { name: "Тёмная" }).check();

    await expect(page.locator("body")).toHaveCSS("background-color", background.dark);
    await expect(page.getByRole("alert")).toContainText("Выбор не удалось сохранить");

    await group(page).getByRole("radio", { name: "Светлая" }).check();
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
});
