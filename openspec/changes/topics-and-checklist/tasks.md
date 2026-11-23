Tasks marked **(owner)** need the owner and cannot be done by an agent.

## 1. Domain

- [ ] 1.1 Add `Topic.id` and `Program.dailyBlocks` to `src/domain/programs/types.ts` and the three `dailyBlocks` of design D1 to `demo.json`; verify `pnpm typecheck` and the CI check of built-in programs (`@req PROG-010`) pass
- [ ] 1.2 Give `todayTopic` the optional `focus` of design D1; verify with unit tests named `@req PROG-005` (focus not passed, focus passed, unknown focus, no focus) and coverage of `src/domain` ≥ 95 %
- [ ] 1.3 Make `markDoneAttempt` take the typed answers of any exercise (design D6); verify with unit tests named `@req PLAY-021` and `@req PLAY-009` that an items exercise marked done is valid against the attempt of `contracts/export.schema.json` and derives as done with no verdicts

## 2. Storage

- [ ] 2.1 Add schema version 2 with the store `days` (design D4), the fixture `src/storage/db/fixtures/version-2.json`, and move the test-only next version to 3 (design D7); verify with the migration tests (`@req DATA-005`) that version 1 data opens at version 2 with every record kept and an empty `days`
- [ ] 2.2 Add `getDayTicks` and `putDayTicks` to the store; verify with unit tests named `@req PROG-009` the round trip, an empty day, and that another tab is told of the write

## 3. Today and Topics

- [ ] 3.1 Add `src/ui/demo/program.ts` (design D2), moving the reading of done states from `StartView.vue` and the progress helpers from `ProgramToday.vue`, with the focus read from the store; verify the existing end-to-end tests of Today and the book cards pass unchanged
- [ ] 3.2 Add the route `/topics`, the section «Темы», the link «другая тема» and `TopicsView.vue` (design D3); move `completeInStore` to `e2e/study.ts` (design D7); verify with end-to-end tests named `@req PROG-008` and `@req PROG-005` the scenarios of the delta specs `topics` and `today` (D8), the existing test of the focus after adding the demo with «другая тема» before «Открыть раздел», axe on Topics in both themes, and the choice by keyboard
- [ ] 3.3 Add `src/ui/demo/day.ts` and `DailyChecklist.vue` on Today (design D4); verify with a unit test of `localDay` and end-to-end tests named `@req PROG-009` and `@req PROG-006` a tick kept over a reload, the next day empty (page clock), and the failed write
- [ ] 3.4 Add the hover highlight of design D5; verify with an end-to-end test named `@req PROG-018` the changed background of a rung and a step and no `title` or tooltip on Today

## 4. Study

- [ ] 4.1 Offer «Выполнить упражнение» on every exercise not done (design D6), replacing «Отметить как сделанное»; verify with end-to-end tests named `@req PLAY-021` and `@req PLAY-009` the scenarios of the delta spec `study`, and the existing tests of PLAY-013 with the new label

## 5. Documentation

- [ ] 5.1 Write PROG-018, PLAY-021 and PLAY-009's new sentence into `docs/product/` and correct `08-interface-reference.md` (design D9)
- [ ] 5.2 **(owner)** Read the Russian texts of Topics, the checklist and «Выполнить упражнение» on the running build and correct them

## 6. Review and evidence

- [ ] 6.1 Add Topics (clean and with the demo) to the screenshot suite; verify the whole end-to-end suite passes on Chromium and Firefox and the pipeline stays within C-19
- [ ] 6.2 Run `pnpm verify`; verify it passes, WebKit by the pipeline; the pull request shows the changed screenshots beside those of `main` and `pnpm size` within C-06
- [ ] 6.3 Open the pull request as the bot with the sections of C-18 item 1
- [ ] 6.4 A reviewing agent with a fresh context writes round 1 in `review.md`, each finding with `Severity: critical` or `Severity: minor`; fix or decline each finding; the same agent, resumed, writes each later round. In rounds 1 and 2 every finding is fixed or declined with a reason; from round 3 on an open minor finding is declined as technical debt recorded in `docs/roadmap.md` under "Later, unscheduled", new minor observations go under `### Notes`, and critical findings are fixed in any round (`docs/process.md` step 4). Verify the `evidence` check is green
- [ ] 6.5 A validating agent runs the holdout scenarios that touch Today, Topics and Study against a production build; attach its report to the pull request
- [ ] 6.6 **(owner)** Try the demo, read the pull request and the report; approve and merge
