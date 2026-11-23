# Design

## Context

Built already (`demo-program`): `src/domain/programs/` with `demo.json`, the type `Program`, and `topicProgress` (with `next`), `levelShares`, `currentLevel`, `todayTopic` (first topic not passed); `ProgramToday.vue` with the goal card and the today card, fed by `doneExercises`, which `StartView.vue` reads (`readDone`) on start, when the books change and on `onStoredDataChange`. The store (`src/storage/db`) has the settings `theme`, `activeProgram` and `focusTopic`, typed and tested but never used by a screen; schema version 1 has no store for checklist ticks. The attempt `mark-done` exists in the log, the export format and the derivation, where it makes any exercise done; Study writes it only for an open exercise («Отметить как сделанное», PLAY-013). `contracts/export.schema.json` already has `days` (day → ticked block ids) and `settings.focusTopic`; `contracts/program.schema.json` has `dailyBlocks`.

The layout follows `docs/product/08-interface-reference.md` (sections Сегодня and Темы), cut to the requirements; where they differ the requirement wins and the reference is corrected (D9).

## Goals / Non-Goals

**Goals:**

- The learner chooses the topic to work on in Topics, and Today follows it.
- Today has the day's checklist, kept for the day.
- Today's steps and rungs answer the pointer; any exercise can be made done in one action.

**Non-Goals:**

- Study opened for a topic, its two steps, the next-step offer, the pages panel's source switch, PROG-007: the change `two-step-study`.
- A filter in Topics (the reference has one; PROG-008 does not ask for it), a way to clear the focus other than choosing another topic, export and import of ticks and focus (DATA-007, DATA-008), undoing «Выполнить упражнение».
- The book cards on Today (PROG-014) stay as they are; `two-step-study` decides their fate (owner's decision).

## Decisions

### D1. Topic IDs, daily blocks and today's topic, in the domain

- `Topic` gains `id` (the focus names a topic by it); `Program` gains `dailyBlocks: readonly { id: string; title: string }[]`.
- `demo.json` gains three `dailyBlocks`, the program's own words: `listen` «Послушать английскую речь 10 минут», `read` «Прочитать страницу текста на английском», `words` «Повторить новые слова». The CI check of built-in programs (PROG-010) is unchanged: the schema already checks the blocks.
- `todayTopic(topics, passed, focus?: string)` → the index of the topic whose `id` is `focus` when there is one and it is not passed; otherwise, as now, the first topic not passed, `-1` when every topic is passed. A `focus` that names no topic of the program is ignored (a setting left by another program, or edited by hand).

No other domain code: the day of the checklist is a key, not computed in the domain (D4).

### D2. The program's state, shared by Today and Topics

`src/ui/demo/program.ts` takes from `ProgramToday.vue` and `StartView.vue` what both screens need, and nothing more:

- `demoBooks`: the stored demo books while the demo is added, else `undefined`.
- `useStoredProgress()`: reads the done states (`readDone`, moved here from `StartView.vue`) and the setting `focusTopic` while the demo is added, on mount, when the books change and on `onStoredDataChange`.
- `useProgram(books)`: `progress` (topic → `topicProgress`), `passed`, `today` (index from `todayTopic` with the focus), and the helpers `bookOf`, `leadUnit`, `unitOf` already in `ProgramToday.vue`, with `program`.
- `isDone(pack, exercise)` from the done states read; `chooseFocus(topic)`: `putSetting("focusTopic", topic.id)`; resolves when written, rejects with the store's error.

`StartView.vue` and `TopicsView.vue` call `useStoredProgress`; `ProgramToday.vue` and `TopicsView.vue` call `useProgram`. A focus or a done exercise from another tab shows after the window regains focus (DATA-012).

`src/ui/demo/check.ts` holds `checkDemo(readAgain?)`, moved out of `DemoBooks.vue`, which calls it with its own re-reading of stale packs. Topics calls it without, on mount and on `onStoredDataChange`, so that, opened first (after a reload or from a bookmark), it finds out itself whether the demo is stored; stale packs leave the phase `loading` for the start screen to read again.

### D3. Topics (PROG-008)

Route `/topics`, name `topics`, title «Темы», a lazy chunk like Study. The top bar gains «Темы» between «Сегодня» and «О приложении». Today's card gains, beside its heading, a link «другая тема» to `#/topics`.

`TopicsView.vue`:

- Heading 1 «Темы». While the demo check is under way (`loading`, `reading`) nothing more. Without the demo added (`idle`, `failed`): one sentence that topics appear once the demo is added, with a link to Today, where it is offered.
- With the demo: one `<section>` per level of the scale, in order, heading 2 the level name («A1»), then a list of its topics in program order. A row of a topic not passed is a `<button>` holding: «раздел N» (the lead unit), the title, the state as a word («не начата», «в процессе», «✓ пройдена»), and the counts «курс X из Y · практика X из N» (drills capped at the needed number, as on Today). Today's topic carries the text «тема дня».
- Choosing a row calls `chooseFocus`; when it resolves, the router goes to `/`. When it fails, a message under the row (`role="alert"`) says the choice could not be kept and the row can be chosen again (DATA-004); nothing moves.
- A passed topic is a plain list item, not a button: it shows «✓ пройдена» and its counts and cannot be chosen (owner's decision on PROG-008). A focus passed after it was chosen is not today's topic (PROG-005): Today shows the first topic not passed.

### D4. The daily checklist (PROG-009, PROG-006)

- **Storage.** Schema version 2 adds the store `days`, key `day`, records `{ day: "2026-11-23", blocks: ["listen"] }`: one record holds one property of `days` of the export format, its key (`day`) and its value (`blocks`). The migration only creates the store; version 1 data is untouched. The store gains `getDayTicks(day): Promise<string[]>` (empty for a day not stored) and `putDayTicks(day, blocks)` (replaces the day's record; writes are announced to other tabs as every write is). Earlier days stay stored, for the export of DATA-007.
- **The day.** `src/ui/demo/day.ts`: `localDay(now: Date)` → `YYYY-MM-DD` from the device's local year, month and day. It is in `ui`, since the domain has no clock (C-08). The day is taken again whenever the checklist reads (mount, `onStoredDataChange`), so a tab left open overnight shows an empty list once it is looked at again.
- **Today.** `DailyChecklist.vue`, a `<section>` «Другие дела дня» below the today card, shown while the program is active, also when the program is complete. One checkbox per block, its label the block's title. Ticks are written one after another, each built from the set the previous one wrote, so a quick second tick loses none; each writes the whole set for the day; the box shows the new state only once the write has succeeded; a failure says so beside the list and the tick can be repeated (DATA-004). Single column: the second column of the reference waits for a wider Today.

### D5. Hover on Today (PROG-018)

Each step of the today card becomes a `<div class="step">` holding its heading and chips. Under `@media (hover: hover)`, `.step:hover` and `.rung:hover` get the background `--color-surface-muted` and a rounded corner; nothing else changes. No `title` attribute, no tooltip element, no text that appears on hover. The keyboard is not affected: the links inside keep their focus ring; the rungs are not focusable, as now.

### D6. «Выполнить упражнение» (PLAY-021, PLAY-009)

- `ExerciseBlock.vue`: one secondary button «Выполнить упражнение» in the actions of every exercise whose view is not done, items and open alike; for an open exercise it replaces «Отметить как сделанное» (one action, one label). Shown to every learner, no setting.
- `unit.ts`: `markDone(entry)` as now, for every exercise: flushes the draft, then `keep(entry, "mark-done", …)`. `markDoneAttempt(context, answers)` now takes the typed answers of the exercise (all items, or `text`) instead of one text, so the log keeps what was typed when it was pressed. Results are empty: no item gets a verdict, and the items keep the verdicts they had.
- The derivation is unchanged (`deriveExercise` already makes any exercise done on a `mark-done`, `doneAt` the first one), so `DERIVATION` stays 1 and no cached state is rebuilt. Done stays done (PLAY-010); there is no undo, as for an open exercise now (owner's decision).
- After a successful mark, which removes the focused button, the focus goes to the exercise's number (its heading button), so a keyboard or screen-reader user stays in the exercise.
- The announcement and the failure message are those of the open exercise (`markedDoneMessage`, «Отметку «сделано»» in `KeptAction`).

### D7. The store-seeding helper and the newer version

- `completeInStore` moves from `e2e/today.spec.ts` to `e2e/study.ts`, exported, so the Topics tests seed done exercises without walking Study (C-19); the UI path of completing an exercise is covered by the Study tests.
- `writeNewerData` defaults to version 3, one above the app's. The test-only migration in `src/storage/db/db.fixture.ts` becomes version 3 and stops creating `days`, which version 2 now has.

### D8. Tests

- Unit: `todayTopic` with a focus not passed, a passed focus, an unknown focus (`@req PROG-005`); migration from the fixture of version 1 to 2 keeps every record and adds an empty `days` (`@req DATA-005`, by the existing loop over fixtures and a new fixture `version-2.json`); `getDayTicks` / `putDayTicks` round trip and another tab told (`@req PROG-009`); `localDay` at the edges of a day in a fixed time zone (`@req PROG-009`); `markDoneAttempt` of an items exercise valid against the export format (`@req PLAY-021`).
- End-to-end, Chromium only (not the demo flow of C-13), with the demo added once per worker (`e2e/study.ts`) and done exercises seeded by `completeInStore`:
  - `@req PROG-008`: Topics shows A1 and A2 with two topics each, topic 1 «в процессе» with «курс 1 из 3» after one seeded exercise and «тема дня»; choosing topic 3 by keyboard returns to Today with topic 3, kept after a reload; axe on Topics in both themes; the clean-profile Topics in the list of plain views (screenshots, axe).
  - `@req PROG-005`: with topic 3 the focus and seeded as passed, Today shows topic 1.
  - `@req PROG-009 @req PROG-006`: three unticked blocks; a tick survives a reload; with the page clock set to the next day the list is empty.
  - `@req PROG-018`: hovering rung A1 and step 2 changes their background and no element with a `title` or role `tooltip` appears in Today.
  - `@req PLAY-021 @req PLAY-009`: in unit 1 of the course, «Выполнить упражнение» on exercise 1.1 with no answer makes it «сделано», the header one of three; the open exercise's button has the same label.
  - Existing tests that name «Отметить как сделанное» take the new label.
- Budget (C-19): about eight new end-to-end tests, none walking Study to complete an exercise; each opens one or two screens.

### D9. Documentation

- `docs/product/05-program-and-levels.md`: PROG-018, asked for by the owner; PROG-008's last sentence becomes "The learner can set any topic not passed as the focus; a passed topic is shown as passed and cannot be chosen."
- `docs/product/04-exercise-player.md`: PLAY-021, asked for by the owner; PLAY-009's last sentence becomes "Any exercise is done when the learner marks it done (`PLAY-013`, `PLAY-021`)."
- `docs/product/08-interface-reference.md`: Topics grouped by level, without the filter; «Выполнить упражнение» among an exercise's buttons.

## Constitution

| Constraint | How it is met and measured |
| --- | --- |
| C-01 | daily blocks and texts are the program's own words; no book text |
| C-02, C-03 | no request; the new store holds block ids and dates only; the existing checks |
| C-05 | the fixture of version 1 migrates to 2 with every record kept; a fixture of version 2 (migration tests) |
| C-06 | Topics is a lazy chunk; the checklist and shared module add little; `pnpm size` |
| C-07 | Topics rows are buttons with their state in words; checkboxes with labels; hover adds no information; axe on Topics and Today in both themes; keyboard choice of a topic (D8) |
| C-08 | `todayTopic` stays pure; the day is computed in `ui` |
| C-10, C-11 | unit tests of D8 with `@req`; coverage of `src/domain` ≥ 95 % |
| C-14 | `openspec validate --strict` |
| C-18 | the review record; changed screenshots of Today and Study and the new Topics beside `main`'s |
| C-19 | the end-to-end tests seed the store and open one or two screens each (D7, D8) |

## Risks

- **No undo of «Выполнить упражнение».** A press by mistake makes the exercise done for good, as «Отметить как сделанное» does now; the exercise can still be answered and checked.
- **Two tabs ticking the same day** at once: the later write wins for that day. Only the tick of the other tab can be lost, never attempts.
- **Schema version 2** is the first real migration in a release; its fixture test is the guard (C-05).
