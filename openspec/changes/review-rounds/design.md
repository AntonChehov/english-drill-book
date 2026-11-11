# Design

## Context

C-18 item 2 today: one record, one reviewed commit, findings closed by the author as "fixed in <sha>" or "declined". `scripts/pr-evidence.mjs` check 3 parses the record and check 4 limits what may be committed after the reviewed commit. The fix of a finding is never read by the reviewer.

Constraints touched: C-18 item 2 (rewritten, D6), C-17 and the roles of `docs/process.md` (a third role, D5). Measured as before by the required `evidence` check; the new rules are covered by unit tests of the script.

## Goals / Non-Goals

**Goals:**

- An approval is valid for exactly the content it was given for.
- A fix is confirmed by a second reading, not by the author's note.
- A failed check tells the reader what to do next.

**Non-Goals:**

- Proving that a review took place. CI can check that the record is complete and matches the content, not that an agent read the code. That rests, as before, on the roles and on the owner reading the pull request.
- Replacing the owner's approval on GitHub. The reviewer's verdict is a precondition for it.

## Decisions

### D1. What is hashed

The hash covers the files the pull request changes: the files that differ between the merge base with `main` and the head commit. For each, its path, its mode and the git blob ID at the head (or `deleted`). The list is sorted by path and hashed with SHA-256; the record shows the first 12 hexadecimal characters.

Two files are left out: `review.md` and `tasks.md` of the change's own directory. Why: the record cannot contain its own hash, and ticking a verified task is bookkeeping, not a change to review. Everything else in the change's directory, the design and the delta specs included, is hashed.

Why blob IDs of the changed files and not the commit or the tree: the hash then depends only on what the pull request changes. Amending a commit message or bringing the branch up to date with `main` keeps the approval, unless `main` changed one of the same files, in which case the content the reviewer approved is in fact different.

One script computes it for both sides: `pnpm review:hash` for the reviewer, the same module imported by `pr-evidence.mjs` in CI.

### D2. The record

```markdown
# Review

## Round 1

Reviewed: 3f9c2a71b0de
Verdict: changes requested

### F1 <title>

- Where: <file>:<line>
- Problem: <what is wrong and why it matters>

### F2 <title>

- Where: <file>:<line>
- Problem: <…>

## Round 2

Reviewed: 8a04e6d2c517
Verdict: approved

- F1: fixed
  - <optional: how the fix was checked>
- F2: declined — <reason given by the author, accepted or not by the reviewer>

### Notes

<optional: why the round approves, what was checked beyond the findings>

## Requirement coverage

| ID | Implemented in | Test |
| --- | --- | --- |

## Outside the listed requirements

<list, or "none">
```

- Findings are numbered through the whole record. A round may raise new ones.
- A round after the first carries one line for every finding not yet closed: `fixed`, `not fixed — <what remains>`, or `declined — <reason>`.
- A round with no new finding and no line `not fixed` has the verdict `approved`; any other round has `changes requested`. The script checks that the verdict agrees with the round's content.
- `Requirement coverage` and `Outside the listed requirements` are written once, by the approving round.

### D3. What the check requires

Check 3 passes when all of these hold; each failure has its own message (D4):

1. the record exists and has at least one round;
2. every round has a hash and a verdict that agrees with its content;
3. every finding is closed: `fixed` in a round later than the one that raised it, or `declined` with a reason;
4. the last round is `approved`;
5. the hash of the last round equals the hash CI computes for the head commit.

Check 4 becomes "Reviewed content": it reports rule 5 on its own line of the table, so that "the review is incomplete" and "the review is out of date" are told apart at a glance.

### D4. Messages

Each message states the fact and then the action. Wording to be reviewed by the owner in the pull request; the intent:

| Situation | The message says |
| --- | --- |
| no record | run a review of the whole diff with the review skill and commit the record |
| content changed after the last round | which hash was reviewed and which is current; run the review again with the review skill and add a round |
| last round asks for changes | which findings are open; fix or decline each, then run the review again |
| finding closed in the round that raised it | a fix is confirmed by a later round; run the review again |
| declined without a reason | give the reason |
| verdict disagrees with the round | which line contradicts it |

No message names a particular skill; a unit test enforces it.

### D5. The reviewing agent

The review is made by an agent started for this purpose with a fresh context. It reads this repository — the diff, the change's proposal, design and specs — runs the review skill, and writes its round into `review.md`. It does not edit anything else and does not fix what it finds. The implementing agent then fixes or declines, and a reviewing agent is started again for the next round.

Why a separate agent: an author reviewing their own change sees what they meant to write. Alternative considered: the implementing agent runs the skill itself, as today — cheaper, but its second round would be the author confirming their own fix, which is what this change removes.

The reviewing agent is not shown the holdout scenarios, like the implementer.

### D6. Wording of the constitution, C-18 item 2

> 2. *That it was reviewed* — a review record committed as `review.md` in the change's directory, kept in rounds as a review in a team is. In each round a reviewing agent, not the author, runs the review skill on the whole diff and records the hash of the content it read, its findings and a verdict: **changes requested** or **approved**. A later round states for every open finding whether it is fixed. A finding is closed only as **fixed**, confirmed by a later round, or **declined**, with the reason; declined findings are shown to the owner at approval. The record also states, for each listed requirement, where it is implemented and which test covers it, and what was changed outside the listed requirements. The pull request passes when the last round is approved, no finding is open, and the hash of that round equals the hash of the latest commit's content: any change to the reviewed files makes the approval stale.

`docs/process.md` step 4 and its roles table, `CLAUDE.md` and the tasks rule in `openspec/config.yaml` are reworded to match.

## Risks / Trade-offs

- [More agent runs per change: at least two reviews when there is any finding] → accepted; it is the point of the change. A clean change still takes one.
- [A trivial fix after approval, such as a typo, forces a new round] → accepted, as in a team with stale approvals dismissed; the round is short because the reviewer reads the difference from the previous round.
- [The agent writes an approval without reviewing] → not preventable by CI (see Non-Goals); the separate role and the owner's reading are the control.
- [Bringing the branch up to date changes the hash] → only when `main` changed a file the pull request also changes (D1), which is exactly when a second look is warranted.
- [This change's own pull request] → it is judged by its own version of the script, so its record is written in rounds from the start.

## Clarifications made in implementation

Within the intent of the decisions above; listed so that the owner can check them.

- **D1, the merge base.** Both sides take the merge base of the head commit with `origin/main`, or with a local `main` where there is no `origin/main`. A stale `origin/main` would give the reviewer a hash CI never computes, so `pnpm review:hash` fetches `main` from `origin` first and prints nothing when it cannot; `--offline` prints the hash with a warning that it may differ from CI's, and so does `--base <ref>` (round 1 of the review, F3). The checkout of the `evidence` job fetches every branch with its history (`fetch-depth: 0`), so `origin/main` is there and is the current `main`. The other parts of the evidence check, the exemptions included, keep the merge base with the pull request's base commit as before.
- **D1, the input of the hash.** For each file, its path, a NUL, its mode (empty for a deleted file), a NUL, its blob ID or `deleted`, a NUL; sorted by path. The mode is in it so that making a reviewed file executable, or turning it into a link, makes the approval stale (F6). `pnpm review:hash <change>` prints the 12 characters; without `<change>` it takes the one in-flight change whose directory the branch touches. A name that is not a directory under `openspec/changes/` at the head is refused with the names that are (F4). It hashes the commit, not the working tree, and warns about files not committed.
- **D2, the form of the record.** The record is read line by line, and what it does not recognise is reported with the form expected, never read as something else (rounds 1 and 2 of the review, F2 and F8). The grammar:
  - Before `## Round 1`: only one title line `# …`.
  - Level-two sections: `## Round <n>`, numbered 1, 2, 3 in order, then once each `## Requirement coverage` and `## Outside the listed requirements`. A round after a closing section is reported; so is any other level-two section, whose content is then not read further.
  - The head of a round, before its first level-three heading: exactly one line `Reviewed:` with the 12 characters, exactly one line `Verdict:`, and at most one outcome line `- F<n>: …` per finding, each unindented. Lines indented under an outcome by two spaces or a tab, blank lines between them included, belong to it: for `not fixed` and `declined` they continue the reason, for `fixed` they say how the fix was checked. Any other line of the head is reported.
  - The subsections of a round: its findings `### F<n> <title>`, numbered through the whole record, and at most one `### Notes`, which any round may have, an approving one included. Any other heading in a round is reported.
  - Free text, that is a finding's body, `### Notes`, the lines indented under an outcome and the two closing sections, holds no heading (an ATX heading, a setext heading made by a line of `=` or `-` under a line of text, and either inside a block quote) and none of a round's own lines (`Reviewed:`, `Verdict:` or an outcome in any list form, also quoted); each is reported with where it belongs.
  - Fences are read as CommonMark reads them: three or more backticks with no backtick in the rest of the line, or three or more tildes; a block closes on a line of the same character, at least as long, and nothing else. A fenced block is text where free text may stand, and reported elsewhere; one that is never closed is reported. HTML comments are not read.
- **D2, outcomes.** An outcome line is `- F<n>:` followed by exactly `fixed`, `not fixed — <what remains>` or `declined — <reason>`, with an em dash, an en dash or a hyphen; any other text, such as words after `fixed`, is reported (F5). It is stated only for a finding raised in an earlier round, since it answers the author: in the round that raised the finding it closes nothing and is reported. `not fixed` without what remains is reported, like `declined` without a reason. A round after the first that omits an open finding is reported (D2: it "carries one line for every finding not yet closed").
- **D3, rule 4.** The last round must say `Verdict: approved`, checked on its own and not only through the findings it leaves open (F1).
- **D2, coverage.** `Requirement coverage` and `Outside the listed requirements` are required only once the last round approves, since the approving round writes them.
- **D3, checks 3 and 4 when nothing was compared.** When there is no record, no round, or the last round has no hash, check 4 fails too, says which of these it is and shows the current hash; when the description names no change in `openspec/changes/`, checks 3 and 4 both fail besides check 1. The table never shows the record as read or the content as checked when nothing was (F7).
- **Where the code lives.** The record is parsed in `scripts/review-record.mjs`, not in `scripts/pr-evidence.mjs` itself, because the evidence comment needs it too and `pr-evidence.mjs` already imports from `evidence-comment.mjs`.
- **D6, the rest of C-18.** The sentence "A new commit invalidates items 2 – 4" now says that a new commit invalidates items 3 and 4, and item 2 when it changes the reviewed content, which is what the hash enforces. `README.md` no longer says that agents review their own diff.
