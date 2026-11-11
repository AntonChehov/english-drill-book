import { expect, test } from "./fixtures";
import { addressOf, themes } from "./views";

const background = { light: "rgb(255, 255, 255)", dark: "rgb(17, 19, 24)" } as const;

for (const theme of themes) {
  test(`the ${theme} theme follows the system setting`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto(addressOf("/"));

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("body")).toHaveCSS("background-color", background[theme]);
  });
}
