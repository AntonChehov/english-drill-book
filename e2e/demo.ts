import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expect } from "./fixtures";
import { addressOf } from "./views";

/** The demo books as the start screen lists them once added. */
export const demoTitles = ["Everyday Grammar: A Demo Course", "Everyday Grammar: Demo Drills"];

/** Matches the address of a demo book. */
export const demoPdf = /\/demo\/(course|drills)\.pdf$/;

/** Matches the address of the worker of the PDF library. */
export const pdfWorker = /pdf\.worker.*\.mjs$/;

/** What a browser may log when a module worker cannot be loaded. */
export const pdfWorkerError = /worker|Worker|module script|pdf\.worker/;

/** Matches the address of the drill book, the second one read. */
export const drillsPdf = /\/demo\/drills\.pdf$/;

/**
 * The console errors a browser may log for a request a test makes fail on purpose: Chromium logs
 * the failed load, Firefox and WebKit may log nothing or a network error.
 */
export const failedLoad = /Failed to load resource|NetworkError|network connection was lost/;

/**
 * The files of the PDF library in the build: its chunk and its worker, read from the manifest
 * that `pnpm build` writes, so the test does not depend on hashed names.
 */
export function pdfLibraryFiles(): string[] {
  const manifest = JSON.parse(readFileSync("dist/.vite/manifest.json", "utf8")) as Record<
    string,
    { file: string; src?: string }
  >;
  return Object.values(manifest)
    .filter((chunk) => chunk.src?.includes("node_modules/") && chunk.src.includes("pdfjs-dist"))
    .map((chunk) => chunk.file);
}

export const startButton = (page: Page) => page.getByRole("button", { name: "Попробовать демо" });
export const retryButton = (page: Page) =>
  page.getByRole("button", { name: "Попробовать ещё раз" });
export const addedHeading = (page: Page) =>
  page.getByRole("heading", { level: 2, name: "Демо-книги добавлены" });

/** Opens the start screen and adds the demo; returns how long reading the books took, in ms. */
export async function addDemo(page: Page): Promise<number> {
  await page.goto(addressOf("/"));
  const started = Date.now();
  await startButton(page).click();
  await expect(addedHeading(page)).toBeVisible();
  return Date.now() - started;
}

/** Opens the start screen and makes adding the demo fail: the drill book does not arrive. */
export async function failDemo(page: Page, allowConsoleError: (pattern: RegExp) => void) {
  allowConsoleError(failedLoad);
  await page.route(drillsPdf, (route) => route.abort("internetdisconnected"));
  await page.goto(addressOf("/"));
  await startButton(page).click();
  await expect(retryButton(page)).toBeVisible();
}

/** The name of the app's database (src/storage/db/schema.ts). */
export const databaseName = "english-drill-book";

/**
 * Makes the browser refuse this site storage, as Firefox does when storage is blocked for a site:
 * `indexedDB.open` throws a `SecurityError`. It runs before the app on every load of the page.
 * Setting `window.storageAllowed = true` lets storage work again, as when the visitor allows it.
 */
export async function refuseStorage(page: Page) {
  await page.addInitScript(() => {
    const open = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (this: IDBFactory, ...args: [string, number?]) {
      if ((window as unknown as { storageAllowed?: boolean }).storageAllowed !== true) {
        throw new DOMException("The operation is insecure.", "SecurityError");
      }
      return open.apply(this, args);
    };
  });
}

export const notKeptMessage =
  "Демо-книги прочитаны, но сохранить их в этом браузере не удалось: браузер не разрешает этому сайту хранить данные. Так бывает в режиме инкогнито или когда сохранение данных сайтов выключено в настройках браузера. Разрешите его и попробуйте ещё раз.";

/** Opens the start screen with storage refused and adds the demo, which cannot be kept. */
export async function addDemoNotKept(page: Page) {
  await refuseStorage(page);
  await page.goto(addressOf("/"));
  await startButton(page).click();
  await expect(page.getByRole("alert")).toHaveText(notKeptMessage);
}

/**
 * Before the app starts, writes the app's database with a version above the app's, with a store
 * and a record of its own, as a newer version of the app would leave it.
 */
export async function writeNewerData(page: Page, version = 2) {
  await page.addInitScript(
    ({ name, newer }) => {
      const request = indexedDB.open(name, newer);
      request.addEventListener("upgradeneeded", () => {
        request.result.createObjectStore("future", { keyPath: "id" }).add({ id: "kept", n: 1 });
      });
      request.addEventListener("success", () => request.result.close());
    },
    { name: databaseName, newer: version },
  );
}

export const newerHeading = (page: Page) =>
  page.getByRole("heading", { level: 1, name: "Нужна новая версия приложения" });

/** The version, stores and records of the app's database as the page sees it. */
export function databaseOf(page: Page) {
  return page.evaluate(
    (name) =>
      new Promise<{ version: number; stores: Record<string, unknown[]> }>((resolve, reject) => {
        const request = indexedDB.open(name);
        request.addEventListener("error", () => reject(request.error));
        request.addEventListener("success", () => {
          const database = request.result;
          const names = [...database.objectStoreNames];
          const stores: Record<string, unknown[]> = {};
          if (names.length === 0) {
            database.close();
            resolve({ version: database.version, stores });
            return;
          }
          const transaction = database.transaction(names, "readonly");
          for (const store of names) {
            const all = transaction.objectStore(store).getAll();
            all.addEventListener("success", () => {
              stores[store] = all.result;
            });
          }
          transaction.addEventListener("complete", () => {
            database.close();
            resolve({ version: database.version, stores });
          });
        });
      }),
    databaseName,
  );
}

/** The states of the start screen's demo section after the first, for screenshots and axe. */
export const demoStates = [
  { name: "start-demo-added", reach: (page: Page) => addDemo(page) },
  {
    name: "start-demo-failed",
    reach: (page: Page, allowConsoleError: (pattern: RegExp) => void) =>
      failDemo(page, allowConsoleError),
  },
  {
    // The demo added in an earlier visit, shown from the store after a reload (design D7).
    name: "start-demo-kept",
    reach: async (page: Page) => {
      await addDemo(page);
      await page.reload();
      await expect(addedHeading(page)).toBeVisible();
    },
  },
  // Read, and refused by the browser's storage (DATA-004).
  { name: "start-demo-not-kept", reach: (page: Page) => addDemoNotKept(page) },
  {
    // Data of a newer version of the app: the full-screen message (DATA-005).
    name: "newer-version",
    reach: async (page: Page) => {
      await writeNewerData(page);
      await page.goto(addressOf("/"));
      await expect(newerHeading(page)).toBeVisible();
    },
  },
] as const;
