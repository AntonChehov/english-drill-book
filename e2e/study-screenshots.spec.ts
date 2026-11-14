import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { pagesPanel, studyStates, test } from "./study";
import { themes } from "./views";

/**
 * One PNG per state of Study, theme and width, named as in e2e/screenshots.spec.ts. The pages are
 * masked: a canvas drawn by the PDF library differs between machines (design of `study-screen`,
 * Risks).
 */
const directory = process.env["SCREENSHOTS_DIR"] ?? "screenshots";
const widths = [1280, 390] as const;

test.beforeAll(() => mkdirSync(directory, { recursive: true }));

for (const state of studyStates) {
  for (const theme of themes) {
    for (const width of widths) {
      test(`screenshot ${state.name} ${theme} ${width}`, async ({ page, allowConsoleError }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
        await state.reach(page, allowConsoleError);
        await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

        await page.screenshot({
          path: join(directory, `${state.name}-${theme}-${width}.png`),
          fullPage: true,
          animations: "disabled",
          caret: "hide",
          mask: [pagesPanel(page).getByRole("listitem")],
        });
      });
    }
  }
}
