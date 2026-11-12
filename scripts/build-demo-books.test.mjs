import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validatePack } from "../src/domain/packs/validate.ts";
import {
  books,
  buildBook,
  documentsOf,
  documentsPath,
  formatPack,
  packPath,
  pdfPath,
  sourcePath,
  sourceProblems,
} from "./build-demo-books.mjs";

const root = process.cwd();
const source = (name) => JSON.parse(readFileSync(sourcePath(root, name), "utf8"));
const built = Object.fromEntries(
  await Promise.all(books.map(async (name) => [name, await buildBook(source(name))])),
);

describe("build-demo-books", () => {
  for (const name of books) {
    it(`rebuilds public/demo/${name}.pdf byte for byte from demo/${name}.json`, () => {
      const committed = readFileSync(pdfPath(root, name));
      expect(Buffer.from(built[name].bytes).equals(committed)).toBe(true);
    });

    it(`keeps public/demo/${name}.pdf under 100 kB`, () => {
      expect(built[name].bytes.length).toBeLessThan(100_000);
    });

    it(`writes demo/${name}.pack.json as the pack expected from the source`, () => {
      expect(formatPack(built[name].pack)).toBe(readFileSync(packPath(root, name), "utf8"));
    });

    it(`builds from demo/${name}.json a pack that passes validation`, () => {
      expect(validatePack(built[name].pack)).toEqual({ ok: true, pack: built[name].pack });
    });

    it(`builds the same bytes twice from demo/${name}.json`, async () => {
      const again = await buildBook(source(name));
      expect(Buffer.from(again.bytes).equals(Buffer.from(built[name].bytes))).toBe(true);
    });

    it(`finds nothing in demo/${name}.json against demo/LAYOUT.md`, () => {
      expect(sourceProblems(source(name))).toEqual([]);
    });
  }

  it("writes the hash and page count of each committed PDF where the profiles read them", () => {
    const packs = Object.fromEntries(books.map((name) => [name, built[name].pack]));
    expect(documentsOf(packs)).toBe(readFileSync(documentsPath(root), "utf8"));
    for (const name of books) {
      const committed = readFileSync(pdfPath(root, name));
      expect(JSON.parse(documentsOf(packs))[name]).toEqual({
        sha256: createHash("sha256").update(committed).digest("hex"),
        pages: built[name].pack.source.documents[0].pages,
      });
    }
  });

  it("prints every unit, exercise and item of the sources, numbered as the books number them", () => {
    for (const name of books) {
      const { units } = source(name);
      const pack = built[name].pack;
      expect(pack.units.map((unit) => unit.id)).toEqual(units.map((_, index) => String(index + 1)));
      pack.units.forEach((unit, unitIndex) => {
        expect(unit.exercises.map((exercise) => exercise.id)).toEqual(
          units[unitIndex].exercises.map((_, index) => `${unit.id}.${index + 1}`),
        );
      });
    }
  });

  it("has between the books every kind of exercise: typed, choices, a connected text, an open one", () => {
    const exercises = books.flatMap((name) =>
      built[name].pack.units.flatMap((unit) => unit.exercises),
    );
    const items = exercises.flatMap((exercise) => exercise.items ?? []);
    expect(items.some((item) => item.choices)).toBe(true);
    expect(items.some((item) => !item.choices)).toBe(true);
    expect(exercises.filter((exercise) => exercise.type === "text")).toHaveLength(1);
    expect(exercises.filter((exercise) => exercise.type === "open")).toHaveLength(1);
  });

  it("prints keys with loose alternatives, optional words and several whole answers", () => {
    const patterns = books.flatMap((name) =>
      built[name].pack.units.flatMap((unit) =>
        unit.exercises.flatMap((exercise) => (exercise.items ?? []).map((item) => item.accept)),
      ),
    );
    expect(patterns.some((accept) => accept.some((pattern) => pattern.includes(" / ")))).toBe(true);
    expect(patterns.some((accept) => accept.some((pattern) => /\(.+\)/u.test(pattern)))).toBe(true);
    expect(patterns.some((accept) => accept.length > 1)).toBe(true);
  });

  it("runs one exercise of the course from the foot of a page onto the next", () => {
    const spanning = built.course.pack.units
      .flatMap((unit) => unit.exercises)
      .filter(({ pages: [range] }) => range.to > range.from);
    expect(spanning.map((exercise) => exercise.id)).toEqual(["3.3"]);
  });

  it("refuses a source that breaks the layout", async () => {
    const broken = source("drills");
    const item = broken.units[0].exercises[0].items[0];
    item.accept = ["Are you 2 ready; yes", "there is / there's"];
    item.prompt = "you [and] me";
    broken.units[1].exercises[0].task = "1.1  Do it.";
    expect(sourceProblems(broken)).toEqual([
      "exercise 1.1 item 1: square brackets in the prompt",
      "exercise 1.1 item 1: a digit in the key",
      "exercise 1.1 item 1: a semicolon inside an answer",
      "exercise 1.1 item 1: a slash between more than single words",
      "exercise 2.1 task: a line break or extra space",
      "exercise 2.1: the task starts with a number",
    ]);
    await expect(buildBook(broken)).rejects.toThrow("The source breaks demo/LAYOUT.md");
  });
});
