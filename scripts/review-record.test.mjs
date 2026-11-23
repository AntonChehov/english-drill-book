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
const finding = (id, title, severity = "Severity: minor") => [
  `### ${id} ${title}`,
  "",
  severity,
  "- Where: scripts/a.mjs:1",
  "- Problem: it breaks.",
  "",
];
const record = (...parts) => ["# Review", "", ...parts.flat()].join("\n");

const roundOne = round(
  1,
  h1,
  "Verdict: changes requested",
  ...finding("F1", "Loop never ends", "Severity: critical"),
  ...finding("F2", "Vague name"),
);
/** Problems of a record whose first round raised F1 and F2. */
const after = (...rounds) => parseRecord(record(roundOne, ...rounds)).problems;
/** A record with an approving round and `lines` under its `### Notes`. */
const inNotes = (...lines) =>
  record(round(1, h1, "Verdict: approved", "### Notes", "", ...lines)).replace(/^$/m, "");
const lineOf = (text, part) => text.split("\n").findIndex((line) => line.includes(part)) + 1;

describe("a record that passes", () => {
  it("has one round, approved, without findings", () => {
    const result = parseRecord(record(round(1, h1, "Verdict: approved")));
    expect(result.problems).toEqual([]);
    expect(result.last).toMatchObject({ number: 1, reviewed: h1, verdict: "approved" });
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

  it("reads any other line as free text: sections, headings, tables, fences and quotes", () => {
    const text = [
      "Anything before the first round, even Verdict: nonsense",
      "",
      "## Round 1",
      "",
      `Reviewed: ${h1}`,
      "Verdict: approved",
      "",
      "## Requirement coverage",
      "",
      "| ID | Test |",
      "| --- | --- |",
      "| PROD-001 | a.test.ts |",
      "",
      "#### A deeper heading",
      "> Reviewed: quoted",
      "  Verdict: indented",
      "```",
      "- F9: fixed",
      "```",
    ].join("\n");
    const lines = text.split("\n").filter((line) => line !== "- F9: fixed");
    expect(parseRecord(lines.join("\n")).problems).toEqual([]);
    // An unindented form is read wherever it stands, a fenced block included.
    expect(parseRecord(text).problems).toEqual([messages.unknownFinding(1, "F9")]);
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

  it("2. every round has a verdict, and one of each", () => {
    expect(after(round(2, h2, "Verdict: fine", "- F1: fixed", "- F2: fixed"))).toEqual([
      messages.noVerdict(2),
    ]);
    expect(
      parseRecord(record(round(1, h1, "Verdict: approved", "Verdict: approved"))).problems,
    ).toEqual([messages.repeatedLine(1, "Verdict")]);
    expect(
      parseRecord(record(round(1, h1, "Verdict: approved", `Reviewed: ${h2}`))).problems,
    ).toEqual([messages.repeatedLine(1, "Reviewed")]);
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
      "- F1: declined — out of scope",
      ...finding("F1", "Loop"),
    );
    expect(parseRecord(record(requested)).problems).toEqual([
      messages.outcomeInOwnRound(1, "F1"),
      messages.changesRequested(1, ["F1"]),
    ]);
  });

  it("3. a declined finding has a reason, after the dash on the same line", () => {
    expect(after(round(2, h2, "Verdict: approved", "- F1: fixed", "- F2: declined"))).toEqual([
      messages.declinedWithoutReason(2, "F2"),
    ]);
    expect(
      after(round(2, h2, "Verdict: approved", "- F1: fixed", "- F2: declined —", "  the reason")),
    ).toEqual([messages.declinedWithoutReason(2, "F2")]);
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
    expect(parseRecord(record(round(1, h1, "Verdict: changes requested"))).problems).toEqual([
      messages.requestsWithoutCause(1),
      messages.lastNotApproved(1),
    ]);
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

  it("writes outcomes as one of three, once each, for findings raised before", () => {
    expect(after(round(2, h2, "Verdict: approved", "- F1: later", "- F2: fixed"))).toEqual([
      messages.badOutcome(2, "F1", "later"),
      messages.notStated(2, "F1"),
    ]);
    expect(
      after(round(2, h2, "Verdict: approved", "- F1: fixed", "- F2: fixed", "- F7: fixed")),
    ).toEqual([messages.unknownFinding(2, "F7")]);
    expect(
      after(round(2, h2, "Verdict: approved", "- F1: fixed", "- F1: fixed", "- F2: fixed")),
    ).toEqual([messages.statedTwice(2, "F1")]);
  });

  it("says what remains of a finding not fixed", () => {
    expect(
      after(round(2, h2, "Verdict: changes requested", "- F1: not fixed", "- F2: fixed")),
    ).toEqual([messages.notFixedWithoutWhat(2, "F1"), messages.changesRequested(2, ["F1"])]);
  });

  it("takes text after fixed for an outcome that is none of the three", () => {
    const partial = "fixed only in one of the two places; the other remains";
    expect(after(round(2, h2, "Verdict: approved", `- F1: ${partial}`, "- F2: fixed"))).toEqual([
      messages.badOutcome(2, "F1", partial),
      messages.notStated(2, "F1"),
    ]);
    expect(after(round(2, h2, "Verdict: approved", "- F1: fixed", "- F2: declined: fine"))).toEqual(
      [messages.badOutcome(2, "F2", "declined: fine"), messages.notStated(2, "F2")],
    );
    expect(
      after(round(2, h2, "Verdict: approved", "- F1: fixed.", "- F2: declined — fine")),
    ).toEqual([]);
  });
});

const one = (...severity) =>
  parseRecord(
    record(
      round(1, h1, "Verdict: changes requested", "### F1 Loop", "", ...severity, "- Where: a"),
      round(2, h2, "Verdict: approved", "- F1: fixed"),
    ),
  ).problems;

describe("the severity of a finding (workflow-retro D6)", () => {
  it("is critical or minor, once", () => {
    expect(one("Severity: critical")).toEqual([]);
    expect(one("Severity: Minor")).toEqual([]);
  });

  it("is missing", () => {
    expect(one()).toEqual([messages.noSeverity(1, "F1")]);
  });

  it("is repeated", () => {
    expect(one("Severity: critical", "Severity: minor")).toEqual([
      messages.repeatedSeverity(1, "F1"),
    ]);
  });

  it("is unknown", () => {
    expect(one("Severity: major")).toEqual([messages.badSeverity(1, "F1", "major")]);
    expect(one("Severity:")).toEqual([messages.badSeverity(1, "F1", "")]);
  });

  it("belongs to the finding before the next heading only", () => {
    const text = record(
      round(
        1,
        h1,
        "Verdict: changes requested",
        "### F1 Loop",
        "",
        "### Notes",
        "",
        "Severity: critical",
      ),
      round(2, h2, "Verdict: approved", "- F1: fixed"),
    );
    expect(parseRecord(text).problems).toEqual([messages.noSeverity(1, "F1")]);
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

  it("says that nothing was compared when the last round has no hash", () => {
    const parsed = parseRecord(
      record(roundOne, round(2, undefined, "Verdict: approved", "- F1: fixed", "- F2: fixed")),
    );
    expect(reviewLine({ change: "c", record: parsed, current: h1 })).toBe(
      `Review: round 2, approved, records no hash; the content of this commit is \`${h1}\`, so nothing was compared.`,
    );
  });
});

describe("changeNamedIn", () => {
  it("reads the Change line of a description", () => {
    expect(changeNamedIn("text\nChange: `review-rounds`\n")).toBe("review-rounds");
    expect(changeNamedIn(undefined)).toBeUndefined();
  });
});

describe("HTML comments (review-follow-ups D2)", () => {
  it("reports a comment anywhere, with its line, and still reads the lines of the record", () => {
    const text = record(
      ["<!-- before the review -->", ""],
      round(1, h1, "Verdict: approved", "```", "<!-- inside a fence -->", "```"),
    );
    expect(parseRecord(text).problems).toEqual([
      messages.htmlComment(lineOf(text, "<!-- before")),
      messages.htmlComment(lineOf(text, "<!-- inside")),
    ]);
  });

  it("reports a comment that hides a form, and reads the form as before", () => {
    const text = record(roundOne, round(2, h2, "Verdict: approved", "- F1: fixed")).replace(
      "- F1: fixed",
      "<!-- Verdict: changes requested -->\n- F1: fixed",
    );
    expect(parseRecord(text).problems).toEqual([
      messages.htmlComment(lineOf(text, "<!-- Verdict")),
      messages.notStated(2, "F2"),
    ]);
  });

  it("reports a comment after a lone carriage return, on the line the parser counts", () => {
    const text = inNotes("~~~\r~~~", "<!--", "hidden text, invisible", "~~~", "-->");
    expect(parseRecord(text).problems).toEqual([messages.htmlComment(lineOf(text, "<!--"))]);
    const same = inNotes("Checked by hand.\r<!--", "hidden", "-->");
    expect(parseRecord(same).problems).toEqual([
      messages.htmlComment(lineOf(same, "Checked by hand.\r<!--")),
    ]);
  });

  it("counts lines with CRLF endings as the rest of the parser does", () => {
    const text = inNotes("Checked by hand.", "<!-- x -->").replaceAll("\n", "\r\n");
    expect(parseRecord(text).problems).toEqual([
      messages.htmlComment(text.split("\r\n").indexOf("<!-- x -->") + 1),
    ]);
  });

  it("accepts the characters written with an entity, anywhere", () => {
    expect(
      parseRecord(inNotes("Write `&lt;!--` for the characters &lt;!-- themselves.")).problems,
    ).toEqual([]);
    expect(parseRecord(inNotes("```", "&lt;!-- quoted", "```")).problems).toEqual([]);
  });

  it("says what to do and where, with the line number", () => {
    const text = messages.htmlComment(7);
    expect(text).toContain("line 7");
    expect(text).toContain("`### Notes`");
    expect(text).toContain("`&lt;!--`");
  });
});
