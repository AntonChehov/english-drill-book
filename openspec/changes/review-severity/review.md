# Review

## Round 1

Reviewed: d78510d4c99e
Verdict: changes requested

### F1 Three sentences still say that every change has a design

Severity: minor

- Where: README.md:26; CLAUDE.md:5; docs/process.md:20 (step 1)
- Problem: the change makes `design.md` optional in step 2 of `docs/process.md`, in C-14 and in `openspec/config.yaml`, but three sentences it did not touch still state the old rule. `README.md` says "every piece of work is a change with a proposal, a design, tasks and delta specs that the owner approves before any code is written". `CLAUDE.md` says "No code before the owner has approved its proposal, design and tasks". Step 1 of `docs/process.md` says the assistant drafts "why, which requirements, the design, the tasks". An agent reading `CLAUDE.md` first, as it is told to, learns the old rule there and the new one two lines below it; the change `review-follow-ups` reworded `README.md` to agree with the process for the same reason.
- What should happen: say in each of the three places that a design is drafted and approved where one is warranted, or point to step 2 of `docs/process.md`, so that the four documents and `README.md` state one rule.

### F2 The round 3 rule does not say how an open minor finding is closed in the record, so a reviewer following it writes a record the check refuses

Severity: minor

- Where: docs/process.md:23 (step 4); CLAUDE.md:8; docs/constitution.md:56 (C-18 item 2)
- Problem: the proposal says the review check is unchanged, and it is: `parseRecord` in `scripts/review-record.mjs` refuses an approving round that raises a finding (`approvedButRaises`) or marks one not fixed (`approvedButNotFixed`), requires a later round to state every open finding, and C-18 still says the pull request passes when "no finding is open". The new text says that from round 3 on "the reviewer lists minor findings under `### Notes` as technical debt" and "approves when no critical finding remains", but not what the record then says about a minor finding raised in round 1 or 2 that is still open: by the check it has to be stated as `- F<n>: fixed` or `- F<n>: declined — <reason>` before the round can approve, and a minor issue found in round 3 or later cannot be raised as `### F<n>` in an approving round at all. A reviewer who reads the rule literally, raises a minor `### F<n>` in round 3 and approves, or leaves an open minor finding unstated, gets a red `evidence` check. The same step also says "In rounds 1 and 2 every finding is fixed" two sentences after "fixes or declines each finding", and C-18 keeps "closed only as fixed … or declined"; whether declining with a reason stays allowed in rounds 1 and 2 is not said.
- What should happen: state the mechanics once, in step 4, and let `CLAUDE.md` and C-18 point to it: from round 3 on a minor issue is not raised as a finding but listed under `### Notes`; a minor finding still open from an earlier round is closed as `- F<n>: declined — technical debt, recorded in docs/roadmap.md` (or `fixed`) in the approving round; and declining with a reason remains possible in every round, so "every finding is fixed" in rounds 1 and 2 reads "fixed or declined". Then the texts and the check agree, as the proposal claims.

### Notes

- Scope: the whole diff `main...HEAD` (two commits, seven files): `CLAUDE.md`, `docs/constitution.md`, `docs/process.md`, `openspec/config.yaml` and the change's own `.openspec.yaml`, `proposal.md` and `tasks.md`; `README.md`, `docs/roadmap.md`, `scripts/review-record.mjs` and `scripts/review-hash.mjs` read whole for consistency. The review skill was started but stopped on a rate limit before reading the diff, so the review was done by hand. Run here: `pnpm spec` (8 passed, `skip_specs` accepted), `pnpm format:check` (passes), `pnpm review:hash review-severity` online.
- The check and the `Severity:` line: I ran `parseRecord` on a record whose finding holds `Severity: minor` as its first line and whose `### Notes` mentions `Severity: critical` in a list item; neither is reported, since under a finding and under notes the parser refuses only headings and a round's own lines (`Reviewed:`, `Verdict:`, `- F<n>:`). The same line in the head of a round, between `Verdict:` and the first `###`, is refused as an unknown line, which the texts do not contradict: they say the finding carries it. The pointer in `CLAUDE.md` to the grammar in design D2 of `review-rounds` stays right, because the line is free text to that grammar.
- The four documents agree on the rule itself: critical or minor, every finding fixed in rounds 1 and 2, only critical findings block approval from round 3, minor ones to `### Notes` and `docs/roadmap.md` (step 4 and `CLAUDE.md` name "Later, unscheduled", C-18 names only the file, which is fine), a round 4 or later only because of critical findings; the definitions of critical and minor stand once, in step 4, and the others point to it. The `Severity:` line of this record follows the text of step 4.
- Proposal and tasks follow the archived changes (`review-follow-ups`, `near-grammar`): the sections, "Requirements delivered: none", `skip_specs` in `.openspec.yaml`, the group "Review and evidence" and the **(owner)** task. Not raised, for the author to take or leave: the proposal does not name `skip_specs` as the archived ones do, nor what is deliberately left for later (the rule in `openspec/config.yaml` asks for it; "Reviews of changes already merged are not redone" under Impact comes close); task 2.2 already shows "pull request #20" while unticked, where the archived records add the link when the task is done; task 2.1 does not say that the author fixes or declines each finding between rounds, as 3.3 of `review-follow-ups` does.
- No constitution constraint is touched beyond C-14 and C-18 themselves; no code, test, schema or living spec changes, so no traceability, budget or accessibility check applies. Nothing from a published textbook is in the diff (C-01).

## Round 2

Reviewed: 682ef4cfea3a
Verdict: approved

- F1: fixed
  `README.md`, `CLAUDE.md` and step 1 of `docs/process.md` now each say the design is omitted for a change of only texts or only documentation, in the words of step 2 and C-14.
- F2: fixed
  Step 4 now states the mechanics the check enforces: rounds 1 and 2 fix or decline with a reason; from round 3 on an open minor finding is closed as `declined — technical debt, recorded in docs/roadmap.md`, accepted once recorded under "Later, unscheduled", new minor observations go under `### Notes` only, critical findings are fixed in any round. `CLAUDE.md`, C-18 and `openspec/config.yaml` say the same, shorter, and point to step 4. Each of these outcomes is one the parser accepts in an approving round, so the texts and `scripts/review-record.mjs` agree.

### Notes

- Scope: `git diff 7c46ea3..HEAD` (commit 3025d2f: `README.md`, `CLAUDE.md`, `docs/process.md`, `docs/constitution.md`, `openspec/config.yaml`) read in full, and the whole diff `main...HEAD` again; the change's proposal, tasks and `.openspec.yaml` are unchanged since round 1. Reviewed by hand, as in round 1. Run here: `pnpm spec` (8 passed), `pnpm format:check` (passes), `pnpm review:hash review-severity` online.
- The five documents now state one rule for the design exception and one for severity and rounds; the definitions of critical and minor stand once, in step 4. The notes of round 1 on the proposal and tasks were not raised and stand as they were.

## Requirement coverage

The change delivers no requirement of `docs/product/`: it changes the process documents only, so there is no implementation and no test to name.

## Outside the listed requirements

The whole change is outside listed requirements: `CLAUDE.md`, `README.md`, `docs/process.md` (steps 1, 2 and 4), `docs/constitution.md` (C-14, C-18), `openspec/config.yaml` (design and tasks rules), and the change's own `.openspec.yaml`, `proposal.md` and `tasks.md`. No code, schema, test or living spec.
