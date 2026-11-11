# Tasks

Tasks marked **(owner)** need the owner's GitHub account and cannot be done by an agent.

## 1. Hash

- [ ] 1.1 Write `scripts/review-hash.mjs` as in design D1 with unit tests over a temporary repository: the hash changes when a changed file is edited, added or deleted; it does not change when only `review.md` or `tasks.md` of the change is edited, when a commit message is amended, or when the branch is brought up to date with a `main` that touched other files; verify the unit tests pass
- [ ] 1.2 Add `pnpm review:hash`; verify it prints the same value locally and in a CI run for the same commit

## 2. Record and check

- [ ] 2.1 Parse the record of design D2 in `scripts/pr-evidence.mjs`, with unit tests over fixture records for every rule of D3 failing alone and for a record with one, two and three rounds passing; verify the unit tests pass
- [ ] 2.2 Replace check 4 with "Reviewed content" (D3) and remove the rule on commits after the review with its tests; verify the report table shows the two checks separately
- [ ] 2.3 Write the messages of design D4, each stating the fact and the action, with a unit test that no message names a particular skill; verify the tests pass
- [ ] 2.4 Show the round, the verdict and the hash in the job summary and in the evidence comment; verify with the unit tests of the comment

## 3. Documents

- [ ] 3.1 Replace C-18 item 2 in `docs/constitution.md` with the wording of design D6; reword `docs/process.md` (step 4, roles table), `CLAUDE.md` and the tasks rule of `openspec/config.yaml` to match; verify each against what the script checks

## 4. Review and evidence

- [ ] 4.1 Run `pnpm verify` from a clean build; verify it passes
- [ ] 4.2 Open the pull request as the bot; a reviewing agent writes round 1; verify the `evidence` check fails with the message for "changes requested" if there are findings, or passes if there are none
- [ ] 4.3 Fix or decline each finding; a reviewing agent writes the next round; repeat until a round approves; verify the `evidence` check is green
- [ ] 4.4 After the approving round, push a one-line change to a reviewed file; verify the `evidence` check fails with the message for stale content; have the change reviewed in a further round; verify the check is green again
- [ ] 4.5 **(owner)** Approve and merge
