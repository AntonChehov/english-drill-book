# Tasks

Tasks marked **(owner)** need the owner and cannot be done by an agent.

## 1. The record

- [ ] 1.1 Make `parseRecord` in `scripts/review-record.mjs` report an HTML comment as in design D2; verify with unit tests for a comment before the first round, among a round's own lines, under a finding, under `### Notes`, in a closing section, and inside a fenced block, where it is accepted
- [ ] 1.2 Run the check on a clone with a hand-written record that hides an approving round in a comment; verify it fails with the message of D2

## 2. The process

- [ ] 2.1 Reword step 4 of `docs/process.md` as in design D1, and `CLAUDE.md` and `README.md` to agree, including the rule on HTML comments; verify each against what the script checks

## 3. Review and evidence

- [ ] 3.1 Run `pnpm verify` from a clean build; verify it passes
- [ ] 3.2 Open the pull request as the bot with the sections of C-18 item 1, stating that there is no visual change
- [ ] 3.3 A reviewing agent with a fresh context writes round 1 in `review.md`; fix or decline each finding; the same reviewing agent, resumed, writes each later round until one approves the latest content; verify the `evidence` check is green
- [ ] 3.4 **(owner)** Read the pull request and the declined findings, approve and merge
