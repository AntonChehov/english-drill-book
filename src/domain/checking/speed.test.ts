// The speed of CHK-014 (design D7). The only test of the checker that reads a clock.
/* oxlint-disable no-restricted-properties -- measuring time is what this test is for */
import { describe, expect, it } from "vitest";
import {
  checkAnswer,
  compileKey,
  MAX_ANSWER_LENGTH,
  MAX_KEY_CHARACTERS,
  MAX_KEY_READINGS,
  type Key,
} from "./index";

const CHECKS = 200;
const PREPARATIONS = 5;
const LIMIT_MS = 5;

/** Four `'s`: 81 readings of every variant and of the answer, the most the rules allow. */
const FOUR_S = "he's she's it's that's";

function median(values: readonly number[]): number {
  const sorted = values.toSorted((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? Number.NaN;
}

function timed(run: () => unknown): number {
  const start = performance.now();
  run();
  return performance.now() - start;
}

function keyOf(accept: readonly string[]): Key {
  const compiled = compileKey(accept);
  if (!compiled.ok) throw new Error(`invalid key: ${JSON.stringify(compiled.errors)}`);
  return compiled.key;
}

/** An invented ten-letter word, different for each index. */
function filler(index: number): string {
  return Array.from({ length: 10 }, (_, at) =>
    String.fromCharCode(97 + ((index * 7 + at * 3) % 26)),
  ).join("");
}

/** Endings of four letters, the same two first, so every one is two edits from `qqzz`. */
function endings(count: number): readonly string[] {
  return Array.from({ length: count }, (_, index) => `qq${filler(index).slice(0, 2)}`);
}

/**
 * The worst key for `count` endings: a beginning shared with the answer, as long as the limits
 * of CHK-002 allow, then four `'s`, then one of the endings. The answer has the same beginning,
 * words and length and is `bad`, so every comparison runs to its end.
 */
function sharedBeginning(count: number): { accept: string; answer: string } {
  const build = (words: number) => {
    const beginning = Array.from({ length: words }, (_, index) => filler(index)).join(" ");
    return {
      accept: `${beginning} ${FOUR_S} [${endings(count).join("|")}]`,
      answer: `${beginning} ${FOUR_S} qqzz`,
    };
  };
  let words = 0;
  while (compileKey([build(words + 1).accept]).ok) words += 1;
  return build(words);
}

function measure(name: string, accept: readonly string[], answer: string): number {
  let key = keyOf(accept);
  const preparing = Array.from({ length: PREPARATIONS }, () =>
    timed(() => {
      key = keyOf(accept);
    }),
  );
  const checking = Array.from({ length: CHECKS }, () => timed(() => checkAnswer(key, answer)));
  const checkMedian = median(checking);
  // oxlint-disable-next-line no-console -- design D7 asks for the medians in the test output
  console.info(
    `CHK-014 ${name}: median of ${CHECKS} checks ${checkMedian.toFixed(3)} ms; ` +
      `median of ${PREPARATIONS} preparations ${median(preparing).toFixed(2)} ms`,
  );
  return checkMedian;
}

describe("speed", () => {
  for (const count of [1, 4, 8]) {
    it(`@req CHK-014 checks a bad answer of 81 readings against ${count} long ending(s) in under 5 ms`, () => {
      const { accept, answer } = sharedBeginning(count);
      const key = keyOf([accept]);
      const characters = [...key.readings.keys()].reduce((sum, text) => sum + text.length, 0);
      expect(characters).toBeGreaterThan(MAX_KEY_CHARACTERS * 0.75);
      expect(checkAnswer(key, answer)).toBe("bad");
      expect(measure(`${count} ending(s)`, [accept], answer)).toBeLessThan(LIMIT_MS);
    });
  }

  for (const count of [1, 4, 8]) {
    it(`@req CHK-014 checks a bad answer of 1000 characters against ${count} long ending(s) in under 5 ms`, () => {
      const { accept, answer } = sharedBeginning(count);
      // Punctuation reads as nothing: the readings stay those of the worst answer above, and
      // normalising reads all 1000 characters.
      const longest = answer.padEnd(MAX_ANSWER_LENGTH, ".");
      expect(longest).toHaveLength(MAX_ANSWER_LENGTH);
      expect(checkAnswer(keyOf([accept]), longest)).toBe("bad");
      const name = `1000 characters, ${count} ending(s)`;
      expect(measure(name, [accept], longest)).toBeLessThan(LIMIT_MS);
    });
  }

  it("@req CHK-014 refuses an answer of 200 000 characters in under 5 ms", () => {
    const { accept } = sharedBeginning(1);
    const pasted = `${FOUR_S} ${"b".repeat(200_000)}`;
    expect(checkAnswer(keyOf([accept]), pasted)).toBe("bad");
    expect(measure("200 000 characters", [accept], pasted)).toBeLessThan(LIMIT_MS);
  });

  it("@req CHK-014 prepares the keys of review round 2 in well under 100 ms", () => {
    const ten = "[a|b|c|d|e|f|g|h|i|j]";
    const equal = `[${Array.from({ length: 4000 }, () => "x").join("|")}]`;
    const keys: readonly [string, readonly string[]][] = [
      ["3999 groups of 4000 equal alternatives", Array.from({ length: 3999 }, () => equal)],
      [
        "200 patterns of four 's before 4000 variants",
        Array.from({ length: 200 }, () => `${FOUR_S} ${ten} ${ten} ${ten} [a|b|c|d]`),
      ],
      ["one pattern of 500 000 words", [Array.from({ length: 500_000 }, () => "a").join(" ")]],
    ];
    for (const [name, accept] of keys) {
      expect(compileKey(accept).ok).toBe(false);
      const preparing = median(Array.from({ length: 3 }, () => timed(() => compileKey(accept))));
      // oxlint-disable-next-line no-console -- design D7 asks for the medians in the test output
      console.info(`CHK-014 preparing ${name}: median of 3 ${preparing.toFixed(2)} ms`);
      expect(preparing).toBeLessThan(100);
    }
  });

  it("@req CHK-014 prepares the slowest valid key found within a second", () => {
    // 4000 patterns of 500 characters, the most a key holds: every character is normalised.
    const accept = Array.from({ length: MAX_KEY_READINGS }, (_, index) =>
      `${index}`.padEnd(500, "'"),
    );
    expect(compileKey(accept).ok).toBe(true);
    const preparing = median(Array.from({ length: 3 }, () => timed(() => compileKey(accept))));
    // oxlint-disable-next-line no-console -- design D7 asks for the medians in the test output
    console.info(
      `CHK-014 preparing 4000 patterns of 500 characters: median of 3 ${preparing.toFixed(1)} ms`,
    );
    expect(preparing).toBeLessThan(1000);
  });

  it("@req CHK-014 checks a bad answer against 4000 readings of one shape in under 5 ms", () => {
    const ten = "[a|b|c|d|e|f|g|h|i|j]";
    const accept = `${ten} ${ten} ${ten} [a|b|c|d]`;
    expect(keyOf([accept]).readings.size).toBe(MAX_KEY_READINGS);
    expect(checkAnswer(keyOf([accept]), "j j x x")).toBe("bad");
    expect(measure("4000 readings", [accept], "j j x x")).toBeLessThan(LIMIT_MS);
  });

  it("@req CHK-014 checks a near answer against a key with 's and 'd in under 5 ms", () => {
    const accept = "he's [ba|ca|da|fa|ga] [be|ce|de|fe|ge] [bi|ci|di|fi|gi] and she'd go";
    const answer = "he's ga ge gi and she'd gx";
    expect(checkAnswer(keyOf([accept]), answer)).toBe("near");
    expect(measure("near", [accept], answer)).toBeLessThan(LIMIT_MS);
  });

  it("@req CHK-014 refuses the keys that would be slower, before any check", () => {
    const ten = "[a|b|c|d|e|f|g|h|i|j]";
    expect(compileKey([`${FOUR_S} ${ten} ${ten} ${ten} [a|b|c|d]`])).toEqual({
      ok: false,
      errors: [{ index: null, reason: "key-too-large" }],
    });
    expect(compileKey([`${sharedBeginning(1).accept} more`]).ok).toBe(false);
  });
});
