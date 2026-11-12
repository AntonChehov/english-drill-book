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
    `\`review.md\` has the line \`${quote(line)}\` before its first round. Before \`## Round 1\` the record holds only its title, \`# Review\`: move the line under \`### Notes\` of a round, which any round may have.`,
  unclosedFence: (line) =>
    `\`review.md\` has a fenced block, opened on line ${line}, that is never closed, so everything after it is read as text. Close it with a line that repeats its opening fence.`,
  repeatedLine: (round, name) =>
    `Round ${round} has more than one line \`${name}:\`. Keep one: a round has one hash and one verdict.`,
  unknownLine: (round, line) =>
    `Round ${round} has the line \`${quote(line)}\`, which the record does not know. Before its first \`###\` subsection a round holds only \`Reviewed: <hash>\`, \`Verdict:\` and lines \`- F<n>: <outcome>\`, each of which may be followed by lines indented under it; put other text under \`### Notes\`, which any round may have, or under a finding.`,
  unknownHeading: (round, heading) =>
    `Round ${round} has the heading \`${quote(heading)}\`, which the record does not know. A round's only headings are its findings \`### F<n> <title>\` and one \`### Notes\`; inside them use paragraphs and list items, not headings.`,
  misplacedLine: (round, where, line) =>
    `Round ${round} has the line \`${quote(line)}\` ${where}. The lines \`Reviewed:\`, \`Verdict:\` and \`- F<n>: <outcome>\` stand unindented at the start of the round, before its first \`###\` subsection; elsewhere say it in words.`,
  notAFinding: (round, heading) =>
    `Round ${round} has a heading \`### ${quote(heading)}\` that is neither a finding nor \`### Notes\`. Write a finding as \`### F<n> <title>\`, numbered through the whole record, and other text under \`### Notes\`.`,
  repeatedNotes: (round) =>
    `Round ${round} has \`### Notes\` more than once. Keep one and put all the round's notes there.`,
  statedTwice: (round, id) =>
    `Round ${round} states the outcome of ${id} more than once. Keep one line \`- ${id}: <outcome>\`: a round gives each finding one outcome.`,
  roundAfterClosing: (round) =>
    `\`## Round ${round}\` comes after the closing sections. Rounds come first: move it above \`## Requirement coverage\` and \`## Outside the listed requirements\`.`,
  misplacedInClosing: (section, line) =>
    `\`## ${section}\` has the line \`${quote(line)}\`, which belongs to a round. \`Reviewed:\`, \`Verdict:\` and \`- F<n>: <outcome>\` stand at the start of a round, above the closing sections; here say it in words.`,
  headingInClosing: (section, heading) =>
    `\`## ${section}\` has the heading \`${quote(heading)}\`. The closing sections hold text and tables, not headings: a finding goes in a round as \`### F<n> <title>\`, notes as \`### Notes\`.`,
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
/** A fence as CommonMark has it: three or more backticks with no backtick after, or tildes. */
const fenceLine = /^\s*(`{3,}(?=[^`]*$)|~{3,})/;
/** An ATX heading of up to three spaces' indentation. */
const headingLine = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;
const outcomeLine = /^[-*+]\s+F(\d+)\s*:\s*(.*?)\s*$/;
const fieldLine = /^(Reviewed|Verdict)\s*:\s*(.*?)\s*$/i;
/** Indented under the line before it: two spaces or a tab, as a list item's content is. */
const indented = /^(?: {2,}|\t)\S/;

/**
 * Whether a line, wherever it stands, reads as one of a round's own lines: `Reviewed:`,
 * `Verdict:` or an outcome in any list form. Free text may not hold one.
 */
const looksLikeRoundLine = (trimmed) =>
  fieldLine.test(trimmed) || /^(?:[-*+]|\d+[.)])\s+F\d+\s*:/.test(trimmed);
const isHeading = (trimmed) => /^#{1,6}(?:[ \t]|$)/.test(trimmed);

/**
 * What free text may not hold: a heading, also one in a block quote or underlined (a setext
 * heading, made of the free line before it), or one of a round's own lines, also quoted.
 * @param {string} trimmed  the line without its indentation
 * @param {string | undefined} previous  the line before, when it was free text of the same place
 * @returns {{ heading: string } | { roundLine: true } | undefined}
 */
function forbiddenInText(trimmed, previous) {
  const inner = trimmed.replace(/^(?:>\s*)+/, "");
  if (isHeading(inner)) return { heading: trimmed };
  const underlinesListItem = previous !== undefined && /^(?:[-*+]|\d+[.)])\s/.test(previous);
  if (previous !== undefined && !underlinesListItem && /^(?:=+|-+)$/.test(inner))
    return { heading: previous };
  if (looksLikeRoundLine(inner)) return { roundLine: true };
  return undefined;
}

/** An outcome exactly as D2 writes it, or undefined. */
function parseOutcome(text) {
  if (/^fixed\.?$/i.test(text)) return { outcome: "fixed", note: "" };
  const match = /^(not fixed|declined)(?:\s*[—–-]\s*(.*))?$/i.exec(text);
  if (!match) return undefined;
  return { outcome: match[1].toLowerCase(), note: (match[2] ?? "").trim() };
}

/**
 * Reads a review record in rounds, line by line, by the grammar of design D2 as clarified
 * (rounds 1 and 2 of the review of review-rounds, F2 and F8). Everything in it is either
 * recognised or reported; free text has three places only: indented under an outcome, under
 * a finding and under a round's `### Notes`, plus the two closing sections. `problems`
 * lists, as messages of check 3, what breaks a rule of design D2 or D3 other than the
 * coverage of listed requirements, which needs the description and is checked by the caller.
 * @returns {{ rounds: object[], last: object | undefined, open: string[],
 *   coveredIds: Set<string>, problems: string[] }}
 */
export function parseRecord(markdown) {
  const problems = [];
  const rounds = [];
  const closing = new Map();
  /**
   * Where the line being read belongs: `preamble`, `round` (its `part` is `head` before the
   * first `###`, else the subsection), `closing` or `unknown`.
   */
  let place = { kind: "preamble", titled: false };
  /** The fence of the open fenced block and the line it opened on, while one is open. */
  let openFence;

  /** The previous line, when it was free text: a setext underline makes it a heading. */
  let lastFree;

  for (const [index, line] of (markdown ?? "").split(/\r?\n/).entries()) {
    const trimmed = line.trim();
    const round = place.kind === "round" ? place.round : undefined;
    const previous = lastFree;
    lastFree = undefined;

    // Fenced blocks: free text wherever free text may stand, and nothing else.
    if (openFence) {
      const close = /^\s*(`{3,}|~{3,})\s*$/.exec(line)?.[1];
      if (close && close[0] === openFence.marker[0] && close.length >= openFence.marker.length)
        openFence = undefined;
      if (place.kind === "closing") place.content.push(line);
      continue;
    }
    const marker = fenceLine.exec(line)?.[1];
    if (marker) {
      openFence = { marker, line: index + 1 };
      if (place.kind === "preamble") problems.push(messages.textBeforeRounds(line));
      else if (round && round.part === "head") {
        if (!(indented.test(line) && round.outcome))
          problems.push(messages.unknownLine(round.number, line));
      } else if (place.kind === "closing") place.content.push(line);
      continue;
    }

    const heading = headingLine.exec(line);
    if (heading?.[1] === "##") {
      const title = heading[2] ?? "";
      const number = /^Round\s+(\d+)$/i.exec(title)?.[1];
      if (number !== undefined) {
        const expected = rounds.length + 1;
        if (Number(number) !== expected)
          problems.push(messages.roundOrder(Number(number), expected));
        if (closing.size > 0) problems.push(messages.roundAfterClosing(Number(number)));
        const next = {
          number: Number(number),
          reviewed: undefined,
          verdict: undefined,
          raised: [],
          stated: [],
          seen: new Set(),
          part: "head",
          outcome: undefined,
          notes: false,
        };
        rounds.push(next);
        place = { kind: "round", round: next };
      } else if (closingSections.includes(title)) {
        if (closing.has(title)) problems.push(messages.repeatedSection(title));
        const content = [];
        closing.set(title, content);
        place = { kind: "closing", title, content };
      } else {
        problems.push(messages.unknownSection(title));
        place = { kind: "unknown" };
      }
      continue;
    }
    if (place.kind === "unknown") continue;
    if (trimmed === "") {
      if (place.kind === "closing") place.content.push(line);
      continue;
    }

    if (place.kind === "closing") {
      const forbidden = forbiddenInText(trimmed, previous);
      if (forbidden?.heading)
        problems.push(messages.headingInClosing(place.title, forbidden.heading));
      else if (forbidden) problems.push(messages.misplacedInClosing(place.title, trimmed));
      else {
        place.content.push(line);
        lastFree = trimmed;
      }
      continue;
    }

    if (place.kind === "preamble") {
      if (heading?.[1] === "#" && !place.titled) place.titled = true;
      else problems.push(messages.textBeforeRounds(line));
      continue;
    }

    // In a round: its subsections first.
    if (heading?.[1] === "###") {
      const title = heading[2] ?? "";
      const finding = /^F(\d+)[:.]?\s+(\S.*)$/.exec(title);
      if (finding) {
        const id = `F${Number(finding[1])}`;
        round.raised.push({ id, title: finding[2] });
        round.part = `under finding ${id}`;
      } else if (title === "Notes") {
        if (round.notes) problems.push(messages.repeatedNotes(round.number));
        round.notes = true;
        round.part = "under `### Notes`";
      } else {
        problems.push(messages.notAFinding(round.number, title));
        round.part = `under \`### ${quote(title)}\``;
      }
      continue;
    }
    if (isHeading(trimmed)) {
      problems.push(messages.unknownHeading(round.number, trimmed));
      continue;
    }
    if (round.part !== "head") {
      const forbidden = forbiddenInText(trimmed, previous);
      if (forbidden?.heading)
        problems.push(messages.unknownHeading(round.number, forbidden.heading));
      else if (forbidden) problems.push(messages.misplacedLine(round.number, round.part, trimmed));
      else lastFree = trimmed;
      continue;
    }

    // The head of a round: its own lines, and the lines indented under an outcome.
    if (indented.test(line)) {
      const forbidden = round.outcome && forbiddenInText(trimmed, previous);
      if (!round.outcome) problems.push(messages.unknownLine(round.number, trimmed));
      else if (forbidden?.heading)
        problems.push(messages.unknownHeading(round.number, forbidden.heading));
      else if (forbidden)
        problems.push(
          messages.misplacedLine(
            round.number,
            `indented under the outcome of ${round.outcome.id}`,
            trimmed,
          ),
        );
      else {
        round.outcome.lines.push(trimmed);
        lastFree = trimmed;
      }
      continue;
    }
    round.outcome = undefined;
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
      // Lines indented under it belong to it, whatever it is.
      round.outcome = { id, lines: [] };
      if (round.stated.some((entry) => entry.id === id)) {
        problems.push(messages.statedTwice(round.number, id));
      } else if (!parsed) {
        problems.push(messages.badOutcome(round.number, id, outcome[2]));
      } else {
        round.outcome = { id, ...parsed, lines: [] };
        round.stated.push(round.outcome);
      }
      continue;
    }
    problems.push(messages.unknownLine(round.number, trimmed));
  }

  if (openFence) problems.push(messages.unclosedFence(openFence.line));
  for (const round of rounds) {
    if (!round.reviewed) problems.push(messages.noHash(round.number));
    if (!round.verdict) problems.push(messages.noVerdict(round.number));
    // The lines indented under an outcome extend its reason, or note how a fix was checked.
    round.stated = round.stated.map(({ id, outcome, note, lines }) => ({
      id,
      outcome,
      note: [note, ...lines].filter(Boolean).join("\n"),
    }));
    for (const key of ["seen", "part", "outcome", "notes"]) delete round[key];
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
