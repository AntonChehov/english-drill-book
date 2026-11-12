import { describe, expect, it } from "vitest";
import coursePack from "../../../../demo/course.pack.json";
import courseText from "../../../../demo/course.text.json";
import drillsPack from "../../../../demo/drills.pack.json";
import drillsText from "../../../../demo/drills.text.json";
import { validatePack } from "../../packs/validate";
import type { Line, PageText, ReadProblem } from "../types";
import { demoBooks, demoCourse, demoDrills } from "./profiles";
import { DEMO_SIZES, parseAnswers, readDemoBook } from "./reader";

const books = [
  { name: "course", book: demoCourse, text: courseText as PageText[], pack: coursePack },
  { name: "drills", book: demoDrills, text: drillsText as PageText[], pack: drillsPack },
];

const documentOf = (pack: typeof coursePack) => pack.source.documents[0]!;

/** The text with every line that `drop` matches left out. */
function without(text: readonly PageText[], drop: (line: Line) => boolean): PageText[] {
  return text.map((page) => ({ ...page, lines: page.lines.filter((line) => !drop(line)) }));
}

/** The text with `change` applied to every line. */
function changed(text: readonly PageText[], change: (line: Line) => Line): PageText[] {
  return text.map((page) => ({ ...page, lines: page.lines.map(change) }));
}

/** The text with a line added at the end of page `page`. */
function withLine(text: readonly PageText[], page: number, line: Line): PageText[] {
  return text.map((found) =>
    found.page === page ? { ...found, lines: [...found.lines, line] } : found,
  );
}

const course = () => courseText as PageText[];

/** Page ranges two pages later. */
const later = (ranges: { document: string; from: number; to: number }[]) =>
  ranges.map((range) => ({ ...range, from: range.from + 2, to: range.to + 2 }));
const read = (text: readonly PageText[]) =>
  readDemoBook(demoCourse.profile, text, documentOf(coursePack));
const problemsOf = (text: readonly PageText[]): readonly ReadProblem[] => {
  const result = read(text);
  return result.ok ? [] : result.problems;
};

const body = (text: string, y = 700, x = 64): Line => ({ text, x, y, size: DEMO_SIZES.body });
const task = (text: string, y = 700): Line => ({ text, x: 64, y, size: DEMO_SIZES.task });
const heading = (text: string, y = 700): Line => ({ text, x: 64, y, size: DEMO_SIZES.heading });

describe("PACK-003 The demo book: reading", () => {
  for (const { name, book, text, pack } of books) {
    it(`@req PACK-003 reads the text of public/demo/${name}.pdf into exactly the pack of its source`, () => {
      expect(readDemoBook(book.profile, text, documentOf(pack))).toEqual({ ok: true, pack });
    });

    it(`@req PACK-001 @req PACK-003 reads public/demo/${name}.pdf into a pack that passes validation`, () => {
      const result = readDemoBook(book.profile, text, documentOf(pack));
      expect(result.ok && validatePack(result.pack).ok).toBe(true);
    });

    it(`@req PACK-003 finds the units of ${name} by content: two blank pages in front shift only the page ranges`, () => {
      const shifted: PageText[] = [
        { page: 1, lines: [] },
        { page: 2, lines: [] },
        ...text.map((page) => ({ ...page, page: page.page + 2 })),
      ];
      const expected = {
        ...pack,
        units: pack.units.map((unit) => ({
          ...unit,
          pages: later(unit.pages),
          exercises: unit.exercises.map((exercise) => ({
            ...exercise,
            pages: later(exercise.pages),
          })),
        })),
      };
      expect(readDemoBook(book.profile, shifted, documentOf(pack))).toEqual({
        ok: true,
        pack: expected,
      });
    });
  }

  it("@req PACK-003 has a profile for each demo book, the course first", () => {
    expect(demoBooks.map(({ profile }) => profile.id)).toEqual(["demo-course", "demo-drills"]);
    expect(demoBooks.map(({ file }) => file)).toEqual(["demo/course.pdf", "demo/drills.pdf"]);
  });

  it("@req PACK-003 records the hash and page count of the document it read", () => {
    const result = readDemoBook(demoCourse.profile, course(), {
      sha256: "f".repeat(64),
      pages: 99,
    });
    expect(result.ok && result.pack.source?.documents).toEqual([
      { role: "book", sha256: "f".repeat(64), pages: 99 },
    ]);
  });
});

describe("PACK-003 The demo book: damaged text", () => {
  it("@req PACK-003 without the heading of unit 2, reports the unit missing and returns no pack", () => {
    const problems = problemsOf(
      without(course(), (line) => line.text.startsWith("Unit 2 Present")),
    );
    expect(problems).toContainEqual({ kind: "unit-missing", id: "2" });
    expect(problems).toContainEqual({ kind: "exercise-unexpected", id: "2.1", page: 6 });
    expect(read(without(course(), (line) => line.text.startsWith("Unit 2 Present"))).ok).toBe(
      false,
    );
  });

  it("@req PACK-003 without the key line of exercise 3.2, reports its key missing", () => {
    const damaged = without(course(), (line) => line.text.startsWith("3.2 1 an (egg)"));
    // Its second line now follows the entry of 3.1, whose answers then do not add up.
    expect(problemsOf(damaged)).toEqual([
      { kind: "key-mismatch", id: "3.1" },
      { kind: "key-missing", id: "3.2" },
    ]);
    const gone = without(
      course(),
      (line) => line.text.startsWith("3.2 1 an (egg)") || line.text.startsWith("7 an (ice cream)"),
    );
    expect(problemsOf(gone)).toEqual([{ kind: "key-missing", id: "3.2" }]);
  });

  it("@req PACK-003 with exercise 1.2 numbered 1.1, reports the number repeated and 1.2 missing", () => {
    const damaged = changed(course(), (line) =>
      line.text.startsWith("1.2 Choose the correct word.")
        ? { ...line, text: line.text.replace("1.2", "1.1") }
        : line,
    );
    expect(problemsOf(damaged)).toEqual([
      { kind: "exercise-repeated", id: "1.1", page: 4 },
      { kind: "exercise-missing", id: "1.2" },
      { kind: "key-unexpected", id: "1.2" },
    ]);
  });

  it("@req PACK-003 reports a unit printed twice, a unit the profile does not have and an exercise too many", () => {
    let damaged = withLine(course(), 9, heading("Unit 3 A and an again", 790));
    damaged = withLine(damaged, 11, task("4.4 Write more.", 790));
    damaged = withLine(damaged, 11, body("1 More.", 800));
    damaged = withLine(damaged, 11, heading("Unit 5 Extra", 810));
    expect(problemsOf(damaged)).toEqual([
      { kind: "unit-repeated", id: "3", page: 9 },
      { kind: "unit-unexpected", id: "5", page: 11 },
      { kind: "exercise-unexpected", id: "4.4", page: 11 },
    ]);
  });

  it("@req PACK-003 without the answer key, reports only that the key is missing", () => {
    const damaged = changed(course(), (line) =>
      line.text === "Answer key" ? { ...line, text: "Answers" } : line,
    );
    expect(problemsOf(damaged)).toEqual([{ kind: "key-section-missing", id: "" }]);
  });

  it("@req PACK-003 reports a key entry printed twice", () => {
    const damaged = withLine(course(), 12, body("4.2 1 Is there", 800));
    expect(problemsOf(damaged)).toEqual([{ kind: "key-repeated", id: "4.2", page: 12 }]);
  });

  it("@req PACK-003 reports items out of order", () => {
    const damaged = changed(course(), (line) =>
      line.text === "3 Omar and Priya ___ in the garden."
        ? { ...line, text: "4 Omar and Priya ___ in the garden." }
        : line,
    );
    expect(problemsOf(damaged)).toEqual([{ kind: "item-sequence", id: "1.1", page: 4 }]);
  });

  it("@req PACK-003 reports a connected text without its text", () => {
    const damaged = without(
      course(),
      (line) =>
        line.size === DEMO_SIZES.body && /^(Omar \(live\)|he \(walk\)|\(call\))/u.test(line.text),
    );
    expect(problemsOf(damaged)).toEqual([{ kind: "exercise-empty", id: "2.3", page: 6 }]);
  });

  it("@req PACK-003 reads an open exercise without ideas or example", () => {
    let damaged = without(course(), (line) => line.text.startsWith("Ideas:"));
    damaged = changed(damaged, (line) =>
      line.text.startsWith("4.3 Answers will vary.")
        ? { ...line, text: "4.3 Answers will vary." }
        : line,
    );
    damaged = without(damaged, (line) => line.text.startsWith("the desk. There isn't"));
    const result = read(damaged);
    expect(result.ok && result.pack.units[3]!.exercises[2]).toEqual({
      id: "4.3",
      type: "open",
      task: "Write four sentences about your room. Use there is and there are.",
      pages: [{ document: "book", from: 11, to: 11 }],
    });
  });

  it("@req PACK-003 skips lines of other sizes and lines in the task size that start no exercise", () => {
    let damaged = withLine(course(), 4, { text: "1.9 small print", x: 64, y: 790, size: 8 });
    damaged = withLine(damaged, 3, task("The rule", 300));
    expect(read(damaged)).toEqual({ ok: true, pack: coursePack });
  });
});

describe("parseAnswers", () => {
  it("splits numbered answers and whole answers separated by ;", () => {
    expect(parseAnswers("1 is 2 No, he isn't; No, he's not 3 am", 3)).toEqual([
      ["is"],
      ["No, he isn't", "No, he's not"],
      ["am"],
    ]);
  });

  it("refuses a key that does not start at 1, misses a number or has too many", () => {
    expect(parseAnswers("is 2 are", 2)).toBeUndefined();
    expect(parseAnswers("1 is 3 are", 2)).toBeUndefined();
    expect(parseAnswers("1 is 2 are", 3)).toBeUndefined();
    expect(parseAnswers("1 is 2 3 are", 3)).toBeUndefined();
    expect(parseAnswers("1 is 2", 2)).toBeUndefined();
    expect(parseAnswers("", 1)).toBeUndefined();
  });

  it("refuses a number where an answer should be, since answers have no digits", () => {
    expect(parseAnswers("1 is 2 are 3", 2)).toBeUndefined();
    expect(parseAnswers("1 is 2 are 7 an 8 a", 2)).toBeUndefined();
  });
});
