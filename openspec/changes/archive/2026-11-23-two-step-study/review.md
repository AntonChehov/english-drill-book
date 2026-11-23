# Review

## Round 1

Reviewed: 5dc8f0ce6f26
Verdict: changes requested

### F1 Two pages panels share `id="pages-heading"`

Severity: minor

`PagesPanel.vue` has `<section aria-labelledby="pages-heading"><h2 id="pages-heading">`. In step 2 `StudyView.vue` mounts a second panel once the switch is pressed, so the document holds two elements with that id, and the course panel's `aria-labelledby` resolves to the drill panel's heading (the first in the document, `display: none` while the course is shown). It works only because both headings say «Страницы книги»: the name is right by coincidence, and the two regions cannot be told apart by name. axe passes on `study-drills-course` (checked in both browsers), so this is not a blocker: no user loses anything today. It is invalid HTML and breaks the moment the two headings differ (for example «Страницы курса»). Give each panel its own id (`useId()` in `PagesPanel.vue`; the design said the panel does not change, so correct D5 and Impact too) or an `aria-label` from a prop.

### F2 `TopicStep` is exported with no importer, and `TopicOfUnit` repeats its union

Severity: minor

`src/domain/programs/progress.ts` exports `interface TopicStep`. Nothing in `src` or `e2e` imports it; the barrel does not re-export it. That is an export with no caller (the owner's rule for this change). `TopicOfUnit.step` in `src/ui/study/unit.ts` spells the same union `"course" | "drills"` out again. Either type the field as `TopicStep["step"]` (re-export the type from the barrel, which gives the export its caller) or drop `export` from the interface and accept the repeat. The first is the simpler.

### F3 Task 5.1 is ticked with the pipeline not yet run

Severity: minor

Task 5.1 says "verify ... the whole end-to-end suite on Chromium and Firefox, and the pipeline within C-19". Commit 4cbfdca ticks it, but the branch has not been pushed and no pipeline has run, so "the pipeline within C-19" is not verified. Locally the four new tests take 3 s together and the 33 tests of `study-steps`, `study-a11y` and `study` 12 s on Chromium, so the budget is very likely met; the tick should still wait for the run, or the task should say what was measured. Untick, and tick it once the pull request shows the duration.

### Notes

Read the whole diff against `origin/main` (18 files; three commits, of which the last two are the implementation and the tasks). No dependency added, the store and `contracts/` untouched.

Design questions checked and found sound:

- `topicStep`: step 1 is the unit a topic leads, step 2 the unit holding a supplement of the pack among the unit's exercises; topics without supplements skipped; units of no topic and packs outside the program give `undefined`. Tests cover each branch, including the first of two matches.
- `useUnit` keeps `topic` `undefined` when either book is missing or invalid, so Study falls back to what it was.
- The offer: the `role="status"` region is in the page from the first render, so the sentence is announced when it appears; the focus is not moved; the link is an ordinary link after the last exercise in Tab order. The tests click the link, not Tab to it; a native link needs no more.
- The switch: `role="group"`, `aria-label`, `aria-pressed` on both buttons, the state not by colour alone (weight and border). The course panel is mounted on first press, so a failing course PDF never shows its alert to a learner who did not ask for it; the extra `courseOpened` ref is justified by that. The number of an exercise shows the drill book again. Each opening starts on the drill book (the route is keyed by the path).
- No dead branch found in `StudyView.vue`, `TopicSteps.vue` or `topicOf`; `courseLink` is used in step 2 and `drillsLink` in step 1, each by one step bar link.
- Russian texts read correctly and match the delta specs word for word.

Not observable in the demo, so not tested, and the design says so (D5): the scroll of the pages column to its top when a switch button is pressed, and the scroll to the exercise's own page after its number (the demo units have one drill page).

Task 4.2 is an owner task and is ticked in 4cbfdca by the bot. I cannot tell from the repository whether the owner decided; the owner should confirm that «keep the cards» is the decision.

Gates run: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm trace` (59 requirements), `pnpm spec` (10 passed), `vitest` on `src/domain/programs` (41 passed). A production build into a scratch directory (not `dist/`) under `vite preview`: `study-steps`, `study-a11y` and `study` on Chromium (33 passed); `study-steps`, `study-a11y`, `today` and `topics` on Firefox (all passed).

## Round 2

Reviewed: e5f113e09ebb
Verdict: approved
- F1: fixed
  `PagesPanel.vue` takes `headingId = useId()` and labels its section by its own heading, so two panels no longer share an id. Nothing else in `src`, `e2e` or the specs names `pages-heading`; the one selector that did (`e2e/pages.spec.ts`, the DOC-001 timing) now reads `section.pages canvas`. Design D5 and the proposal's Impact say that `PagesPanel` changes in its heading id.
- F2: fixed
  `TopicStep` is re-exported as a type from `src/domain/programs/index.ts` and `TopicOfUnit.step` is `TopicStep["step"]`, so the export has its caller and the union is written once.
- F3: fixed
  Task 5.1 is unticked until the pull request shows the pipeline within C-19.

### Notes

Since round 1 only 1bfa332 changed: 7 files. The rest of the whole diff stands as reviewed in round 1. No new export without a caller, no dead code, no regression found.

The proposal's Impact lists `e2e/study.ts` among the changed files but not `e2e/pages.spec.ts`, whose selector changed with F1; trivial, not a finding.

Task 4.2 was confirmed by the owner, as the coordinator states; it is no longer open.

Gates run: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm trace` (59 requirements), `pnpm spec` (10 passed). A production build into a scratch directory (not `dist/`) under `vite preview`: `study-steps`, `study-a11y`, `pages` and `study` on Chromium and Firefox, 55 passed, including the DOC-001 timing test and axe on both new states in both themes.

## Requirement coverage

| Requirement | Implemented in | Covered by |
| --- | --- | --- |
| PLAY-017 | `src/domain/programs/progress.ts` (`topicStep`), `src/ui/study/unit.ts` (`topicOf`), `src/ui/study/TopicSteps.vue`, `src/ui/study/StudyView.vue` (the offer) | `src/domain/programs/progress.test.ts`, `e2e/study-steps.spec.ts`, `e2e/study-a11y.spec.ts` (`study-course-done`) |
| PLAY-018 | `src/ui/study/StudyView.vue` (`showSource`, the group, the second `PagesPanel`) | `e2e/study-steps.spec.ts`, `e2e/study-a11y.spec.ts` (`study-drills-course`) |
| PROG-007 | none new: `useUnit` and `TopicSteps.vue` show the step `next` of Today opens | `e2e/study-steps.spec.ts` |
| PROG-014 | text only: `docs/product/05-program-and-levels.md`; behaviour unchanged | `e2e/today.spec.ts`, `e2e/study-frame.spec.ts` |

## Outside the listed requirements

`e2e/study.ts` gains the states `study-drills-course` and `study-course-done`, and the comment of `studyStates` is reworded. `docs/product/08-interface-reference.md` describes the steps and the switch.
