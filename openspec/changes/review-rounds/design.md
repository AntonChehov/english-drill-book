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

The hash covers the files the pull request changes: the files that differ between the merge base with `main` and the head commit. For each, its path and the git blob ID at the head (or `deleted`). The list is sorted by path and hashed with SHA-256; the record shows the first 12 hexadecimal characters.

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
- F2: declined — <reason given by the author, accepted or not by the reviewer>

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
