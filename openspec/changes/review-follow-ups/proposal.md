# Proposal

## Why

Two things the first changes reviewed in rounds showed.

**Who reviews the later rounds.** `docs/process.md` says a reviewing agent "is started again for the next round", which reads as a new agent each time, and that is how the change `answer-checker` was reviewed: four rounds, four agents, each reading the whole diff from nothing. A reviewer in a team does not forget the change between rounds. A new context matters once, so that the review is not made by the author; after that the reviewer who raised the findings is the one best placed, and cheapest, to say whether they are fixed.

**A round can hide in a comment.** A reviewer of `review-rounds` noted that text inside an HTML comment under `### Notes` is free text to the check and invisible on GitHub. The check reads only headings outside free text, so a comment cannot forge an approval, but the record is evidence for a person: what the owner sees on the pull request and what the file holds must be the same text.

## What Changes

- **The same reviewer for every round of a change.** The first round is made by a reviewing agent started with a fresh context. Later rounds are made by that same agent, resumed with its context. A new agent is started only when the first cannot be resumed, and its round says so under `### Notes`. `docs/process.md` (step 4), `CLAUDE.md` and `README.md` are reworded; C-18 already says "a reviewing agent, not the author" and stays as it is.
- **No HTML comments in the record.** A `review.md` that contains `<!--` outside a fenced block fails the review check, with a message that says what to do.

Requirements delivered from `docs/product/`: none. This change alters no behaviour of the app, so it has no delta specs (`skip_specs`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None.

## Impact

- Changed: `scripts/review-record.mjs` and its tests; `docs/process.md`, `CLAUDE.md`, `README.md`.
- Records already archived are not read by the check and are not touched.
