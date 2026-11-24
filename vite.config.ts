import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import vue from "@vitejs/plugin-vue";
import { build, defineConfig, type Plugin, type ResolvedConfig } from "vite";

/**
 * Content-Security-Policy for the production build (constitution C-02).
 * GitHub Pages cannot set response headers, so the policy is a meta tag.
 * It is left out of the dev server, which injects styles inline for hot reload.
 */
export const contentSecurityPolicy = "default-src 'self'; base-uri 'self'; object-src 'none'";

function contentSecurityPolicyMeta(): Plugin {
  return {
    name: "content-security-policy-meta",
    apply: "build",
    transformIndexHtml: () => [
      {
        tag: "meta",
        attrs: { "http-equiv": "Content-Security-Policy", content: contentSecurityPolicy },
        injectTo: "head-prepend",
      },
    ],
  };
}

/** The file of the build that carries the licence of every runtime dependency. */
export const noticesFile = "third-party-notices.txt";

/**
 * The name, version, licence and licence text of every runtime dependency in `package.json`.
 * The bundler drops licence comments from some chunks (pdf.js, Apache-2.0, among them), so the
 * notices ship as a file of their own (decision 0005).
 */
export function thirdPartyNotices(root: string): string {
  const read = (path: string) => readFileSync(join(root, path), "utf8");
  const { dependencies = {} } = JSON.parse(read("package.json")) as {
    dependencies?: Record<string, string>;
  };
  const sections = Object.keys(dependencies)
    .toSorted()
    .map((name) => {
      const meta = JSON.parse(read(`node_modules/${name}/package.json`)) as {
        version: string;
        license: string;
      };
      const text = read(`node_modules/${name}/LICENSE`).trim();
      return `${name} ${meta.version} (${meta.license})\n\n${text}`;
    });
  return (
    [
      "English Drill Book includes the following third-party software, under the licences below.",
      ...sections,
    ].join(`\n\n${"-".repeat(72)}\n\n`) + "\n"
  );
}

function thirdPartyNoticesFile(): Plugin {
  return {
    name: "third-party-notices",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: noticesFile,
        source: thirdPartyNotices(process.cwd()),
      });
    },
  };
}

/** The file of the build that is the service worker (design D1 of `shell-offline-themes`). */
export const workerFile = "sw.js";

/**
 * The files of the build the service worker keeps, as paths from the output folder: the app itself,
 * not the demo books' PDFs (PACK-003), the manifest the build tools read, or the worker.
 */
export function cachedFiles(files: readonly string[]): string[] {
  return files
    .filter(
      (file) => !file.startsWith("demo/") && !file.startsWith(".vite/") && file !== workerFile,
    )
    .toSorted();
}

/**
 * Bundles `src/sw/worker.ts` into `sw.js`, with the list of the files of the build and a cache name
 * that changes with any of their contents, so a new build is kept whole and the old one dropped.
 */
function serviceWorker(): Plugin {
  let config: ResolvedConfig;
  return {
    name: "service-worker",
    apply: "build",
    configResolved: (resolved) => void (config = resolved),
    async writeBundle() {
      const outDir = resolve(config.root, config.build.outDir);
      const files = cachedFiles(
        readdirSync(outDir, { recursive: true, encoding: "utf8" }).filter((file) =>
          statSync(join(outDir, file)).isFile(),
        ),
      );
      const hash = createHash("sha256");
      for (const file of files) hash.update(file).update(readFileSync(join(outDir, file)));
      await build({
        configFile: false,
        logLevel: "warn",
        publicDir: false,
        define: {
          APP_FILES: JSON.stringify(files),
          APP_CACHE: JSON.stringify(`edb-${hash.digest("hex").slice(0, 12)}`),
        },
        build: {
          outDir,
          emptyOutDir: false,
          lib: {
            entry: join(config.root, "src/sw/worker.ts"),
            formats: ["iife"],
            name: "worker",
            fileName: () => workerFile,
          },
        },
      });
    },
  };
}

export default defineConfig({
  // The demo is served from a subpath on GitHub Pages; the deploy workflow sets BASE_PATH.
  base: process.env["BASE_PATH"] ?? "/",
  plugins: [vue(), contentSecurityPolicyMeta(), thirdPartyNoticesFile(), serviceWorker()],
  build: {
    // scripts/size.mjs reads the manifest to find what the first screen loads.
    manifest: true,
  },
});
