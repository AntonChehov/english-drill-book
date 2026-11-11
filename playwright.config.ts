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
  },
  projects: [
    // Everything runs on Chromium; Firefox and WebKit run the demo flow (constitution C-13).
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: /screenshots\.spec\.ts/ },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      grep: /@demo/,
      testIgnore: /screenshots\.spec\.ts/,
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      grep: /@demo/,
      testIgnore: /screenshots\.spec\.ts/,
    },
    // Evidence for pull requests (design D8); run on its own with `pnpm screenshots`.
    { name: "screenshots", use: { ...devices["Desktop Chrome"] }, testMatch: /screenshots\.spec\.ts/ },
  ],
  webServer: {
    command: `pnpm exec vite preview --port ${port} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${port}${basePath}`,
    reuseExistingServer: !ci,
  },
});
