import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expect } from "./fixtures";
import { addressOf } from "./views";

/** The demo books as the start screen lists them once added. */
export const demoTitles = ["Everyday Grammar: A Demo Course", "Everyday Grammar: Demo Drills"];

/** Matches the address of a demo book. */
export const demoPdf = /\/demo\/(course|drills)\.pdf$/;

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

/** The states of the start screen's demo section after the first, for screenshots and axe. */
export const demoStates = [
  { name: "start-demo-added", reach: (page: Page) => addDemo(page) },
  {
    name: "start-demo-failed",
    reach: (page: Page, allowConsoleError: (pattern: RegExp) => void) =>
      failDemo(page, allowConsoleError),
  },
] as const;
