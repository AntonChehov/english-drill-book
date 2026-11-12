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
    expect(parseRecord("# Review\n\n## Findings\n\nnone\n").problems).toEqual([
      messages.unknownSection("Findings"),
      messages.noRound(),
    ]);
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

  it("3. an outcome is stated by a later round, not the one that raised the finding", () => {
    const own = round(1, h1, "Verdict: approved", "- F1: fixed", ...finding("F1", "Loop"));
    expect(parseRecord(record(own)).problems).toEqual([
      messages.outcomeInOwnRound(1, "F1"),
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
      messages.outcomeInOwnRound(1, "F1"),
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
    ).toEqual([messages.raisedTwice("F2", 1, 2), messages.lastNotApproved(2)]);
  });

  it("writes findings as F<n> headings and outcomes as one of three", () => {
    expect(parseRecord(record(round(1, h1, "Verdict: approved", "### Remarks"))).problems).toEqual([
      messages.notAFinding(1, "Remarks"),
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

describe("ways through the gate closed in round 1 of the review of review-rounds", () => {
  it("F1: a last round that requests changes fails even when nothing is left open", () => {
    const declinedAtOnce = round(
      1,
      h1,
      "Verdict: changes requested",
      "- F1: declined — out of scope",
      ...finding("F1", "Loop"),
    );
    const { problems } = parseRecord(record(declinedAtOnce));
    // Sibling: an outcome in the round that raised the finding closes nothing.
    expect(problems).toEqual([
      messages.outcomeInOwnRound(1, "F1"),
      messages.changesRequested(1, ["F1"]),
    ]);
    // Sibling: requests changes with no cause at all, as the last round.
    expect(parseRecord(record(round(1, h1, "Verdict: changes requested"))).problems).toEqual([
      messages.requestsWithoutCause(1),
      messages.lastNotApproved(1),
    ]);
  });

  it("F2: a section that is not a round or a closing section is reported", () => {
    const reReview = [
      "## Round 2 (re-review)",
      "",
      `Reviewed: ${h2}`,
      "Verdict: changes requested",
      "",
      ...finding("F3", "Still broken"),
    ];
    const approved = record(round(1, h1, "Verdict: approved"), reReview);
    expect(parseRecord(approved).problems).toEqual([
      messages.unknownSection("Round 2 (re-review)"),
    ]);
    expect(
      parseRecord(bare(round(1, h1, "Verdict: approved"), approvedBy, approvedBy)).problems,
    ).toEqual([
      messages.repeatedSection("Requirement coverage"),
      messages.repeatedSection("Outside the listed requirements"),
    ]);
  });

  it("F2: a second Reviewed or Verdict line in a round is reported", () => {
    expect(
      parseRecord(record(round(1, h1, "Verdict: approved", "Verdict: changes requested"))).problems,
    ).toEqual([messages.repeatedLine(1, "Verdict")]);
    expect(
      parseRecord(record(round(1, h1, "Verdict: approved", `Reviewed: ${h2}`))).problems,
    ).toEqual([messages.repeatedLine(1, "Reviewed")]);
  });

  it("F2: a heading of another level in a round is reported, not dropped", () => {
    const deep = round(1, h1, "Verdict: approved", "#### F1 Hidden", "- Where: a.mjs:1");
    expect(parseRecord(record(deep)).problems).toEqual([
      messages.unknownHeading(1, "#### F1 Hidden"),
      messages.unknownLine(1, "- Where: a.mjs:1"),
    ]);
    const inside = round(
      1,
      h1,
      "Verdict: changes requested",
      ...finding("F1", "Loop"),
      "#### Detail",
    );
    expect(parseRecord(record(inside)).problems).toContain(
      messages.unknownHeading(1, "#### Detail"),
    );
  });

  it("F2: a line the round does not know is reported, before or under a finding", () => {
    expect(
      parseRecord(record(round(1, h1, "Verdict: approved", "Looks good to me."))).problems,
    ).toEqual([messages.unknownLine(1, "Looks good to me.")]);
    expect(parseRecord(record(round(1, h1, "Verdict: approved", "- F1 fixed"))).problems).toEqual([
      messages.unknownLine(1, "- F1 fixed"),
    ]);
    const late = round(2, h2, "Verdict: approved", "- F1: fixed", "- F2: fixed");
    const misplaced = record(
      round(
        1,
        h1,
        "Verdict: changes requested",
        ...finding("F1", "A"),
        ...finding("F2", "B"),
        "Verdict: approved",
      ),
      late,
    );
    expect(parseRecord(misplaced).problems).toEqual([
      messages.misplacedLine(1, "under finding F2", "Verdict: approved"),
    ]);
    expect(
      parseRecord(`Notes first.\n${record(round(1, h1, "Verdict: approved"))}`).problems,
    ).toEqual([messages.textBeforeRounds("Notes first.")]);
  });

  it("F2: a heading inside a fenced block of a finding is text, not a heading", () => {
    const fenced = round(
      1,
      h1,
      "Verdict: changes requested",
      ...finding("F1", "Script"),
      "```sh",
      "# a comment",
      "## not a section",
      "```",
    );
    expect(
      parseRecord(record(fenced, round(2, h2, "Verdict: approved", "- F1: fixed"))).problems,
    ).toEqual([]);
  });

  it("F2: a fenced block that is never closed is reported, not read to the end as text", () => {
    const open = round(
      1,
      h1,
      "Verdict: changes requested",
      ...finding("F1", "Script"),
      "```sh",
      "~~~",
    );
    const hidden = bare(open, round(2, h2, "Verdict: approved", "- F1: fixed"), approvedBy);
    expect(parseRecord(hidden).problems).toEqual([
      messages.unclosedFence(hidden.split("\n").indexOf("```sh") + 1),
      messages.changesRequested(1, ["F1"]),
    ]);
  });

  it("F5: text after fixed is an outcome that is none of the three", () => {
    const partial = "fixed only in one of the two places; the other remains";
    expect(after(round(2, h2, "Verdict: approved", `- F1: ${partial}`, "- F2: fixed"))).toEqual([
      messages.badOutcome(2, "F1", partial),
      messages.notStated(2, "F1"),
    ]);
    // Siblings: a separator other than a dash, and text after a bare `declined`.
    expect(after(round(2, h2, "Verdict: approved", "- F1: fixed", "- F2: declined: fine"))).toEqual(
      [messages.badOutcome(2, "F2", "declined: fine"), messages.notStated(2, "F2")],
    );
    expect(
      after(round(2, h2, "Verdict: approved", "- F1: fixed.", "- F2: declined — fine")),
    ).toEqual([]);
  });

  it("F7: the review line says that nothing was compared when the last round has no hash", () => {
    const parsed = parseRecord(
      record(roundOne, round(2, undefined, "Verdict: approved", "- F1: fixed", "- F2: fixed")),
    );
    expect(reviewLine({ change: "c", record: parsed, current: h1 })).toBe(
      `Review: round 2, approved, records no hash; the content of this commit is \`${h1}\`, so nothing was compared.`,
    );
  });
});

/** The two closing sections, with the given lines added to the coverage or the outside one. */
const closingWith = (section, ...lines) =>
  section === "coverage"
    ? [
        "## Requirement coverage",
        "",
        "| ID | Implemented in | Test |",
        "| --- | --- | --- |",
        ...lines,
        "",
        "## Outside the listed requirements",
        "",
        "none",
        "",
      ]
    : [
        "## Requirement coverage",
        "",
        "",
        "## Outside the listed requirements",
        "",
        "none",
        ...lines,
        "",
      ];

/** A record of the given parts, closing sections included. */
const withClosing = (...parts) => ["# Review", "", ...parts.flat()].join("\n");

describe("round 2 of the review of review-rounds", () => {
  const approvedOne = round(1, h1, "Verdict: approved");

  it("F2: a round's own lines in a closing section are reported", () => {
    for (const [section, title] of [
      ["coverage", "Requirement coverage"],
      ["outside", "Outside the listed requirements"],
    ]) {
      expect(
        parseRecord(withClosing(approvedOne, closingWith(section, "Verdict: changes requested")))
          .problems,
      ).toEqual([messages.misplacedInClosing(title, "Verdict: changes requested")]);
      expect(
        parseRecord(withClosing(approvedOne, closingWith(section, "- F1: fixed"))).problems,
      ).toEqual([messages.misplacedInClosing(title, "- F1: fixed")]);
      expect(
        parseRecord(withClosing(approvedOne, closingWith(section, "### F2 Hidden"))).problems,
      ).toEqual([messages.headingInClosing(title, "### F2 Hidden")]);
    }
  });

  it("F2: a finding stated twice in one round is reported", () => {
    expect(
      after(round(2, h2, "Verdict: approved", "- F1: fixed", "- F1: declined — x", "- F2: fixed")),
    ).toEqual([messages.statedTwice(2, "F1")]);
  });

  it("F2: a round after the closing sections is reported", () => {
    const late =
      record(roundOne) +
      "\n" +
      round(2, h2, "Verdict: approved", "- F1: fixed", "- F2: fixed").join("\n");
    expect(parseRecord(late).problems).toEqual([messages.roundAfterClosing(2)]);
  });

  it("F8: a round may carry notes, approving rounds included", () => {
    const notes = [
      "### Notes",
      "",
      "Checked F1 against a stale origin/main in a scratch clone.",
      "",
      "- also ran the tests",
    ];
    expect(
      after(round(2, h2, "Verdict: approved", "- F1: fixed", "- F2: fixed", ...notes)),
    ).toEqual([]);
    expect(
      after(round(2, h2, "Verdict: approved", "- F1: fixed", "- F2: fixed", ...notes, ...notes)),
    ).toEqual([messages.repeatedNotes(2)]);
    expect(
      after(
        round(
          2,
          h2,
          "Verdict: approved",
          "- F1: fixed",
          "- F2: fixed",
          "### Notes",
          "",
          "#### Detail",
        ),
      ),
    ).toEqual([messages.unknownHeading(2, "#### Detail")]);
    expect(
      after(
        round(
          2,
          h2,
          "Verdict: approved",
          "- F1: fixed",
          "- F2: fixed",
          "### Notes",
          "",
          "Verdict: changes requested",
        ),
      ),
    ).toEqual([messages.misplacedLine(2, "under `### Notes`", "Verdict: changes requested")]);
  });

  it("F8: an outcome may be followed by indented lines of its own", () => {
    const result = parseRecord(
      record(
        roundOne,
        round(
          2,
          h2,
          "Verdict: changes requested",
          "- F1: fixed",
          "  - checked with a test that fails before the fix",
          "",
          "  and by hand.",
          "- F2: not fixed —",
          "  the name is still vague",
        ),
        round(3, h3, "Verdict: approved", "- F2: declined — the design", "  names it so."),
      ),
    );
    expect(result.problems).toEqual([]);
    expect(result.rounds[1].stated).toEqual([
      {
        id: "F1",
        outcome: "fixed",
        note: "- checked with a test that fails before the fix\nand by hand.",
      },
      { id: "F2", outcome: "not fixed", note: "the name is still vague" },
    ]);
  });

  it("F8: an indented line never counts as a round's line, and is reported when it looks like one", () => {
    expect(after(round(2, h2, "Verdict: approved", "- F1: fixed", "  - F2: fixed"))).toEqual([
      messages.misplacedLine(2, "indented under the outcome of F1", "- F2: fixed"),
      messages.notStated(2, "F2"),
    ]);
    expect(
      after(
        round(2, h2, "Verdict: approved", "  a note under nothing", "- F1: fixed", "- F2: fixed"),
      ),
    ).toEqual([messages.unknownLine(2, "a note under nothing")]);
  });

  it("F8: the message for an unknown line names places that every round may use", () => {
    const text = messages.unknownLine(2, "x");
    expect(text).toContain("`### Notes`");
    expect(text).toContain("indented");
    expect(messages.textBeforeRounds("x")).toContain("`### Notes`");
    expect(messages.notAFinding(2, "x")).toContain("`### Notes`");
  });

  it("F2: a setext heading or a quoted round line in free text is reported", () => {
    const notes = (...lines) =>
      after(
        round(2, h2, "Verdict: approved", "- F1: fixed", "- F2: fixed", "### Notes", "", ...lines),
      );
    expect(notes("Round 3", "=======")).toEqual([messages.unknownHeading(2, "Round 3")]);
    expect(notes("Summary", "---")).toEqual([messages.unknownHeading(2, "Summary")]);
    expect(notes("Summary", "", "---")).toEqual([]);
    expect(notes("> Verdict: changes requested")).toEqual([
      messages.misplacedLine(2, "under `### Notes`", "> Verdict: changes requested"),
    ]);
    expect(notes("> ## Round 3")).toEqual([messages.unknownHeading(2, "> ## Round 3")]);
    expect(
      parseRecord(
        withClosing(round(1, h1, "Verdict: approved"), closingWith("outside", "Extra", "===")),
      ).problems,
    ).toEqual([messages.headingInClosing("Outside the listed requirements", "Extra")]);
  });

  it("F9: a line of inline code that starts with backticks is not a fence", () => {
    const inline = round(
      1,
      h1,
      "Verdict: changes requested",
      ...finding("F1", "Inline"),
      "``` ``` `x` ``` ```",
    );
    expect(
      parseRecord(record(inline, round(2, h2, "Verdict: approved", "- F1: fixed"))).problems,
    ).toEqual([]);
  });

  it("F9: fences open and close as CommonMark says", () => {
    const tilde = round(
      1,
      h1,
      "Verdict: changes requested",
      ...finding("F1", "Fences"),
      "~~~~",
      "~~~",
      "```",
      "## Round 9",
      "~~~~~",
    );
    expect(
      parseRecord(record(tilde, round(2, h2, "Verdict: approved", "- F1: fixed"))).problems,
    ).toEqual([]);
    const short = round(
      1,
      h1,
      "Verdict: changes requested",
      ...finding("F1", "Short"),
      "````js",
      "```",
      "````",
    );
    expect(
      parseRecord(record(short, round(2, h2, "Verdict: approved", "- F1: fixed"))).problems,
    ).toEqual([]);
    const withText = round(
      1,
      h1,
      "Verdict: changes requested",
      ...finding("F1", "Text"),
      "```",
      "``` not a close",
    );
    expect(parseRecord(bare(withText)).problems[0]).toBe(
      messages.unclosedFence(bare(withText).split("\n").indexOf("```") + 1),
    );
  });
});

/** The number of the first line of a record that equals the given one. */
const lineOf = (text, line) => text.split("\n").indexOf(line) + 1;
const approvedTwo = (...lines) =>
  round(2, h2, "Verdict: approved", "- F1: fixed", "- F2: fixed", ...lines);

describe("HTML comments (review-follow-ups D2)", () => {
  it("reports a comment before the first round, besides the line itself", () => {
    const text = record(
      ["<!-- written before the review -->", ""],
      round(1, h1, "Verdict: approved"),
    );
    expect(parseRecord(text).problems).toEqual([
      messages.htmlComment(3),
      messages.textBeforeRounds("<!-- written before the review -->"),
    ]);
  });

  it("reports a comment among a round's own lines, besides the line itself", () => {
    const text = record(roundOne, approvedTwo()).replace(
      "- F1: fixed",
      "<!-- Verdict: changes requested -->\n- F1: fixed",
    );
    expect(parseRecord(text).problems).toEqual([
      messages.htmlComment(lineOf(text, "<!-- Verdict: changes requested -->")),
      messages.unknownLine(2, "<!-- Verdict: changes requested -->"),
    ]);
  });

  it("reports a comment indented under an outcome", () => {
    const text = record(roundOne, approvedTwo()).replace(
      "- F1: fixed",
      "- F1: fixed\n  <!-- not really -->",
    );
    const result = parseRecord(text);
    expect(result.problems).toEqual([messages.htmlComment(lineOf(text, "  <!-- not really -->"))]);
    expect(result.rounds[1].stated[0]).toEqual({
      id: "F1",
      outcome: "fixed",
      note: "<!-- not really -->",
    });
  });

  it("reports a comment under a finding", () => {
    const text = record(
      round(1, h1, "Verdict: changes requested", ...finding("F1", "Loop"), "<!-- hidden -->"),
      round(2, h2, "Verdict: approved", "- F1: fixed"),
    );
    expect(parseRecord(text).problems).toEqual([
      messages.htmlComment(lineOf(text, "<!-- hidden -->")),
    ]);
  });

  it("reports a comment under ### Notes, also one that closes on the same line", () => {
    const line = "Checked by hand. <!-- Verdict: approved -->";
    const text = record(roundOne, approvedTwo("### Notes", "", line));
    expect(parseRecord(text).problems).toEqual([messages.htmlComment(lineOf(text, line))]);
  });

  it("reports a comment that hides a round, and reads the lines in it as before", () => {
    const hidden = [
      "### Notes",
      "",
      "<!--",
      "## Round 3",
      "",
      `Reviewed: ${h3}`,
      "Verdict: approved",
      "-->",
    ];
    const text = record(roundOne, approvedTwo(...hidden));
    expect(parseRecord(text).problems).toEqual([
      messages.htmlComment(lineOf(text, "<!--")),
      messages.unknownLine(3, "-->"),
    ]);
  });

  it("reports a comment in a closing section, and still reads the section", () => {
    for (const section of ["coverage", "outside"]) {
      const text = withClosing(
        round(1, h1, "Verdict: approved"),
        closingWith(section, "<!-- | PROD-002 | src/b.ts | src/b.test.ts | -->"),
      );
      const result = parseRecord(text);
      expect(result.problems).toEqual([
        messages.htmlComment(lineOf(text, "<!-- | PROD-002 | src/b.ts | src/b.test.ts | -->")),
      ]);
      const without = text.replace("<!-- | PROD-002 | src/b.ts | src/b.test.ts | -->", "text");
      expect(result.coveredIds).toEqual(parseRecord(without).coveredIds);
      expect(result.coveredIds.has("PROD-002")).toBe(false);
    }
  });

  it("reports a comment on a heading, which is read as before", () => {
    const text = record(roundOne, approvedTwo()).replace("## Round 2", "## Round 2 <!-- x -->");
    const problems = parseRecord(text).problems;
    expect(problems[0]).toBe(messages.htmlComment(lineOf(text, "## Round 2 <!-- x -->")));
    expect(problems).toContain(messages.unknownSection("Round 2 <!-- x -->"));
  });

  it("reports every line with a comment, each by its number", () => {
    const text = record(roundOne, approvedTwo("### Notes", "", "<!-- a -->", "", "<!-- b -->"));
    expect(parseRecord(text).problems).toEqual([
      messages.htmlComment(lineOf(text, "<!-- a -->")),
      messages.htmlComment(lineOf(text, "<!-- b -->")),
    ]);
  });

  it("accepts a comment inside a fenced block, in a round or a closing section", () => {
    const quoted = ["```html", "<!-- Verdict: approved -->", "```"];
    expect(after(approvedTwo("### Notes", "", ...quoted))).toEqual([]);
    expect(
      parseRecord(record(roundOne.concat(["~~~", "<!--", "~~~", ""]), approvedTwo())).problems,
    ).toEqual([]);
    expect(
      parseRecord(withClosing(round(1, h1, "Verdict: approved"), closingWith("outside", ...quoted)))
        .problems,
    ).toEqual([]);
  });

  it("says what to do and where, with the line number", () => {
    const text = messages.htmlComment(7);
    expect(text).toContain("line 7");
    expect(text).toContain("`### Notes`");
    expect(text).toContain("fenced block");
  });
});
