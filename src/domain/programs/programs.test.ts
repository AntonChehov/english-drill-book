// The check of built-in programs in CI. It lives here and
// not in src: nothing in the running app validates a built-in program.
import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import programSchema from "../../../contracts/program.schema.json";
import { demoBooks } from "../books/demo/profiles";
import type { BookProfile } from "../books/types";
import demo from "./demo.json";

interface ProgramFile {
  scale: string[];
  goal: { from: string; to: string };
  requires: { pack: string; major: number }[];
  topics: {
    id: string;
    level: string;
    lead: { pack: string; unit: string };
    supplements?: { pack: string; exercise: string }[];
  }[];
}

const validate = new Ajv2020({ allErrors: true, strict: true }).compile(programSchema);
const profiles = demoBooks.map((book) => book.profile);
const builtIn = import.meta.glob<ProgramFile>("./*.json", { eager: true, import: "default" });

/** The rules of PROG-010 a program breaks, against the profiles of its books. */
function programProblems(program: ProgramFile, books: readonly BookProfile[]): string[] {
  const problems: string[] = [];
  const ids = program.topics.map((topic) => topic.id);
  if (new Set(ids).size !== ids.length) problems.push("topic IDs repeat");
  for (const topic of program.topics) {
    if (!program.scale.includes(topic.level)) problems.push(`${topic.id}: level off the scale`);
  }
  const from = program.scale.indexOf(program.goal.from);
  const to = program.scale.indexOf(program.goal.to);
  if (from === -1 || to === -1 || from > to) problems.push("goal not on the scale in order");

  const bookOf = (pack: string) => {
    const required = program.requires.find((entry) => entry.pack === pack);
    const book = books.find((profile) => profile.id === pack);
    return required !== undefined && book?.version.split(".")[0] === String(required.major)
      ? book
      : undefined;
  };
  for (const topic of program.topics) {
    const lead = bookOf(topic.lead.pack);
    if (lead === undefined) problems.push(`${topic.id}: pack ${topic.lead.pack} not required`);
    else if (!lead.units.some((unit) => unit.id === topic.lead.unit)) {
      problems.push(`${topic.id}: no unit ${topic.lead.unit}`);
    }
    for (const { pack, exercise } of topic.supplements ?? []) {
      const book = bookOf(pack);
      if (book === undefined) {
        problems.push(`${topic.id}: pack ${pack} not required`);
        continue;
      }
      const [unitId, n] = exercise.split(".");
      const unit = book.units.find((entry) => entry.id === unitId);
      const number = Number(n);
      if (
        unit === undefined ||
        !Number.isInteger(number) ||
        number < 1 ||
        number > unit.exercises
      ) {
        problems.push(`${topic.id}: no exercise ${exercise}`);
      }
    }
  }
  return problems;
}

describe("built-in programs", () => {
  it("@req PROG-010 there is at least one", () => {
    expect(Object.keys(builtIn)).toContain("./demo.json");
  });

  for (const [file, program] of Object.entries(builtIn)) {
    it(`@req PROG-010 ${file} is valid against the schema and breaks no rule`, () => {
      validate(program);
      expect(validate.errors ?? []).toEqual([]);
      expect(programProblems(program, profiles)).toEqual([]);
    });
  }

  const broken: [string, (program: ProgramFile) => void, string][] = [
    ["a repeated topic ID", (p) => (p.topics[1]!.id = "t1"), "topic IDs repeat"],
    ["a level off the scale", (p) => (p.topics[0]!.level = "B1"), "t1: level off the scale"],
    [
      "the goal reversed",
      (p) => (p.goal = { from: "A2", to: "A1" }),
      "goal not on the scale in order",
    ],
    ["a goal off the scale", (p) => (p.goal.to = "B2"), "goal not on the scale in order"],
    ["a pack not required", (p) => p.requires.pop(), "t1: pack demo-drills not required"],
    [
      "a lead pack not required",
      (p) => (p.topics[0]!.lead.pack = "other"),
      "t1: pack other not required",
    ],
    [
      "a required major the book does not have",
      (p) => (p.requires[0]!.major = 2),
      "t1: pack demo-course not required",
    ],
    ["an unknown unit", (p) => (p.topics[0]!.lead.unit = "9"), "t1: no unit 9"],
    [
      "an exercise past its unit's count",
      (p) => (p.topics[0]!.supplements![0]!.exercise = "1.4"),
      "t1: no exercise 1.4",
    ],
    [
      "an exercise of an unknown unit",
      (p) => (p.topics[0]!.supplements![0]!.exercise = "9.1"),
      "t1: no exercise 9.1",
    ],
    [
      "an exercise numbered 0",
      (p) => (p.topics[0]!.supplements![0]!.exercise = "1.0"),
      "t1: no exercise 1.0",
    ],
  ];
  for (const [name, breakIt, problem] of broken) {
    it(`@req PROG-010 catches ${name}`, () => {
      const program = structuredClone(demo) as ProgramFile;
      breakIt(program);
      expect(programProblems(program, profiles)).toContain(problem);
    });
  }
});

describe("the demo program", () => {
  it("@req PROG-015 joins topic N to unit N of the course and exercises N.1 – N.3 of the drills", () => {
    expect(demo.goal).toEqual({ from: "A1", to: "A2" });
    expect(demo.topics).toEqual(
      ["1", "2", "3", "4"].map((n) => ({
        id: `t${n}`,
        title: expect.any(String),
        level: Number(n) <= 2 ? "A1" : "A2",
        lead: { pack: "demo-course", unit: n },
        supplements: ["1", "2", "3"].map((k) => ({ pack: "demo-drills", exercise: `${n}.${k}` })),
      })),
    );
  });
});
