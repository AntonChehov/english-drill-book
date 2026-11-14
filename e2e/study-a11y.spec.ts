import { AxeBuilder } from "@axe-core/playwright";
import { expect, studyStates, test } from "./study";
import { themes } from "./views";

/** WCAG 2.1 AA; serious and critical violations fail (constitution C-07), as in e2e/a11y.spec.ts. */
const failingImpacts = new Set(["serious", "critical"]);

for (const state of studyStates) {
  for (const theme of themes) {
    test(`${state.name} in the ${theme} theme has no serious accessibility violations`, async ({
      page,
      allowConsoleError,
    }) => {
      await page.emulateMedia({ colorScheme: theme });
      await state.reach(page, allowConsoleError);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const violations = results.violations
        .filter((violation) => failingImpacts.has(violation.impact ?? ""))
        .map((violation) => ({
          rule: violation.id,
          impact: violation.impact,
          targets: violation.nodes.map((node) => node.target.join(" ")),
        }));
      expect(violations).toEqual([]);
    });
  }
}
