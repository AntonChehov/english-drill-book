import { test as base, expect, type BrowserContext } from "@playwright/test";

/**
 * Watches every page of a browser context for what no test may cause:
 * a request to another origin (constitution C-02), a console error, which includes
 * Content-Security-Policy violations, and an uncaught exception.
 * Requests to other origins are aborted, so a test never touches the network.
 */
export async function guardContext(context: BrowserContext, ownOrigin: string) {
  const foreignRequests: string[] = [];
  const errors: string[] = [];

  await context.route(
    (url) => url.origin !== ownOrigin && /^(https?|wss?):$/.test(url.protocol),
    async (route) => {
      foreignRequests.push(route.request().url());
      await route.abort("blockedbyclient");
    },
  );

  const watch = (page: import("@playwright/test").Page) => {
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`);
    });
    page.on("pageerror", (error) => errors.push(`exception: ${error.message}`));
  };
  context.pages().forEach(watch);
  context.on("page", watch);

  return function assertClean() {
    expect(foreignRequests, "requests to other origins (C-02)").toEqual([]);
    expect(errors, "console errors and uncaught exceptions").toEqual([]);
  };
}

interface Fixtures {
  ownOrigin: string;
  guard: void;
  /** Opens a page in a new browser context with no stored state, guarded like `page`. */
  openCleanPage: (address: string) => Promise<import("@playwright/test").Page>;
}

export const test = base.extend<Fixtures>({
  ownOrigin: async ({ baseURL }, use) => {
    if (!baseURL) throw new Error("baseURL is not configured");
    await use(new URL(baseURL).origin);
  },

  guard: [
    async ({ context, ownOrigin }, use) => {
      const assertClean = await guardContext(context, ownOrigin);
      await use();
      assertClean();
    },
    { auto: true },
  ],

  openCleanPage: async ({ browser, baseURL, ownOrigin }, use) => {
    const opened: { context: BrowserContext; assertClean: () => void }[] = [];
    await use(async (address) => {
      const context = await browser.newContext({ baseURL });
      opened.push({ context, assertClean: await guardContext(context, ownOrigin) });
      const page = await context.newPage();
      await page.goto(address);
      return page;
    });
    for (const { context, assertClean } of opened) {
      assertClean();
      await context.close();
    }
  },
});

export { expect };
