# Proposal

## Why

The first change of slice 1.6, `demo-program`, put the demo program on Today: the goal, the level and today's topic. The learner cannot yet steer it: there is no list of topics, no way to choose what to work on, and no checklist for the day. Two requests of the owner, approved for this slice, belong to the same screens: Today's items should answer the pointer, and any exercise should be markable as done without typing its answers.

What its proposal left for the second change (Topics with the focus, the checklist, the two-step Study, the source switch of the pages panel, opening a topic at its first unfinished step) is too much for one review: it touches Today, a new screen, the store's schema and Study's layout. It is cut in two changes, each visible on its own and leaving no code without a caller:

1. **`topics-and-checklist`** (this change, first): what the learner sees and steers outside Study — Topics with the focus, the daily checklist on Today, the hover highlight on Today, and «Выполнить упражнение» in Study.
2. **`two-step-study`** (next): Study opened for a topic — the two steps with the offer of the next step, the pages panel switching to the course, and Today's and Topics' entry into that Study at the topic's first unfinished step. It builds on the focus and on Topics of this change and changes neither.

Split rule: this change ends on screens that already exist (Today, Study by unit) and a new one (Topics); the next one changes only how Study is opened and laid out. This one goes first because Topics is where a topic is chosen, and the next change opens Study from there.

## What Changes

- **Topics** (`#/topics`, a section «Темы» in the top bar, and a link «другая тема» on Today's card): every topic of the program in order, grouped by level, with its state and done counts; today's topic marked. Choosing a topic not passed stores it as the focus and returns to Today.
- **The focus on Today.** Today's topic is the focus topic when one is set and not passed, else the first topic not passed. The focus is the setting `focusTopic` that the store and the export format already have.
- **The daily checklist.** The demo program gains `dailyBlocks` (three activities outside the app, in the program's own words); Today shows them as a card «Другие дела дня» with a tick each. Ticks are stored per calendar day of the device's time zone and start empty the next day, in a new store `days` (schema version 2).
- **Hover on Today** (owner's request): on a device with a pointer, each step of today's topic and each rung of the level ladder is highlighted under the pointer; no tooltip.
- **«Выполнить упражнение»** (owner's request): every exercise not yet done, of either book, offers this action to every learner. It makes the exercise done without its answers being typed or checked, so it counts on Today, in Topics and in the unit's count. It records the existing attempt `mark-done`, which an open exercise already uses; for an open exercise it replaces «Отметить как сделанное».

Requirements delivered:

- **PROG-005** today's topic, now with the focus (modified; added without it in `demo-program`).
- **PROG-006** what Today shows, now with the daily checklist (modified).
- **PROG-008** Topics and the focus (modified at the owner's request: a passed topic cannot be chosen as the focus; `docs/product/05-program-and-levels.md` follows).
- **PROG-009** the daily checklist per calendar day.
- **PROG-018** (new, owner's request) the hover highlight of Today's items, no tooltip. Added to `docs/product/05-program-and-levels.md`.
- **PLAY-021** (new, owner's request) «Выполнить упражнение» for every exercise. Added to `docs/product/04-exercise-player.md`.
- **PLAY-009** done (modified): any exercise, not only an open one, is done when the learner marks it done, as PLAY-021 needs. The derivation already treats a `mark-done` of any exercise so; nothing stored changes.

Left for `two-step-study`: **PLAY-017** (Study in two steps, the offer of the next step), **PLAY-018** (the source switch of the pages panel), **PROG-007** (opening today's topic leads to Study at its first unfinished step, and the way back). Also the fate of PROG-014 and the book cards on Today (kept unchanged here).

Not in slice 1.6: PROG-011, PROG-012, PROG-016, PROG-017 (milestone 3); export and import of the ticks and the focus (DATA-007, DATA-008, milestone 2).

## Review

Review goes in rounds as `docs/process.md` step 4 states. Every finding carries `Severity: critical` or `Severity: minor`. From round 3 on only critical findings block: an open minor finding is closed as declined, as technical debt recorded in `docs/roadmap.md`, and new minor observations go under `### Notes`.

## Capabilities

### New Capabilities

- `topics`: the list of the program's topics and the choice of the focus (PROG-008).

### Modified Capabilities

- `today`: PROG-005 and PROG-006 modified; PROG-009 and PROG-018 added.
- `study`: PLAY-009 modified; PLAY-021 added.

## Impact

- New: `src/ui/views/TopicsView.vue`, `src/ui/components/DailyChecklist.vue`, `src/ui/demo/program.ts` (the program's progress and the focus, shared by Today and Topics), `src/ui/demo/check.ts` (whether the demo is stored, moved out of `DemoBooks.vue` so that Topics can tell on its own), `src/ui/demo/day.ts` (the device's calendar day), schema version 2 with its fixture `src/storage/db/fixtures/version-2.json`, end-to-end tests of Topics, the checklist, the hover and «Выполнить упражнение».
- Changed: `src/ui/components/DemoBooks.vue` (calls `checkDemo`), `src/domain/programs/` (`Topic.id`, `Program.dailyBlocks`, `todayTopic` with the focus, `demo.json` with `dailyBlocks`), `src/domain/study/attempts.ts` (`markDoneAttempt` takes the typed answers of any exercise), `src/storage/db/` (the store `days` and its two functions; the test-only next version becomes version 3), `src/ui/App.vue` (the section «Темы»), `src/ui/router.ts`, `src/ui/components/ProgramToday.vue`, `src/ui/views/StartView.vue`, `src/ui/study/ExerciseBlock.vue`, `src/ui/study/unit.ts`, `e2e/` helpers (the store-seeding helper shared, the newer-data helper one version higher), the reference screenshots of Today, Study and the new Topics.
- Documentation: PROG-018 and the new sentence of PROG-008 in `docs/product/05-program-and-levels.md`; PLAY-021 and the new wording of PLAY-009 in `docs/product/04-exercise-player.md`; Topics grouped by level and «Выполнить упражнение» in `docs/product/08-interface-reference.md`; `docs/roadmap.md`.
- Not changed: `contracts/` (the export format already has `days` and `settings.focusTopic`; the program format already has `dailyBlocks`), the demo books and packs, the derivation (`DERIVATION` stays 1), the pages panel.
- Learner data: schema version 2 only adds an empty store; every pack, attempt, draft and setting of version 1 is kept as it is (C-05, by the fixture of version 1).
- No new dependency. The initial bundle grows by the checklist and the shared program module; Topics is a chunk of its own.
- Depends on: nothing in flight.
