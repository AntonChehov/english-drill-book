# Tasks

Tasks marked **(owner)** need the owner and cannot be done by an agent.

## 1. Approval

- [ ] 1.1 **(owner)** Approve the proposal, design and tasks of `workflow-retro`

## 2. The archive commit in the evidence check (D1, D2)

- [x] 2.1 Add `archiveOf(root, head)` to `scripts/review-hash.mjs` and hash a change that the head commit archives at that commit's parent, in `reviewHash` and in the command without a name; verify with tests on a temporary repository: the hash before and after `openspec archive` is the same, a merge commit or a commit archiving nothing gives `undefined`
- [x] 2.2 In `scripts/pr-evidence.mjs` accept the archived change in checks 1 – 3, add check 7 with its four conditions and its message before the archive commit, and remove the archive pull request exemption (`archiveProblems` as an exemption, `exemptions().archive`, `notArchive`, the archive branch of `exemption()`); verify with tests for each condition of check 7, the change in flight (check 7 fails, checks 1 – 4 as before), and the release pull request still exempt
- [x] 2.3 Show the review line of an archived change in `scripts/evidence-comment.mjs` through `reviewHash`; verify with its tests

## 3. Pull requests without code (D3, D4)

- [x] 3.1 Add `scripts/changes.mjs` (`releaseFiles`, `withoutCode`, `needsBuild`, the command and its output `code`); verify with tests: documentation only, OpenSpec only, `.claude/` only, the release branch with its three files, the release files on another branch, one file of code, no pull request number
- [x] 3.2 Add the `changes` job and the output `code` to `.github/workflows/checks.yml`, make `unit` and `build` depend on it, and in `.github/workflows/pull-request.yml` run the artifact steps of `evidence` only when `code` is `true`; verify `pnpm format:check` and, where installed, `actionlint`
- [x] 3.3 In `scripts/pr-evidence.mjs` report checks 5 and 6 as not applicable when `withoutCode` holds for the pull request's own diff, keeping the newer-commit line of check 5; verify with tests that a pull request with code and no screenshots or metrics still fails both

## 4. The format of `review.md` (D6)

- [x] 4.1 Reduce `scripts/review-record.mjs` to the line forms of D6, add the `Severity:` check, and remove the closing sections and the messages of D6; reduce its tests to match and add tests for a missing, repeated and unknown severity
- [x] 4.2 Remove the coverage comparison from `scripts/pr-evidence.mjs` and its tests
- [x] 4.3 Verify that no script reads a record under `openspec/changes/archive/` other than the one the head commit archives (`git grep` over `scripts/`), and that `pnpm test` passes with the archived records untouched

## 5. Agents and the skill (D7, D8)

- [ ] 5.1 Write `.claude/agents/implementer.md` and `.claude/agents/mechanic.md` with the frontmatter and standing rules of D7; the mechanic's body includes the archive commit of D1 and `gh pr checks --watch`
- [ ] 5.2 Write `.claude/agents/reviewer.md` with the severity definitions and calibration examples of D7 and the record format of D6
- [ ] 5.3 Write `.claude/agents/validator.md`, which reads only `docs/process/validator-prompt.md` of this repository
- [ ] 5.4 Write `.claude/skills/drive-change/SKILL.md` as D8 describes and add `.claude/handoff.md` to `.gitignore`
- [ ] 5.5 Verify that Claude Code lists the four agents with their models (`/agents`) and the skill; if `effort` is not accepted, say so in the agents' bodies and in D7

## 6. Process text (D5, D9)

- [x] 6.1 Rewrite the steps of `docs/process.md` as D5 and D9 say, and update `docs/process/validator-prompt.md` for reruns
- [x] 6.2 Edit C-14 and C-18 of `docs/constitution.md` as D9 says; leave C-19 as it is
- [ ] 6.3 Shorten the review paragraph of `CLAUDE.md` and update the task rule of `openspec/config.yaml`; verify `pnpm spec` passes
- [x] 6.4 Record the change in `docs/roadmap.md` (Done) and the one-time check of the release pull request after the merge (Risks of the design)

## 7. Review and evidence

- [ ] 7.1 Open the pull request as the bot with the sections of C-18 item 1
- [ ] 7.2 A reviewing agent with a fresh context writes round 1 in `review.md`; each later round is written by the same agent, resumed, or by a fresh one as D8 says, until one approves; every finding carries `Severity: critical` or `Severity: minor`, and from round 3 on an open minor finding is declined as technical debt recorded in `docs/roadmap.md` while critical findings are fixed in any round
- [ ] 7.3 No holdout validation: the change alters no behaviour of the app
- [ ] 7.4 **(owner)** Read the texts of the pull request: the process, the constitution, the agents and the skill
- [ ] 7.5 Make the archive commit of D1 as the last commit of the branch; verify the `evidence` check is green on it, with check 7 passed, and the pipeline within C-19
