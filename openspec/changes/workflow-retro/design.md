# Design

## Context

Constraints touched: C-14 (a small change has no design and no delta specs), C-18 (archive commit, no coverage statement, items 3–4 not for pull requests without code, IDs checked against `docs/product/`), C-19 (unchanged; a run without code is shorter), C-11 (`pnpm trace` still reads living specs and changes in flight), C-17 (unchanged). All are measured by the evidence check and its tests in `scripts/*.test.mjs`. No dependency is added (C-12).

## Decisions

### D1. The archive commit ends the branch

After the last round approves and validation passes, the last commit ticks every task, runs `openspec archive <name> --yes`, updates `docs/roadmap.md` and is committed as `chore: archive <name>`. A later fix means `git revert` of that commit, the fix, a round, a new archive commit; no history is rewritten. Rejected (pipeline-follow-ups D1): specs that describe more than `main`. The folded specs reach `main` in the same merge, and D2 answers the review hash.

### D2. Evidence and hash with an archive commit

`archiveOf(root, head)` in `review-hash.mjs` recognises a one-parent commit that adds `openspec/changes/archive/<date>-<name>/`. `reviewHash` hashes such a change at the parent. The CLI, the comment and the check agree. Check 7 of `pr-evidence.mjs`: the head commit archives the named change, changes only its move, the living specs of its delta specs and `docs/roadmap.md`, keeps every blob but `tasks.md`, leaves no task unticked and no change in flight. The archive exemption is removed; the release pull request stays exempt.

### D3. Pull requests without code

`scripts/changes.mjs`: `withoutCode(paths)` is true when every path is under `docs/`, `openspec/`, `.claude/` or is a root Markdown file or `LICENSE`. `needsBuild` is also false for the release branch with only its three files. A first job `changes` sets output `code`; `unit` and `build` run only when it is `true`. Rejected: `paths-ignore`, under which the required check would never report; a third-party filter action.

### D4. Skipped jobs cannot pass the check

`evidence` fails unless the reusable workflow succeeded. `pr-evidence.mjs` decides `withoutCode` again from its own diff: a wrong `code=false` with code fails checks 5 and 6. Without code they report "not applicable".

### D5. Validation alongside review

Steps: propose, approve, implement, pull request, review and validate together on one commit, archive, merge. The validator gets the previous report and a summary of the fixes as behaviour. It reruns three times the scenarios they may touch, all when unsure, marks the rest "carried over from <commit>" and names the commit it tested. The threshold is unchanged.

### D6. `review.md`, frozen

Read lines, unindented: `## Round <n>`, `Reviewed: <hash>`, `Verdict: approved | changes requested`, `- F<n>: fixed | not fixed — … | declined — …`, `### F<n> <title>`, `Severity: critical | minor`. `### Notes` and every other line is free text. `<!--` anywhere fails. Removed: closing coverage sections, unknown-line and fence rules. Archived records are not read again.

### D7. Two sizes: the schema `lite`

A change is small when it is about 400 changed lines or fewer, has at most 3 requirements and changes no schema or storage format. The proposer says which, and the owner approves. A small change is made with `openspec new change <name> --schema lite` and `skip_specs: true`. `openspec/schemas/lite/schema.yaml` has two artifacts: `proposal` (Why, What, Requirements) and `tasks` (requires `proposal`), with templates; `apply.tracks: tasks.md`. Checked in a scratch copy with OpenSpec 1.17.0: `schema validate`, `validate --strict`, apply tracking and `archive` work.

Rejected: tasks inside `proposal.md`, as decided first. Ticking a task would then change the review hash, which excludes only `tasks.md` and `review.md`, and check 7 reads `tasks.md`. Changing both costs more than a second short file.

### D8. A requirement in one place

Requirement wording lives in `docs/product/`. A small change has no delta spec; its `@req` tests carry the requirement. A large change keeps delta specs and the living specs, with scenarios only for edge cases not in `docs/product/`. Check 2 of `pr-evidence.mjs` accepts a listed ID when it is defined in `docs/product/` (`**ID`) and named by a test; it no longer reads delta specs. C-18 item 1 says the same. Trade-off: the living specs lag behind the behaviour of small changes; `docs/product/` stays the source.

### D9. Limits, boilerplate, moratorium, context, debt

- `openspec/config.yaml` rules: proposal ≤ 400 words (`lite` ≤ 300), design ≤ 1 000 words, decisions and rejected alternatives only, tasks ≤ 300 words. `docs/process.md` lists an overrun as a minor finding.
- The rule "end with a group Review and evidence" is removed from `config.yaml`. Review, evidence and the archive are the steps of `docs/process.md`, not tasks. Coverage needs no new script: check 2 and `pnpm trace` cover requirement ↔ test.
- Moratorium in `docs/process.md`: no new process rule or script until three product changes in a row are merged, unless an incident on `main`.
- `context` in `config.yaml` is cut to three lines: product, language, C-01. Each artifact rule names the product files it needs. `CLAUDE.md` keeps only what every role needs and names no local files.
- Technical debt moves verbatim from "Later, unscheduled" of `docs/roadmap.md` to `docs/tech-debt.md`, one line per item. C-18 and process step 5 point there.

## Risks / Trade-offs

- If GitHub counted skipped jobs in a reusable workflow as a failure, pull requests without code would go red, never falsely green. The open release pull request shows it after the merge.
- The `changes` job delays `unit` and `build` by about 10–15 s.
- A late fix after the archive commit costs a revert and a new archive commit.
- The size of a change is a judgement; a wrong `lite` is a minor finding, and a change found larger moves to `spec-driven` before the review.
