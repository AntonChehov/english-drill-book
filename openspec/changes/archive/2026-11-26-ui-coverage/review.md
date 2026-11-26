# Review

## Round 1

Reviewed: 40123c38efaa
Verdict: changes requested

### F1 The checklist tests read the real clock

Severity: critical

Where: `src/ui/views/Today.test.ts`, the three tests of "the checklist of the day" (PROG-009, DATA-004). What: `DailyChecklist.vue` takes the day from `new Date()` when it mounts and when it writes; the tests compute `localDay(new Date())` again, later, to seed and to read the ticks. A run that crosses local midnight between the two reads stores the tick under one day and looks for it under the other, and fails. Why: C-10 forbids tests that depend on the real clock; this is a flaky test. Fix: fix the system time for these tests (`vi.useFakeTimers({ toFake: ["Date"] })` with `vi.setSystemTime`, keeping timers real), and compare with that fixed day.

### F2 Tests reach into the markup of the components the split will change

Severity: critical

Where: `src/ui/testing/study.fixture.ts` (`settle`, `exerciseOf`), `StudyView*.test.ts`, `ExerciseBlock*.test.ts`. What: the proposal and D2 say the study tests query by role, label and text, so that they hold across `study-split`. Many of them select on class names and ids that are private to `StudyView.vue`, `PagesPanel.vue` and `ExerciseBlock.vue`: `.pages-column`, `.progress`, `.book`, `.state`, `.loading`, `#unit-menu-list`, `#bar-unit`, the `style` attribute holding `display: none`. Worst is `settle`, which waits for `.loading` to be absent: if the split renames or moves that class, `settle` returns at once and every study test runs against a screen still loading, so the tests turn racy instead of failing. Why: this is a stated property of the change that is not met, and it is the property that makes the tests the proof of the split. Fix: wait on the status text "Открываем раздел…" (role `status`) or on the `h1`; find the pages panel, the header count and an exercise's state through their roles, labels or headings (add none to the app in this change, which changes no app code; where no accessible handle exists, name the selector in one helper in the fixture, so that the split changes one place). Visibility of a collapsed panel can be asserted through the strip button and the absence of the panel's controls rather than its inline style.

### F3 happy-dom is not pinned

Severity: minor

Where: `package.json`. What: `"happy-dom": "^21.0.4"`, while the other development dependencies (vitest, fake-indexeddb, prettier, oxlint …) are pinned to an exact version. Why: the lockfile holds it today, but an update of the lockfile can take a newer minor of the DOM the component tests run in without anyone choosing it. Fix: `21.0.4`.

### F4 scrollIntoView is replaced on the prototype and never restored

Severity: minor

Where: `src/ui/study/StudyView.test.ts`, "an address with an exercise scrolls to it". What: `HTMLElement.prototype.scrollIntoView = scroll` is an assignment, which `vi.restoreAllMocks` does not undo, so with shuffle the tests of the file that run after it see a mock and those before it the DOM's own method. Why: state that leaks between tests by order; harmless now, a trap later. Fix: `vi.spyOn(HTMLElement.prototype, "scrollIntoView").mockImplementation(...)`, which `restoreAllMocks` undoes.

### F5 A test waits 10 ms of real time

Severity: minor

Where: `src/storage/pdf/load.test.ts`, "waits through a message that is not the ready one". What: `setTimeout(resolve, 10)` on the real clock to show that nothing settled. The fake worker answers in a microtask, so flushing the queue (`setImmediate`, as the fixture's `flushPromises`) shows the same without real time. Why: C-10 spirit, and the test reads as if timing mattered.

### Notes

Checked: no file outside tests, the fixture, `vitest.config.ts`, `package.json` and the lockfile changes; `src` gains only `*.test.ts` and one `*.fixture.ts`, which coverage excludes. Every `@req` ID exists (PROD-012 in `docs/product/01-product.md`, the others in `openspec/specs`), and the tests I read check the requirement they name; I found no test that only runs code for coverage. Thresholds and each exclusion carry a reason. `pnpm audit` is clean, `pnpm check` passes, `pnpm test:coverage` passes: `src/ui` 92.7 % lines and 83.3 % branches, `src/storage` 99.6 / 96.0, `src/domain` 99.7 / 98.6. The slowest new file, `ExerciseBlock.test.ts`, takes about 2.2 s; the whole run stays under 10 s locally.

Outside this diff: `src/domain/checking/speed.test.ts` "refuses large keys in well under 100 ms" failed in 3 of 6 full runs on this branch (114 ms and 111 ms), and in 1 of 5 runs with the new test files excluded, so it is flaky on `main` already; the added happy-dom files raise the load it runs under. Not a finding of this change, but worth its own fix before CI shows it.

Fix of F2 changes no behaviour of the app; the tests only change what they hold on to.

## Round 2

Reviewed: 4b3ad64ef58f
Verdict: approved

- F1: fixed
- F2: fixed
- F3: fixed
- F4: fixed
- F5: fixed

### Notes

I am the same reviewer as in round 1, resumed, and I read the whole diff again.

Fix of F1: only `Date` is faked in the checklist block, and the day is fixed at noon, so the fake storage's `setImmediate` and the real timers are untouched. Fix of F2: `settle` now waits for an `h1` and for the "Открываем раздел…" status to be gone, so it fails when no screen is drawn, instead of passing at once. Exercises are found through `aria-labelledby` and their heading, the list of units through `aria-controls` and the progress of the unit through its visually hidden words.

The private handles that remain, as the coordinator asked: the `header` element in `statusOf` is semantic markup of the exercise block and moves with it in any split. `#bar-unit` is the frame's own target in `App.vue`, which the study screen teleports into. It is a contract between the frame and the screen, not something inside the screen, so the split keeps it. `isHidden` reads the inline `display: none` that `v-show` writes. If the split hides a panel with `v-if` instead, the button is gone and `buttonNamed` throws, so the test fails loudly and does not pass by mistake. All three sit in one helper each in the fixture, and nothing more is needed for `study-split`. `TopicsView.test.ts` still selects `.topic`, `.state` and `.counts`. That screen is not part of the split, and I raise no finding on it.

Gates on this commit: `pnpm check` passes, `pnpm test:coverage` passes with the thresholds, and three shuffled runs of `pnpm vitest run` pass, apart from the `speed.test.ts` flake on `main` noted in round 1. That flake failed 1 run of 3 again and is outside this diff.
