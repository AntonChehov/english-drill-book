// Helpers shared by the CI scripts: metrics.json, which several jobs fill in part by part,
// the job summary and step outputs of GitHub Actions, and the check that a module runs
// as a command rather than being imported by a test.
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
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

/** Appends Markdown to the job summary when running in GitHub Actions. */
export function appendSummary(markdown, env = process.env) {
  if (env["GITHUB_STEP_SUMMARY"]) appendFileSync(env["GITHUB_STEP_SUMMARY"], `${markdown}\n`);
}

/** Sets a step output when running in GitHub Actions. */
export function setOutput(name, value, env = process.env) {
  if (env["GITHUB_OUTPUT"]) appendFileSync(env["GITHUB_OUTPUT"], `${name}=${value}\n`);
}

/** Reads a required environment variable, naming it when it is missing. */
export function requireEnv(name, env = process.env) {
  const value = env[name];
  if (!value) throw new Error(`Set ${name} in the environment.`);
  return value;
}

export function isMain(moduleUrl) {
  return Boolean(process.argv[1]) && moduleUrl === pathToFileURL(process.argv[1]).href;
}
