import { describe, expect, it } from "vitest";
import { INDEPENDENT_READINGS, readings } from "./normalise";

const RIGHT_SINGLE_QUOTE = String.fromCodePoint(0x2019);
const COMBINING_ACUTE = String.fromCodePoint(0x0301);
const E_ACUTE = String.fromCodePoint(0x00e9);

function texts(text: string): readonly string[] {
  return readings(text).map((reading) => reading.text);
}

/** The single reading of a text without `'s` or `'d`. */
function only(text: string): { text: string; words: number } {
  const all = readings(text);
  expect(all).toHaveLength(1);
  return { ...all[0]! };
}

describe("readings", () => {
  describe("@req CHK-003 normalisation", () => {
    it("@req CHK-003 ignores case, spaces and final punctuation", () => {
      const expected = { text: "sheisathome", words: 4 };
      for (const text of [
        "She is at home.",
        "SHE IS AT HOME",
        "she  is at home",
        "She is at home",
      ]) {
        expect(only(text)).toEqual(expected);
      }
    });

    it("@req CHK-003 expands every contraction of step 4", () => {
      const pairs = [
        ["won't", "will not"],
        ["can't", "can not"],
        ["cannot", "can not"],
        ["shan't", "shall not"],
        ["isn't", "is not"],
        ["I'm", "I am"],
        ["you're", "you are"],
        ["we've", "we have"],
        ["they'll", "they will"],
      ] as const;
      for (const [contraction, longForm] of pairs) {
        expect(only(contraction)).toEqual({ ...only(longForm), words: 2 });
      }
    });

    it("@req CHK-003 counts a contraction as the words it stands for", () => {
      expect(only("I don't know")).toEqual({ text: "idonotknow", words: 4 });
    });

    it("@req CHK-003 expands a contraction at the end of a word only", () => {
      expect(only("the dos and don'ts")).toEqual({ text: "thedosanddon'ts", words: 4 });
      expect(only("I'mx")).toEqual({ text: "i'mx", words: 1 });
    });

    it("@req CHK-003 reads an ellipsis as three dots", () => {
      expect(only("well… yes")).toEqual(only("well... yes"));
    });

    it("@req CHK-003 reads a typographic apostrophe as an ASCII one", () => {
      expect(only(`it isn${RIGHT_SINGLE_QUOTE}t cold`)).toEqual(only("it is not cold"));
      expect(texts(`Anna${RIGHT_SINGLE_QUOTE}s`)).toEqual(texts("Anna's"));
    });

    it("@req CHK-003 drops typographic quotes", () => {
      expect(only("“yes” «no»")).toEqual({ text: "yesno", words: 2 });
    });

    it("@req CHK-003 removes single quotation marks and keeps apostrophes inside words", () => {
      expect(only("he said, 'I'm tired.'")).toEqual({ text: "hesaidiamtired", words: 5 });
      expect(only("'yes,' she said")).toEqual({ text: "yesshesaid", words: 3 });
      expect(only("rock 'n' roll")).toEqual({ text: "rocknroll", words: 3 });
      expect(only("'a 'b' c'")).toEqual({ text: "abc", words: 3 });
      expect(only("' - ''")).toEqual({ text: "", words: 0 });
    });

    it("@req CHK-003 keeps an apostrophe after a word when no quotation is open", () => {
      expect(only("the boys' room")).toEqual({ text: "theboys'room", words: 3 });
      expect(only("'the boys' room'")).toEqual({ text: "theboysroom'", words: 3 });
    });

    it("@req CHK-003 removes an apostrophe at the start of a word, as in 'tis", () => {
      expect(only("'tis")).toEqual({ text: "tis", words: 1 });
    });

    it("@req CHK-003 reads a composed and a decomposed letter alike", () => {
      expect(only(`caf${E_ACUTE}`)).toEqual(only(`cafe${COMBINING_ACUTE}`));
    });

    it("@req CHK-003 reads 's three ways", () => {
      expect(readings("he's tired")).toEqual([
        { text: "heistired", words: 3 },
        { text: "hehastired", words: 3 },
        { text: "he'stired", words: 2 },
      ]);
    });

    it("@req CHK-003 reads 'd two ways", () => {
      expect(readings("I'd go")).toEqual([
        { text: "iwouldgo", words: 3 },
        { text: "ihadgo", words: 3 },
      ]);
    });

    it("@req CHK-003 reads each 's and 'd of a text independently", () => {
      const all = texts("she's said he'd go");
      expect(all).toHaveLength(6);
      expect(all).toContain("shehassaidhewouldgo");
      expect(all).toContain("sheissaidhehadgo");
    });

    it("@req CHK-003 reads the first four 's and 'd independently and later ones as the fourth", () => {
      const all = texts("a's b's c's d's e's");
      expect(INDEPENDENT_READINGS).toBe(4);
      expect(all).toHaveLength(3 ** 4);
      expect(all).toContain("aisbhascisdhasehas");
      expect(all).not.toContain("aisbiscisdisehas");
    });

    it("@req CHK-003 pairs is with would and has with had after the fourth", () => {
      const all = texts("a's b's c's d's e'd");
      expect(all).toHaveLength(3 ** 4);
      expect(all).toContain("aisbiscisdisewould");
      expect(all).toContain("aisbiscisdhasehad");
      expect(all).toContain("aisbiscisd'sehad");
      expect(texts("a'd b'd c'd d'd e's")).toContain("ahadbhadchaddhadehas");
    });

    it("@req CHK-003 reads 's and 'd at the end of a word only", () => {
      expect(only("it'sy")).toEqual({ text: "it'sy", words: 1 });
    });

    it("@req CHK-003 keeps a slash inside a word out of the reading", () => {
      expect(only("and/or")).toEqual({ text: "andor", words: 1 });
    });

    it("@req CHK-003 reads a blank or punctuation-only text as empty", () => {
      expect(readings("")).toEqual([{ text: "", words: 0 }]);
      expect(readings(" ? ")).toEqual([{ text: "", words: 0 }]);
    });

    it("@req CHK-003 lowers case without regard to the language of the system", () => {
      expect(only("IT IS")).toEqual({ text: "itis", words: 2 });
      expect(only("I")).toEqual({ text: "i", words: 1 });
    });
  });

  describe("@req CHK-004 letters", () => {
    it("@req CHK-004 keeps Cyrillic letters and lowers their case", () => {
      expect(only("Она дома.")).toEqual({ text: "онадома", words: 2 });
      expect(only("ОНА ДОМА")).toEqual({ text: "онадома", words: 2 });
    });

    it("@req CHK-004 reads ё as е", () => {
      expect(only("всё")).toEqual(only("все"));
      expect(only("ВСЁ")).toEqual(only("все"));
    });

    it("@req CHK-004 keeps Latin letters with marks and the digits 0-9", () => {
      expect(only("naïve 2nd")).toEqual({ text: "naïve2nd", words: 2 });
    });

    it("@req CHK-004 drops other characters, and a word made only of them", () => {
      expect(only("tea ☕")).toEqual({ text: "tea", words: 1 });
      expect(only("α β tea ٣")).toEqual({ text: "tea", words: 1 });
    });
  });
});
