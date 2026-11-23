Tasks marked **(owner)** need the owner and cannot be done by an agent.

## 1. Domain

- [x] 1.1 Add `topicStep` to `src/domain/programs/progress.ts` and export it (design D1); verify with unit tests named `@req PLAY-017` (a course unit, a drill unit, the first of two matching topics, a topic without supplements skipped, a unit of no topic, a pack the program does not use) and coverage of `src/domain` ≥ 95 %

## 2. Study

- [x] 2.1 Give `useUnit` the unit's `topic` (design D2) and add `TopicSteps.vue` to Study's header (design D3); verify with end-to-end tests named `@req PLAY-017` the steps of course unit 1, the way to drill unit 1 and back, and the topic of course unit 2 after ›
- [x] 2.2 Add the offer of the next step below the exercises of a course unit (design D4); verify with an end-to-end test named `@req PLAY-017` no offer with 1.3 not done (1.1 and 1.2 seeded by `completeInStore`), the sentence in a status region after «Выполнить упражнение» on 1.3, and «Перейти к практике» opening drill unit 1 at 1.1
- [x] 2.3 Add the source switch and the course's pages panel in step 2 (design D5); verify with an end-to-end test named `@req PLAY-018` pages 3 and 4 shown by the switch pressed by keyboard, page 2 back by «Сборник упражнений» and by the number of exercise 1.2, the drill book's page after a reload, and no switch in course unit 1
- [x] 2.4 Verify PROG-007 (design D3) with an end-to-end test named `@req PROG-007`: with course unit 1 seeded done, «Открыть раздел» opens drill unit 1 at 1.1 with step 2 «сейчас», and «Сегодня» in the top bar shows Today with «сделано 3 из 3»

## 3. Today

- [x] 3.1 Name `@req PROG-014` in the test that finds the program above the book cards (design D6); verify `pnpm trace` passes

## 4. Documentation

- [x] 4.1 Write PROG-014's new wording into `docs/product/05-program-and-levels.md` and the steps and the switch into the Study section of `docs/product/08-interface-reference.md` (design D6, D8)
- [x] 4.2 **(owner)** Decide PROG-014: keep the book cards (recommended, this change) or remove them in a change of their own
- [x] 4.3 **(owner)** Read the Russian texts of the steps, the offer and the switch on the running build and correct them

## 5. Review and evidence

- [ ] 5.1 Add the states `study-drills-course` and `study-course-done` to `studyStates` (design D7); verify axe in both themes and the screenshots of both, the whole end-to-end suite on Chromium and Firefox, and the pipeline within C-19
- [ ] 5.2 Run `pnpm verify`; verify it passes, WebKit by the pipeline; the pull request shows Study's changed screenshots beside those of `main` and `pnpm size` within C-06
- [ ] 5.3 Open the pull request as the bot with the sections of C-18 item 1
- [ ] 5.4 A reviewing agent with a fresh context writes round 1 in `review.md`, each finding with `Severity: critical` or `Severity: minor`; fix or decline each finding; the same agent, resumed, writes each later round. In rounds 1 and 2 every finding is fixed or declined with a reason; from round 3 on an open minor finding is declined as technical debt recorded in `docs/roadmap.md` under "Later, unscheduled", new minor observations go under `### Notes`, and critical findings are fixed in any round (`docs/process.md` step 4). Verify the `evidence` check is green
- [ ] 5.5 A validating agent runs the holdout scenarios that touch Today, Topics and Study against a production build; attach its report to the pull request
- [ ] 5.6 **(owner)** Try the demo, read the pull request and the report; approve and merge
