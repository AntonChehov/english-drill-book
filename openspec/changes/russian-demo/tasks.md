# Tasks

Tasks marked **(owner)** need the owner and cannot be done by an agent.

## 1. The text

- [ ] 1.1 Write in `demo/course.json` and `demo/drills.json`, as design D2 states, the `learner` texts: the Russian title of each unit («Глагол to be: am, is, are», «Present simple», «Артикли a и an», «There is и there are»), the `theory` of each unit of the course (plain paragraphs, English spans marked `*…*`), the `theory` of each unit of the drill book (what the unit practises, with a pointer to the course), and the `help` of every exercise; set `version` to `1.1.0` in both; keep every English text as it is
- [ ] 1.2 **(owner)** Read the Russian texts in both sources and correct them before the books are built

## 2. The pack

- [ ] 2.1 Add `help` to the three exercise kinds of `contracts/pack.schema.json` and restate the description of `theory` as in design D1; add `help` to `contracts/examples/pack.valid.json` and an over-long `help` to an invalid example; follow in `src/domain/packs/types.ts` and `validate.ts`; verify with unit tests named `@req PACK-001` and `@req PACK-004` that `help` is accepted on each kind, refused over 1000 characters with its path and `maxLength`, and that the validator and the schema still agree on every example

## 3. The build and the join

- [ ] 3.1 In `scripts/build-demo-books.mjs` check the `learner` texts in `sourceProblems`, carry them into the expected pack and write `src/domain/books/demo/learner.json` as in design D2; run `pnpm demo:build`; verify with the builder's tests that the PDF bytes and `documents.json` are unchanged and that `demo/<book>.pack.json` holds the Russian titles, `theory` and `help`
- [ ] 3.2 Add `learner` to `DemoBook` and `withLearnerTexts` in `src/domain/books/demo/learner.ts`; set the profiles' version to `1.1.0`; call the join in `addDemo` as in design D2; verify with unit tests named `@req PACK-004` that the reader's result joined equals `demo/<book>.pack.json` for both books, and that `keptDemo` reports a stored pack of version `1.0.0` as stale (design D4)

## 4. Study

- [ ] 4.1 Add `theoryParagraphs` to `src/domain/study` as in design D3; verify with unit tests named `@req PLAY-020`: paragraphs, `*…*` spans, an unclosed `*` shown literally, an empty text
- [ ] 4.2 Show the block «Объяснение» in `StudyView.vue` and the `help` in `ExerciseBlock.vue`, and drop `lang="en"` from unit titles in `StudyView.vue`, `UnitMenu.vue` and `BookCards.vue`, as in design D3; verify with an end-to-end test named `@req PLAY-020` and `@req PACK-004` the scenarios of the delta specs: the block open with its Russian paragraph and an `<em lang="en">`, folded on request, the `help` of exercise 1.1 between its task and item 1, item 1's prompt marked `en`, the heading «Раздел 1. Глагол to be: am, is, are», and no axe violation

## 5. Review and evidence

- [ ] 5.1 Update the end-to-end tests and `e2e/views.ts` to the Russian unit titles; verify the whole suite passes on Chromium and Firefox
- [ ] 5.2 Run `pnpm verify`; verify it passes, WebKit by the pipeline; the pull request shows the changed screenshots beside those of `main` and `pnpm size` within C-06
- [ ] 5.3 Open the pull request as the bot with the sections of C-18 item 1
- [ ] 5.4 A reviewing agent with a fresh context writes round 1 in `review.md`; fix or decline each finding; the same agent, resumed, writes each later round. Approve stays required; at most three rounds in the normal course, see `docs/process.md`. Verify the `evidence` check is green
- [ ] 5.5 A validating agent runs the holdout scenarios of milestone 1 that touch Study and the demo against a production build; attach its report to the pull request
- [ ] 5.6 **(owner)** Try the demo, read the pull request and the report; approve and merge
