import { describe, expect, it } from "vitest";
import { theoryParagraphs } from "./theory";

describe("PLAY-020 The explanation of a unit", () => {
  it("@req PLAY-020 splits a theory into paragraphs at a blank line, each paragraph into runs", () => {
    expect(
      theoryParagraphs("Глагол *be* имеет три формы.\n\nВ вопросе он первый: *Are you tired?*"),
    ).toEqual([
      [
        { text: "Глагол ", learned: false },
        { text: "be", learned: true },
        { text: " имеет три формы.", learned: false },
      ],
      [
        { text: "В вопросе он первый: ", learned: false },
        { text: "Are you tired?", learned: true },
      ],
    ]);
  });

  it("@req PLAY-020 a paragraph without a span is one plain run; spans may touch", () => {
    expect(theoryParagraphs("Только по-русски.")).toEqual([
      [{ text: "Только по-русски.", learned: false }],
    ]);
    expect(theoryParagraphs("*am*, *is*")).toEqual([
      [
        { text: "am", learned: true },
        { text: ", ", learned: false },
        { text: "is", learned: true },
      ],
    ]);
    expect(theoryParagraphs("*am**is*")).toEqual([
      [
        { text: "am", learned: true },
        { text: "is", learned: true },
      ],
    ]);
  });

  it("@req PLAY-020 shows an unclosed * literally, in the plain text", () => {
    expect(theoryParagraphs("Форма *am после I.")).toEqual([
      [{ text: "Форма *am после I.", learned: false }],
    ]);
    expect(theoryParagraphs("Формы *am* и *is")).toEqual([
      [
        { text: "Формы ", learned: false },
        { text: "am", learned: true },
        { text: " и *is", learned: false },
      ],
    ]);
    expect(theoryParagraphs("*")).toEqual([[{ text: "*", learned: false }]]);
  });

  it("@req PLAY-020 an empty text has no paragraphs; blank paragraphs and blank lines around are left out", () => {
    expect(theoryParagraphs("")).toEqual([]);
    expect(theoryParagraphs("\n\n  \n\n")).toEqual([]);
    expect(theoryParagraphs("\n\nОдин.\n\n\n\nДва.\n")).toEqual([
      [{ text: "Один.", learned: false }],
      [{ text: "Два.", learned: false }],
    ]);
  });

  it("@req PLAY-020 keeps a single line break inside a paragraph as text", () => {
    expect(theoryParagraphs("Одна\nстрока.")).toEqual([
      [{ text: "Одна\nстрока.", learned: false }],
    ]);
  });
});
