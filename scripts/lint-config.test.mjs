import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// An override of oxlint replaces the options of a rule; it does not add to them. The override of
// src/domain/checking therefore repeats the restrictions of src/domain, and this test keeps the
// two in step: a restriction added to src/domain only would not apply to the checker.
const config = JSON.parse(readFileSync(new URL("../.oxlintrc.json", import.meta.url), "utf8"));

function rulesOf(files) {
  const override = config.overrides.find(
    (candidate) => JSON.stringify(candidate.files) === JSON.stringify([files]),
  );
  if (!override) throw new Error(`no override for ${files}`);
  return override.rules;
}

function restrictions(rules, rule) {
  return (rules[rule] ?? []).slice(1).map(({ name, object, property }) => ({
    name,
    object,
    property,
  }));
}

describe("the lint override of src/domain/checking", () => {
  const domain = rulesOf("src/domain/**");
  const checking = rulesOf("src/domain/checking/**");

  // Every rule both overrides set: the checker's must be at least as strict.
  const shared = Object.keys(checking).filter((rule) => rule in domain);

  it("sets the rules of the locale and the clock", () => {
    expect(shared).toEqual(
      expect.arrayContaining(["no-restricted-globals", "no-restricted-properties"]),
    );
  });

  for (const rule of shared) {
    it(`keeps ${rule} an error with every restriction of src/domain`, () => {
      expect([checking[rule]].flat()[0]).toBe("error");
      const kept = restrictions(checking, rule);
      for (const restriction of restrictions(domain, rule))
        expect(kept).toContainEqual(restriction);
    });
  }

  it("@req CHK-013 adds the locale rules of the checker", () => {
    expect(restrictions(checking, "no-restricted-globals")).toContainEqual({
      name: "Intl",
      object: undefined,
      property: undefined,
    });
    const properties = restrictions(checking, "no-restricted-properties").map(
      ({ property }) => property,
    );
    expect(properties).toEqual(
      expect.arrayContaining(["toLocaleLowerCase", "toLocaleUpperCase", "localeCompare"]),
    );
  });

  it("does not replace the import restrictions of src/domain", () => {
    expect(checking["no-restricted-imports"]).toBeUndefined();
    expect(domain["no-restricted-imports"]).toBeDefined();
  });
});
