# Tasks

Tasks marked **(owner)** need the owner and cannot be done by an agent.

## 1. Logic of an exercise

- [ ] 1.1 Write `gradeExercise` and `viewOfExercise` in `src/domain/study` as in design D5; verify with unit tests named `@req PLAY-003`, `@req PLAY-004`, `@req PLAY-006`, `@req PLAY-011` over the demo packs
- [ ] 1.2 Write `checkAttempt`, `revealAttempt`, `overrideAttempt` and `markDoneAttempt`; verify with unit tests named `@req PLAY-007`, `@req PLAY-008`, `@req PLAY-009`, `@req PLAY-010` that the attempts they build, run through `deriveExercise`, give the states of the delta spec, including an override whose clock is behind its check's

## 2. The frame and the start screen

- [ ] 2.1 Add the top bar of design D1 and the route `#/study/<pack>/<unit>` with its "not found"; verify with end-to-end tests that the existing `@req PROD-001` and `@req PROD-008` scenarios hold for Study
- [ ] 2.2 Turn the unit list of the start screen into the cards of design D2; verify with end-to-end tests named `@req PROG-014`

## 3. Study

- [ ] 3.1 Write `useUnit` and the exercise components as in design D3, D4, D6 and D10; verify with end-to-end tests named `@req PLAY-001`, `@req PLAY-002`, `@req PLAY-003`, `@req PLAY-005`, `@req PLAY-006`, `@req PLAY-007`, `@req PLAY-008`, `@req PLAY-009`, `@req PLAY-010`, `@req PLAY-011`, `@req PLAY-013`, `@req PLAY-015` covering every scenario of the delta spec `study`
- [ ] 3.2 Make the layout of design D3 and the keyboard of design D7; verify with end-to-end tests named `@req PROD-006` at 1280 px and 360 px and `@req PROD-007` by keyboard alone
- [ ] 3.3 Show a failed write as in design D6; verify with an end-to-end test that refuses the write once and then lets the repeat through

## 4. Pages

- [ ] 4.1 Write `src/storage/pdf/render.ts` and the pages panel as in design D8; verify with end-to-end tests named `@req DOC-001` and `@req DOC-008`, and that the start screen still requests no file of the PDF library

## 5. Review and evidence

- [ ] 5.1 Add Study in its states to the accessibility check and the screenshots, both themes, the pages panel masked; verify no serious or critical violation
- [ ] 5.2 Run `pnpm verify` from a clean build; verify it passes, coverage of `src/domain` is at least 95 %, and the checks of a pull request finish within 3 minutes
- [ ] 5.3 Open the pull request as the bot with the sections of C-18 item 1; the changed screenshots are shown beside those of `main`
- [ ] 5.4 A reviewing agent with a fresh context writes round 1 in `review.md`; fix or decline each finding; the same reviewing agent, resumed, writes each later round until one approves the latest content; verify the `evidence` check is green
- [ ] 5.5 A validating agent runs the holdout scenarios of milestone 1 that Study makes possible against a production build; attach its report to the pull request
- [ ] 5.6 **(owner)** Try the demo on the preview or after merge; read the pull request, the declined findings and the validation report; approve and merge
