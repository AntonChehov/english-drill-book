import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "./fixtures";
import { addressOf, themes, views } from "./views";

/**
 * One PNG per view, theme and width, made from the production build (design D8).
 * File names are `<view>-<theme>-<width>.png`; scripts/screenshots.mjs relies on them.
 */
const directory = process.env["SCREENSHOTS_DIR"] ?? "screenshots";
const widths = [1280, 390] as const;

test.beforeAll(() => mkdirSync(directory, { recursive: true }));

for (const view of views) {
  for (const theme of themes) {
    for (const width of widths) {
      test(`screenshot ${view.name} ${theme} ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
        await page.goto(addressOf(view.path));
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(view.heading);

        await page.screenshot({
          path: join(directory, `${view.name}-${theme}-${width}.png`),
          fullPage: true,
          animations: "disabled",
          caret: "hide",
        });
      });
    }
  }
}
