import { describe, expect, it } from "vitest";
import coursePack from "../../../../demo/course.pack.json";
import courseText from "../../../../demo/course.text.json";
import drillsPack from "../../../../demo/drills.pack.json";
import drillsText from "../../../../demo/drills.text.json";
import type { Pack } from "../../packs/types";
import { validatePack } from "../../packs/validate";
import type { PageText } from "../types";
import { withLearnerTexts, type LearnerTexts } from "./learner";
import { demoBooks, demoCourse, demoDrills } from "./profiles";
import { readDemoBook } from "./reader";

const books = [
  { name: "course", book: demoCourse, text: courseText as PageText[], pack: coursePack },
  { name: "drills", book: demoDrills, text: drillsText as PageText[], pack: drillsPack },
];

const russian = /[а-яё]/iu;

/** What the reader finds in the pages of `book`. */
function readPack(book: (typeof books)[number]): Pack {
  const result = readDemoBook(book.book.profile, book.text, book.pack.source.documents[0]!);
  if (!result.ok) throw new Error("The demo book was not read");
  return result.pack;
}

describe("PACK-004 What the pack says to the learner", () => {
  for (const entry of books) {
    it(`@req PACK-004 the ${entry.name} read from its pages, joined with learner.json, is demo/${entry.name}.pack.json`, () => {
      const read = readPack(entry);
      expect(withLearnerTexts(read, entry.book.learner)).toEqual(entry.pack);
      expect(validatePack(withLearnerTexts(read, entry.book.learner)).ok).toBe(true);
    });

    it(`@req PACK-004 every unit of the ${entry.name} has a Russian title and theory and every exercise a help; the material stays English`, () => {
      const read = readPack(entry);
      const pack = withLearnerTexts(read, entry.book.learner);
      expect(pack.title).toBe(read.title);
      expect(pack.title).not.toMatch(russian);
      pack.units.forEach((unit, index) => {
        const printed = read.units[index]!;
        expect(unit.theory).toMatch(russian);
        expect(unit.theory).not.toBe(printed.title);
        expect(
          unit.exercises.map(({ help }) => help).every((help) => russian.test(help ?? "")),
        ).toBe(true);
        // The English of the pages: the tasks, prompts, choices, texts, models and samples.
        unit.exercises.forEach((exercise, at) => {
          const { help: _help, ...rest } = exercise;
          expect(rest).toEqual(printed.exercises[at]);
        });
        expect(unit.pages).toEqual(printed.pages);
      });
    });
  }

  it("@req PACK-004 the unit titles are the Russian ones in both books, the English ones on the pages", () => {
    const titles = [
      "Глагол to be: am, is, are",
      "Present simple",
      "Артикли a и an",
      "There is и there are",
    ];
    for (const entry of books) {
      expect(
        withLearnerTexts(readPack(entry), entry.book.learner).units.map((u) => u.title),
      ).toEqual(titles);
      expect(readPack(entry).units.map((unit) => unit.title)).toEqual([
        "To be: am, is, are",
        "Present simple",
        "A and an",
        "There is and there are",
      ]);
    }
  });

  it("@req PACK-004 the profiles name version 1.1.0 and carry the learner texts of their book", () => {
    for (const book of demoBooks) {
      expect(book.profile.version).toBe("1.1.0");
      expect(Object.keys(book.learner.units)).toEqual(["1", "2", "3", "4"]);
      expect(Object.keys(book.learner.exercises)).toHaveLength(12);
    }
    expect(coursePack.version).toBe("1.1.0");
    expect(drillsPack.version).toBe("1.1.0");
  });

  it("@req PACK-004 leaves a unit or an exercise the texts do not name as it is, and changes nothing else", () => {
    const read = readPack(books[0]!);
    const partial: LearnerTexts = {
      units: { "2": { title: "Present simple", theory: "Настоящее простое время." } },
      exercises: { "2.1": { help: "Поставьте глагол в present simple." } },
    };
    const pack = withLearnerTexts(read, partial);
    expect(pack.units[0]).toEqual(read.units[0]);
    expect(pack.units[1]).toEqual({
      ...read.units[1],
      theory: "Настоящее простое время.",
      exercises: [
        { ...read.units[1]!.exercises[0], help: "Поставьте глагол в present simple." },
        read.units[1]!.exercises[1],
        read.units[1]!.exercises[2],
      ],
    });
    expect(withLearnerTexts(read, { units: {}, exercises: {} })).toEqual(read);
    // Pure: the pack read is not changed.
    expect(read.units[1]!.theory).toBeUndefined();
  });
});
