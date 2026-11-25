# Proposal

## Why

The second retrospective (2026-11-25) found three sources of repeated work: a full validation of the milestone on every change, a pipeline budget that loaded runners just exceed, and evidence checks failing on the form of `review.md`. The owner chose V1–V4, V6 and V7. The moratorium of `workflow-retro` is over: three product changes have been merged since.

## What Changes

1. **Validation per change (V1)**: the validator runs, once, only the scenarios the change touches. The full milestone set, three runs each, only before a release or on the owner's request. `docs/process.md` step 5 and `docs/process/validator-prompt.md` say so.
2. **Pipeline budget of 4 minutes (V2)**: C-19 says "within 4 minutes"; `scripts/duration.mjs` has `budgetSeconds = 240`.
3. **Local check of the review record (V3)**: `pnpm review:check <name>` runs checks 3 and 4 of the evidence check (form, one outcome line per open finding, hash) without the GitHub API. The reviewer runs it before finishing a round, the mechanic before every push; it shares code with `pr-evidence.mjs`. A line `- F<n>:` in `### Notes` is read as an outcome; the texts say so.
4. **Archive after green CI (V4)**: the archive commit is made only when CI is green on the commit before it (`docs/process.md` step 6).
5. **Word limits are a ceiling (V7)**: an artifact is as short as it can be (`CLAUDE.md`, `docs/process.md`).
6. **Only the mechanic watches CI (V6)**: it watches in the foreground and reports once; the coordinating session polls once only if no report comes within 10 minutes (`docs/process.md` step 4).

Requirements delivered: none. Process only.

Left for later: the lighter specifications.

## Capabilities

None.

## Impact

- Texts: `docs/process.md`, `docs/process/validator-prompt.md`, `docs/constitution.md` (C-19), `CLAUDE.md`.
- Scripts and tests: `duration.mjs`, `duration.test.mjs`, `pr-evidence.mjs`, `review-record.mjs`, new `review-check.mjs`, `package.json`.
- Local agent files, not committed.
