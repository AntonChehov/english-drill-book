import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The app never opens a browser dialog (PROD-009): `pnpm lint` fails on a call of `alert`,
// `confirm` or `prompt`, so the rule must stay an error, in every override too.
const config = JSON.parse(
  readFileSync(new URL("../../.oxlintrc.json", import.meta.url), "utf8"),
) as {
  rules: Record<string, unknown>;
  overrides: { rules?: Record<string, unknown> }[];
};

const level = (setting: unknown) => [setting].flat()[0];

describe("the lint rule on browser dialogs", () => {
  it("@req PROD-009 makes alert, confirm and prompt an error everywhere", () => {
    expect(level(config.rules["no-alert"])).toBe("error");
    for (const override of config.overrides)
      expect(level(override.rules?.["no-alert"] ?? "error")).toBe("error");
  });
});
