import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyTheme, storedTheme, theme } from "./theme";

const page = () => {
  const attributes = new Map<string, string>();
  return {
    attributes,
    setAttribute: (name: string, value: string) => void attributes.set(name, value),
    removeAttribute: (name: string) => void attributes.delete(name),
  };
};

describe("applyTheme", () => {
  it("@req PROD-005 puts a chosen theme on the page and takes it off for «Как в системе»", () => {
    const root = page();
    applyTheme("dark", root);
    expect(root.attributes.get("data-theme")).toBe("dark");
    expect(theme.value).toBe("dark");

    applyTheme("light", root);
    expect(root.attributes.get("data-theme")).toBe("light");

    applyTheme("system", root);
    expect(root.attributes.has("data-theme")).toBe(false);
    expect(theme.value).toBe("system");
  });
});

describe("storedTheme", () => {
  it("@req PROD-005 is the stored theme", async () => {
    expect(await storedTheme(async () => "dark")).toBe("dark");
  });

  it("@req PROD-005 is the system's when nothing is stored, the read fails or it is slow", async () => {
    expect(await storedTheme(async () => undefined)).toBe("system");
    expect(await storedTheme(() => Promise.reject(new Error("closed")))).toBe("system");
    expect(await storedTheme(() => new Promise(() => undefined), 10)).toBe("system");
  });
});

describe("base.css", () => {
  const css = readFileSync(new URL("./styles/base.css", import.meta.url), "utf8");
  const colours = (selector: string) => {
    const start = css.indexOf(`${selector} {`);
    return css.slice(start, css.indexOf("}", start)).match(/--[\w-]+: [^;]+;/g);
  };

  it("@req PROD-005 has the same dark colours for the chosen theme and for the system's", () => {
    const chosen = colours(':root[data-theme="dark"]');
    expect(chosen?.length).toBeGreaterThan(10);
    expect(colours(':root:not([data-theme="light"])')).toEqual(chosen);
  });
});
