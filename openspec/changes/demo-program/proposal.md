# Proposal

## Why

Slice 1.6 joins the two demo books: a topic is a unit of the course with its exercises in the drill book, and the app says what to do today and where the learner stands. The slice is too large for one pull request, so it is cut in two changes. Each must be shippable on its own and leave no code without a caller: a computation of progress with no screen to show it would be dead code until the second change.

This first change, `demo-program`, therefore brings the program together with the screen that uses it: the demo program over the two demo books, its check in CI, and Today showing the goal, the current level and today's topic with its steps. The second change brings what lets the learner steer and work through a topic: Topics with the focus, the two-step Study, the source switch of the pages panel and the daily checklist.

Split rule: the program and its computation ship only with a screen that reads them; Today is the smallest such screen, so it comes first and Topics, Study and the checklist follow.

## What Changes

- **The demo program.** A built-in program file `src/domain/programs/demo.json` in the format of `contracts/program.schema.json` (unchanged): scale `A1`, `A2`, goal A1 → A2, rules at their defaults (0.9, 0.5, 2), four topics in course order, topic `n` led by unit `n` of the course with exercises `n.1` – `n.3` of the drill book as its supplements. Topic titles are the program's own Russian words. No `dailyBlocks` yet: nothing would show them.
- **Its check in CI.** A unit test reads every built-in program, validates it against the schema and checks the rules of PROG-010 against the profiles of the demo books. The check lives in the test; no runtime code validates a built-in program.
- **Progress over a program.** Pure functions in `src/domain/programs/`: a topic's progress and whether it is passed, the share of each level, the current level with its "+", today's topic. Their only caller is Today.
- **Today shows the program.** When the demo books are stored, the demo program is active, and Today shows, above the book cards it already has: a goal card (goal, current level, one row per level with its share and the threshold mark) and a today card (today's topic with its level, step 1 the course unit with its exercises, step 2 the drill exercises with done / needed, the topic's state), each exercise a link into Study at that exercise. When every topic is passed, the card says the program is complete.

Requirements delivered (`docs/product/05-program-and-levels.md`):

- **PROG-001** topic passed; **PROG-002** share of a level; **PROG-003** current level; **PROG-004** the "+".
- **PROG-005** today's topic, *without the focus topic*: there is no way to set a focus until Topics exists, so the clause "the focus topic if one is set" is not specified or built here. The requirement is added without it and modified in the second change.
- **PROG-006** what Today shows, *without the daily checklist*, for the same reason; modified in the second change with PROG-009.
- **PROG-010** built-in programs validated in CI.
- **PROG-013** one active program: the demo program, whenever its books are stored.
- **PROG-015** the demo program over the two demo books.

Left for the second change of slice 1.6: **PROG-005** (the focus), **PROG-006** (the checklist), **PROG-007** (today's topic opens Study at its first unfinished step, and the way back), **PROG-008** (Topics), **PROG-009** (the daily checklist), **PLAY-017** (Study in two steps), **PLAY-018** (the source switch of the pages panel). Also the fate of PROG-014 and the book cards once Topics lists the units.

Not in slice 1.6: PROG-011, PROG-012, PROG-016, PROG-017 (milestone 3: the learner's own books and the real program).

## Review

Review goes in rounds as `docs/process.md` step 4 states. Every finding carries `Severity: critical` or `Severity: minor`. From round 3 on only critical findings block: an open minor finding is closed as declined, as technical debt recorded in `docs/roadmap.md`, and new minor observations go under `### Notes`.

## Capabilities

### New Capabilities

- `program`: the built-in program, its validation, and the rules of progress over it (PROG-001 – PROG-004, PROG-010, PROG-015).

### Modified Capabilities

- `today`: PROG-005, PROG-006 and PROG-013 added; PROG-014 kept as it is.

## Impact

- New: `src/domain/programs/` (`types.ts`, `progress.ts`, `demo.json`, unit tests, the CI check of built-in programs), `src/ui/components/ProgramToday.vue`, end-to-end tests of Today with the program.
- Changed: `src/ui/views/StartView.vue` (shows the program above the demo section; reads the done states once for both), `src/ui/components/BookCards.vue` (no longer reads the done states itself), `src/ui/components/DemoBooks.vue` (tells the start screen the demo was added, which moves the focus to Today), `e2e/demo.ts`, `e2e/demo.spec.ts` and `e2e/storage.spec.ts` (the book cards found by their titles, since Today's topic is a heading of the same level), the reference screenshots of Today. `docs/roadmap.md` gains two items of technical debt found by validation; its slice 1.6 entry is updated when the change is archived.
- Not changed: `contracts/`, the demo books, packs and PDFs, the store and its schema, Study.
- The initial bundle grows by the program (under 1 kB gzip) and the new component; no new dependency. `ajv` stays a development dependency, used only by tests.
- Depends on: nothing in flight.
