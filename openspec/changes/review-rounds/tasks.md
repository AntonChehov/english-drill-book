# Tasks

Tasks marked **(owner)** need the owner's GitHub account and cannot be done by an agent.

## 1. Hash

- [x] 1.1 Write `scripts/review-hash.mjs` as in design D1 with unit tests over a temporary repository: the hash changes when a changed file is edited, added or deleted; it does not change when only `review.md` or `tasks.md` of the change is edited, when a commit message is amended, or when the branch is brought up to date with a `main` that touched other files; verify the unit tests pass
- [x] 1.2 Add `pnpm review:hash`; verify it prints the same value locally and in a CI run for the same commit
  - A local clone and the `evidence` job of run 43087987806 computed the same hash, `4deab9156879`, for the head of pull request #6 at round 1 of the review. The hash has since gained the file mode (round 1, F6), so its values differ from then on, on both sides alike.

## 2. Record and check

- [x] 2.1 Parse the record of design D2 in `scripts/pr-evidence.mjs`, with unit tests over fixture records for every rule of D3 failing alone and for a record with one, two and three rounds passing; verify the unit tests pass
- [x] 2.2 Replace check 4 with "Reviewed content" (D3) and remove the rule on commits after the review with its tests; verify the report table shows the two checks separately
- [x] 2.3 Write the messages of design D4, each stating the fact and the action, with a unit test that no message names a particular skill; verify the tests pass
- [x] 2.4 Show the round, the verdict and the hash in the job summary and in the evidence comment; verify with the unit tests of the comment

## 3. Documents

- [x] 3.1 Replace C-18 item 2 in `docs/constitution.md` with the wording of design D6; reword `docs/process.md` (step 4, roles table), `CLAUDE.md` and the tasks rule of `openspec/config.yaml` to match; verify each against what the script checks

## 4. Review and evidence

- [x] 4.1 Run `pnpm verify` from a clean build; verify it passes — every part ran locally except WebKit, which does not start on the development machine; the whole of it passed in CI, run [43109793753](https://github.com/AntonChehov/english-drill-book/actions/runs/43109793753)
  - Without `dist`, `reports` or `.lighthouseci` beforehand: `pnpm check`, 238 unit tests with the coverage thresholds, the end-to-end tests on Chromium and Firefox (24), `pnpm size` (34.57 kB JS, 0.50 kB CSS gzip) and `pnpm lhci` pass. WebKit does not start on this machine (`libavif.so.16` missing) and nothing was installed, so its 8 tests did not run locally; CI runs them.
- [x] 4.2 Open the pull request as the bot; a reviewing agent writes round 1; verify the `evidence` check fails with the message for "changes requested" if there are findings, or passes if there are none — round 1 raised F1 – F7; run [43088766713](https://github.com/AntonChehov/english-drill-book/actions/runs/43088766713) failed on check 3 for them
- [x] 4.3 Fix or decline each finding; a reviewing agent writes the next round; repeat until a round approves; verify the `evidence` check is green — round 2 left F2 open and raised F8 and F9 (run [43107727385](https://github.com/AntonChehov/english-drill-book/actions/runs/43107727385), red); round 3 approved; run [43109793753](https://github.com/AntonChehov/english-drill-book/actions/runs/43109793753) is green
- [x] 4.4 After the approving round, push a one-line change to a reviewed file; verify the `evidence` check fails with the message for stale content; have the change reviewed in a further round; verify the check is green again — commit d71578f changed one sentence of `design.md`; run [43110214472](https://github.com/AntonChehov/english-drill-book/actions/runs/43110214472) failed on check 4 as out of date; round 4 approved the new content; the run on the commit that records this tick is green
- [ ] 4.5 **(owner)** Approve and merge
