#!/usr/bin/env node
// Constitution C-06: the JavaScript and CSS the first screen loads, gzipped, against
// the budgets. Writes the result under `size` in metrics.json (design D6).
// Usage: node scripts/size.mjs [--dist dist] [--metrics metrics.json] [--js-budget kB] [--css-budget kB]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { gzipSync } from "node:zlib";
import { isMain, mergeMetrics } from "./common.mjs";

/** Budgets of C-06 in kilobytes (1 kB = 1000 bytes) of gzip. */
export const budgets = { js: 120, css: 20 };

/**
 * The files the first screen loads: every entry of the Vite manifest and, recursively,
 * the chunks it imports statically, with their CSS. Dynamic imports load later and
 * are left out, which is how the PDF library stays outside the budget.
 */
export function initialFiles(manifest) {
  const js = new Set();
  const css = new Set();
  const visit = (key) => {
    const chunk = manifest[key];
    if (!chunk || js.has(chunk.file)) return;
    js.add(chunk.file);
    for (const file of chunk.css ?? []) css.add(file);
    for (const imported of chunk.imports ?? []) visit(imported);
  };
  for (const [key, chunk] of Object.entries(manifest)) if (chunk.isEntry) visit(key);
  return { js: [...js].toSorted(), css: [...css].toSorted() };
}

/**
 * The scripts the first screen does not load: chunks imported dynamically and files they use,
 * such as the worker of the PDF library. They are outside the budget and listed for the record.
 */
export function laterFiles(manifest, initial = initialFiles(manifest)) {
  const files = new Set();
  for (const chunk of Object.values(manifest)) {
    for (const file of [chunk.file, ...(chunk.assets ?? [])]) {
      if (/\.m?js$/.test(file) && !initial.js.includes(file)) files.add(file);
    }
  }
  return [...files].toSorted();
}

/** Gzipped size in bytes, at the level static hosts commonly serve. */
export function gzipSize(content) {
  return gzipSync(content, { level: 9 }).length;
}

/** Sizes of the initial files against the budgets, and the budgets exceeded. */
export function measure(files, readFile, limits = budgets) {
  const result = {};
  const over = [];
  for (const kind of ["js", "css"]) {
    let bytes = 0;
    let gzip = 0;
    for (const file of files[kind]) {
      const content = readFile(file);
      bytes += content.length;
      gzip += gzipSize(content);
    }
    const budget = limits[kind] * 1000;
    result[kind] = { files: files[kind], bytes, gzip, budget };
    if (gzip > budget)
      over.push(`${kind}: ${formatKb(gzip)} gzip is over the budget of ${formatKb(budget)}`);
  }
  return { size: result, over };
}

export function formatKb(bytes) {
  return `${(bytes / 1000).toFixed(2)} kB`;
}

function main() {
  const { values } = parseArgs({
    options: {
      dist: { type: "string", default: "dist" },
      metrics: { type: "string", default: "metrics.json" },
      "js-budget": { type: "string" },
      "css-budget": { type: "string" },
    },
  });
  const manifest = JSON.parse(readFileSync(join(values.dist, ".vite", "manifest.json"), "utf8"));
  const limits = {
    js: Number(values["js-budget"] ?? budgets.js),
    css: Number(values["css-budget"] ?? budgets.css),
  };
  const read = (file) => readFileSync(join(values.dist, file));
  const initial = initialFiles(manifest);
  const { size, over } = measure(initial, read, limits);
  const later = laterFiles(manifest, initial).map((file) => {
    const content = read(file);
    return { file, bytes: content.length, gzip: gzipSize(content) };
  });
  mergeMetrics(values.metrics, { size: { ...size, later } });

  for (const kind of ["js", "css"]) {
    console.log(
      `Initial ${kind}: ${formatKb(size[kind].gzip)} gzip of ${formatKb(size[kind].budget)}`,
    );
  }
  for (const { file, gzip } of later) {
    console.log(`Loaded later, outside the budget: ${file} ${formatKb(gzip)} gzip`);
  }
  if (over.length > 0) {
    console.error(`Bundle budget exceeded (constitution C-06):\n- ${over.join("\n- ")}`);
    process.exitCode = 1;
  }
}

if (isMain(import.meta.url)) main();
