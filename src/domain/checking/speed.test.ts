// The speed of CHK-014 (design D7). The only test of the checker that reads a clock.
/* oxlint-disable no-restricted-properties -- measuring time is what this test is for */
import { describe, expect, it } from "vitest";
import { checkAnswer, compileKey, expandPattern, MAX_VARIANTS, type Key } from "./index";

// 125 × 32 = 4000 variants of one length, each with 's and 'd: every variant is a candidate
// for `near`, and every one has six readings.
const LARGEST =
  "he's [ba|ca|da|fa|ga] [be|ce|de|fe|ge] [bi|ci|di|fi|gi] [bo|co] [bu|cu] [by|cy] [ko|lo] [ku|lu] and she'd go";
const CHECKS = 200;
const PREPARATIONS = 11;

function median(values: readonly number[]): number {
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[middle] ?? 0)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function timed(run: () => unknown): number {
  const start = performance.now();
  run();
  return performance.now() - start;
}

describe("speed", () => {
  it("@req CHK-014 checks an answer against the largest key in under 5 ms", () => {
    const expansion = expandPattern(LARGEST);
    expect(expansion.ok && expansion.variants.length).toBe(MAX_VARIANTS);
    const last = expansion.ok ? (expansion.variants.at(-1) ?? "") : "";
    expect(last).toBe("he's ga ge gi co cu cy lo lu and she'd go");
    const answer = `${last.slice(0, -1)}x`;

    let key: Key | undefined;
    const preparing = Array.from({ length: PREPARATIONS }, () =>
      timed(() => {
        const compiled = compileKey([LARGEST]);
        key = compiled.ok ? compiled.key : undefined;
      }),
    );
    if (key === undefined) throw new Error("the largest key is invalid");
    const prepared = key;
    expect(prepared.readings.size).toBe(6 * MAX_VARIANTS);
    expect(checkAnswer(prepared, answer)).toBe("near");

    const checking = Array.from({ length: CHECKS }, () =>
      timed(() => checkAnswer(prepared, answer)),
    );
    const checkMedian = median(checking);
    // oxlint-disable-next-line no-console -- design D7 asks for both medians in the test output
    console.info(
      `CHK-014: median of ${CHECKS} checks ${checkMedian.toFixed(3)} ms; ` +
        `median of ${PREPARATIONS} preparations ${median(preparing).toFixed(1)} ms`,
    );
    expect(checkMedian).toBeLessThan(5);
  });
});
