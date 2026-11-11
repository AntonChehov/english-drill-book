import { describe, expect, it } from "vitest";
import { documentTitle } from "./document-title";

describe("documentTitle", () => {
  it("puts the view title before the app name", () => {
    expect(documentTitle("App", "О приложении")).toBe("О приложении — App");
  });

  it("is the app name alone without a view title", () => {
    expect(documentTitle("App")).toBe("App");
  });

  it("ignores a blank view title", () => {
    expect(documentTitle("App", "  ")).toBe("App");
  });

  it("trims the view title", () => {
    expect(documentTitle("App", " Темы ")).toBe("Темы — App");
  });
});
