// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StorageError } from "../../storage/db/errors";
import { getStore } from "../storage";
import { click, freshStorage, mountApp, resetApp, textOf } from "../testing/study.fixture";

beforeEach(async () => {
  resetApp();
  document.documentElement.removeAttribute("data-theme");
  await freshStorage();
});

afterEach(() => {
  resetApp();
  document.documentElement.removeAttribute("data-theme");
  vi.restoreAllMocks();
});

const choice = (label: string): HTMLInputElement => {
  const found = [...document.querySelectorAll("label")].find((each) => textOf(each) === label);
  return found!.querySelector("input")!;
};

describe("About", () => {
  it("@req PROD-005 offers the three themes with the one applied chosen", async () => {
    await mountApp("/about");

    expect(textOf(document.querySelector("h1")!)).toBe("О приложении");
    expect(document.title).toBe("О приложении — English Drill Book");
    expect(document.querySelector('[role="radiogroup"]')).not.toBeNull();
    expect(choice("Как в системе").checked).toBe(true);
    expect(choice("Светлая").checked).toBe(false);
    expect(choice("Тёмная").checked).toBe(false);
  });

  it("@req PROD-005 the theme chosen is applied at once and kept", async () => {
    await mountApp("/about");

    await click(choice("Тёмная"));

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    await vi.waitFor(async () => expect(await (await getStore()).getSetting("theme")).toBe("dark"));

    await click(choice("Светлая"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    await click(choice("Как в системе"));
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    await vi.waitFor(async () =>
      expect(await (await getStore()).getSetting("theme")).toBe("system"),
    );
    expect(document.querySelector('[role="alert"]')).toBeNull();
  });

  it("@req DATA-004 a theme the store refuses holds until the page is closed, and the failure is said", async () => {
    const store = await getStore();
    vi.spyOn(store, "putSetting").mockRejectedValueOnce(new StorageError("unavailable"));
    await mountApp("/about");

    await click(choice("Тёмная"));

    await vi.waitFor(() =>
      expect(textOf(document.querySelector('[role="alert"]')!)).toBe(
        "Выбор не удалось сохранить: оформление изменено только до закрытия страницы.",
      ),
    );
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    await click(choice("Светлая"));

    await vi.waitFor(() => expect(document.querySelector('[role="alert"]')).toBeNull());
  });
});

describe("an address with nothing at it", () => {
  it("@req PROD-011 says so and leads to the start screen, with the frame still there", async () => {
    const { router } = await mountApp("/no/such/page");

    expect(textOf(document.querySelector("h1")!)).toBe("Страница не найдена");
    expect(document.title).toBe("Страница не найдена — English Drill Book");
    expect(document.querySelectorAll("nav a").length).toBeGreaterThan(0);

    const home = [...document.querySelectorAll("main a")].find(
      (each) => textOf(each) === "На главную",
    ) as HTMLElement;
    await click(home);

    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe("/"));
  });
});
