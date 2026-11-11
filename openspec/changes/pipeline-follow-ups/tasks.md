# Tasks

Tasks marked **(owner)** need the owner's GitHub account and cannot be done by an agent.

## 1. Close the bootstrap

- [ ] 1.1 Tick tasks 7.2, 7.5, 8.1, 8.2 and 9.3 of `bootstrap-app-and-ci`, each with the run or address that showed it; tick 7.4 with the note of design D5; record the protection settings in its design D11; verify with `gh` that each named run succeeded and that the protection of `main` reads as recorded
- [ ] 1.2 Archive `bootstrap-app-and-ci` with `openspec archive`; verify `openspec/specs/app-shell/spec.md` carries PROD-001 and PROD-008 and that `pnpm check` passes
- [ ] 1.3 Update `docs/roadmap.md`: slice 1.1 done, what is next; verify the demo address in it answers

## 2. Archive pull request

- [ ] 2.1 Add the exemption of design D1 to `scripts/pr-evidence.mjs` with unit tests in which each of the five conditions fails alone and the pull request is then judged by the six checks; verify the unit tests pass
- [ ] 2.2 Amend `docs/constitution.md` (C-14, C-18) and `docs/process.md` (step 8) as in design D2; verify the wording against what the script checks

## 3. First version

- [ ] 3.1 Set the initial version of design D3; verify `pnpm verify` passes

## 4. Review and evidence

- [ ] 4.1 Run `pnpm verify` from a clean build; verify it passes
- [ ] 4.2 Open the pull request as the bot before any review record exists; verify the `evidence` check fails and names the missing `review.md`; record the run here
- [ ] 4.3 Run the code-review skill on the whole diff and commit `review.md` with one finding still without an outcome (design D4); verify the `evidence` check fails and names that finding; record the run here
- [ ] 4.4 Fix or decline each finding and complete `review.md`; verify the `evidence` check is green; record the run here
- [ ] 4.5 **(owner)** Approve and merge
- [ ] 4.6 After the merge, verify the release pull request proposes `0.1.0`
- [ ] 4.7 After the merge, open the archive pull request of this change as the bot from `archive/pipeline-follow-ups`; verify the `evidence` check passes by the exemption and says so in its summary
