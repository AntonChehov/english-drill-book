# Review of workflow-retro-2

## Round 1

Reviewed: 64238f049f4a
Verdict: changes requested

### F1 The --offline hint is gone from review:hash

Severity: minor

Where: `scripts/review-hash.mjs`, `fetchMain`. What: the fetch error used to end with "Run this again online, or with --offline to print it with that warning."; the shared `fetchMain` now says only "Run this again online.". `--offline` is still an option of `pnpm review:hash` (parsed in `main`, documented in the header), so a reviewer offline loses the pointer to it. Why: the hint fits `review:hash` but not `review:check`, which has no `--offline`; keep it for `review:hash`, for example by letting `main` catch and extend the error, or by a hint parameter of `fetchMain`.

### F2 review:check reports no record at the archive commit

Severity: minor

Where: `scripts/review-check.mjs`, `checkReview`. What: the record is read from `recordPath(change)`, that is `openspec/changes/<name>/review.md`, while `reviewHash` hashes an archive commit at its parent and CI reads the record from the archived directory (`directoryOf` in `pr-evidence.mjs`). With the archive commit at HEAD the record path no longer exists, so the script prints "There is no review record" and "No content was compared" and exits 1 where CI passes checks 3 and 4. Why: the proposal says it runs checks 3 and 4 of the evidence check, and the mechanic is to run it before every push, the archive push included. Either read the record from the archived directory when `archiveOf` names the change, or state in the usage comment and the texts that it is run before the archive commit, not on it.

### Notes

C-19 is 240 s everywhere: constitution, `duration.mjs` (constant and comment), `duration.test.mjs`; no other mention of 3 minutes or 180 s outside the archive. `reviewProblems` keeps the behaviour of checks 3 and 4 in `pr-evidence.mjs` (same messages, same order; `reviewOf` already carries `change`); its tests stay green. The texts of V1, V4, V6 and V7 match the proposal. Task 4.1 is local and unticked by design. Tests of `review-check`, `pr-evidence` and `duration` run green locally (132).

## Round 2

Reviewed: 4c2a9827b3ae
Verdict: approved

- F1: fixed
- F2: fixed

### Notes

Fix of F1: `fetchMain` takes the closing advice as a parameter; `review:hash` passes the `--offline` hint again. Fix of F2: `checkReview` reads the record from the archived directory when `archiveOf` names the change, with a new test at an archive commit. The rest of the diff is unchanged since round 1. The error of `fetchMain` now says the hash "is not printed" for `review:check` too, which prints no hash: harmless wording. Tests of `review-check` and `pr-evidence` are green locally (131).

## Round 3

Reviewed: c129d7e8edd2
Verdict: approved

### Notes

No finding was open. The branch was rebased onto main (#39, #40) and the archive commit reverted. The hash changed because main changed files of this diff, but the diff's own lines are the same as in round 2. The proposal and tasks did not change, and `review.md` only gained round 2.
