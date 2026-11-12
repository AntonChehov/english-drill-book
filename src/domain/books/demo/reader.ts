// The reader of the demo layout (design D5). It relies only on what demo/LAYOUT.md states and
// finds everything by what the pages say, never by page numbers fixed in advance.

import type { Exercise, Item, Pack, PageRef, Unit } from "../../packs/types";
import type { BookProfile, DocumentInfo, Line, PageText, ReadProblem, ReadResult } from "../types";

/** Font sizes of the demo layout, in points (demo/LAYOUT.md). */
export const DEMO_SIZES = { heading: 18, task: 11, body: 10.5 } as const;

/** How far a size may be from the one the layout states. */
const SIZE_TOLERANCE = 0.25;

/** How far the start of an item line may be from that of the first item of its exercise. */
const COLUMN_TOLERANCE = 1;

const UNIT_HEADING = /^Unit (\d+) (.+)$/u;
const KEY_HEADING = "Answer key";
const NUMBERED = /^(\d+\.\d+) (.+)$/u;
const ITEM = /^(\d+) (.+)$/u;
const NUMBER = /^\d+$/u;
const CHOICES = /^(.*\S) \[([^\]]+)\]$/u;
const OPEN_KEY = /^Answers will vary\.(?: Example: (.+))?$/u;

interface Range {
  from: number;
  to: number;
}

interface FoundExercise extends Range {
  readonly id: string;
  task: string;
  readonly body: { readonly line: Line; readonly page: number }[];
}

interface FoundUnit extends Range {
  readonly id: string;
  readonly title: string;
  readonly exercises: FoundExercise[];
}

const near = (size: number, expected: number) => Math.abs(size - expected) <= SIZE_TOLERANCE;

/** What the pages say, in the order they say it: units, exercises and key entries. */
function scan(pages: readonly PageText[], problems: ReadProblem[]) {
  const units: FoundUnit[] = [];
  const exercises = new Map<string, FoundExercise>();
  const keys = new Map<string, string>();
  let keySection = false;
  let sawKey = false;
  let unit: FoundUnit | undefined;
  let exercise: FoundExercise | undefined;
  let key: string | undefined;

  const extend = (page: number) => {
    exercise!.to = page;
    unit!.to = page;
  };

  for (const { page, lines } of pages) {
    for (const line of lines) {
      if (near(line.size, DEMO_SIZES.heading)) {
        exercise = undefined;
        key = undefined;
        const heading = UNIT_HEADING.exec(line.text);
        if (heading) {
          keySection = false;
          const id = heading[1]!;
          if (units.some((found) => found.id === id)) {
            problems.push({ kind: "unit-repeated", id, page });
            unit = undefined;
          } else {
            unit = { id, title: heading[2]!, from: page, to: page, exercises: [] };
            units.push(unit);
          }
        } else if (line.text === KEY_HEADING) {
          keySection = true;
          sawKey = true;
          unit = undefined;
        }
        continue;
      }

      if (keySection) {
        if (!near(line.size, DEMO_SIZES.body)) continue;
        const entry = NUMBERED.exec(line.text);
        if (entry) {
          const id = entry[1]!;
          if (keys.has(id)) {
            problems.push({ kind: "key-repeated", id, page });
            key = undefined;
          } else {
            key = id;
            keys.set(id, entry[2]!);
          }
        } else if (key !== undefined) {
          keys.set(key, `${keys.get(key)} ${line.text}`);
        }
        continue;
      }

      if (unit === undefined) continue;
      if (near(line.size, DEMO_SIZES.task)) {
        const heading = NUMBERED.exec(line.text);
        if (heading) {
          const id = heading[1]!;
          exercise = undefined;
          if (exercises.has(id)) {
            problems.push({ kind: "exercise-repeated", id, page });
          } else if (!id.startsWith(`${unit.id}.`)) {
            problems.push({ kind: "exercise-unexpected", id, page });
          } else {
            exercise = { id, task: heading[2]!, from: page, to: page, body: [] };
            exercises.set(id, exercise);
            unit.exercises.push(exercise);
            extend(page);
          }
        } else if (exercise !== undefined && exercise.body.length === 0) {
          exercise.task = `${exercise.task} ${line.text}`;
          extend(page);
        }
      } else if (near(line.size, DEMO_SIZES.body) && exercise !== undefined) {
        exercise.body.push({ line, page });
        extend(page);
      }
    }
  }
  return { units, keys, keySection: sawKey };
}

/**
 * The numbered answers of a key entry, `1 is 2 are 3 am`, each split at `;` into whole answers.
 * Undefined unless the numbers run from 1 to `count` with an answer after each. Answers have no
 * digits (demo/LAYOUT.md), so any other number means the entry is not what it should be.
 */
export function parseAnswers(text: string, count: number): string[][] | undefined {
  const answers: string[][] = [];
  let words: string[] | undefined;
  for (const word of text.split(" ")) {
    if (word === String(answers.length + 1) && answers.length < count) {
      if (words !== undefined && words.length === 0) return undefined;
      words = [];
      answers.push(words);
    } else if (words === undefined || NUMBER.test(word)) {
      return undefined;
    } else {
      words.push(word);
    }
  }
  if (answers.length !== count || words === undefined || words.length === 0) return undefined;
  return answers.map((answer) =>
    answer
      .join(" ")
      .split(";")
      .map((pattern) => pattern.trim()),
  );
}

/** The items of an exercise: lines that start with their number in the column of the first. */
function itemsOf(body: FoundExercise["body"]) {
  const column = body[0]!.line.x;
  const items: { number: string; text: string }[] = [];
  for (const { line } of body) {
    const start = ITEM.exec(line.text);
    if (start && Math.abs(line.x - column) <= COLUMN_TOLERANCE) {
      items.push({ number: start[1]!, text: start[2]! });
    } else {
      const last = items.at(-1)!;
      last.text = `${last.text} ${line.text}`;
    }
  }
  return items;
}

function itemOf(id: string, text: string, accept: string[]): Item {
  const choices = CHOICES.exec(text);
  if (!choices) return { id, prompt: text, accept };
  return { id, prompt: choices[1]!, accept, choices: choices[2]!.split(" / ") };
}

function exerciseOf(
  found: FoundExercise,
  key: string,
  pages: PageRef[],
  problems: ReadProblem[],
): Exercise | undefined {
  const { id, task, body } = found;
  const prompt = body.map(({ line }) => line.text).join(" ");
  const first = body[0];

  if (first !== undefined && ITEM.test(first.line.text)) {
    const printed = itemsOf(body);
    if (printed.some((item, index) => item.number !== String(index + 1))) {
      problems.push({ kind: "item-sequence", id, page: found.from });
      return undefined;
    }
    const answers = parseAnswers(key, printed.length);
    if (answers === undefined) {
      problems.push({ kind: "key-mismatch", id });
      return undefined;
    }
    const items = printed.map((item, index) => itemOf(item.number, item.text, answers[index]!));
    return { id, type: "items", task, pages, items };
  }

  const open = OPEN_KEY.exec(key);
  if (open) {
    return {
      id,
      type: "open",
      task,
      pages,
      ...(prompt && { prompt }),
      ...(open[1] !== undefined && { sample: open[1] }),
    };
  }
  if (first === undefined) {
    problems.push({ kind: "exercise-empty", id, page: found.from });
    return undefined;
  }
  return { id, type: "text", task, pages, prompt, model: key };
}

/**
 * Reads a book of the demo layout into a pack. The result is the pack, or every problem found:
 * for a demo book anything missing is a failure (design D5), so no partial pack is returned.
 */
export function readDemoBook(
  profile: BookProfile,
  pages: readonly PageText[],
  document: DocumentInfo,
): ReadResult {
  const problems: ReadProblem[] = [];
  const found = scan(pages, problems);
  const role = profile.documentRole;
  const pagesOf = ({ from, to }: Range): PageRef[] => [{ document: role, from, to }];

  for (const unit of found.units) {
    if (!profile.units.some((expected) => expected.id === unit.id)) {
      problems.push({ kind: "unit-unexpected", id: unit.id, page: unit.from });
    }
  }
  if (!found.keySection) problems.push({ kind: "key-section-missing", id: "" });

  const units: Unit[] = [];
  for (const expected of profile.units) {
    const unit = found.units.find((candidate) => candidate.id === expected.id);
    if (unit === undefined) {
      problems.push({ kind: "unit-missing", id: expected.id });
      continue;
    }
    const exerciseIds = Array.from(
      { length: expected.exercises },
      (_, index) => `${unit.id}.${index + 1}`,
    );
    for (const exercise of unit.exercises) {
      if (!exerciseIds.includes(exercise.id)) {
        problems.push({ kind: "exercise-unexpected", id: exercise.id, page: exercise.from });
      }
    }
    const exercises: Exercise[] = [];
    for (const id of exerciseIds) {
      const exercise = unit.exercises.find((candidate) => candidate.id === id);
      if (exercise === undefined) {
        problems.push({ kind: "exercise-missing", id });
        continue;
      }
      const key = found.keys.get(id);
      if (key === undefined) {
        if (found.keySection) problems.push({ kind: "key-missing", id });
        continue;
      }
      const read = exerciseOf(exercise, key, pagesOf(exercise), problems);
      if (read) exercises.push(read);
    }
    units.push({ id: unit.id, title: unit.title, pages: pagesOf(unit), exercises });
  }

  const exercisesFound = new Set(found.units.flatMap((unit) => unit.exercises.map((e) => e.id)));
  for (const id of found.keys.keys()) {
    if (!exercisesFound.has(id)) problems.push({ kind: "key-unexpected", id });
  }

  if (problems.length > 0) return { ok: false, problems };

  const pack: Pack = {
    kind: "pack",
    schemaVersion: 1,
    id: profile.id,
    version: profile.version,
    title: profile.title,
    language: profile.language,
    instructionLanguage: profile.instructionLanguage,
    original: true,
    license: profile.license,
    source: {
      title: profile.source.title,
      authors: [...profile.source.authors],
      edition: profile.source.edition,
      year: profile.source.year,
      documents: [{ role, sha256: document.sha256, pages: document.pages }],
    },
    units,
  };
  return { ok: true, pack };
}
