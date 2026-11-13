import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { demoStates } from "./demo";
import { expect, test } from "./fixtures";
import { addressOf, themes, views } from "./views";

/**
 * One PNG per view, theme and width, made from the production build (design D8), and one per
 * state of the start screen's demo section after the first (`start-demo-added`, `start-demo-failed`).
 * File names are `<view or state>-<theme>-<width>.png`; scripts/screenshots.mjs relies on them.
 */
const directory = process.env["SCREENSHOTS_DIR"] ?? "screenshots";
const widths = [1280, 390] as const;

test.beforeAll(() => mkdirSync(directory, { recursive: true }));

async function capture(page: Page, name: string) {
  await page.screenshot({
    path: join(directory, `${name}.png`),
    fullPage: true,
    animations: "disabled",
    caret: "hide",
  });
}

for (const view of views) {
  for (const theme of themes) {
    for (const width of widths) {
      test(`screenshot ${view.name} ${theme} ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
        await page.goto(addressOf(view.path));
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(view.heading);

        await capture(page, `${view.name}-${theme}-${width}`);
      });
    }
  }
}

// The start screen with the demo added and with adding it failed (design D8).
for (const state of demoStates) {
  for (const theme of themes) {
    for (const width of widths) {
      test(`screenshot ${state.name} ${theme} ${width}`, async ({ page, allowConsoleError }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
        await state.reach(page, allowConsoleError);
        // The focus ring of the heading or the retry button is part of the state, but blur it so
        // that two runs give the same pixels whichever element the browser drew it on.
        await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

        await capture(page, `${state.name}-${theme}-${width}`);
      });
    }
  }
}
