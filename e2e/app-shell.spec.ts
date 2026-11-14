import { expect, test } from "./fixtures";
import { addressOf, plainViews as views } from "./views";

const startView = views[0]!;
const otherViews = views.filter((view) => view.name !== "start" && view.name !== "not-found");

test.describe("PROD-001 Single window", () => {
  for (const view of views) {
    test(
      `@req PROD-001 every link on ${view.name} opens its destination in the same window`,
      {
        tag: "@demo",
      },
      async ({ page, context }) => {
        await page.goto(addressOf(view.path));
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(view.heading);

        const links = page.getByRole("link");
        const count = await links.count();
        expect(count, "the view has navigation links").toBeGreaterThan(0);

        for (let index = 0; index < count; index++) {
          await page.goto(addressOf(view.path));
          await expect(page.getByRole("heading", { level: 1 })).toHaveText(view.heading);
          const link = links.nth(index);
          await expect(link).not.toHaveAttribute("target", /.+/);

          const href = await link.getAttribute("href");
          const popups: unknown[] = [];
          context.on("page", (opened) => popups.push(opened));
          await link.click();

          await expect(page).toHaveURL((url) => url.hash === href);
          await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
          expect(popups, "no other window or tab was opened").toHaveLength(0);
          expect(context.pages()).toHaveLength(1);
        }
      },
    );
  }
});

test.describe("PROD-008 Addressable views", () => {
  for (const view of otherViews) {
    test(
      `@req PROD-008 reloading ${view.name} keeps the view`,
      { tag: "@demo" },
      async ({ page }) => {
        await page.goto(addressOf(startView.path));
        await page.getByRole("link", { name: view.heading }).click();
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(view.heading);
        const address = page.url();

        await page.reload();

        await expect(page).toHaveURL(address);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(view.heading);
      },
    );

    test(
      `@req PROD-008 the address of ${view.name} opens it in a clean profile`,
      {
        tag: "@demo",
      },
      async ({ openCleanPage }) => {
        const page = await openCleanPage(addressOf(view.path));

        await expect(page.getByRole("heading", { level: 1 })).toHaveText(view.heading);
        await expect(page).toHaveTitle(new RegExp(`^${view.heading} — `));
      },
    );
  }

  for (const unknown of ["/no-such-page", "/about/extra", "/%D1%82%D0%B5%D0%BC%D1%8B"]) {
    test(
      `@req PROD-008 unknown address ${unknown} shows the not-found view`,
      {
        tag: "@demo",
      },
      async ({ page }) => {
        await page.goto(addressOf(unknown));

        const heading = page.getByRole("heading", { level: 1 });
        await expect(heading).toHaveText("Страница не найдена");
        await expect(page.locator("html")).toHaveAttribute("lang", "ru");
        await expect(page.locator("main")).not.toBeEmpty();

        await page.getByRole("link", { name: "На главную" }).click();
        await expect(heading).toHaveText(startView.heading);
        await expect(page).toHaveURL((url) => url.hash === "#/");
      },
    );
  }
});
