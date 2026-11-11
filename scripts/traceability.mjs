#!/usr/bin/env node
// Constitution C-11: every requirement in openspec/specs and in the changes in flight
// carries its ID in its title and is named by at least one test (`@req ID`).
// Usage: node scripts/traceability.mjs [repository root]
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";

const requirementTitle = /^###\s+Requirement:\s*(.*)$/gm;
const idAtStart = /^([A-Z][A-Z0-9]*-\d{3})\b/;
const testTag = /@req\s+([A-Z][A-Z0-9]*-\d{3})\b/g;

/** Requirement titles of a spec file: the IDs found and the titles that lack one. */
export function parseRequirements(markdown) {
  const ids = [];
  const untitled = [];
  for (const [, title] of markdown.matchAll(requirementTitle)) {
    const id = idAtStart.exec(title.trim())?.[1];
    if (id) ids.push(id);
    else untitled.push(title.trim());
  }
  return { ids, untitled };
}

/** IDs named by `@req ID` in the source of a test file. */
export function parseTestedIds(source) {
  return [...source.matchAll(testTag)].map((match) => match[1]);
}

function filesUnder(root, directory, accept) {
  let entries;
  try {
    entries = readdirSync(join(root, directory), { recursive: true, withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(root, join(entry.parentPath, entry.name)).split(sep).join("/"))
    .filter((path) => !path.includes("node_modules/") && accept(path));
}

export function isSpecFile(path) {
  return (
    path.endsWith("/spec.md") &&
    (path.startsWith("openspec/specs/") ||
      (path.startsWith("openspec/changes/") && !path.startsWith("openspec/changes/archive/")))
  );
}

export function isTestFile(path) {
  return /\.(test|spec)\.(ts|mts|js|mjs)$/.test(path);
}

/**
 * Compares the requirements of the specification with the tests.
 * Returns the problems found; an empty list means the repository is traceable.
 */
export function checkTraceability(root) {
  const required = new Map();
  const problems = [];
  for (const path of filesUnder(root, "openspec", isSpecFile)) {
    const { ids, untitled } = parseRequirements(readFileSync(join(root, path), "utf8"));
    for (const id of ids) required.set(id, [...(required.get(id) ?? []), path]);
    for (const title of untitled) {
      problems.push(`${path}: requirement "${title}" has no ID at the start of its title`);
    }
  }

  // Tests of the app only: the tests of these scripts hold `@req` tags as fixtures.
  const tested = new Set();
  for (const directory of ["src", "e2e"]) {
    for (const path of filesUnder(root, directory, isTestFile)) {
      for (const id of parseTestedIds(readFileSync(join(root, path), "utf8"))) tested.add(id);
    }
  }

  for (const [id, paths] of [...required].toSorted(([a], [b]) => a.localeCompare(b))) {
    if (!tested.has(id))
      problems.push(`${id} (${paths.join(", ")}) is named by no test (@req ${id})`);
  }
  return { required: [...required.keys()].toSorted(), tested: [...tested].toSorted(), problems };
}

function main() {
  const root = process.argv[2] ?? process.cwd();
  const { required, problems } = checkTraceability(root);
  if (problems.length > 0) {
    console.error(`Traceability check failed (constitution C-11):\n- ${problems.join("\n- ")}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Traceability: ${required.length} requirements, each named by a test.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
