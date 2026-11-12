import { describe, expect, it } from "vitest";
import { checkAnswer, compileKey, NEAR_MIN_LENGTH, type CheckOptions, type Verdict } from "./index";

function verdict(
  accept: readonly string[],
  answer: string,
  options?: CheckOptions,
): Verdict | null {
  const compiled = compileKey(accept);
  if (!compiled.ok) throw new Error(`invalid key: ${JSON.stringify(compiled.errors)}`);
  return checkAnswer(compiled.key, answer, options);
}

const LEFT_SINGLE_QUOTE = String.fromCodePoint(0x2018);
const RIGHT_SINGLE_QUOTE = String.fromCodePoint(0x2019);
const COMBINING_ACUTE = String.fromCodePoint(0x0301);
const E_ACUTE = String.fromCodePoint(0x00e9);

describe("checkAnswer", () => {
  describe("@req CHK-001 pattern syntax", () => {
    it("@req CHK-001 accepts both sides of a loose alternative covering several words", () => {
      expect(verdict(["we have / we've got a dog"], "we have a dog")).toBe("ok");
      expect(verdict(["we have / we've got a dog"], "we've got a dog")).toBe("ok");
    });

    it("@req CHK-001 accepts both sides of a loose alternative covering one word", () => {
      expect(verdict(["a few / some people came"], "a few people came")).toBe("ok");
      expect(verdict(["a few / some people came"], "some people came")).toBe("ok");
    });

    it("@req CHK-001 accepts every member of a chain of loose alternatives", () => {
      for (const answer of ["red", "green", "blue"]) {
        expect(verdict(["red / green / blue"], answer)).toBe("ok");
      }
    });

    it("@req CHK-001 reads a slash inside a word as text", () => {
      expect(verdict(["and/or"], "and or")).toBe("ok");
    });

    it("@req CHK-001 accepts an answer matching any pattern of the list", () => {
      expect(verdict(["at home", "in the house"], "in the house")).toBe("ok");
    });
  });

  describe("@req CHK-003 normalisation", () => {
    it("@req CHK-003 ignores case, spaces and final punctuation", () => {
      for (const answer of ["SHE IS AT HOME", "she  is at home", "She is at home"]) {
        expect(verdict(["She is at home."], answer)).toBe("ok");
      }
    });

    it("@req CHK-003 accepts a contraction for the long form and the reverse", () => {
      expect(verdict(["I do not know"], "I don't know")).toBe("ok");
      expect(verdict(["they won't come"], "they will not come")).toBe("ok");
    });

    it("@req CHK-003 accepts an ellipsis for three dots", () => {
      expect(verdict(["well... yes"], "well… yes")).toBe("ok");
    });

    it("@req CHK-003 accepts cannot and can not for can't", () => {
      expect(verdict(["I can't swim"], "I cannot swim")).toBe("ok");
      expect(verdict(["I can't swim"], "I can not swim")).toBe("ok");
    });

    it("@req CHK-003 accepts a typographic apostrophe", () => {
      expect(verdict(["it isn't cold"], `it isn${RIGHT_SINGLE_QUOTE}t cold`)).toBe("ok");
    });

    it("@req CHK-003 ignores single quotation marks around direct speech", () => {
      const key = ["He said, 'I'm tired.'"];
      expect(verdict(key, "He said, I'm tired.")).toBe("ok");
      expect(verdict(key, `He said, "I'm tired."`)).toBe("ok");
      expect(verdict([`He said, "I'm tired."`], "He said, 'I'm tired.'")).toBe("ok");
      expect(verdict(["'Yes,' she said"], "Yes, she said")).toBe("ok");
      expect(verdict(["'he runs'"], "he runs")).toBe("ok");
      expect(verdict(["he runs"], "'he runs'")).toBe("ok");
    });

    it("@req CHK-003 expands a contraction before a closing quotation mark", () => {
      const quoted = `${LEFT_SINGLE_QUOTE}I can${RIGHT_SINGLE_QUOTE}t${RIGHT_SINGLE_QUOTE}`;
      expect(verdict([quoted], "I cannot")).toBe("ok");
    });

    it("@req CHK-003 keeps the apostrophe of a plural possessive", () => {
      expect(verdict(["the boys' room"], "the boys' room")).toBe("ok");
      expect(verdict(["the boys' room"], "the boys room")).toBe("near");
    });

    it("@req CHK-003 reads 's as is, has and a possessive", () => {
      expect(verdict(["he is tired"], "he's tired")).toBe("ok");
      expect(verdict(["he has gone"], "he's gone")).toBe("ok");
      expect(verdict(["it is Anna's bag"], "it's Anna's bag")).toBe("ok");
    });

    it("@req CHK-003 reads two 's of one answer differently", () => {
      expect(verdict(["she has said he is ill"], "she's said he's ill")).toBe("ok");
    });

    it("@req CHK-003 reads 'd as would and had", () => {
      expect(verdict(["I would like tea"], "I'd like tea")).toBe("ok");
      expect(verdict(["I had seen it"], "I'd seen it")).toBe("ok");
    });

    it("@req CHK-003 accepts a decomposed letter for a composed one", () => {
      expect(verdict([`caf${E_ACUTE}`], `cafe${COMBINING_ACUTE}`)).toBe("ok");
    });
  });

  describe("@req CHK-004 letters", () => {
    it("@req CHK-004 checks an answer in Russian", () => {
      expect(verdict(["Она дома."], "она дома")).toBe("ok");
      expect(verdict(["Она дома."], "ОНА ДОМА")).toBe("ok");
    });

    it("@req CHK-004 accepts е for ё", () => {
      expect(verdict(["всё"], "все")).toBe("ok");
    });

    it("@req CHK-004 drops other characters", () => {
      expect(verdict(["tea"], "tea ☕")).toBe("ok");
    });
  });

  describe("@req CHK-005 correct answer", () => {
    it("@req CHK-005 is ok when equal after normalisation", () => {
      expect(verdict(["He's been here."], "he has been here")).toBe("ok");
    });

    it("@req CHK-005 compares the text of a reading, not its number of words", () => {
      expect(verdict(["a lot"], "alot")).toBe("ok");
    });
  });

  describe("@req CHK-006 almost right", () => {
    it("@req CHK-006 is near for one wrong letter", () => {
      expect(verdict(["the weather is beautiful"], "the weather is beatiful")).toBe("near");
    });

    it("@req CHK-006 is near for one letter too many or one replaced", () => {
      expect(verdict(["the weather is beautiful"], "the weather is beautifull")).toBe("near");
      expect(verdict(["the weather is beautiful"], "the weather iz beautiful")).toBe("near");
    });

    it("@req CHK-006 is bad for a missing word", () => {
      expect(verdict(["she is a doctor"], "she is doctor")).toBe("bad");
    });

    it("@req CHK-006 is bad for a missing auxiliary", () => {
      expect(verdict(["I am ill"], "I ill")).toBe("bad");
    });

    it("@req CHK-006 is bad for a short answer", () => {
      expect(NEAR_MIN_LENGTH).toBe(4);
      expect(verdict(["cat"], "cut")).toBe("bad");
      expect(verdict(["cats"], "cuts")).toBe("near");
    });

    it("@req CHK-006 is bad for two wrong letters", () => {
      expect(verdict(["I do not know"], "I do not no")).toBe("bad");
      expect(verdict(["I do not know"], "I do not knaw")).toBe("near");
    });

    it("@req CHK-006 is bad for a missing apostrophe, which changes the number of words", () => {
      expect(verdict(["I don't know"], "I dont know")).toBe("bad");
    });
  });

  describe("@req CHK-007 wrong answer", () => {
    it("@req CHK-007 is bad for another word", () => {
      expect(verdict(["she goes"], "she went")).toBe("bad");
    });

    it("@req CHK-007 is bad for punctuation only", () => {
      expect(verdict(["she goes"], "?")).toBe("bad");
    });
  });

  describe("@req CHK-008 blank answer", () => {
    it("@req CHK-008 gives no verdict to an empty answer or spaces only", () => {
      expect(verdict(["she goes"], "")).toBeNull();
      expect(verdict(["she goes"], "   ")).toBeNull();
      expect(verdict(["she goes"], "\t\n")).toBeNull();
    });

    it("@req CHK-008 is ok for a blank when the key accepts a blank", () => {
      expect(verdict(["", "the"], "")).toBe("ok");
      expect(verdict(["", "the"], "the")).toBe("ok");
      expect(verdict(["", "the"], "a")).toBe("bad");
    });

    it("@req CHK-008 is ok for punctuation only when the key accepts a blank", () => {
      expect(verdict(["(the)"], "?")).toBe("ok");
    });
  });

  describe("@req CHK-009 items with choices", () => {
    const choices = { choices: ["than", "then"] };

    it("@req CHK-009 is ok for the right option and bad for the wrong one", () => {
      expect(verdict(["than"], "than", choices)).toBe("ok");
      expect(verdict(["than"], "then", choices)).toBe("bad");
      expect(verdict(["than"], "then")).toBe("near");
    });

    it("@req CHK-009 gives no verdict when nothing is chosen", () => {
      expect(verdict(["than"], "", choices)).toBeNull();
    });
  });

  describe("@req CHK-013 determinism", () => {
    it("@req CHK-013 lowers a capital I to i whatever the language of the system", () => {
      expect(verdict(["it is"], "IT IS")).toBe("ok");
      expect(verdict(["I am"], "i am")).toBe("ok");
    });
  });
});
