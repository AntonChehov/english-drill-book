// The review record of constitution C-18 item 2, kept in rounds, and the messages of the evidence
// check about it. Each message states the fact, then the action, and stands on its own in one cell
// of the job summary. No message names a particular skill: the reader may use any, so they say "the
// review skill".
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
  htmlComment: (line) =>
    `\`review.md\` has an HTML comment on line ${line}. A comment is not shown on the pull request, so the record would hold text its reader cannot see: delete it, or write the text openly under \`### Notes\`; to mention the characters themselves, write \`&lt;!--\`.`,
  repeatedLine: (round, name) =>
    `Round ${round} has more than one line \`${name}:\`. Keep one: a round has one hash and one verdict.`,
  noSeverity: (round, id) =>
    `${id} of round ${round} has no line \`Severity: critical\` or \`Severity: minor\`. Add one under its heading, before the next heading.`,
  repeatedSeverity: (round, id) =>
    `${id} of round ${round} has more than one line \`Severity:\`. Keep one.`,
  badSeverity: (round, id, text) =>
    `${id} of round ${round} has the severity \`${quote(text)}\`, which is neither critical nor minor. Write \`Severity: critical\` or \`Severity: minor\`.`,
  statedTwice: (round, id) =>
    `Round ${round} states the outcome of ${id} more than once. Keep one line \`- ${id}: <outcome>\`: a round gives each finding one outcome.`,
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
  stale: ({ round, reviewed, current, change }) =>
    `The review is out of date: round ${round} read the content \`${reviewed}\`, and the content of this commit is \`${current}\`, so the files of this pull request changed after it. Run the review again with the review skill on the whole diff and add round ${round + 1} with \`Reviewed: ${current}\`, the hash that \`pnpm review:hash ${change}\` prints once it has fetched \`main\`.`,
  noChangeContent: () =>
    "No content was compared: the description names no change in `openspec/changes/` (see check 1), so there is no review hash to compute. Name the change with a line `Change: <name>`.",
  noRoundToCompare: ({ current, change }) =>
    `No content was compared: the review has no round yet, and the content of this commit is \`${current}\` (see check 3). Run the review with the review skill and record that hash, which \`pnpm review:hash ${change}\` prints, in the round's line \`Reviewed:\`.`,
  lastRoundNoHash: ({ round, current, change }) =>
    `No content was compared: the last round, round ${round}, has no line \`Reviewed: <hash>\` (see check 3), and the content of this commit is \`${current}\`. Add to round ${round} the hash of the content it read; if that was not this content, run the review again with the review skill and add round ${round + 1} with the hash that \`pnpm review:hash ${change}\` prints.`,
};

/** An unindented line of the record that is read by its form. */
const roundHeading = /^##[ \t]+Round[ \t]+(\d+)[ \t]*$/i;
const findingHeading = /^###[ \t]+F(\d+)[:.]?[ \t]+(\S.*?)[ \t]*$/;
const anyHeading = /^#{2,3}(?:[ \t]|$)/;
const outcomeLine = /^[-*+]\s+F(\d+)\s*:\s*(.*?)\s*$/;
const fieldLine = /^(Reviewed|Verdict)\s*:\s*(.*?)\s*$/i;
const severityLine = /^Severity\s*:\s*(.*?)\s*$/i;

/**
 * The numbers of the lines that hold an HTML comment's opening `<!--`, wherever it stands,
 * fenced blocks included: found in the raw text, so that no reading of fences or line endings can
 * hide one. Lines are counted as the parser counts them, by `\n`; a lone `\r` ends no line, so a
 * comment after one is on the line that holds that `\r`.
 */
function commentLines(markdown) {
  const lines = new Set();
  // `\n` is not part of `<!--`, so splitting on it alone cannot cut an opening in two.
  for (const [index, line] of markdown.split("\n").entries())
    if (line.includes("<!--")) lines.add(index + 1);
  return lines;
}

/** An outcome exactly as the grammar of the record writes it, or undefined. */
function parseOutcome(text) {
  if (/^fixed\.?$/i.test(text)) return { outcome: "fixed", note: "" };
  const match = /^(not fixed|declined)(?:\s*[—–-]\s*(.*))?$/i.exec(text);
  if (!match) return undefined;
  return { outcome: match[1].toLowerCase(), note: (match[2] ?? "").trim() };
}

/**
 * Reads a review record in rounds, line by line, by the grammar of the record: an
 * unindented line is read by its form wherever it stands in a round (`## Round <n>`,
 * `Reviewed:`, `Verdict:`, `- F<n>: <outcome>`, `### F<n> <title>`, `Severity:`); every other
 * line, and everything before the first round, is free text. `problems` lists, as messages
 * of check 3, what breaks a rule of the record.
 * @returns {{ rounds: object[], last: object | undefined, open: string[], problems: string[] }}
 */
export function parseRecord(markdown) {
  const problems = [];
  const rounds = [];
  const commented = commentLines(markdown ?? "");
  /** The finding whose heading was the last heading read, until the next `##` or `###`. */
  let finding;

  for (const [index, line] of (markdown ?? "").split(/\r?\n/).entries()) {
    if (commented.has(index + 1)) problems.push(messages.htmlComment(index + 1));
    const number = roundHeading.exec(line)?.[1];
    if (number !== undefined) {
      const expected = rounds.length + 1;
      if (Number(number) !== expected) problems.push(messages.roundOrder(Number(number), expected));
      rounds.push({
        number: Number(number),
        reviewed: undefined,
        verdict: undefined,
        raised: [],
        stated: [],
        seen: new Set(),
      });
      finding = undefined;
      continue;
    }
    const round = rounds.at(-1);
    if (!round) continue;

    const heading = findingHeading.exec(line);
    if (anyHeading.test(line)) {
      finding = heading && {
        id: `F${Number(heading[1])}`,
        title: heading[2],
        severities: [],
      };
      if (finding) round.raised.push(finding);
      continue;
    }
    const severity = severityLine.exec(line);
    if (severity) {
      finding?.severities.push(severity[1]);
      continue;
    }
    const field = fieldLine.exec(line);
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
    const outcome = outcomeLine.exec(line);
    if (outcome) {
      const id = `F${Number(outcome[1])}`;
      const parsed = parseOutcome(outcome[2]);
      if (round.stated.some((entry) => entry.id === id)) {
        problems.push(messages.statedTwice(round.number, id));
      } else if (!parsed) {
        problems.push(messages.badOutcome(round.number, id, outcome[2]));
      } else {
        round.stated.push({ id, ...parsed });
      }
    }
  }

  for (const round of rounds) {
    if (!round.reviewed) problems.push(messages.noHash(round.number));
    if (!round.verdict) problems.push(messages.noVerdict(round.number));
    for (const { id, severities } of round.raised) {
      if (severities.length === 0) problems.push(messages.noSeverity(round.number, id));
      else if (severities.length > 1) problems.push(messages.repeatedSeverity(round.number, id));
      else if (!/^(critical|minor)$/i.test(severities[0]))
        problems.push(messages.badSeverity(round.number, id, severities[0]));
    }
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
      const known = findings.get(id);
      if (!known) {
        problems.push(messages.unknownFinding(round.number, id));
      } else if (known.raisedIn === round.number) {
        // An outcome answers the author, so it comes in a round after the one that raised it.
        problems.push(messages.outcomeInOwnRound(round.number, id));
      } else if (outcome === "fixed") {
        known.open = false;
      } else if (outcome === "declined") {
        if (note) known.open = false;
        else problems.push(messages.declinedWithoutReason(round.number, id));
      } else {
        notFixed.push(id);
        known.open = true;
        if (!note) problems.push(messages.notFixedWithoutWhat(round.number, id));
      }
    }
    if (index > 0) {
      const stated = new Set(round.stated.map((entry) => entry.id));
      for (const id of openBefore)
        if (!stated.has(id)) problems.push(messages.notStated(round.number, id));
    }
    // The verdict follows from the round: approved when it raises nothing and marks nothing not
    // fixed.
    const raised = round.raised.map((entry) => entry.id);
    if (round.verdict === "approved") {
      if (raised.length > 0) problems.push(messages.approvedButRaises(round.number, raised));
      if (notFixed.length > 0) problems.push(messages.approvedButNotFixed(round.number, notFixed));
    } else if (round.verdict && raised.length === 0 && notFixed.length === 0) {
      problems.push(messages.requestsWithoutCause(round.number));
    }
  }

  // The last round approves (F1).
  const last = rounds.at(-1);
  const open = [...findings.values()].filter((f) => f.open).map((f) => f.id);
  if (last?.verdict === "changes requested") {
    problems.push(
      open.length > 0
        ? messages.changesRequested(last.number, open)
        : messages.lastNotApproved(last.number),
    );
  }
  return { rounds, last, open, problems };
}

/**
 * The problems of checks 3 and 4 for a review record and the hash of the current content,
 * shared by the evidence check and `pnpm review:check`.
 * @param {{ change: string, record: ReturnType<typeof parseRecord> | undefined, current: string }} review
 * @returns {{ check: 3 | 4, problem: string }[]}
 */
export function reviewProblems({ change, record, current }) {
  const problems = [];
  const fail = (check, problem) => problems.push({ check, problem });
  if (record === undefined) fail(3, messages.noRecord(change));
  for (const problem of record?.problems ?? []) fail(3, problem);
  const last = record?.last;
  if (!last) fail(4, messages.noRoundToCompare({ current, change }));
  else if (!last.reviewed)
    fail(4, messages.lastRoundNoHash({ round: last.number, current, change }));
  else if (last.reviewed !== current)
    fail(4, messages.stale({ round: last.number, reviewed: last.reviewed, current, change }));
  return problems;
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
