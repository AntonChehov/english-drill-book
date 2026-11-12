import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

const ci = Boolean(process.env["CI"]);

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ["src/**/*.test.ts", "scripts/**/*.test.mjs"],
      environment: "node",
      setupFiles: ["./vitest.setup.ts"],
      // Order-independence (constitution C-10): shuffle, with the seed printed on failure.
      sequence: { shuffle: true },
      reporters: ci ? ["default", "junit"] : ["default"],
      outputFile: { junit: "reports/unit-junit.xml" },
      coverage: {
        provider: "v8",
        include: ["src/domain/**/*.ts"],
        exclude: ["src/domain/**/*.test.ts"],
        reporter: ["text", "json-summary", "html"],
        reportsDirectory: "reports/coverage",
        thresholds: { lines: 95, branches: 95 },
      },
    },
  }),
);
