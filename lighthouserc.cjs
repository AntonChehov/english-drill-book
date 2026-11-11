// Lighthouse CI on the production build, mobile profile (constitution C-06, C-07; design D6).
// Chrome is the Chromium that Playwright installs, so the same browser runs locally and in
// the Playwright container in CI.
const { chromium } = require("@playwright/test");

const port = 4174;

module.exports = {
  ci: {
    collect: {
      startServerCommand: `pnpm exec vite preview --port ${port} --strictPort --host 127.0.0.1`,
      startServerReadyPattern: "Local",
      url: [`http://127.0.0.1:${port}/`],
      numberOfRuns: 3,
      chromePath: chromium.executablePath(),
      settings: {
        // The default form factor and throttling of Lighthouse are the mobile profile.
        chromeFlags: "--headless=new --no-sandbox",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9, aggregationMethod: "median-run" }],
        "categories:accessibility": ["error", { minScore: 0.95, aggregationMethod: "median-run" }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "reports/lighthouse",
    },
  },
};
