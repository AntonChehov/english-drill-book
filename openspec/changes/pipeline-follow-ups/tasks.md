# Tasks

Tasks marked **(owner)** need the owner's GitHub account and cannot be done by an agent.

## 1. Close the bootstrap

- [x] 1.1 Tick tasks 7.2, 7.5, 8.1, 8.2 and 9.3 of `bootstrap-app-and-ci`, each with the run or address that showed it; tick 7.4 with the note of design D5; record the protection settings in its design D11; verify with `gh` that each named run succeeded and that the protection of `main` reads as recorded
  - Verified with `gh`: runs 43072179823, 43072602012 (pull request), 43077073059 (Main) and 43077854070 (Prune evidence, its log says "Removed: pr-1") concluded `success`; the evidence comment on #1 is one comment, updated in place for e32aa45; pull request #2 is the bot's, from `release-please--branches--main--components--english-drill-book`, every check green; the `evidence` branch holds `main` and `pr-2`; `GET …/branches/main/protection` reads as recorded in D11. The demo was opened in Chromium. Taken from the owner's brief, not verifiable through the API: that the protection was switched on by the owner's assistant.
- [x] 1.2 Archive `bootstrap-app-and-ci` with `openspec archive`; verify `openspec/specs/app-shell/spec.md` carries PROD-001 and PROD-008 and that `pnpm check` passes
  - Archived as `openspec/changes/archive/2026-11-11-bootstrap-app-and-ci/`; `openspec/specs/app-shell/spec.md` holds PROD-001 and PROD-008; `pnpm check` passes (traceability: 2 requirements, each named by a test). The evidence check lists changes under `openspec/changes/` without `archive`, so this pull request still names exactly one change.
- [x] 1.3 Update `docs/roadmap.md`: slice 1.1 done, what is next; verify the demo address in it answers
  - The demo address answers 200 (`curl`, 2026-11-11).

## 2. Archive pull request

- [x] 2.1 Add the exemption of design D1 to `scripts/pr-evidence.mjs` with unit tests in which each of the five conditions fails alone and the pull request is then judged by the six checks; verify the unit tests pass
  - `archiveProblems` returns the conditions not met; the job summary says "Exempt: …" for an exempt pull request and lists the unmet conditions for an `archive/` branch that is not. `scripts/pr-evidence.test.mjs`: 59 tests pass, one per failing condition (5 has three: an unticked task, no `review.md`, no `tasks.md`), plus a pull request that moves no change into the archive.
- [x] 2.2 Amend `docs/constitution.md` (C-14, C-18) and `docs/process.md` (step 8) as in design D2; verify the wording against what the script checks
  - C-18 states the conditions in full and C-14 points to it, rather than to a design that moves into the archive. The first wording did not match the script (review findings F6, F11); after the fixes each condition in C-18 is one in `isReleasePullRequest` or `archiveProblems`: author; branch prefix; the files changed; at least one change moved to a new `<date>-<name>` directory, leaving nothing behind; no other change and nothing archived touched; living specs only of archived capabilities, none deleted; every task ticked; `review.md` present.

## 3. First version

- [x] 3.1 Set the initial version of design D3; verify `pnpm verify` passes
  - `"initial-version": "0.1.0"`; `bump-patch-for-minor-pre-major` removed (design D3, as implemented). `pnpm verify` is run in 4.1.

## 4. Review and evidence

- [x] 4.1 Run `pnpm verify` from a clean build; verify it passes
  - Passed in 1 min 0 s after removing `dist`, `reports`, `test-results`, `screenshots`, `.lighthouseci` and `metrics.json`: 148 unit tests, coverage of `src/domain` 100 %, 32 end-to-end tests on Chromium, Firefox and WebKit, initial JS 34.57 kB and CSS 0.50 kB gzip, Lighthouse assertions met. WebKit ran with three system libraries it lacks on this machine preloaded from a scratch directory; nothing was installed. `commitlint --from main` passes.
- [x] 4.2 Open the pull request as the bot before any review record exists; verify the `evidence` check fails and names the missing `review.md`; record the run here
  - Pull request #3, opened by `app/english-drill-book-bot` at ed1e4fa. Run [43081006507](https://github.com/AntonChehov/english-drill-book/actions/runs/43081006507): every job of `checks` green, `evidence` failed with one problem, check 3 "openspec/changes/pipeline-follow-ups/review.md does not exist"; checks 1, 2, 4, 5 and 6 passed.
- [x] 4.3 Run the code-review skill on the whole diff and commit `review.md` with one finding still without an outcome (design D4); verify the `evidence` check fails and names that finding; record the run here
  - Reviewed commit ed1e4fa, 15 findings. Fixes in 3dcf77d and 628c974; `review.md` committed in 4a93425 with F4 open. Run [43083274816](https://github.com/AntonChehov/english-drill-book/actions/runs/43083274816): `checks` green, `evidence` failed with one problem, check 3 'finding "F4 The last task of a change cannot be ticked before its own archive pull request has run" has no outcome (fixed in <sha> or declined)'; checks 1, 2, 4, 5 and 6 passed.
- [ ] 4.4 Fix or decline each finding and complete `review.md`; verify the `evidence` check is green; record the run here
- [ ] 4.5 **(owner)** Approve and merge
- [ ] 4.6 After the merge, verify the release pull request proposes `0.1.0`
- [ ] 4.7 After the merge, open the archive pull request of this change as the bot from `archive/pipeline-follow-ups`; verify the `evidence` check passes by the exemption and says so in its summary
