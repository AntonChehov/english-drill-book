// The review record of constitution C-18 item 2, kept in rounds (review-rounds design D2),
// and the messages of the evidence check about it (D4). Each message states the fact, then
// the action, and stands on its own in one cell of the job summary. No message names a
// particular skill: the reader may use any, so they say "the review skill".
import { shownLength } from "./review-hash.mjs";

/** The line of a pull request description that names its change. */
export function changeNamedIn(body) {
  return /^Change:\s*`?([\w.-]+)`?\s*$/m.exec(body ?? "")?.[1];
}

export const recordPath = (change) => `openspec/changes/${change}/review.md`;

const list = (ids) => ids.join(", ");
/**
 * Text of the record quoted in a message: one line, short, and with nothing that would end
 * the code span or the cell of the summary table.
 */
const quote = (text) => {
  const line = String(text).trim().replaceAll("`", "'").replaceAll("|", "¦");
  return line.length > 80 ? `${line.slice(0, 79)}…` : line;
};
const outcomes = (id) =>
  `\`- ${id}: fixed\`, \`- ${id}: not fixed — <what remains>\` or \`- ${id}: declined — <reason>\``;

/** Every message of checks 3 and 4. */
export const messages = {
  noRecord: (change) =>
    `There is no review record: \`${recordPath(change)}\` does not exist. Have a reviewing agent, not the author, run a review of the whole diff with the review skill and commit its record there as \`## Round 1\`.`,
  noChangeRecord: () =>
    "No review record was read: the description names no change in `openspec/changes/` (see check 1). Name the change with a line `Change: <name>`; its record is `openspec/changes/<name>/review.md`.",
  noRound: () =>
    "`review.md` has no round: it has no section `## Round 1`. Run the review with the review skill and record it as `## Round 1`, with the lines `Reviewed: <hash>` and `Verdict:` and its findings.",
  roundOrder: (found, expected) =>
    `\`## Round ${found}\` is round ${expected} of the record. Number the rounds 1, 2, 3 in the order they were made.`,
  noHash: (round) =>
    `Round ${round} has no line \`Reviewed: <hash>\` with the ${shownLength} characters that \`pnpm review:hash\` prints. Add the hash of the content that round read.`,
  noVerdict: (round) =>
    `Round ${round} has no line \`Verdict: approved\` or \`Verdict: changes requested\`. Add the verdict the round reached.`,
  unknownSection: (title) =>
    `\`review.md\` has a section \`## ${quote(title)}\`, which the record does not know. Write a round as \`## Round <n>\` and the closing sections as \`## Requirement coverage\` and \`## Outside the listed requirements\`.`,
  repeatedSection: (title) =>
    `\`review.md\` has the section \`## ${quote(title)}\` more than once. Keep one.`,
  textBeforeRounds: (line) =>
    `\`review.md\` has the line \`${quote(line)}\` before its first round. Before \`## Round 1\` the record holds only its title, \`# Review\`: move the line into a finding of a round.`,
  unclosedFence: (line) =>
    `\`review.md\` has a fenced block, opened on line ${line}, that is never closed, so everything after it is read as text. Close it with a line that repeats its opening fence.`,
  repeatedLine: (round, name) =>
    `Round ${round} has more than one line \`${name}:\`. Keep one: a round has one hash and one verdict.`,
  unknownLine: (round, line) =>
    `Round ${round} has the line \`${quote(line)}\`, which the record does not know. Before its first finding a round holds only \`Reviewed: <hash>\`, \`Verdict:\` and one line \`- F<n>: <outcome>\` per open finding; write anything else under a finding \`### F<n> <title>\`.`,
  unknownHeading: (round, heading) =>
    `Round ${round} has the heading \`${quote(heading)}\`, which the record does not know. Write a finding as \`### F<n> <title>\`; inside a finding use paragraphs and list items, not headings.`,
  misplacedLine: (round, id, line) =>
    `Round ${round} has the line \`${quote(line)}\` under finding ${quote(id)}. The lines \`Reviewed:\`, \`Verdict:\` and \`- F<n>: <outcome>\` go at the start of the round, before its first finding.`,
  notAFinding: (round, heading) =>
    `Round ${round} has a heading \`### ${quote(heading)}\` that is not a finding. Write each finding as \`### F<n> <title>\`, numbered through the whole record.`,
  raisedTwice: (id, first, second) =>
    `${id} is raised twice, in round ${first} and in round ${second}. Number the findings through the whole record: give the later one the next free number.`,
  unknownFinding: (round, id) =>
    `Round ${round} states the outcome of ${id}, which no earlier round raised. Remove the line, or raise ${id} as a finding first.`,
  badOutcome: (round, id, text) =>
    `Round ${round} gives ${id} the outcome \`${quote(text)}\`, which is none of the three. Write ${outcomes(id)}.`,
  outcomeInOwnRound: (round, id) =>
    `${id} is raised in round ${round} and given an outcome in the same round. An outcome answers the author, so only a later round states it: remove the line from round ${round}, run the review again with the review skill and state the outcome of ${id} in the next round.`,
  declinedWithoutReason: (round, id) =>
    `${id} is declined in round ${round} without a reason. Write the reason after a dash: \`- ${id}: declined — <reason>\`.`,
  notFixedWithoutWhat: (round, id) =>
    `${id} is marked not fixed in round ${round} without saying what remains. Write it after a dash: \`- ${id}: not fixed — <what remains>\`.`,
  notStated: (round, id) =>
    `Round ${round} does not say whether ${id} is fixed. A round after the first states every open finding: add ${outcomes(id)}.`,
  approvedButRaises: (round, ids) =>
    `Round ${round} is approved but raises ${list(ids)}. A round that raises a finding requests changes: write \`Verdict: changes requested\`.`,
  approvedButNotFixed: (round, ids) =>
    `Round ${round} is approved but marks ${list(ids)} not fixed. A round with a finding not fixed requests changes: write \`Verdict: changes requested\`.`,
  requestsWithoutCause: (round) =>
    `Round ${round} requests changes but raises no finding and marks none not fixed. Write \`Verdict: approved\`, or record what has to change as a finding.`,
  changesRequested: (round, open) =>
    `The last round, round ${round}, requests changes; open: ${list(open)}. Fix or decline each, then run the review again with the review skill and add round ${round + 1}.`,
  lastNotApproved: (round) =>
    `The last round, round ${round}, requests changes, so the review has not approved this content. Run the review again with the review skill and add round ${round + 1}, which approves once no finding is open.`,
  noCoverage: () =>
    "`review.md` has no section `## Requirement coverage`. The approving round adds it: for each listed requirement, where it is implemented and which test covers it.",
  noOutside: () =>
    "`review.md` has no section `## Outside the listed requirements` with content. The approving round adds it: what changed outside the listed requirements, or `none`.",
  notCovered: (id) =>
    `\`review.md\` does not state where ${id} is implemented and tested. Add a row for ${id} to \`## Requirement coverage\`.`,
  stale: ({ round, reviewed, current, change }) =>
    `The review is out of date: round ${round} read the content \`${reviewed}\`, and the content of this commit is \`${current}\`, so the files of this pull request changed after it. Run the review again with the review skill on the whole diff and add round ${round + 1} with \`Reviewed: ${current}\`, the hash that \`pnpm review:hash ${change}\` prints once it has fetched \`main\`.`,
  noChangeContent: () =>
    "No content was compared: the description names no change in `openspec/changes/` (see check 1), so there is no review hash to compute. Name the change with a line `Change: <name>`.",
  noRoundToCompare: ({ current, change }) =>
    `No content was compared: the review has no round yet, and the content of this commit is \`${current}\` (see check 3). Run the review with the review skill and record that hash, which \`pnpm review:hash ${change}\` prints, in the round's line \`Reviewed:\`.`,
  lastRoundNoHash: ({ round, current, change }) =>
    `No content was compared: the last round, round ${round}, has no line \`Reviewed: <hash>\` (see check 3), and the content of this commit is \`${current}\`. Add to round ${round} the hash of the content it read; if that was not this content, run the review again with the review skill and add round ${round + 1} with the hash that \`pnpm review:hash ${change}\` prints.`,
};

const requirementId = /\b[A-Z][A-Z0-9]*-\d{3}\b/g;
const closingSections = ["Requirement coverage", "Outside the listed requirements"];
const fence = /^\s{0,3}(`{3,}|~{3,})/;
const headingLine = /^(#{1,6})\s+(.*?)\s*$/;
const outcomeLine = /^[-*+]\s+F(\d+)\s*:\s*(.*?)\s*$/;
const fieldLine = /^(Reviewed|Verdict)\s*:\s*(.*?)\s*$/i;

/** An outcome exactly as D2 writes it, or undefined. */
function parseOutcome(text) {
  if (/^fixed\.?$/i.test(text)) return { outcome: "fixed", note: "" };
  const match = /^(not fixed|declined)(?:\s*[—–-]\s*(.*))?$/i.exec(text);
  if (!match) return undefined;
  return { outcome: match[1].toLowerCase(), note: (match[2] ?? "").trim() };
}

/**
 * Reads a review record in rounds, line by line. Everything in it is either recognised or
 * reported: a record the parser cannot read is never passed by skipping what it does not
 * know (round 1 of the review of review-rounds, F2). Inside a finding, paragraphs, list
 * items and fenced blocks are free text. `problems` lists, as messages of check 3, what
 * breaks a rule of design D2 or D3 other than the coverage of listed requirements, which
 * needs the description and is checked by the caller.
 * @returns {{ rounds: object[], last: object | undefined, open: string[],
 *   coveredIds: Set<string>, problems: string[] }}
 */
export function parseRecord(markdown) {
  const problems = [];
  const rounds = [];
  const closing = new Map();
  /** Where the line being read belongs: before the rounds, a round, or a closing section. */
  let place = { kind: "preamble", titled: false };
  /** The fence of the open fenced block and the line it opened on, while one is open. */
  let openFence;

  for (const [index, line] of (markdown ?? "").split(/\r?\n/).entries()) {
    const round = place.kind === "round" ? place.round : undefined;
    const finding = round?.raised.at(-1);
    const marker = fence.exec(line)?.[1];
    if (openFence || marker) {
      if (!openFence) {
        openFence = { marker, line: index + 1 };
        // A fenced block is text of a finding or of a closing section, and nothing else.
        if (place.kind !== "closing" && !finding)
          problems.push(
            round ? messages.unknownLine(round.number, line) : messages.textBeforeRounds(line),
          );
      } else if (
        marker &&
        marker[0] === openFence.marker[0] &&
        marker.length >= openFence.marker.length &&
        line.trim() === marker
      ) {
        openFence = undefined;
      }
      if (place.kind === "closing") place.content.push(line);
      continue;
    }

    const heading = headingLine.exec(line);
    if (heading?.[1] === "##") {
      const title = heading[2];
      const number = /^Round\s+(\d+)$/i.exec(title)?.[1];
      if (number !== undefined) {
        const expected = rounds.length + 1;
        if (Number(number) !== expected)
          problems.push(messages.roundOrder(Number(number), expected));
        const next = {
          number: Number(number),
          reviewed: undefined,
          verdict: undefined,
          raised: [],
          stated: [],
          seen: new Set(),
        };
        rounds.push(next);
        place = { kind: "round", round: next };
      } else if (closingSections.includes(title)) {
        if (closing.has(title)) problems.push(messages.repeatedSection(title));
        const content = [];
        closing.set(title, content);
        place = { kind: "closing", content };
      } else {
        problems.push(messages.unknownSection(title));
        place = { kind: "unknown" };
      }
      continue;
    }
    if (place.kind === "closing") {
      place.content.push(line);
      continue;
    }
    if (place.kind === "unknown" || line.trim() === "") continue;

    if (place.kind === "preamble") {
      if (heading?.[1] === "#" && !place.titled) place.titled = true;
      else problems.push(messages.textBeforeRounds(line));
      continue;
    }

    // In a round.
    if (heading?.[1] === "###") {
      const parsed = /^F(\d+)[:.]?\s+(\S.*)$/.exec(heading[2]);
      if (parsed) round.raised.push({ id: `F${Number(parsed[1])}`, title: parsed[2] });
      else {
        problems.push(messages.notAFinding(round.number, heading[2]));
        // Its text is not read as the round's own lines.
        round.raised.push({ id: undefined, title: heading[2] });
      }
      continue;
    }
    if (heading) {
      problems.push(messages.unknownHeading(round.number, line.trim()));
      continue;
    }
    const field = fieldLine.exec(line);
    const outcome = outcomeLine.exec(line);
    if (finding) {
      if (field || outcome)
        problems.push(
          messages.misplacedLine(round.number, finding.id ?? finding.title, line.trim()),
        );
      continue;
    }
    if (field) {
      const name = field[1].toLowerCase() === "reviewed" ? "Reviewed" : "Verdict";
      if (round.seen.has(name)) {
        problems.push(messages.repeatedLine(round.number, name));
        continue;
      }
      round.seen.add(name);
      if (name === "Reviewed") {
        round.reviewed = new RegExp(`^\`?([0-9a-f]{${shownLength}})\`?$`).exec(field[2])?.[1];
      } else {
        round.verdict = /^(approved|changes requested)\.?$/i.exec(field[2])?.[1].toLowerCase();
      }
      continue;
    }
    if (outcome) {
      const id = `F${Number(outcome[1])}`;
      const parsed = parseOutcome(outcome[2]);
      if (parsed) round.stated.push({ id, ...parsed });
      else problems.push(messages.badOutcome(round.number, id, outcome[2]));
      continue;
    }
    problems.push(messages.unknownLine(round.number, line.trim()));
  }

  if (openFence) problems.push(messages.unclosedFence(openFence.line));
  for (const round of rounds) {
    if (!round.reviewed) problems.push(messages.noHash(round.number));
    if (!round.verdict) problems.push(messages.noVerdict(round.number));
    round.raised = round.raised.filter((entry) => entry.id !== undefined);
    delete round.seen;
  }
  if (rounds.length === 0) problems.push(messages.noRound());

  /** Every finding by ID: the round that raised it and whether it is still open. */
  const findings = new Map();
  for (const [index, round] of rounds.entries()) {
    const openBefore = [...findings.values()].filter((f) => f.open).map((f) => f.id);
    for (const { id } of round.raised) {
      const earlier = findings.get(id);
      if (earlier) problems.push(messages.raisedTwice(id, earlier.raisedIn, round.number));
      else findings.set(id, { id, raisedIn: round.number, open: true });
    }
    const notFixed = [];
    for (const { id, outcome, note } of round.stated) {
      const finding = findings.get(id);
      if (!finding) {
        problems.push(messages.unknownFinding(round.number, id));
      } else if (finding.raisedIn === round.number) {
        // An outcome answers the author, so it comes in a round after the one that raised it.
        problems.push(messages.outcomeInOwnRound(round.number, id));
      } else if (outcome === "fixed") {
        finding.open = false;
      } else if (outcome === "declined") {
        if (note) finding.open = false;
        else problems.push(messages.declinedWithoutReason(round.number, id));
      } else {
        notFixed.push(id);
        finding.open = true;
        if (!note) problems.push(messages.notFixedWithoutWhat(round.number, id));
      }
    }
    if (index > 0) {
      const stated = new Set(round.stated.map((entry) => entry.id));
      for (const id of openBefore)
        if (!stated.has(id)) problems.push(messages.notStated(round.number, id));
    }
    // The verdict follows from the round (D2): approved when it raises nothing and marks
    // nothing not fixed.
    const raised = round.raised.map((finding) => finding.id);
    if (round.verdict === "approved") {
      if (raised.length > 0) problems.push(messages.approvedButRaises(round.number, raised));
      if (notFixed.length > 0) problems.push(messages.approvedButNotFixed(round.number, notFixed));
    } else if (round.verdict && raised.length === 0 && notFixed.length === 0) {
      problems.push(messages.requestsWithoutCause(round.number));
    }
  }

  // Rule 4 of D3, on its own: the last round approves (F1).
  const last = rounds.at(-1);
  const open = [...findings.values()].filter((f) => f.open).map((f) => f.id);
  if (last?.verdict === "changes requested") {
    problems.push(
      open.length > 0
        ? messages.changesRequested(last.number, open)
        : messages.lastNotApproved(last.number),
    );
  }

  // Written once, by the approving round: required only when the last round approves.
  const coverage = closing.get("Requirement coverage");
  if (last?.verdict === "approved") {
    if (coverage === undefined) problems.push(messages.noCoverage());
    if (!closing.get("Outside the listed requirements")?.join("\n").trim())
      problems.push(messages.noOutside());
  }
  const coveredIds = new Set(
    (coverage ?? [])
      .filter((line) => line.startsWith("|"))
      .flatMap((line) => line.split("|")[1]?.match(requirementId) ?? []),
  );
  return { rounds, last, open, coveredIds, problems };
}

/**
 * One line on the state of the review for the job summary and the evidence comment: the
 * last round, its verdict and hash, and the hash of the commit's content.
 */
export function reviewLine({ change, record, current }) {
  const now = `the content of this commit is \`${current}\``;
  if (record === undefined) return `Review: no record in \`${recordPath(change)}\`; ${now}.`;
  const { last } = record;
  if (!last) return `Review: \`${recordPath(change)}\` has no round; ${now}.`;
  const verdict = last.verdict ?? "no verdict";
  if (!last.reviewed)
    return `Review: round ${last.number}, ${verdict}, records no hash; ${now}, so nothing was compared.`;
  const same = last.reviewed === current ? "the same" : "different, so the review is out of date";
  return `Review: round ${last.number}, ${verdict}, read \`${last.reviewed}\`; ${now}, ${same}.`;
}
