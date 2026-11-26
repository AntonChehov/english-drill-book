import { configDefaults, defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

const ci = Boolean(process.env["CI"]);

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "node",
      setupFiles: ["./vitest.setup.ts"],
      // Order-independence (constitution C-10): shuffle, with the seed printed on failure.
      sequence: { shuffle: true },
      reporters: ci ? ["default", "junit"] : ["default"],
      outputFile: { junit: "reports/unit-junit.xml" },
      // The speed test reads a clock, so it runs alone, after every other file has finished.
      projects: [
        {
          extends: true,
          test: {
            name: "unit",
            include: ["src/**/*.test.ts", "scripts/**/*.test.mjs"],
            exclude: [...configDefaults.exclude, "**/speed.test.ts"],
          },
        },
        {
          extends: true,
          test: {
            name: "speed",
            include: ["src/**/speed.test.ts"],
            sequence: { groupOrder: 1 },
          },
        },
      ],
      coverage: {
        provider: "v8",
        include: ["src/domain/**/*.ts", "src/ui/**/*.{ts,vue}", "src/storage/**/*.ts"],
        exclude: [
          // Tests and their helpers are code that only tests run.
          "src/**/*.test.ts",
          "src/**/*.fixture.ts",
          // The page's entry point starts the app in a browser (a top-level await on the store,
          // the service worker); the end-to-end specs run it.
          "src/ui/main.ts",
          // Types only, nothing to run.
          "src/ui/env.d.ts",
          // Draws a PDF page on a canvas with pdf.js in a real browser, which a DOM made for tests
          // does not have; the end-to-end specs of the pages panel run it.
          "src/storage/pdf/render.ts",
        ],
        reporter: ["text", "json-summary", "html"],
        reportsDirectory: "reports/coverage",
        // The domain is pure logic and is held to more than the code that draws and stores.
        thresholds: {
          "src/domain/**": { lines: 95, branches: 95 },
          "src/ui/**": { lines: 70, branches: 70 },
          "src/storage/**": { lines: 70, branches: 70 },
        },
      },
    },
  }),
);
