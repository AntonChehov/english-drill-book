import { AxeBuilder } from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { demoStates } from "./demo";
import { expect, test } from "./fixtures";
import { addressOf, themes, views } from "./views";

/** WCAG 2.1 AA; serious and critical violations fail (constitution C-07). */
const failingImpacts = new Set(["serious", "critical"]);

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return results.violations
    .filter((violation) => failingImpacts.has(violation.impact ?? ""))
    .map((violation) => ({
      rule: violation.id,
      impact: violation.impact,
      targets: violation.nodes.map((node) => node.target.join(" ")),
    }));
}

for (const view of views) {
  for (const theme of themes) {
    test(`${view.name} in the ${theme} theme has no serious accessibility violations`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: theme });
      await page.goto(addressOf(view.path));
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(view.heading);

      expect(await seriousViolations(page)).toEqual([]);
    });
  }
}

// The start screen with the demo added, kept, failed and not kept, and the message about newer
// data (design D8 of `demo-books`, D4, D5, D7 of `storage`).
for (const state of demoStates) {
  for (const theme of themes) {
    test(`${state.name} in the ${theme} theme has no serious accessibility violations`, async ({
      page,
      allowConsoleError,
    }) => {
      await page.emulateMedia({ colorScheme: theme });
      await state.reach(page, allowConsoleError);

      expect(await seriousViolations(page)).toEqual([]);
    });
  }
}
