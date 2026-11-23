# Design

## Context

Each change has gone through: proposal, implementation, review rounds, a pull request with evidence, validation, the owner's merge, and then a second pull request that archives it. `scripts/pr-evidence.mjs` exempts that archive pull request (pipeline-follow-ups D1) and the release pull request (bootstrap D9) from the six checks of C-18. Every pull request runs the whole of `.github/workflows/checks.yml`. `scripts/review-record.mjs` reads `review.md` by a strict grammar (review-rounds D2, review-follow-ups D2): every line has to be known, fences and setext headings are tracked, and the approving round adds a requirement coverage table.

Constraints touched, and how each is measured after this change:

- **C-14** (one change per pull request; which pull requests name none): the evidence check, as now. Only the release pull request names none.
- **C-18** (evidence): the evidence check. Items 1 – 4 stay; item 2 drops the coverage statement; items 3 and 4 do not apply to a pull request without code (D4); a new condition: the pull request ends with the archive commit of its change (D1, D2). Its unit tests in `scripts/*.test.mjs`.
- **C-19** (pipeline hygiene): unchanged in meaning. `scripts/duration.mjs` still reports every run; a run without code is shorter.
- **C-17** (holdout isolation): unchanged; the validator agent of D7 has no shell and is told to read nothing of this repository but its prompt.
- **C-11**, **C-15**: unchanged. `pnpm trace` keeps measuring requirement ↔ test; it reads the living specs, into which the archive commit folds the delta specs before the merge.

No runtime dependency is added (C-12). No new development dependency either.

## Decisions

### D1. The archive commit ends the change's branch

The archive is made on the change's own branch, as its last commit, once: the last review round approves, validation passes and the owner has no open remarks on the texts. The mechanic (D7):

1. ticks every remaining task in `tasks.md`, including those verified by the run this push starts (as the archive pull request did: a red check keeps the tick off `main`);
2. runs `pnpm exec openspec archive <name> --yes`, which moves `openspec/changes/<name>/` to `openspec/changes/archive/<date>-<name>/` and folds the delta specs into `openspec/specs/`;
3. updates `docs/roadmap.md` (the sentence is given by the coordinating session);
4. commits all three as one commit `chore: archive <name>` and pushes it with the approving round.

`tasks.md` has no task for the merge: the merge is the owner's act, recorded by GitHub. Owner tasks before it (approving the proposal, reading the texts) are ticked as they happen.

When anything has to change after the archive commit (a critical finding, a red check, `main` merged in), the branch gets `git revert --no-edit <archive commit>`, then the fix, the next review round, and a new archive commit. No history is rewritten. A pull request that is closed instead leaves its archive on a branch that is never merged.

The alternative rejected in pipeline-follow-ups D1 had two reasons. "`openspec/specs` only describes what is on `main`" still holds: the folded specs reach `main` with the merge, in the same commit. "Check 4 would have to allow writes outside the change's directory after the review" is answered by D2: the review hash is taken before the archive commit, and the archive commit is checked by rule instead of by review.

### D2. The evidence check and the review hash with an archive commit

`scripts/review-hash.mjs` gets one function, `archiveOf(root, head)`: when `head` has one parent and its diff to that parent (`--name-status --no-renames`) adds files under `openspec/changes/archive/<date>-<name>/`, it returns `{ change: <name>, directory, parent, files }`; otherwise `undefined`. `reviewHash(root, { change, head })` uses it: a change in flight at `head` is hashed at `head`, as now; a change that `head` archives is hashed at `parent`, where it is still in flight. Because the CLI, `scripts/evidence-comment.mjs` and `scripts/pr-evidence.mjs` all call `reviewHash`, they agree. The reviewer always hashes before the archive commit exists, so the hash it records is the one CI computes.

In `scripts/pr-evidence.mjs`:

- Check 1 accepts `Change: <name>` when `<name>` is in flight at the head or archived by the head commit.
- Checks 2 and 3 read the delta specs and `review.md` from the change's directory at the head: in flight, or the archived one.
- Check 4 compares the last round's hash with `reviewHash` as above.
- **Check 7, Archive** (new): the head commit is the archive commit of the named change, and
  1. it changes only files under `openspec/changes/<name>/` (deleted, none left at the head), under the one new `openspec/changes/archive/<date>-<name>/` (added), `openspec/specs/<capability>/spec.md` of capabilities that the archived delta specs carry (added or modified, none deleted), and `docs/roadmap.md`;
  2. every added file has the blob of the file it replaces, `tasks.md` excepted, so the archive commit cannot carry an unreviewed edit;
  3. the archived `tasks.md` has no unticked task and `review.md` exists;
  4. no change is in flight at the head.

  Before the archive commit check 7 fails with what to do: "the last commit does not archive `<name>`: when the review approves and validation passes, run `openspec archive` as the last commit (docs/process.md step 6)". Checks 3 and 4 already fail until the review approves, so this adds no red run that was not red before: the approving round and the archive commit are pushed together.

Removed: `archiveProblems` as an exemption (author, branch prefix, several changes per pull request, the touched-archive rules), `exemptions().archive`, `notArchive` in the report and the archive branch of `exemption()`. What it checked about moves, ticks and living specs is kept, narrowed to one commit and one change, as check 7. The release pull request stays exempt from checks 1 – 7.

### D3. Which pull requests skip the build

A new `scripts/changes.mjs` exports:

- `releaseFiles`, moved here from `pr-evidence.mjs`;
- `withoutCode(paths)`: true when every path is under `docs/`, `openspec/` or `.claude/`, or is `README.md`, `CLAUDE.md`, `CHANGELOG.md` or `LICENSE`. Nothing a build, a unit test or an end-to-end test reads is in that list (checked: no test reads `docs/` or `openspec/` of the repository; `contracts/`, `demo/`, `.github/` and `package.json` count as code);
- `needsBuild({ paths, headRef })`: false when `withoutCode(paths)`, or when `headRef` starts with `release-please--` and every path is one of `releaseFiles`; else true.

As a command it lists the pull request's files through the API (`GET /pulls/{n}/files`, paginated; 3000 files or more count as code), prints the decision and sets the step output `code`. Without `PR_NUMBER` (the main workflow) it sets `code=true` without a request.

`checks.yml` gets a first job `changes` (sparse checkout of `scripts`, the runner's Node, `pull-requests: read`), the workflow output `code`, and `unit` and `build` get `needs: changes` and `if: needs.changes.outputs.code == 'true'`. `e2e`, `lighthouse` and `screenshots` need `build` and are skipped with it. `static` needs nothing and starts at once, as now. `main.yml` is unchanged: on `main` the job always says `code=true`.

Alternative considered: `paths-ignore` on the workflow. Rejected: the required `evidence` check would then never report, and branch protection would wait for it forever. A third-party paths-filter action was rejected as a new pinned action for what 40 lines and their tests do.

### D4. The evidence check when jobs are skipped

The required check is only `evidence`, so every way a skipped job could make it pass is closed:

- The `evidence` job keeps `needs: checks` and `if: !cancelled()`. Its first step fails unless `needs.checks.result == 'success'`. A failed `changes` job fails the reusable workflow, so `evidence` fails. Skipped jobs inside a successful reusable workflow leave its result `success`.
- The steps that need artifacts (numbers, screenshots of `main`, comparison, publishing, the evidence comment) run only when `needs.checks.outputs.code == 'true'`.
- `scripts/pr-evidence.mjs` does not trust that output. It decides again with `withoutCode` on its own `git diff` of the pull request. When the pull request changes code, checks 5 and 6 are run as now and fail without screenshots and metrics, so a wrong `code=false` gives a red check, never a green one. When it changes no code, checks 5 and 6 report "not applicable: no file the build or tests read changed (D3)", except the line of check 5 that a newer commit was pushed, which stays.
- The release pull request stays exempt from all checks, as now.

C-18 gets one sentence: items 3 and 4 do not apply to a pull request that changes only the files of D3, because its build and numbers are those of `main`. C-19 is not edited.

### D5. Validation alongside review

`docs/process.md` steps become:

1. **Propose.** 2. **Approve** (the owner). 3. **Implement** (implementer). 4. **Pull request**: the mechanic pushes and opens it; CI runs. The owner may read the texts from here on, alongside the review.
5. **Review and validate.** Review round 1 and validation start together, on the same commit: the reviewer on the diff, the validator on a production build of that commit served from a scratch directory. The implementer fixes the findings of both. Each later round reviews the fixes; the validator reruns the scenarios the fixes may touch. One push per round.
6. **Archive** (D1), when the last round approves, validation passes and the owner's remarks on the texts are answered.
7. **Merge** (the owner).

The validator decides what to rerun, so that the coordinating session does not need to know the scenarios. `docs/process/validator-prompt.md` gains:

- Input: for a rerun, the previous report and a summary of the fixes written as behaviour (what a user now sees or can do), never code.
- Rule: on a rerun, rerun three times each scenario whose outcome the fixes may change, and every scenario when unsure; the others keep their scores, marked "carried over from <commit>". Say which were rerun and why.
- Output: the commit of the build under test.

The threshold (0.9 per scenario, no regression) does not change.

### D6. The format of `review.md`, frozen

```text
# Review                                (optional; any text before the first round is free)

## Round <n>                             rounds 1, 2, 3 … in order
Reviewed: <12 hex characters>           once per round
Verdict: approved | changes requested   once per round
- F<n>: fixed                           once per open finding, in any round after the first
- F<n>: not fixed — <what remains>
- F<n>: declined — <reason>

### F<n> <title>                        a finding, numbered through the whole record
Severity: critical | minor              once per finding, before the next ### or ##

### Notes                               optional, free text
```

The reader goes line by line. A line is read by its form wherever it stands in a round, unindented: `## Round <n>`, `Reviewed:`, `Verdict:`, an outcome line, `### F<n> <title>` and `Severity:`. Every other line is free text and is not read, headings, tables and fenced blocks included; so a record does not quote one of the forms at the start of a line (a quoted one is read, and a duplicate then fails loudly rather than passing silently). An HTML comment's opening `<!--` anywhere still fails, so that what the owner reads on the pull request is all of it.

Checked as now: the order of rounds; one hash and one verdict per round; each finding raised once; outcomes only for findings raised in an earlier round, one per round, exactly one of the three, with the text after the dash for `not fixed` and `declined`; every open finding stated by every later round; the verdict consistent with the round; the last round approved with nothing open; the stale-hash messages of check 4. New: each finding has exactly one `Severity:` line, `critical` or `minor`. The rule that from round 3 on new minor observations go under `### Notes` stays the reviewer's, as in review-severity; the check does not enforce it.

Removed from `scripts/review-record.mjs`: the closing sections, `coveredIds` and the coverage messages (`noCoverage`, `noOutside`, `notCovered`), unknown sections and headings, text before the rounds, lines unknown or misplaced in a round, indented lines under an outcome, block quotes, setext headings and fence tracking, `### Notes` repeated, and their messages. `scripts/pr-evidence.mjs` stops comparing listed requirements with the record: `pnpm trace` and check 2 cover requirement ↔ test.

Records already archived are not read again: the evidence check reads only the record of the change its pull request names, and check 7 reads only the change the head commit archives. Older records (with coverage tables, without `Severity:` before review-severity) stay as they are.

### D7. Project agents

Four files in `.claude/agents/`, each with frontmatter `name`, `description`, `model`, `effort` and `tools` (or `disallowedTools`), and a short body of standing rules, so that a brief from the coordinating session carries only the task.

| Agent | Model, effort | Tools | Does |
| --- | --- | --- | --- |
| `implementer` | Sonnet, high | Read, Edit, Write, Bash, Grep, Glob | works through `tasks.md`, fixes findings |
| `reviewer` | Opus, medium | Read, Grep, Glob, Bash, Edit, Skill | writes its round of `review.md`, edits nothing else |
| `validator` | Sonnet, high | all but Bash, Grep, Glob, Edit, Write, NotebookEdit | runs the holdout scenarios in a browser |
| `mechanic` | Haiku, low | Bash, Read, Edit | pushes, opens the pull request, watches CI, ticks tasks, makes the archive commit |

Standing rules, in every agent where they apply:

- **Report**: terse, at most 150 words (mechanic 80); facts, commands run and their results, open questions. The validator's report has the form of its prompt.
- **No dead code**: no export without an importer (check each new export with `git grep`), no unused file, parameter or branch.
- **Before handing back**: `pnpm check`, `pnpm test`, the end-to-end specs the change touches, and `pnpm exec commitlint --from origin/main --to HEAD`, all green.
- **Identity**: commit as the bot with the variables inline on the command (`GIT_AUTHOR_NAME=... git commit`, never `export`); `GH_TOKEN=$(node scripts/bot-token.mjs) gh ...` for GitHub.
- **Never push** unless the brief says so; only the mechanic is asked to.
- **Builds**: the owner's preview serves `dist/`, so an agent builds only into a scratch directory (`pnpm exec vite build --outDir <scratch>`) and serves that.
- The repository rules of `CLAUDE.md` (C-01, reading nothing outside the repository) apply as before.

The reviewer's body also carries the severity definitions of `docs/process.md` step 4 with calibration examples. Critical: a learner's mark or progress lost or changed without their action (a ticked item of the daily checklist that is gone after a reload, an answer lost on reload); a requirement of the change not met; a constitution violation; a flow that cannot be done by keyboard or screen reader; broken on Chrome or Edge on desktop; a failing or flaky test. Minor: naming, structure, duplication, an export without an importer, wording, polish not in the spec. When unsure between the two for anything the learner made, critical. The reviewer is resumed for later rounds or replaced as D8 says.

The validator's body tells it to read `docs/process/validator-prompt.md` and nothing else of this repository, and gives it the scenario directory and build URL from the brief.

Dead-code tooling: `knip` is not in the project, and a dead-export script that handles Vue files, type exports and re-exports is not simple. The rule above is the whole measure for now; a tool is left for later.

### D8. The skill of the coordinating session

One skill, `.claude/skills/drive-change/SKILL.md`, in the format of a global skill (frontmatter `name` and a `description` with its triggers and what it is not for, then a short body). It triggers on driving a change to a merge-ready pull request ("drive the change", "next slice", "веди изменение", "продолжай изменение") and not on implementing code, reviewing or validating, which are the agents of D7. Its body:

- **Short context**: one change per session. The coordinating session edits no code and does not poll CI itself: the mechanic watches the checks (`gh pr checks --watch`) in the background. Before any wait longer than a few minutes (CI, validation, the owner) it writes a handoff note to `.claude/handoff.md` (git-ignored: change, branch, pull request, step, agent IDs, open findings) and the owner may `/clear`; the next session starts from that note.
- **Routing**: the table of D7, which agent for which step.
- **Reviewer, resumed or fresh**: resume the same reviewer for the next round when its last turn was under 5 minutes ago and its context is under 100 thousand tokens; otherwise start a fresh `reviewer`, which reads `review.md` and the diff and says under `### Notes` that it is a new agent (as step 4 already allows).
- **Owner touchpoints**: approving the proposal; reading the texts, which may run alongside review; the merge. Between them the session drives the change to a merge-ready pull request without asking whether to continue, and reports a red check or a stalled agent at once, with its diagnosis.

One skill rather than four: the four habits are one workflow and trigger together.

### D9. Text changes

- `docs/constitution.md`: C-14 names only the release pull request as implementing no change; C-18 drops the archive pull request, the coverage statement of item 2 and adds the archive commit and the sentence of D4.
- `docs/process.md`: the steps of D5, step 4's record format by reference to the frozen form of D6, step 8 removed, the roles table gaining the mechanic.
- `CLAUDE.md`: the paragraph on review rounds shortened to the rule (rounds, severity, round 3) and a pointer to `docs/process.md` and the agents, instead of the grammar.
- `openspec/config.yaml`: the task group "Review and evidence" ends with the archive commit, and has no task for the merge.
- `.gitignore`: `.claude/handoff.md`.

## Risks / Trade-offs

- **A skipped job and the required check.** If GitHub ever counted skipped jobs inside a reusable workflow as a failure, every pull request without code would go red: fail-closed, never a false green (D4). The first real case is the open release pull request, which release-please updates after this merge; if it goes red, the `if` conditions are fixed in a follow-up.
- **The `changes` job delays `unit` and `build`** by the time of one small job, about 10 – 15 s, on every pull request with code. `static` is not delayed. The duration of this change's own run shows whether the 3-minute budget still holds.
- **Late changes after the archive commit** cost a revert and a new archive commit. Rare: the archive commit comes after the approval, validation and the owner's reading.
- **A looser `review.md`** accepts free text it used to refuse. What is read is still exact, and a form quoted at the start of a line is read rather than ignored, so a mistake fails rather than passes.
- **Agent frontmatter**: if a field such as `effort` is not supported by the installed Claude Code, the agent still loads and the coordinating session passes the effort in the brief; task 5.5 checks it.
- **A new reviewer** knows the diff less well than a resumed one. `review.md` holds every finding, and each round covers the whole diff (C-18).
