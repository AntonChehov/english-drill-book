# Review of workflow-retro

## Round 1

Reviewed: 297f48224ad9
Verdict: changes requested

### F1 C-18 says the release pull request still runs the other checks; the pipeline skips them
Severity: critical

Where: `docs/constitution.md`, C-18, the paragraph after item 5; against `scripts/changes.mjs` (`needsBuild`), `.github/workflows/checks.yml` and `docs/process.md` step 4.

What: C-18 says of the release pull request that it "is exempt from items 1 – 5; the other checks of the pipeline still run on it and must pass". But `needsBuild` returns false for a `release-please--` branch that changes only the three release files, so `unit`, `build`, `e2e`, `lighthouse` and `screenshots` are skipped, and `docs/process.md` step 4 and design D3 say so. The constitution's own text now differs from the pipeline it measures.

Why: a constitution statement that the pipeline does not honour is a constitution violation. Either C-18 says that the release pull request runs only `static` and `evidence` (as process step 4 does), or the release branch keeps the build.

### F2 C-18 item 5 requires no change in flight; check 7 checks only the named change
Severity: minor

Where: `docs/constitution.md` C-18 item 5 ("no change is left in flight") and design D2 ("leaves no task unticked and no change in flight"); `archiveProblems` in `scripts/pr-evidence.mjs`.

What: `inFlight` is `input.changes.includes(change)`, the named change only. A branch that also adds another directory under `openspec/changes/` passes check 7. Its files are still in the reviewed hash, so nothing unreviewed passes; the text and the check simply disagree. Either check that `input.changes` is empty at the head, with a test, or write "the change is not left in flight".

### F3 Root Markdown files: the texts say all, the script lists four
Severity: minor

Where: `docs/constitution.md` C-18, `docs/process.md` step 4, design D3 ("a root Markdown file"); `rootFiles` in `scripts/changes.mjs`.

What: the texts exempt "the Markdown files at the root"; the code accepts only `README.md`, `CLAUDE.md`, `CHANGELOG.md` and `LICENSE`. A new `CONTRIBUTING.md` would run the full pipeline and be judged by items 3 and 4. The error is on the safe side (never falsely green), but text and script should name the same set: list the files in the texts, or match `/^[^/]+\.md$/` in the script.

### F4 Pointers to technical debt in docs/roadmap.md remain
Severity: minor

Where: `e2e/pages.spec.ts` line 100, `e2e/study-frame.spec.ts` line 10, `playwright.config.ts` line 44.

What: the comments say WebKit speed is technical debt "(docs/roadmap.md)"; the item now lives in `docs/tech-debt.md` (D9, task 4.4 says the pointers were moved). Point them at `docs/tech-debt.md`.

### F5 Task 5.4 is ticked for a .gitignore edit that does not exist
Severity: minor

Where: `openspec/changes/workflow-retro/tasks.md` task 5.4, "drop the handoff line of `.gitignore`".

What: `.gitignore` is not in the diff, and neither `main` nor the branch ever had a handoff line in it (`git log -- .gitignore`). The ticked task records work that was not done. Reword the task to what was done, or drop that clause.

### F6 docs/process.md does not say a small change sets skip_specs
Severity: minor

Where: `docs/process.md`, "Two sizes of change", first bullet; `CLAUDE.md`.

What: design D7 says a small change is made with `--schema lite` and `skip_specs: true`, and the `lite` proposal instruction says the change sets it. The process text only names `openspec new change <name> --schema lite`. This change's own `pnpm spec` output shows that zero deltas pass only because `skip_specs` is set. An author who follows `docs/process.md` alone may get a red `pnpm spec`. Add "and `skip_specs: true` in `.openspec.yaml`" (or say that the command writes it, if it does).

### Notes

Fresh agent, round 1.

What was checked: the whole diff against `origin/main` (12 commits). `pnpm test` passes (806 tests). `pnpm spec`, `pnpm trace`, typecheck and lint pass. Prettier passes on every tracked file; locally `pnpm format:check` fails only on the git-excluded `.private/`, which CI never sees.

A skipped job cannot make `evidence` falsely green. If `changes` fails, `unit` and `build` are skipped, `checks` is not `success`, and the first step of `evidence` fails. A wrong `code=false` is caught because `checkEvidence` decides `withoutCode` again from its own `git diff --no-renames`, so checks 5 and 6 apply and fail without metrics or a comment. On `main`, `PR_NUMBER` is empty, so `code` is `true`. `e2e`, `lighthouse` and `screenshots` need `build` and have no `if: always()`, so they are skipped with it and do not fail on missing artifacts. A `release-please--` branch not opened by the bot skips the build but is not exempt, and it fails checks 5 and 6. That is safe.

The archive commit can make no unreviewed change to reviewed content. The hash is taken at its single parent. Every archived file but `tasks.md` must equal its parent blob. Any path outside the move, the living specs of archived delta specs and `docs/roadmap.md` fails. A merge commit or a second archived directory is not an archive commit. Check 7 does not compare the living specs or the roadmap edit with what `openspec archive` would produce, so text written by hand there passes unreviewed. C-18 item 5 allows that and the owner reads it at merge. It is noted here, not raised.

Check 2 holds. `parseProductIds` finds 108 distinct `**ID` definitions in `docs/product/`, the same as every ID-shaped token there. A listed ID must be defined there and named by `@req`, and delta specs are no longer read. `pnpm trace` still covers living specs and changes in flight.

Word limits of D9 on this change: proposal 337 of 400, design 940 of 1 000, tasks 272 of 300. All are within.

I could not try `openspec new change --schema lite` in a scratch copy (the command was not permitted). F6 rests on the texts and on this change's own `pnpm spec` output.

## Round 2

Reviewed: eb80f7ca9448
Verdict: approved

- F1: fixed
- F2: fixed
- F3: fixed
- F4: fixed
- F5: declined — the handoff line was an uncommitted local edit of `.gitignore`, reverted before the branch existed; the ticked task names local work, not a diff, and no reviewed file is affected.
- F6: fixed

### Notes

Same reviewing agent as round 1, resumed.

I read the fix commit 76559c3 against 9fc52be. C-18 now says the release pull request runs only the static checks and the evidence check, as `needsBuild`, `docs/process.md` step 4 and D3 do. C-18 item 5 and D2 now speak of the named change not being left in flight, which is what check 7 tests. C-18, process step 4, D3 and the comment in `scripts/changes.mjs` now name the same four root files as `rootFiles`. No text outside the archive still says "the Markdown files at the root". The three test and config comments point to `docs/tech-debt.md`. The small-change bullet of `docs/process.md` says that `--schema lite` sets `skip_specs: true`.

I did not run `openspec new change --schema lite` myself; a scratch run was not permitted in round 1. The process text now agrees with the `lite` proposal instruction and with design D7.

Checks run: `vitest run scripts` passes (310 tests), lint passes, and Prettier passes on the changed files. The design has 941 of 1 000 words. Nothing else changed since round 1.

## Round 3

Reviewed: 4a418e948c01
Verdict: approved

### Notes

Fresh agent for round 3; the reviewer of rounds 1 and 2 was not resumed.

What I read: the whole diff against `origin/main`, with a focus on 8307e71 (archive), 80bda54 (its revert) and b8106f2 (the file check moved from a job of its own into a first step `files` of `unit` and of `build`). There are no open findings from earlier rounds.

D4 still holds. If the step `files` fails (an API error or a missing variable), the steps after it are skipped by the implicit `success()`. The job fails, `checks` is not `success`, and the first step of `evidence` fails. If the step passes with `false`, both jobs are green and do nothing. `build.outputs.code` is `false`, so `e2e`, `lighthouse` and `screenshots` are skipped, and `evidence` skips the artifact steps. `scripts/pr-evidence.mjs` still decides on its own diff, so a wrong `false` fails checks 5 and 6 and cannot pass them. If `unit` and `build` gave different answers (two API calls on the same head), the result is still safe. A `true` from `build` with a skipped `unit` makes `scripts/metrics.mjs` fail on the missing `unit` artifact. A `false` from `build` falls back to the evidence check's own diff. On `main`, `PR_NUMBER` is empty, so both answer `true`.

When code changes, `e2e`, `lighthouse` and `screenshots` run. Their `if:` compares `needs.build.outputs.code` with `'true'` and adds the implicit `success()`, so they run after a green `build` and are skipped after a red one, as before. Job outputs are set even when a later step fails, and the workflow output `code` now comes from `build`.

The texts match the workflow. The header of `checks.yml`, the permission comments of `main.yml` and `pull-request.yml`, the comment above the evidence steps, D3 with its new rejected alternative, the risk line and task 2.2 all describe a step, not a job. The constitution and `docs/process.md` describe only the outcome, and that is unchanged.

New minor observation, not a finding (round 3): the header comment of `scripts/changes.mjs` still says that `checks.yml` "runs this as its first job". It is now the first step of `unit` and `build`.

Not verified: no CI run exists yet for b8106f2, so I could not confirm that the run is now within the 180 s of C-19. That cannot become falsely green either, since `scripts/duration.mjs` enforces the budget in `evidence`. The next CI run on the new archive commit shows it.

Checks run: `pnpm review:hash workflow-retro` only. The change touches workflow YAML and three texts; no script or test changed since round 2.
