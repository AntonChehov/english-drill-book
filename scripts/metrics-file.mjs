// Helpers shared by the CI scripts: metrics.json, which several jobs fill in part by part,
// and the check that a module runs as a command rather than being imported by a test.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Reads metrics.json, or an empty object when it does not exist yet. */
export function readMetrics(path) {
  return existsSync(path) ? readJson(path) : {};
}

/** Sets the given top-level keys of metrics.json, keeping the others. */
export function mergeMetrics(path, part) {
  const metrics = { ...readMetrics(path), ...part };
  writeFileSync(path, `${JSON.stringify(metrics, null, 2)}\n`);
  return metrics;
}

export function isMain(moduleUrl) {
  return Boolean(process.argv[1]) && moduleUrl === pathToFileURL(process.argv[1]).href;
}
