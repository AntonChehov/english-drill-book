# Proposal

## Why

The review record of C-18 is written once. It names the commit that was reviewed, and commits made afterwards to fix the findings are accepted on the author's word: nobody looks at the fix. A team does not review this way. In a team the reviewer reads the change, asks for corrections, reads it again after they are made, says what is still wrong, and approves only the version in front of them; any later push makes that approval stale.

The messages of the check also say what is wrong without saying what to do.

## What Changes

- **A hash of the reviewed content.** `scripts/review-hash.mjs` computes one hash over the files a pull request changes. The reviewer writes it into the record; CI computes it again. If any reviewed file changed since, the hashes differ and the pull request cannot be merged until the review is run again.
- **Rounds.** `review.md` becomes a sequence of rounds, each with the hash it reviewed, its findings and a verdict: `changes requested` or `approved`. A round after the first states, for every finding still open, whether it is now fixed. A finding is closed only by a later round that confirms the fix, or by declining it with a reason.
- **Approval.** The pull request passes when the last round is `approved`, no finding is open, and the round's hash equals the hash of the head commit. A review without findings takes one round; a review with findings takes at least two.
- **Check 4 is replaced.** "Every commit after the reviewed one is a recorded fix or touches only the change's directory" is removed: the hash covers it, and more strictly.
- **Messages say what to do.** Every failure of the review check states the required action in plain words — run the review again with the review skill, fix or decline the finding — without naming a particular skill. This absorbs the change `evidence-messages`, which is withdrawn.
- **Who reviews.** The review is made by a reviewing agent started for it, not by the agent that wrote the code. It reads the diff and the change's documents and does not edit code.

Requirements delivered from `docs/product/`: none. This change alters no behaviour of the app, so it has no delta specs (`skip_specs`).

**BREAKING** for work in flight: a pull request open when this merges needs its record rewritten in rounds.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None.

## Impact

- `scripts/pr-evidence.mjs` and its tests; new `scripts/review-hash.mjs` with tests; `package.json` (`pnpm review:hash`); the evidence comment and the job summary show the round, the verdict and the hash.
- Owner-controlled documents, changed with the owner's approval: `docs/constitution.md` (C-18 item 2), `docs/process.md` (step 4 and the roles table), `CLAUDE.md` (the review instruction), `openspec/config.yaml` (the rule for the last task group).
- Starts after `pipeline-follow-ups` is merged, because both edit the same script.
