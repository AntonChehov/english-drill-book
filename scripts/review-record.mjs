// The review record of constitution C-18 item 2, kept in rounds (review-rounds design D2),
// and the messages of the evidence check about it (D4). Each message states the fact, then
// the action, and stands on its own in one cell of the job summary. No message names a
// particular skill: the reader may use any, so they say "the review skill".
import { sections } from "./common.mjs";
import { shownLength } from "./review-hash.mjs";

/** The line of a pull request description that names its change. */
export function changeNamedIn(body) {
  return /^Change:\s*`?([\w.-]+)`?\s*$/m.exec(body ?? "")?.[1];
}

export const recordPath = (change) => `openspec/changes/${change}/review.md`;

const list = (ids) => ids.join(", ");
const outcomes = (id) =>
  `\`- ${id}: fixed\`, \`- ${id}: not fixed — <what remains>\` or \`- ${id}: declined — <reason>\``;

/** Every message of checks 3 and 4. */
export const messages = {
  noRecord: (change) =>
    `There is no review record: \`${recordPath(change)}\` does not exist. Have a reviewing agent, not the author, run a review of the whole diff with the review skill and commit its record there as \`## Round 1\`.`,
  noRound: () =>
    "`review.md` has no round: it has no section `## Round 1`. Run the review with the review skill and record it as `## Round 1`, with the lines `Reviewed: <hash>` and `Verdict:` and its findings.",
  roundOrder: (found, expected) =>
    `\`## Round ${found}\` is round ${expected} of the record. Number the rounds 1, 2, 3 in the order they were made.`,
  noHash: (round) =>
    `Round ${round} has no line \`Reviewed: <hash>\` with the ${shownLength} characters that \`pnpm review:hash\` prints. Add the hash of the content that round read.`,
  noVerdict: (round) =>
    `Round ${round} has no line \`Verdict: approved\` or \`Verdict: changes requested\`. Add the verdict the round reached.`,
  notAFinding: (round, heading) =>
    `Round ${round} has a heading \`### ${heading}\` that is not a finding. Write each finding as \`### F<n> <title>\`, numbered through the whole record.`,
  raisedTwice: (id, first, second) =>
    `${id} is raised twice, in round ${first} and in round ${second}. Number the findings through the whole record: give the later one the next free number.`,
  unknownFinding: (round, id) =>
    `Round ${round} states the outcome of ${id}, which no earlier round raised. Remove the line, or raise ${id} as a finding first.`,
  badOutcome: (round, id, text) =>
    `Round ${round} gives ${id} the outcome \`${text}\`, which is none of the three. Write ${outcomes(id)}.`,
  fixedInOwnRound: (round, id) =>
    `${id} is marked fixed in round ${round}, the round that raised it. A fix is confirmed only by a later round: run the review again with the review skill and state the outcome of ${id} there.`,
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
  noCoverage: () =>
    "`review.md` has no section `## Requirement coverage`. The approving round adds it: for each listed requirement, where it is implemented and which test covers it.",
  noOutside: () =>
    "`review.md` has no section `## Outside the listed requirements` with content. The approving round adds it: what changed outside the listed requirements, or `none`.",
  notCovered: (id) =>
    `\`review.md\` does not state where ${id} is implemented and tested. Add a row for ${id} to \`## Requirement coverage\`.`,
  stale: ({ round, reviewed, current, change }) =>
    `The review is out of date: round ${round} read the content \`${reviewed}\`, and the content of this commit is \`${current}\`, so the files of this pull request changed after it. Run the review again with the review skill on the whole diff and add round ${round + 1} with \`Reviewed: ${current}\`, the hash that \`pnpm review:hash ${change}\` prints.`,
  nothingToCompare: ({ current, change }) =>
    `No round of the review records a hash to compare with the content of this commit, \`${current}\` (see check 3). Run the review with the review skill and record that hash, which \`pnpm review:hash ${change}\` prints, in the round's line \`Reviewed:\`.`,
};

const requirementId = /\b[A-Z][A-Z0-9]*-\d{3}\b/g;

/** One round: its hash, its verdict, the findings it raises and the outcomes it states. */
function parseRound(number, content, problems) {
  const reviewed = new RegExp(`^Reviewed:\\s*\`?([0-9a-f]{${shownLength}})\`?\\s*$`, "m").exec(
    content,
  )?.[1];
  if (!reviewed) problems.push(messages.noHash(number));
  const verdictText = /^Verdict:\s*(approved|changes requested)\s*\.?\s*$/im.exec(content)?.[1];
  const verdict = verdictText?.toLowerCase();
  if (!verdict) problems.push(messages.noVerdict(number));

  const raised = [];
  for (const { title } of sections(content, 3)) {
    const finding = /^F(\d+)[:.]?\s+(\S.*)$/.exec(title);
    if (finding) raised.push({ id: `F${Number(finding[1])}`, title: finding[2] });
    else problems.push(messages.notAFinding(number, title));
  }

  const stated = [];
  for (const [, digits, text] of content.matchAll(/^[-*]\s+F(\d+):\s*(.*?)\s*$/gm)) {
    const id = `F${Number(digits)}`;
    const outcome = /^(not fixed|fixed|declined)\b\s*(?:[—–:-]+\s*)?(.*)$/i.exec(text);
    if (!outcome) {
      problems.push(messages.badOutcome(number, id, text));
      continue;
    }
    stated.push({ id, outcome: outcome[1].toLowerCase(), note: outcome[2].trim() });
  }
  return { number, reviewed, verdict, raised, stated };
}

/**
 * Reads a review record in rounds. `problems` lists, as messages of check 3, what breaks a
 * rule of design D3 other than the coverage of listed requirements, which needs the
 * description and is checked by the caller.
 * @returns {{ rounds: object[], last: object | undefined, open: string[],
 *   coveredIds: Set<string>, problems: string[] }}
 */
export function parseRecord(markdown) {
  const problems = [];
  const top = sections(markdown, 2);
  const rounds = [];
  for (const { title, content } of top) {
    const match = /^Round\s+(\d+)$/i.exec(title);
    if (!match) continue;
    const number = Number(match[1]);
    if (number !== rounds.length + 1) problems.push(messages.roundOrder(number, rounds.length + 1));
    rounds.push(parseRound(number, content, problems));
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
      } else if (outcome === "fixed") {
        if (finding.raisedIn === round.number)
          problems.push(messages.fixedInOwnRound(round.number, id));
        else finding.open = false;
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

  const last = rounds.at(-1);
  const open = [...findings.values()].filter((f) => f.open).map((f) => f.id);
  if (last?.verdict === "changes requested" && open.length > 0)
    problems.push(messages.changesRequested(last.number, open));

  // Written once, by the approving round: required only when the last round approves.
  const byTitle = new Map(top.map(({ title, content }) => [title, content]));
  const coverage = byTitle.get("Requirement coverage");
  if (last?.verdict === "approved") {
    if (coverage === undefined) problems.push(messages.noCoverage());
    if (!byTitle.get("Outside the listed requirements")?.trim())
      problems.push(messages.noOutside());
  }
  const coveredIds = new Set(
    (coverage ?? "")
      .split("\n")
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
  const read = last.reviewed ? `read \`${last.reviewed}\`` : "records no hash";
  const same = last.reviewed === current ? "the same" : "different, so the review is out of date";
  return `Review: round ${last.number}, ${verdict}, ${read}; ${now}, ${same}.`;
}
