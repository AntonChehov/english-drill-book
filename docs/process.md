# Process

English Drill Book is built specification-first with [OpenSpec](https://github.com/Fission-AI/OpenSpec). The owner decides what is built and approves every merge; coding agents write the implementation. The separation of roles and the hidden acceptance scenarios are adapted from the *Software Factory Practitioner's Guide* (C. Woolley, 2026).

## Where things live

| Path | What it is |
| --- | --- |
| `docs/product/` | the product description: intent and candidate requirements for the whole app |
| `docs/constitution.md` | invariants every change must keep, each with its measurement |
| `docs/decisions/` | architecture decision records |
| `contracts/` | JSON Schemas of the data formats, with examples |
| `openspec/specs/` | the living specification: behaviour that is implemented, by capability |
| `openspec/changes/<name>/` | one change in flight: `proposal.md`, `design.md`, `tasks.md`, delta specs, `review.md` (a small change has only `proposal.md`, `tasks.md` and `review.md`) |
| `openspec/schemas/lite/` | the schema of a small change: a proposal and tasks |
| `openspec/changes/archive/` | merged changes |
| `docs/process/` | the validator's prompt and reports on the process, such as [optimization-round-1.md](process/optimization-round-1.md) |
| holdout scenarios | a separate private repository (see below) |

## Two sizes of change

A change is *small* when it is about 400 changed lines or fewer, has at most 3 requirements and changes no schema or storage format; every other change is *large*. The assistant says which in the proposal and the owner approves the size with the proposal.

- A small change is made with `openspec new change <name> --schema lite`, which sets `skip_specs: true` in the change's `.openspec.yaml`: a `proposal.md` of at most 300 words (Why, What Changes, Requirements) and a `tasks.md`. It has no `design.md` and no delta spec; the requirement's wording is in `docs/product/`, and the tests that name its ID with `@req` carry it.
- A large change has a proposal of at most 400 words, a design of at most 1 000 words (unless it is only texts or only documentation), tasks of at most 300 words and delta specs, with scenarios only for edge cases that `docs/product/` does not state.
- A change found larger than it was judged moves to the schema `spec-driven` before its review.

The limits are ceilings, not targets: an artifact is as short as it can be. An artifact over its limit is a minor finding (step 5).

## One change, start to finish

1. **Propose.** The owner names the next slice from `docs/roadmap.md`. The assistant drafts the change: why, which requirements (taken from `docs/product/` with their IDs), the design (unless the change is small, or only texts or only documentation, step 2), the tasks.
2. **Approve.** The owner reads the proposal, design and tasks and approves or edits them. No code before this. A change whose work is only texts (strings, demo content, translations) or only documentation may omit `design.md`, and so may a small change; a large change that touches code, schema or tests has one.
3. **Implement.** An implementing agent works through `tasks.md` on a branch, as the bot identity, writing tests that name the requirement IDs.
4. **Pull request.** The bot pushes the branch and opens the pull request as a draft; the evidence check skips a draft, and the bot marks the pull request ready after the approving round of step 5 and the archive commit of step 6 (the trigger `ready_for_review` runs it). CI runs the gates of the constitution and the evidence check (C-18): description, review record, screenshots made by CI, numbers, archive. A pull request that changes no file a build or test reads (`docs/`, `openspec/`, `.claude/`, `README.md`, `CLAUDE.md`, `CHANGELOG.md`, `LICENSE`), and the release pull request, run only the static checks and the evidence check; the build, the tests, Lighthouse and the screenshots are skipped, and C-18 items 3 and 4 do not apply to them. Only the mechanic watches CI, in the foreground, and reports once; the coordinating session polls once only if no report comes within 10 minutes. The owner may read the texts of the pull request from here on, alongside step 5.
5. **Review and validate.** Round 1 of the review and the validation start together, on the same commit.
   - *Review.* A reviewing agent started for this with a fresh context runs the review skill on the whole diff and writes round 1 into `review.md`: the hash of the diff it read (`pnpm review:hash <name>`, which fetches `main` first, as CI does), its findings and a verdict, changes requested or approved. Before finishing a round it runs `pnpm review:check <name>`, which runs checks 3 and 4 of the evidence check on the record without the GitHub API. The implementing agent fixes or declines each finding and hands the change back to the same reviewing agent, resumed with what it already knows, for the next round, which states for every open finding whether it is fixed and reviews what changed since, so that the round again covers the whole diff (C-18). A new reviewing agent is started for a later round only when the first cannot be resumed or has grown too large to work well; its round says so under `### Notes`. This repeats until a round approves.
   - *Severity.* Every finding carries a line `Severity: critical` or `Severity: minor`. Critical: a requirement of the change not met or behaviour differing from the spec; loss or corruption of the learner's progress; a constitution violation (for example C-01 textbook text, reading outside the repository, C-11 traceability, C-19 pipeline budget); a scenario that cannot be done by keyboard or screen reader; broken on a target device; failing or flaky tests. Minor: everything else, such as code structure, naming, duplication, wording, performance on non-target devices, UI polish not in the spec, test readability, documentation, an artifact over its word limit. In rounds 1 and 2 every finding is fixed or declined with a reason. From round 3 on an open minor finding is closed as `declined — technical debt, recorded in docs/tech-debt.md`, which the reviewer accepts once the implementing agent has added it there; new minor observations of round 3 or later go under `### Notes` only, never as findings. Critical findings are fixed in whatever round. A round 4 or later happens only because of critical findings.
   - *Validation.* A validating agent drives a production build of the same commit, served from a scratch directory, in a browser against the holdout scenarios the change touches, once each, and reports a score. The full set of the milestone, three runs each, is run only before a release and on the owner's request. It sees neither the code nor the specification. The implementing agent fixes what both the review and the validation found, in one push per round. After fixes the validator reruns the scenarios the fixes may touch, as `docs/process/validator-prompt.md` says, and all of them when unsure.
   - *The record.* The form of `review.md` is frozen; the check reads these unindented lines and nothing else, and every other line is free text. A round is `## Round <n>` with the lines `Reviewed: <12 hex characters>` and `Verdict: approved` or `Verdict: changes requested`; each later round adds one line per open finding, `- F<n>: fixed`, `- F<n>: not fixed — <what remains>` or `- F<n>: declined — <reason>`; each finding is `### F<n> <title>`, numbered through the whole record, with one line `Severity: critical` or `Severity: minor` before the next heading; `### Notes` is free text, except that a line `- F<n>:` there is read as an outcome. Do not quote one of these forms at the start of a line in free text: it would be read. The record holds no HTML comment opening `<!--` anywhere, fenced blocks included (write `&lt;!--` to mention it), so that what the owner reads on the pull request is all of it. Any later change to the reviewed diff changes the hash and needs another round (C-18).
6. **Archive.** When the last round approves, validation passes and the owner's remarks on the texts are answered, once CI is green on the commit before it, the implementing agent makes the last commit of the branch: it ticks every remaining task of `tasks.md`, including those verified by the run this push starts (a red check keeps the tick off `main`), runs `openspec archive <name>`, which folds the delta specs into `openspec/specs` and moves the change to `openspec/changes/archive/`, updates `docs/roadmap.md`, and commits all of it as `chore: archive <name>`, pushed with the approving round; then the bot marks the pull request ready, so that the evidence check first sees the archive commit. The commit changes nothing the review read: the evidence check hashes the change at the parent of the archive commit and checks the archive commit by rule (C-18). If anything has to change after it (a critical finding, a red check, `main` merged in), the branch gets `git revert` of the archive commit, then the fix, the next review round and a new archive commit; no history is rewritten. There is no archive pull request.
7. **Merge.** The owner reads the pull request, the declined findings and the validation report, and approves. Merging deploys the demo.

## Roles and what each may read

| Role | Reads | Never reads |
| --- | --- | --- |
| Owner, with an assistant agent | everything | — |
| Implementing agent | this repository | holdout scenarios |
| Reviewing agent, which writes its round of `review.md` and edits nothing else | this repository | holdout scenarios |
| Validating agent | holdout scenarios, the running build | this repository |

Why: an agent that can read the acceptance scenarios will satisfy their letter; an agent that can read the code while validating will fix instead of report; an author reviewing their own change sees what they meant to write.

## Holdout scenarios

Short narratives of what a user does and what a satisfactory outcome looks like, kept in a private repository. The validator scores each from 0 to 1 over three runs; a change passes when every scenario of its milestone averages at least 0.9 and none has regressed. When a scenario fails, the implementer is told only what was observed, never the scenario's text. The validator's prompt is in `docs/process/validator-prompt.md`.

## Identity

Commits and pull requests by agents are made as a GitHub App, so history shows what an agent wrote and what the owner approved. The owner's approval is required by branch protection.

## Moratorium

No new process rule, script or workflow is added until three product changes in a row have been merged, unless an incident on `main` needs it. This applies from the merge of `workflow-retro`.

## Honest limits

- A human approves every proposal and every merge. This is Level 4 of Shapiro's taxonomy, not a "dark factory".
- Isolation of the holdout scenarios is by repository and instruction, not by credentials: agents run on the owner's machine.
- Tests are in the repository and visible to the implementer; they guard against regression. The holdout scenarios are the independent check.
