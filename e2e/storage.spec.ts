import type { Page, Request } from "@playwright/test";
import {
  addDemo,
  addDemoNotKept,
  addedHeading,
  databaseName,
  databaseOf,
  demoPdf,
  demoTitles,
  newerHeading,
  pdfLibraryFiles,
  refuseStorage,
  retryButton,
  startButton,
  writeNewerData,
} from "./demo";
import { expect, test } from "./fixtures";
import { addressOf } from "./views";

/** The most the demo may add to the site's storage (constitution C-03). */
const storageBudget = 5_000_000;

/** Every request the page makes from now on. */
function requestsOf(page: Page): Request[] {
  const requests: Request[] = [];
  page.on("request", (request) => requests.push(request));
  return requests;
}

const pathOf = (request: Request) => new URL(request.url()).pathname;

test.describe("DATA-001 Data stays in the browser", () => {
  test(
    "@req DATA-001 the demo is kept: after a reload it is shown as added, and no demo file and no file of the PDF library is requested",
    { tag: "@demo" },
    async ({ page }) => {
      await addDemo(page);
      const requests = requestsOf(page);

      await page.reload();

      await expect(addedHeading(page)).toBeVisible();
      await expect(page.getByRole("heading", { level: 3 })).toHaveText(demoTitles);
      await expect(page.getByText("сохранены в этом браузере")).toBeVisible();
      await expect(startButton(page)).toHaveCount(0);
      const library = pdfLibraryFiles();
      expect(library.length, "the build has the PDF library").toBeGreaterThan(0);
      const heavy = requests
        .map(pathOf)
        .filter((path) => demoPdf.test(path) || library.some((file) => path.endsWith(file)));
      expect(heavy, "no demo file and no file of the PDF library").toEqual([]);
    },
  );

  test(
    "@req DATA-001 @req PACK-001 a kept demo pack that fails validation is read again from the PDF",
    { tag: "@demo" },
    async ({ page }) => {
      await addDemo(page);
      await page.evaluate(
        (name) =>
          new Promise<void>((resolve, reject) => {
            const request = indexedDB.open(name);
            request.addEventListener("error", () => reject(request.error));
            request.addEventListener("success", () => {
              const database = request.result;
              const transaction = database.transaction(["packs"], "readwrite");
              const packs = transaction.objectStore("packs");
              const drills = packs.get("demo-drills");
              drills.addEventListener("success", () => {
                packs.put({ ...(drills.result as object), units: [] });
              });
              transaction.addEventListener("complete", () => {
                database.close();
                resolve();
              });
            });
          }),
        databaseName,
      );
      const requests = requestsOf(page);

      await page.reload();

      await expect(addedHeading(page)).toBeVisible();
      await expect(page.getByRole("heading", { level: 3 })).toHaveText(demoTitles);
      expect(requests.map(pathOf).filter((path) => demoPdf.test(path))).toHaveLength(2);
      const stored = await databaseOf(page);
      const drills = stored.stores["packs"]?.find(
        (pack) => (pack as { id: string }).id === "demo-drills",
      ) as { units: unknown[] };
      expect(drills.units).toHaveLength(4);
    },
  );

  test(
    "@req DATA-001 nothing is sent: adding the demo and reloading requests only the app's own origin, and no request carries data",
    { tag: "@demo" },
    async ({ page, ownOrigin }) => {
      const requests = requestsOf(page);

      await addDemo(page);
      await page.reload();
      await expect(addedHeading(page)).toBeVisible();

      expect(requests.length).toBeGreaterThan(0);
      for (const request of requests) {
        expect(new URL(request.url()).origin, request.url()).toBe(ownOrigin);
        expect(request.method(), request.url()).toBe("GET");
        expect(request.postData(), request.url()).toBeNull();
        expect(new URL(request.url()).search, request.url()).toBe("");
      }
    },
  );

  test(
    "@req DATA-001 little is stored: adding the demo grows the site's storage by less than 5 MB",
    { tag: "@demo" },
    async ({ page }) => {
      await page.goto(addressOf("/"));
      await expect(startButton(page)).toBeVisible();
      const usage = () =>
        page.evaluate(async () =>
          "storage" in navigator && "estimate" in navigator.storage
            ? ((await navigator.storage.estimate()).usage ?? null)
            : null,
        );
      const before = await usage();
      test.skip(before === null, "this browser does not estimate its storage");

      await startButton(page).click();
      await expect(addedHeading(page)).toBeVisible();
      const after = await usage();

      const growth = (after ?? 0) - (before ?? 0);
      console.log(`Adding the demo grew the site's storage by ${growth} bytes`);
      test.info().annotations.push({ type: "storage growth", description: `${growth} bytes` });
      expect(growth).toBeLessThan(storageBudget);
      // The packs themselves are what is kept: far less than the books.
      const stored = await databaseOf(page);
      expect(JSON.stringify(stored.stores["packs"]).length).toBeLessThan(storageBudget);
    },
  );
});

test.describe("DATA-004 Failed writes", () => {
  test(
    "@req DATA-004 the demo cannot be kept: the browser refuses storage, the message says so in place with a way to try again, and the books are not shown as added",
    { tag: "@demo" },
    async ({ page }) => {
      await addDemoNotKept(page);

      const demo = page.getByRole("region", { name: "Демо-книги" });
      await expect(demo.getByRole("alert")).toBeVisible();
      await expect(retryButton(page)).toBeFocused();
      await expect(addedHeading(page)).toHaveCount(0);
      await expect(page.getByRole("heading", { level: 3 })).toHaveCount(0);

      // The visitor allows storage and tries again: the books read before are kept, not read again.
      const requests = requestsOf(page);
      await page.evaluate(() => {
        (window as unknown as { storageAllowed: boolean }).storageAllowed = true;
      });
      await retryButton(page).click();

      await expect(addedHeading(page)).toBeVisible();
      await expect(page.getByRole("heading", { level: 3 })).toHaveText(demoTitles);
      expect(requests.map(pathOf).filter((path) => demoPdf.test(path))).toEqual([]);
    },
  );

  test(
    "@req DATA-004 with storage refused, the start screen loads and the demo can be tried",
    { tag: "@demo" },
    async ({ page }) => {
      await refuseStorage(page);
      await page.goto(addressOf("/"));

      await expect(page.getByRole("heading", { level: 1 })).toHaveText("English Drill Book");
      await expect(startButton(page)).toBeVisible();
      await expect(page.getByRole("alert")).toHaveCount(0);
    },
  );
});

test.describe("DATA-005 Versioned schema", () => {
  test(
    "@req DATA-005 newer data: the app says in Russian that a newer version wrote the data, offers nothing that writes, and leaves the database unchanged",
    { tag: "@demo" },
    async ({ page }) => {
      await writeNewerData(page);
      await page.goto(addressOf("/"));

      await expect(newerHeading(page)).toBeVisible();
      await expect(page.getByText("сохранены более новой версией приложения")).toBeVisible();
      await expect(page.getByRole("button")).toHaveText(["Обновить страницу"]);
      await expect(page.getByRole("link")).toHaveCount(0);
      expect(await databaseOf(page)).toEqual({
        version: 2,
        stores: { future: [{ id: "kept", n: 1 }] },
      });

      await page.getByRole("button", { name: "Обновить страницу" }).click();
      await expect(newerHeading(page)).toBeVisible();
    },
  );

  test(
    "@req DATA-005 another tab upgrades: the open tab does not block the upgrade and shows the same message",
    { tag: "@demo" },
    async ({ page, context }) => {
      await addDemo(page);
      const other = await context.newPage();
      await other.goto(addressOf("/"));
      await expect(addedHeading(other)).toBeVisible();

      const version = await other.evaluate(
        (name) =>
          new Promise<number>((resolve, reject) => {
            const request = indexedDB.open(name, 2);
            request.addEventListener("blocked", () => reject(new Error("blocked")));
            request.addEventListener("error", () => reject(request.error));
            request.addEventListener("success", () => {
              request.result.close();
              resolve(request.result.version);
            });
          }),
        databaseName,
      );

      expect(version).toBe(2);
      await expect(newerHeading(page)).toBeVisible();
      await expect(page.getByRole("button")).toHaveText(["Обновить страницу"]);
    },
  );
});

test.describe("DATA-012 Two tabs", () => {
  test(
    "@req DATA-012 seen in the other tab: the demo added in the first is shown in the second when it regains focus, without a reload",
    { tag: "@demo" },
    async ({ page, context }) => {
      const second = await context.newPage();
      // Without the message between tabs, only regaining focus can show the demo here (design D6).
      await second.addInitScript(() => {
        Reflect.deleteProperty(window, "BroadcastChannel");
      });
      await second.goto(addressOf("/"));
      await expect(startButton(second)).toBeVisible();
      const navigations: string[] = [];
      second.on("framenavigated", (frame) => navigations.push(frame.url()));

      await page.bringToFront();
      await addDemo(page);
      await expect(startButton(second)).toBeVisible();

      await second.bringToFront();
      await second.evaluate(() => window.dispatchEvent(new Event("focus")));

      await expect(addedHeading(second)).toBeVisible();
      await expect(second.getByRole("heading", { level: 3 })).toHaveText(demoTitles);
      expect(navigations, "the second tab was not reloaded").toEqual([]);
    },
  );

  test(
    "@req DATA-012 a second tab that is open shows the demo as soon as the first has added it",
    { tag: "@demo" },
    async ({ page, context }) => {
      await page.goto(addressOf("/"));
      const second = await context.newPage();
      await second.goto(addressOf("/"));
      await expect(startButton(second)).toBeVisible();

      await startButton(page).click();
      await expect(addedHeading(page)).toBeVisible();

      await expect(addedHeading(second)).toBeVisible();
    },
  );
});
