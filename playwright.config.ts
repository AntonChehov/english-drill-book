import { defineConfig, devices } from "@playwright/test";

const port = 4173;
const basePath = process.env["BASE_PATH"] ?? "/";
const ci = Boolean(process.env["CI"]);

/**
 * End-to-end tests run against `vite preview` serving the production build (design D5).
 * Run `pnpm build` first; `pnpm e2e` does both.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: ci,
  retries: 0,
  reporter: ci
    ? [
        ["list"],
        ["junit", { outputFile: process.env["E2E_JUNIT_FILE"] ?? "reports/e2e-junit.xml" }],
        ["html", { open: "never", outputFolder: "reports/playwright" }],
      ]
    : [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${port}${basePath}`,
    trace: "retain-on-failure",
    // The worker serves the app's own files itself (PROD-003), so a test that holds one back with
    // `page.route` would never see the request. Only the offline spec lets the worker run.
    serviceWorkers: "block",
  },
  projects: [
    // Everything runs on Chromium; Firefox and WebKit run the demo flow (constitution C-13).
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /screenshots\.spec\.ts/,
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      grep: /@demo/,
      testIgnore: /screenshots\.spec\.ts/,
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      // WebKit, not a target of the app, draws pages and opens units slowly in the pipeline: its
      // speed is technical debt (docs/tech-debt.md), so its waits and its test timeout are longer than the defaults (5 s, 30 s) and CI retries it once.
      expect: { timeout: 15_000 },
      timeout: 60_000,
      // A pass on the retry is reported as flaky, not as a pass.
      retries: ci ? 1 : 0,
      grep: /@demo/,
      testIgnore: /screenshots\.spec\.ts/,
    },
    // Evidence for pull requests (design D8); run on its own with `pnpm screenshots`.
    {
      name: "screenshots",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /screenshots\.spec\.ts/,
    },
  ],
  webServer: {
    command: `pnpm exec vite preview --port ${port} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${port}${basePath}`,
    reuseExistingServer: !ci,
  },
});
