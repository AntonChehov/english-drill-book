import { test as base, expect, type BrowserContext } from "@playwright/test";

/**
 * Watches every page of a browser context for what no test may cause:
 * a request to another origin (constitution C-02), a console error, which includes
 * Content-Security-Policy violations, and an uncaught exception.
 * Requests to other origins are aborted, so a test never touches the network.
 * A test that makes a request fail on purpose names the console error it expects with
 * `allowConsoleError`; any other error still fails it.
 */
export async function guardContext(context: BrowserContext, ownOrigin: string) {
  const foreignRequests: string[] = [];
  const errors: string[] = [];
  const allowed: RegExp[] = [];

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

  return {
    allowConsoleError(pattern: RegExp) {
      allowed.push(pattern);
    },
    assertClean() {
      expect(foreignRequests, "requests to other origins (C-02)").toEqual([]);
      const unexpected = errors.filter((error) => !allowed.some((pattern) => pattern.test(error)));
      expect(unexpected, "console errors and uncaught exceptions").toEqual([]);
    },
  };
}

export interface Fixtures {
  ownOrigin: string;
  /** Lets the console error of a request the test makes fail on purpose through the guard. */
  allowConsoleError: (pattern: RegExp) => void;
  /**
   * Opens a page in a new browser context with no stored state, guarded like `page`; `allowed`
   * names the console errors of requests the test makes fail on purpose there.
   */
  openCleanPage: (
    address: string,
    allowed?: readonly RegExp[],
  ) => Promise<import("@playwright/test").Page>;
}

export const test = base.extend<Fixtures>({
  ownOrigin: async ({ baseURL }, use) => {
    if (!baseURL) throw new Error("baseURL is not configured");
    await use(new URL(baseURL).origin);
  },

  allowConsoleError: [
    async ({ context, ownOrigin }, use) => {
      const guard = await guardContext(context, ownOrigin);
      await use(guard.allowConsoleError);
      guard.assertClean();
    },
    { auto: true },
  ],

  openCleanPage: async ({ browser, baseURL, ownOrigin }, use) => {
    const opened: { context: BrowserContext; assertClean: () => void }[] = [];
    await use(async (address, allowed = []) => {
      // Explicitly empty: the browser of a test applies the project's options, a stored state too.
      const context = await browser.newContext({
        baseURL,
        storageState: { cookies: [], origins: [] },
      });
      const guard = await guardContext(context, ownOrigin);
      for (const pattern of allowed) guard.allowConsoleError(pattern);
      opened.push({ context, assertClean: guard.assertClean });
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
