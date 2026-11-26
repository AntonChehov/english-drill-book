// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newerVersion } from "./storage";
import {
  click,
  freshStorage,
  mountApp,
  resetApp,
  seededStore,
  stubObservers,
  stubScreen,
  textOf,
  upgradeFromNewerVersion,
} from "./testing/study.fixture";

beforeEach(async () => {
  resetApp();
  await freshStorage();
  stubObservers();
  stubScreen(false);
});

afterEach(() => {
  resetApp();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const bar = () => document.querySelector("header")!;

/** The page is scrolled to `y`, as the browser reports it to the bar. */
function scrollTo(y: number) {
  vi.stubGlobal("scrollY", y);
  window.dispatchEvent(new Event("scroll"));
}

describe("the frame of the app", () => {
  it("@req PROD-012 names the app and the three sections, with the current one marked", async () => {
    const { router } = await mountApp("/about");

    const links = [...bar().querySelectorAll("a")];
    expect(links.map(textOf)).toEqual(["English Drill Book", "Сегодня", "Темы", "О приложении"]);
    expect(document.querySelector('nav[aria-label="Разделы приложения"]')).not.toBeNull();
    const current = links.filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map(textOf)).toEqual(["О приложении"]);

    await click(links[2]!);

    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe("/topics"));
    expect(document.title).toBe("Темы — English Drill Book");
    expect(
      [...bar().querySelectorAll("a")]
        .filter((link) => link.getAttribute("aria-current") === "page")
        .map(textOf),
    ).toEqual(["Темы"]);
  });

  it("@req PROD-012 slides the bar away on a scroll down and back on a scroll up", async () => {
    await mountApp("/about");
    expect(bar().classList.contains("away")).toBe(false);

    scrollTo(300);
    await vi.waitFor(() => expect(bar().classList.contains("away")).toBe(true));

    scrollTo(296);
    expect(bar().classList.contains("away")).toBe(true);

    scrollTo(200);
    await vi.waitFor(() => expect(bar().classList.contains("away")).toBe(false));

    scrollTo(500);
    await vi.waitFor(() => expect(bar().classList.contains("away")).toBe(true));
    scrollTo(0);
    await vi.waitFor(() => expect(bar().classList.contains("away")).toBe(false));
  });

  it("@req PROD-012 keeps the bar while the focus is inside it, and lets it go when the focus leaves", async () => {
    await mountApp("/about");
    const link = bar().querySelector("a")!;
    scrollTo(300);
    await vi.waitFor(() => expect(bar().classList.contains("away")).toBe(true));

    link.focus();
    await vi.waitFor(() => expect(bar().classList.contains("away")).toBe(false));
    scrollTo(600);
    expect(bar().classList.contains("away")).toBe(false);

    // The focus moves from one link of the bar to another: it is still inside.
    const other = bar().querySelectorAll("a")[1]!;
    link.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: other }));
    scrollTo(900);
    expect(bar().classList.contains("away")).toBe(false);

    link.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: null }));
    scrollTo(1200);
    await vi.waitFor(() => expect(bar().classList.contains("away")).toBe(true));
  });
});

describe("data written by a newer version", () => {
  it("@req DATA-005 shows only the message, with no frame and nothing to change", async () => {
    newerVersion.value = true;

    await mountApp("/about");

    expect(textOf(document.querySelector("h1")!)).toBe("Нужна новая версия приложения");
    expect(document.activeElement).toBe(document.querySelector("h1"));
    expect(document.title).toBe("Нужна новая версия — English Drill Book");
    expect(document.querySelector("header")).toBeNull();
    expect(document.querySelector("input")).toBeNull();
    expect([...document.querySelectorAll("button")].map(textOf)).toEqual(["Обновить страницу"]);
  });

  it("@req DATA-005 the button loads the page again", async () => {
    const reload = vi.fn<() => void>();
    vi.stubGlobal("location", { ...window.location, reload });
    newerVersion.value = true;
    await mountApp("/");

    await click(document.querySelector("button")!);

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("@req DATA-005 is found when the app starts on a database a newer version wrote", async () => {
    await upgradeFromNewerVersion();

    await mountApp("/");
    await vi.waitFor(() => expect(newerVersion.value).toBe(true));

    expect(textOf(document.querySelector("h1")!)).toBe("Нужна новая версия приложения");
  });

  it("@req DATA-005 is found when another tab upgrades the database while the app is open", async () => {
    await seededStore();
    await mountApp("/about");
    expect(document.querySelector("header")).not.toBeNull();

    await upgradeFromNewerVersion();

    await vi.waitFor(() =>
      expect(textOf(document.querySelector("h1")!)).toBe("Нужна новая версия приложения"),
    );
  });
});
