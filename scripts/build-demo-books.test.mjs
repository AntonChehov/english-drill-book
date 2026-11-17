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
  learnerOf,
  learnerPath,
  packPath,
  pdfPath,
  sourcePath,
  sourceProblems,
} from "./build-demo-books.mjs";

const root = process.cwd();
const source = (name) => JSON.parse(readFileSync(sourcePath(root, name), "utf8"));

/** The problems of the drill book whose unit 1 has `theory` as its learner theory. */
function withTheory(theory) {
  const changed = source("drills");
  changed.units[0].learner.theory = theory;
  return sourceProblems(changed);
}
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

  it("keeps the PDFs and documents.json as published before the sources gained the learner texts (PACK-004)", () => {
    // The hashes the change `demo-books` published; the layout reads no `learner` text.
    expect(JSON.parse(readFileSync(documentsPath(root), "utf8"))).toEqual({
      course: {
        sha256: "3fee82fb7bf060f52defd2091003414e5503c564caf1a9b0c26dac78b0873019",
        pages: 12,
      },
      drills: {
        sha256: "42121716a447b7d9d46b90703cc9e6d7c56cfda3c6b00ac9a7290f26c6b06a2f",
        pages: 6,
      },
    });
    for (const name of books) {
      expect(createHash("sha256").update(built[name].bytes).digest("hex")).toBe(
        JSON.parse(readFileSync(documentsPath(root), "utf8"))[name].sha256,
      );
    }
  });

  it("gives every unit of both packs its Russian title and theory and every exercise its help, the English as printed (PACK-004)", () => {
    const russian = /[а-яё]/iu;
    for (const name of books) {
      const { units } = source(name);
      built[name].pack.units.forEach((unit, unitIndex) => {
        expect(unit.title).toBe(units[unitIndex].learner.title);
        expect(unit.theory).toBe(units[unitIndex].learner.theory);
        expect(unit.theory).toMatch(russian);
        unit.exercises.forEach((exercise, exerciseIndex) => {
          const printed = units[unitIndex].exercises[exerciseIndex];
          expect(exercise.help).toBe(printed.learner.help);
          expect(exercise.help).toMatch(russian);
          expect(exercise.task).toBe(printed.task);
          expect(exercise.task).not.toMatch(russian);
          for (const item of exercise.items ?? []) {
            expect(item.prompt).not.toMatch(russian);
            for (const pattern of item.accept) expect(pattern).not.toMatch(russian);
          }
        });
      });
    }
    expect(built.course.pack.units.map((unit) => unit.title)).toEqual([
      "Глагол to be: am, is, are",
      "Present simple",
      "Артикли a и an",
      "There is и there are",
    ]);
    expect(built.drills.pack.units.map((unit) => unit.title)).toEqual(
      built.course.pack.units.map((unit) => unit.title),
    );
    expect(built.course.pack.title).toBe("Everyday Grammar: A Demo Course");
    expect(built.drills.pack.title).toBe("Everyday Grammar: Demo Drills");
  });

  it("writes the learner texts of both packs where the app joins them to a read pack", () => {
    const packs = Object.fromEntries(books.map((name) => [name, built[name].pack]));
    expect(learnerOf(packs)).toBe(readFileSync(learnerPath(root), "utf8"));
    const learner = JSON.parse(learnerOf(packs));
    expect(Object.keys(learner)).toEqual(books);
    expect(learner.course.units["1"]).toEqual({
      title: built.course.pack.units[0].title,
      theory: built.course.pack.units[0].theory,
    });
    expect(learner.drills.exercises["4.3"]).toEqual({
      help: built.drills.pack.units[3].exercises[2].help,
    });
  });

  it("refuses a source whose learner texts are missing, unclosed or over the limit", async () => {
    const broken = source("drills");
    delete broken.units[0].learner;
    broken.units[1].learner.theory = "Глагол *be\n\n\n\nещё";
    broken.units[1].learner.title = "т".repeat(201);
    delete broken.units[1].exercises[0].learner;
    broken.units[1].exercises[1].learner.help = "п".repeat(1001);
    broken.units[1].exercises[2].learner.help = "";
    expect(sourceProblems(broken)).toEqual([
      "unit 1: no learner title",
      "unit 1: no learner theory",
      "unit 2: the learner title is over 200 characters",
      "unit 2: an unclosed * in the theory",
      "unit 2: an empty paragraph in the theory",
      "exercise 2.1: no learner help",
      "exercise 2.2: the learner help is over 1000 characters",
      "exercise 2.3: no learner help",
    ]);
    await expect(buildBook(broken)).rejects.toThrow("The source breaks demo/LAYOUT.md");
  });

  it("checks the * of a theory paragraph by paragraph, as Study reads them", () => {
    // Even over the whole text, unclosed in each paragraph.
    expect(withTheory("Форма *am.\n\nФорма is*.")).toEqual([
      "unit 1: an unclosed * in the theory",
      "unit 1: an unclosed * in the theory",
    ]);
    expect(withTheory("Пустой ** отрезок.")).toEqual(["unit 1: an empty * span in the theory"]);
  });

  it("accepts touching spans such as *am**is*, which Study shows as two spans", () => {
    const changed = source("drills");
    changed.units[0].learner.theory = "Формы *am**is* и *are*.\n\nВторой абзац: *be*.";
    expect(sourceProblems(changed)).toEqual([]);
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
