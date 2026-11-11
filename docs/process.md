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
| `openspec/changes/<name>/` | one change in flight: `proposal.md`, `design.md`, `tasks.md`, delta specs, `review.md` |
| `openspec/changes/archive/` | merged changes |
| holdout scenarios | a separate private repository (see below) |

## One change, start to finish

1. **Propose.** The owner names the next slice from `docs/roadmap.md`. The assistant drafts the change: why, which requirements (taken from `docs/product/` with their IDs), the design, the tasks.
2. **Approve.** The owner reads the proposal, design and tasks and approves or edits them. No code before this.
3. **Implement.** An implementing agent works through `tasks.md` on a branch, as the bot identity, writing tests that name the requirement IDs.
4. **Review.** When the tasks are done the same agent runs the code-review skill on the whole diff and commits `review.md`: every finding with its outcome, fixed or declined with a reason.
5. **Pull request.** The bot opens it. CI runs the gates of the constitution and the evidence check (C-18): description, review record, screenshots made by CI, numbers.
6. **Validate.** A validating agent drives the built app in a browser against the holdout scenarios and reports a score. It sees neither the code nor the specification.
7. **Merge.** The owner reads the pull request, the declined findings and the validation report, and approves. Merging deploys the demo.
8. **Archive.** After the merge the implementing agent, as the bot, cuts a branch `archive/<name>` from `main`, ticks the change's remaining tasks, runs `openspec archive <name>`, which folds the delta specs into `openspec/specs` and moves the change to the archive, and opens the archive pull request. It changes only `openspec/` and `docs/roadmap.md` and carries no evidence of its own (C-18); its other checks still run, and the owner approves and merges it like any other.

## Roles and what each may read

| Role | Reads | Never reads |
| --- | --- | --- |
| Owner, with an assistant agent | everything | — |
| Implementing agent | this repository | holdout scenarios |
| Validating agent | holdout scenarios, the running build | this repository |

Why: an agent that can read the acceptance scenarios will satisfy their letter; an agent that can read the code while validating will fix instead of report.

## Holdout scenarios

Short narratives of what a user does and what a satisfactory outcome looks like, kept in a private repository. The validator scores each from 0 to 1 over three runs; a change passes when every scenario of its milestone averages at least 0.9 and none has regressed. When a scenario fails, the implementer is told only what was observed, never the scenario's text. The validator's prompt is in `docs/process/validator-prompt.md`.

## Identity

Commits and pull requests by agents are made as a GitHub App, so history shows what an agent wrote and what the owner approved. The owner's approval is required by branch protection.

## Honest limits

- A human approves every proposal and every merge. This is Level 4 of Shapiro's taxonomy, not a "dark factory".
- Isolation of the holdout scenarios is by repository and instruction, not by credentials: agents run on the owner's machine.
- Tests are in the repository and visible to the implementer; they guard against regression. The holdout scenarios are the independent check.
