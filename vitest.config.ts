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
        include: ["src/domain/**/*.ts"],
        // Fixtures are code that only tests run.
        exclude: ["src/domain/**/*.test.ts", "src/domain/**/*.fixture.ts"],
        reporter: ["text", "json-summary", "html"],
        reportsDirectory: "reports/coverage",
        thresholds: { lines: 95, branches: 95 },
      },
    },
  }),
);
