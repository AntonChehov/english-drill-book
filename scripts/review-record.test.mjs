import { describe, expect, it } from "vitest";
import { changeNamedIn, messages, parseRecord, reviewLine } from "./review-record.mjs";

const h1 = "3f9c2a71b0de";
const h2 = "8a04e6d2c517";
const h3 = "1b2c3d4e5f60";

/** A round of a record: `## Round n`, its hash and verdict, then any further lines. */
const round = (number, hash, verdict, ...lines) => [
  `## Round ${number}`,
  "",
  ...(hash ? [`Reviewed: ${hash}`] : []),
  verdict,
  "",
  ...lines,
  "",
];
const finding = (id, title) => [
  `### ${id} ${title}`,
  "",
  "- Where: scripts/a.mjs:1",
  "- Problem: it breaks.",
  "",
];
const approvedBy = [
  "## Requirement coverage",
  "",
  "| ID | Implemented in | Test |",
  "| --- | --- | --- |",
  "| PROD-001 | src/a.ts | src/a.test.ts |",
  "",
  "## Outside the listed requirements",
  "",
  "none",
  "",
];
const record = (...parts) => ["# Review", "", ...parts.flat(), ...approvedBy].join("\n");

const roundOne = round(
  1,
  h1,
  "Verdict: changes requested",
  ...finding("F1", "Loop never ends"),
  ...finding("F2", "Vague name"),
);
/** A record without the sections the approving round writes. */
const bare = (...parts) => ["# Review", "", ...parts.flat()].join("\n");
/** Problems of a record whose first round raised F1 and F2. */
const after = (...rounds) => parseRecord(record(roundOne, ...rounds)).problems;

describe("a record that passes", () => {
  it("has one round, approved, without findings", () => {
    const result = parseRecord(record(round(1, h1, "Verdict: approved")));
    expect(result.problems).toEqual([]);
    expect(result.last).toMatchObject({ number: 1, reviewed: h1, verdict: "approved" });
    expect(result.coveredIds).toEqual(new Set(["PROD-001"]));
  });

  it("has two rounds: findings, then each fixed or declined with a reason", () => {
    const result = parseRecord(
      record(
        roundOne,
        round(2, h2, "Verdict: approved", "- F1: fixed", "- F2: declined — the design names it."),
      ),
    );
    expect(result.problems).toEqual([]);
    expect(result.open).toEqual([]);
    expect(result.last).toMatchObject({ number: 2, reviewed: h2 });
  });

  it("has three rounds: a fix found incomplete, a new finding, then approval", () => {
    const result = parseRecord(
      record(
        roundOne,
        round(
          2,
          h2,
          "Verdict: changes requested",
          "- F1: not fixed — the limit is never reached.",
          "- F2: declined - the design names it.",
          ...finding("F3", "Missing test"),
        ),
        round(3, `\`${h3}\``, "Verdict: Approved", "- F1: fixed", "- F3: fixed"),
      ),
    );
    expect(result.problems).toEqual([]);
    expect(result.rounds.map((r) => r.verdict)).toEqual([
      "changes requested",
      "changes requested",
      "approved",
    ]);
    expect(result.last).toMatchObject({ number: 3, reviewed: h3 });
  });
});

describe("design D3, each rule failing alone", () => {
  it("1. the record has at least one round", () => {
    expect(parseRecord("# Review\n\n## Findings\n\nnone\n").problems).toEqual([messages.noRound()]);
  });

  it("2. every round has a hash", () => {
    expect(after(round(2, undefined, "Verdict: approved", "- F1: fixed", "- F2: fixed"))).toEqual([
      messages.noHash(2),
    ]);
    expect(after(round(2, "8a04e6d", "Verdict: approved", "- F1: fixed", "- F2: fixed"))).toEqual([
      messages.noHash(2),
    ]);
  });

  it("2. every round has a verdict", () => {
    expect(after(round(2, h2, "Verdict: fine", "- F1: fixed", "- F2: fixed"))).toEqual([
      messages.noVerdict(2),
    ]);
  });

  it("2. an approved round raises no finding", () => {
    const raises = round(2, h2, "Verdict: approved", "- F1: fixed", "- F2: fixed");
    raises.push(...finding("F3", "Late"));
    expect(after(raises)).toEqual([messages.approvedButRaises(2, ["F3"])]);
  });

  it("2. an approved round marks no finding not fixed", () => {
    expect(
      after(round(2, h2, "Verdict: approved", "- F1: not fixed — still loops", "- F2: fixed")),
    ).toEqual([messages.approvedButNotFixed(2, ["F1"])]);
  });

  it("2. a round that requests changes has a cause", () => {
    expect(
      after(
        round(2, h2, "Verdict: changes requested", "- F1: fixed", "- F2: fixed"),
        round(3, h3, "Verdict: approved"),
      ),
    ).toEqual([messages.requestsWithoutCause(2)]);
  });

  it("3. a fix is confirmed by a later round, not the one that raised the finding", () => {
    const own = round(1, h1, "Verdict: approved", "- F1: fixed", ...finding("F1", "Loop"));
    expect(parseRecord(record(own)).problems).toEqual([
      messages.fixedInOwnRound(1, "F1"),
      messages.approvedButRaises(1, ["F1"]),
    ]);
    const requested = round(
      1,
      h1,
      "Verdict: changes requested",
      "- F1: fixed",
      ...finding("F1", "Loop"),
    );
    expect(parseRecord(record(requested)).problems).toEqual([
      messages.fixedInOwnRound(1, "F1"),
      messages.changesRequested(1, ["F1"]),
    ]);
  });

  it("3. a declined finding has a reason", () => {
    expect(after(round(2, h2, "Verdict: approved", "- F1: fixed", "- F2: declined"))).toEqual([
      messages.declinedWithoutReason(2, "F2"),
    ]);
  });

  it("3. a later round states every open finding", () => {
    expect(after(round(2, h2, "Verdict: approved", "- F1: fixed"))).toEqual([
      messages.notStated(2, "F2"),
    ]);
  });

  it("4. the last round is approved", () => {
    expect(after()).toEqual([messages.changesRequested(1, ["F1", "F2"])]);
    expect(
      after(
        round(2, h2, "Verdict: changes requested", "- F1: not fixed — still loops", "- F2: fixed"),
      ),
    ).toEqual([messages.changesRequested(2, ["F1"])]);
  });
});

describe("the form of the record", () => {
  it("numbers the rounds in order", () => {
    expect(
      after(round(3, h2, "Verdict: approved", "- F1: fixed", "- F2: fixed")).slice(0, 1),
    ).toEqual([messages.roundOrder(3, 2)]);
  });

  it("numbers the findings through the whole record", () => {
    expect(
      after(
        round(
          2,
          h2,
          "Verdict: changes requested",
          "- F1: fixed",
          "- F2: fixed",
          ...finding("F2", "Again"),
        ),
      ),
    ).toEqual([messages.raisedTwice("F2", 1, 2)]);
  });

  it("writes findings as F<n> headings and outcomes as one of three", () => {
    expect(parseRecord(record(round(1, h1, "Verdict: approved", "### Notes"))).problems).toEqual([
      messages.notAFinding(1, "Notes"),
    ]);
    expect(after(round(2, h2, "Verdict: approved", "- F1: later", "- F2: fixed"))).toEqual([
      messages.badOutcome(2, "F1", "later"),
      messages.notStated(2, "F1"),
    ]);
  });

  it("states outcomes only of findings raised before", () => {
    expect(
      after(round(2, h2, "Verdict: approved", "- F1: fixed", "- F2: fixed", "- F7: fixed")),
    ).toEqual([messages.unknownFinding(2, "F7")]);
  });

  it("says what remains of a finding not fixed", () => {
    expect(
      after(round(2, h2, "Verdict: changes requested", "- F1: not fixed", "- F2: fixed")),
    ).toEqual([messages.notFixedWithoutWhat(2, "F1"), messages.changesRequested(2, ["F1"])]);
  });

  it("asks for coverage only once a round approves", () => {
    expect(parseRecord(bare(roundOne)).problems).toEqual([
      messages.changesRequested(1, ["F1", "F2"]),
    ]);
    expect(parseRecord(bare(round(1, h1, "Verdict: approved"))).problems).toEqual([
      messages.noCoverage(),
      messages.noOutside(),
    ]);
  });
});

describe("reviewLine", () => {
  const change = "c";
  it("shows the last round, its verdict and both hashes", () => {
    const parsed = parseRecord(record(round(1, h1, "Verdict: approved")));
    expect(reviewLine({ change, record: parsed, current: h1 })).toBe(
      `Review: round 1, approved, read \`${h1}\`; the content of this commit is \`${h1}\`, the same.`,
    );
    expect(reviewLine({ change, record: parsed, current: h2 })).toContain(
      "different, so the review is out of date",
    );
  });

  it("says when there is no record, no round, no verdict or no hash", () => {
    expect(reviewLine({ change, record: undefined, current: h1 })).toBe(
      `Review: no record in \`openspec/changes/c/review.md\`; the content of this commit is \`${h1}\`.`,
    );
    expect(reviewLine({ change, record: parseRecord("# Review\n"), current: h1 })).toContain(
      "has no round",
    );
    expect(
      reviewLine({ change, record: parseRecord("## Round 1\n\nVerdict: x\n"), current: h1 }),
    ).toContain("round 1, no verdict, records no hash");
  });
});

describe("changeNamedIn", () => {
  it("reads the Change line of a description", () => {
    expect(changeNamedIn("text\nChange: `review-rounds`\n")).toBe("review-rounds");
    expect(changeNamedIn(undefined)).toBeUndefined();
  });
});
