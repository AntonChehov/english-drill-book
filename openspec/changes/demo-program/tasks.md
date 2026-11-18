Tasks marked **(owner)** need the owner and cannot be done by an agent.

## 1. The demo program and its check

- [x] 1.1 Add `src/domain/programs/types.ts` with `Program` as in design D1 and `src/domain/programs/demo.json` with the content of D1; verify `pnpm typecheck` passes with the JSON assigned to `Program`
- [x] 1.2 Add `src/domain/programs/programs.test.ts` as in design D2: every built-in program valid against `contracts/program.schema.json` and breaking none of the rules of PROG-010, and each rule caught on a broken copy; verify with tests named `@req PROG-010` and, for the topics of the demo program, `@req PROG-015`

## 2. Progress over a program

- [x] 2.1 Add `topicProgress`, `levelShares`, `currentLevel` and `todayTopic` in `src/domain/programs/progress.ts` as in design D3; verify with unit tests named `@req PROG-001` – `@req PROG-005` covering the cases of D7 and the scenarios of the delta spec `program`, and coverage of `src/domain` ≥ 95 %

## 3. Today

- [x] 3.1 Move the reading of done states from `BookCards.vue` to `StartView.vue` as in design D4; verify the existing end-to-end tests of the book cards (`@req PROG-014`) still pass
- [x] 3.2 Add `src/ui/components/ProgramToday.vue` and show it from `StartView.vue` while the demo is added, as in design D5 and D6; verify with end-to-end tests named `@req PROG-005`, `@req PROG-006` and `@req PROG-013` the scenarios of the delta spec `today` (D7), axe on Today with the program in both themes, and the links reached by Tab
- [ ] 3.3 **(owner)** Read the Russian texts of Today and the topic titles of the demo program on the running build and correct them

## 4. Review and evidence

- [x] 4.1 Add Today with the program to the screenshot suite; verify the whole end-to-end suite passes on Chromium and Firefox
- [ ] 4.2 Run `pnpm verify`; verify it passes, WebKit by the pipeline; the pull request shows the changed screenshots beside those of `main` and `pnpm size` within C-06
- [ ] 4.3 Open the pull request as the bot with the sections of C-18 item 1
- [ ] 4.4 A reviewing agent with a fresh context writes round 1 in `review.md`, each finding with `Severity: critical` or `Severity: minor`; fix or decline each finding; the same agent, resumed, writes each later round. In rounds 1 and 2 every finding is fixed or declined with a reason; from round 3 on an open minor finding is declined as technical debt recorded in `docs/roadmap.md` under "Later, unscheduled", new minor observations go under `### Notes`, and critical findings are fixed in any round (`docs/process.md` step 4). Verify the `evidence` check is green
- [ ] 4.5 A validating agent runs the holdout scenarios of milestone 1 that touch Today and the demo against a production build; attach its report to the pull request
- [ ] 4.6 **(owner)** Try the demo, read the pull request and the report; approve and merge
