# Review

## Round 1

Reviewed: 2b562a2db661
Verdict: changes requested

### F1 `TopicProgress` is exported with no importer

Severity: minor

The change makes `TopicProgress` an exported interface in `src/domain/programs/progress.ts` and re-exports it as a type from `src/domain/programs/index.ts`. Nothing in `src` or `e2e` imports it: `src/ui/demo/program.ts` uses the inferred return type of `topicProgress`, and so do `ProgramToday.vue` and `TopicsView.vue`. That is an export with no caller. Revert both lines, or use the type where it is needed.

### F2 Design D2 and Impact describe a module the code does not have

Severity: minor

D2 says `src/ui/demo/program.ts` has `useDemoProgram(books)`, which reads the done states and the focus and returns `progress`, `today`, `leadUnit` and `unitOf`. The code has four exports instead: `demoBooks`, `useStoredProgress()` (the reading), `useProgram(books)` (the progress, which also returns `program`, `bookOf` and `passed`) and `isDone`. The change also adds `src/ui/demo/check.ts`, `checkDemo` moved out of `DemoBooks.vue` with a new optional `readAgain` so that Topics can find out on its own whether the demo is stored. Neither the file nor the change to `DemoBooks.vue` is in D2, D3 or Impact. The split is reasonable; the design should say what was built. Correct D2 (and D3 for `checkDemo` on Topics' mount) and name both files in Impact.

### F3 The record of `days` is said to be the export format's shape, which it is not

Severity: minor

D4 says the records `{ day: "2026-11-23", blocks: ["listen"] }` are "the shape of `days` of the export format", and `DayRecord` in `src/storage/db/store.ts` says it is "one entry of `days` of contracts/export.schema.json". In `contracts/export.schema.json`, `days` is an object that maps a day to an array of block ids (`uniqueItems`), not an array of `{ day, blocks }`. The store's shape is a fine choice, since the key path is `day`, but DATA-007 will have to turn the records into a map. Neither text should say the two are the same. Say that one record holds one property of `days` (its key and its value), in both places.

### F4 A focus the store refuses is not reported to the storage-failure handler

Severity: minor

`choose` in `TopicsView.vue` catches every error with a bare `catch` and only sets `failed`. Every other write of the change and of Study passes the error to `noteStorageFailure` (`DailyChecklist.vue`, `keep` in `unit.ts`). That handler is what turns a `newer-version` error into the newer-data screen. Here a newer version opened in another tab leaves Topics saying «Попробуйте ещё раз», which can never succeed, until the next read on focus notices. Call `noteStorageFailure(error)` in the catch, as the checklist does.

### F5 Topics opened first says the demo is not added while it checks

Severity: minor

When `#/topics` is the first screen loaded, such as after a reload or a bookmark with the demo stored, `demoState` is `loading` and `demoBooks` is `undefined`. Topics then shows «Темы появятся, когда вы добавите демо-книги на экране «Сегодня».» until `checkDemo` resolves. For that moment the page states something false, and a screen reader that reads the page on load may announce it. The scenario «Before the demo is added» is about a clean browser only. Show nothing, or a neutral line, while the phase is `loading`, and the sentence only in `idle`.

### F6 Two ticks in quick succession can lose the first

Severity: minor

`toggle` in `DailyChecklist.vue` builds the next set from `ticks.value`, which changes only once a write has succeeded. If a second box is ticked before the first write commits, the second write is built from the old set and replaces the day's record without the first block. The first box then shows ticked and goes back to unticked, and nothing tells the learner. This is unlikely with IndexedDB's speed, and it loses a tick, not an attempt. It is still a lost write inside one tab, which the Risks section does not list (it lists only two tabs). Serialise the writes, for example by ignoring changes while one is pending, as `entry.busy` does in Study, or build `next` from the last set written. Otherwise add the case to Risks.

### F7 Focus is lost when «Выполнить упражнение» succeeds

Severity: minor

The button is shown with `v-if` while the exercise is not done, so a successful press by keyboard removes the focused element and the focus falls to `body`. This already happened to «Отметить как сделанное» of an open exercise, and the change now extends it to every exercise. The live announcement «Упражнение 1.1 отмечено как сделанное» is made, and browsers keep the sequential navigation point, so this is not a blocker. Still, a screen-reader user is left with no focused element. Move the focus to a stable element of the exercise after the mark, such as «Проверить» for an items exercise or the exercise's number or its field for an open one, and check it in the PLAY-021 end-to-end test.

### F8 A filler assertion in the unit test of an unknown focus

Severity: minor

`src/domain/programs/progress.test.ts`, "a focus the program does not have is ignored", ends with `expect(t4.id).toBe("t4")`. That checks the demo program's data and has nothing to do with the scenario. `t4` is already used by the level tests, so the line does not keep a variable alive either. Remove it. If topic ids need a check, PROG-010's check of built-in programs already ensures they are unique.

### Notes

I reviewed the whole diff of `origin/main...HEAD` (48 files, 6 commits) against PROG-005, PROG-006, PROG-008, PROG-009, PROG-018, PLAY-009, PLAY-021, design D1 – D9 and the constitution.

Checked and found right:

- **Storage, schema 2.** The migration only creates `days` (key `day`). The new test opens the fixture of version 1 at version 2 and finds every store unchanged plus an empty `days`. The schema test runs over every fixture, so version 2's fixture matches the migrations to it. Opening the version 2 fixture with the app reads its tick. The test-only next version is now `NEXT_VERSION` (3) with a store `future`, and `writeNewerData` and `storage.spec.ts` follow. `getDayTicks` and `putDayTicks` go through the same `write` as other writes, so other tabs are told (unit test in `two-connections.test.ts`). Nothing of version 1 is touched (C-05). Export and import of `days` are out of scope (DATA-007, DATA-008), but see F3.
- **«Выполнить упражнение».** `markDoneAttempt` now takes the answers and keeps only the non-blank ones, with `results: {}` and `complete: true`. `newAttempt` validates it against the export format. `deriveExercise` already makes any exercise done on a `mark-done`, with `doneAt` at the first one, so `DERIVATION` stays 1 and nothing cached is rebuilt. The button shows while `status !== "done"` for items and while `!view.done` for open exercises. Both conditions come from `state.done`, so they agree. `markDone` flushes the draft first, so the typed answers stay in their fields (e2e). Done stays done, with no undo, as the owner decided. Today, Topics and the book cards all read `doneExercises`, so the count follows on every screen. One behaviour changes: an open exercise marked done with an empty field now logs `answers: {}` instead of `{ text: "" }`. That is valid and derives the same.
- **Passed topics in Topics.** They render as a `div`, not a button, with «✓ пройдена» in words. The e2e test asserts that the row holds no button. A focus that has since been passed gives way to the first topic not passed. This is tested in the unit tests of `todayTopic` and in e2e (topic 3 seeded passed after being chosen). Today's topic is marked by the text «тема дня» as well as the accent border, so hover and colour are not the only cues.
- **Checklist.** `localDay` takes the local year, month and day. The unit test covers Europe/Moscow at 22:30 UTC giving the next day. The day is taken again on every read and every tick, and a tick made after midnight starts from an empty set. A box shows ticked only after the write, and a failure is said by `role="alert"` beside the list and can be repeated (e2e with `refusePuts`). The checklist also stays when the program is complete (e2e).
- **Hover (PROG-018).** Only `@media (hover: hover)` background on `.step` and `.rung`. No `title` and no tooltip on either card (e2e). Keyboard focus is unchanged. The screenshot suites move the pointer off the page first.
- **Accessibility.** Topics' rows are buttons whose names carry the state and counts in words, under an h2 per level after the h1. The focus after adding the demo goes to «Сегодня», then Tab reaches «другая тема», then «Открыть раздел» (e2e). Axe runs on clean Topics (plain views) and on Topics with the demo in both themes (`topics-demo` in `studyStates`, which lives among Study's states only because it needs the demo per worker; its comment says so).
- **Russian texts** read well: «другая тема», «тема дня», «не начата / в процессе / ✓ пройдена», «курс 1 из 3 · практика 0 из 2», «Другие дела дня», «Отметку не удалось сохранить. Попробуйте ещё раз.», «Выбор темы не удалось сохранить. Попробуйте ещё раз.». The owner's own read (task 5.2) is still open.
- **Simplicity.** Apart from F1, every new export has a caller: `checkDemo` (DemoBooks, Topics), `useStoredProgress` (StartView, Topics), `useProgram` (ProgramToday, Topics), `chooseFocus`, `demoBooks`, `localDay`, `getDayTicks` / `putDayTicks`, and the e2e helpers `refusePuts`, `failNextPut`, `completeInStore` and `topic1Passed`. The `readAgain?` branch of `checkDemo` is reached by both callers, one with it and one without. No new dependency and no setting. C-01: the daily blocks are the program's own words.
- **C-19.** The new e2e tests are Chromium only, as D8 says (not `@demo`), and each seeds the store with `completeInStore` and opens one or two screens. None takes more than about 3 s here.
- **Flaky PACK-003 on Firefox.** The implementer's report did not reproduce. `demo.spec.ts` ran 5 times over on Firefox (55 of 55 passed), and the targeted set ran twice over on both browsers. The test has a 2 s reading budget, and this change touches it only with one more Tab. That points to load timing, as round 1 of `demo-program` also observed, not to this change. Worth watching on CI, not a finding.
- **Gates run:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm spec` (9 passed), `pnpm trace` (56 requirements), and `vitest` with coverage (819 passed, 99.61 % of statements). Also a production build into a scratch directory (not `dist/`) served by `vite preview`, against which `topics`, `today`, `study`, `study-a11y`, `a11y`, `demo` and `storage` ran on Chromium and Firefox twice over: 250 passed in 1.5 min.

## Round 2

Reviewed: 3c8786e2df67
Verdict: approved
- F1: fixed
  `TopicProgress` is no longer re-exported from the barrel. `src/ui/demo/program.ts` now imports it to type `progress` as `ReadonlyMap<Topic, TopicProgress>`, so the export has a caller (d911f85).
- F2: fixed
  D2 lists `demoBooks`, `useStoredProgress`, `useProgram`, `isDone`, `chooseFocus` and `src/ui/demo/check.ts` with its two callers. D3 says what Topics shows during the check. Impact names `check.ts` and `DemoBooks.vue`.
- F3: fixed
  D4 and `DayRecord` say that one record holds one property of `days` of the export format, its key and its value.
- F4: fixed
  `choose` passes the error to `noteStorageFailure` before showing the alert.
- F5: fixed
  The sentence shows only in `idle` and `failed`. During `loading` and `reading` Topics shows only its h1, and the topics only once the demo is `added`. These are all five phases of `DemoState`.
- F6: fixed
  Writes are chained on one promise, and each builds its set from `ticks.value` after the previous write. `write` catches its own error, so the chain never rejects and a failure does not block later ticks. A new e2e test clicks two boxes in one task and finds both kept after a reload.
- F7: fixed
  `ExerciseBlock.vue` remembers that its own button was pressed. Once the view turns done it moves the focus to the exercise's number, but only if the focus fell to `body`, so a learner who moved on is not pulled back. The e2e test now presses Enter on the button and checks the focus on «Упражнение 1.1». A refused or busy press leaves the flag set, which is harmless because of the `body` guard.
- F8: fixed
  The filler assertion is gone.

### Notes

Since round 1 only d911f85 changed: 13 files and the owner's tick of task 5.2. The rest of the whole diff stands as reviewed in round 1. No new export without a caller, no new dependency, no regression found.

PACK-003 (both books read within 2 s) on Firefox: the implementer saw it fail locally with two browsers running in parallel. I judge it local load, not a flaky test of this change, for three reasons. The change does not touch the reading path (`src/ui/demo/add-demo.ts`, `src/storage/pdf`, `src/domain/books` are unchanged). The pipeline runs one project per job (`checks.yml`: chromium and firefox in 2 shards each, webkit in 3), so two browsers never share a runner. Here, with Chromium and Firefox in parallel and repeated three times, the times read 1495 – 1943 ms and every run passed. The margin under local load is thin, though. Recording it in `docs/roadmap.md` under "Later, unscheduled" is worth it, for example a budget measured per project or the test run alone, but that is not part of this change.

Gates run: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm spec` (9 passed), `pnpm trace` (56 requirements), and `vitest` with coverage (819 passed, 99.61 % of statements). Also a production build into a scratch directory (not `dist/`) under `vite preview`, against which `topics`, `today`, `study`, `study-a11y`, `a11y` and `demo` ran on Chromium and Firefox three times over: 312 passed.

## Requirement coverage

| Requirement | Implemented in | Covered by |
| --- | --- | --- |
| PROG-005 | `src/domain/programs/progress.ts` (`todayTopic` with `focus`), `src/ui/demo/program.ts` | `src/domain/programs/progress.test.ts`, `e2e/topics.spec.ts`, `e2e/today.spec.ts` |
| PROG-006 | `src/ui/components/ProgramToday.vue` («другая тема»), `src/ui/components/DailyChecklist.vue`, `src/ui/views/StartView.vue` | `e2e/today.spec.ts`, `e2e/demo.spec.ts` (focus and Tab order), `e2e/a11y.spec.ts` |
| PROG-008 | `src/ui/views/TopicsView.vue`, `src/ui/router.ts`, `src/ui/App.vue`, `src/ui/demo/program.ts` (`chooseFocus`), `src/ui/demo/check.ts` | `e2e/topics.spec.ts`, `e2e/study-a11y.spec.ts` (`topics-demo`), `e2e/a11y.spec.ts` (clean Topics) |
| PROG-009 | `src/storage/db/schema.ts` (version 2), `src/storage/db/store.ts` (`getDayTicks`, `putDayTicks`), `src/ui/demo/day.ts`, `src/ui/components/DailyChecklist.vue` | `src/storage/db/store.test.ts`, `src/storage/db/two-connections.test.ts`, `src/storage/db/migrations.test.ts`, `src/ui/demo/day.test.ts`, `e2e/today.spec.ts` |
| PROG-018 | `src/ui/components/ProgramToday.vue` (`.step`, `.rung` under `hover: hover`) | `e2e/today.spec.ts` |
| PLAY-009 | `src/domain/study/attempts.ts` (`markDoneAttempt`); derivation unchanged | `src/domain/study/attempts.test.ts`, `src/domain/study/view.test.ts`, `e2e/study.spec.ts` |
| PLAY-021 | `src/ui/study/ExerciseBlock.vue`, `src/ui/study/unit.ts` (`markDone`), `src/domain/study/attempts.ts` | `src/domain/study/attempts.test.ts`, `e2e/study.spec.ts` |

## Outside the listed requirements

The done states, the focus and the progress helpers moved from `StartView.vue` and `ProgramToday.vue` into `src/ui/demo/program.ts`. The demo's stored-state check moved from `DemoBooks.vue` into `src/ui/demo/check.ts`. The test-only schema version became 3, and `e2e/demo.ts` (`writeNewerData`) and `e2e/storage.spec.ts` follow it. `completeInStore`, `goalCard` and `todayCard` moved from `e2e/today.spec.ts` to `e2e/study.ts`, and `refusePuts` and `failNextPut` are new. Both screenshot suites move the pointer off the page before a capture. `docs/product/04`, `05` and `08` and `docs/roadmap.md` record the owner's requests and decisions.
