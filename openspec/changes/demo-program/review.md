# Review

## Round 1

Reviewed: c5350b3937e7
Verdict: changes requested

### F1 `Program` types fields the app never reads

Severity: minor

`src/domain/programs/types.ts` declares `Program.title` and `Topic.id`, and design D1 says the type holds "the fields the app reads (`title`, ...)". Nothing in `src` reads either: `ProgramToday.vue` shows the topic's title, the goal, the scale, the rules and the topics, but not the program's title, and it keys topics by the object, not by `id`. The CI check of PROG-010 uses its own `ProgramFile` type, so it does not need them. Drop both fields from the type and say so in D1, or show the program's title on Today if the owner wants it (the interface reference and D6 do not ask for it).

### F2 The end-to-end test of a complete program writes the store by hand with copied constants

Severity: minor

`e2e/today.spec.ts`, "every topic passed", opens the database by the literal name `"english-drill-book"` while `e2e/demo.ts` exports `databaseName` for this, and writes `packVersion: "1.1.0"`, a copy of the demo packs' version that the next bump of the demo books (as `russian-demo` did) leaves stale. It also writes a `mark-done` attempt for every exercise, closed ones included, while Study offers «Отметить как сделанное» only for open exercises (PLAY-013), so the comment "as Study writes it" is not so: the test rests on `derive` accepting a record the app never writes. Writing the store directly is acceptable here (doing 24 exercises through Study is slow, and `e2e/study-texts.spec.ts` already writes the store), and it fails loudly rather than flakily if the format changes. Use `databaseName`, take the version from the demo packs (or the stored pack) instead of a literal, and either write `check` attempts that are complete, as Study writes for a closed exercise, or correct the comment to say the marks are a shortcut Study does not take.

### F3 The proposal's Impact names files the change does not touch

Severity: minor

Impact says `src/ui/components/DemoBooks.vue` changes ("shows the program above the book cards; reads the done states once for both") and `docs/roadmap.md` changes. The diff changes neither: the program and the reading of done states are in `src/ui/views/StartView.vue` (as design D4 and D6 say), and the roadmap is untouched. Correct Impact to `StartView.vue`, and either update the roadmap's entry for slice 1.6 or drop it from Impact.

### Notes

Reviewed the whole diff of `main...HEAD` (18 files) against PROG-001 – PROG-006, PROG-010, PROG-013, PROG-015, design D1 – D7 and the constitution.

Checked and found right:

- Simplicity and callers: `topicProgress`, `levelShares`, `currentLevel`, `todayTopic` and `demoProgram` are each called by `ProgramToday.vue`; the barrel `index.ts` exports only what it uses; the PROG-010 checks live in the test, as D2 says, so no validator ships without a caller. Every branch of `progress.ts` is reached by a unit test. No setting, no store change, no new dependency.
- D4: reading done states moved from `BookCards.vue` to `StartView.vue` (on mount through the immediate watch, on a change of books and on `onStoredDataChange`); `BookCards` is shown only in the `added` phase, the same condition, so the book cards lose no update. Returning from Study remounts the start screen and reads again.
- Spec ↔ code ↔ tests: every scenario of both delta specs is named by a test with its `@req`; the share text sits beside the `aria-hidden` bar; exercise links carry «сделано» / «не сделано» in their names and a hidden «✓», with the visible label inside the accessible name; headings go h2 «Цель», h2 «Сегодня», h3 topic, h4 steps, then the existing h2 of the books. Axe on Today with the program in both themes and its screenshots come from the existing `start-demo-added` state, which now contains the program.
- Russian texts read well: «ниже A1», «почти A1», «пройдено 1 из 2 тем» (genitive forms right for 1, 2, 5), «сделано 0 из 2 нужных», «Для зачёта темы достаточно 2 из 3.». The owner's own read (task 3.3) is still open.
- `bookHeadings` in `demo.spec.ts` and `storage.spec.ts`: needed, since Today's topic is now an h3 too; matching the book titles by name is fine, and the "no books" assertions keep their meaning because the program is absent whenever the books are.
- C-01: the program holds IDs, levels and the program's own titles. C-06: initial JavaScript 44.06 kB gzip of 120 kB.
- Gates run: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm spec`, `pnpm trace` (52 requirements), `vitest` on `src/domain/programs` (31 passed), `pnpm build`, `pnpm size`; on Chromium and Firefox `e2e/today.spec.ts`, `demo.spec.ts`, `storage.spec.ts` and `a11y.spec.ts`, repeated: 321 of 322 passed. The one failure was "one action lists the course and the drill book" on Firefox in the first loaded run, which passed 6 of 6 alone and in a further 174-test repeated run; it carries a 2 s reading budget and looks like load timing, not this change, but the implementer may want to confirm on CI.

Observation, not a finding: in `ProgramToday.vue` the drill chips use a precomputed `done`, while the course chips call `isDone` three times each in the template; mapping the unit's exercises the same way as `drills` would read more evenly.

## Round 2

Reviewed: ec10ae1531cd
Verdict: approved
- F1: fixed
  `Program.title` and `Topic.id` are gone from `types.ts`; design D1 lists the typed fields and says why those two are not typed. `tsc` passes with the JSON assigned to the narrower type, and the CI check keeps its own `ProgramFile` (f462ac5).
- F2: fixed
  The test opens `databaseName`, reads the stored packs in the same transaction and writes, with each pack's own id and version, a `check` with every item's first accepted answer and `ok` and `complete: true` for an `items` exercise, and a `mark-done` with `{ text: "" }` for the open and the text exercise, which Study shows as open. Both match `checkAttempt` and `markDoneAttempt` of `src/domain/study/attempts.ts`; the comment now says so (f462ac5).
- F3: fixed
  Impact names `StartView.vue`, `BookCards.vue` and the three end-to-end helper files, and says the roadmap is updated at the archive (f462ac5).

### Notes

Since round 1 only `e2e/today.spec.ts`, `src/domain/programs/types.ts`, `proposal.md` and `design.md` changed; the rest of the whole diff stands as reviewed in round 1. No new export, branch or field without a reader. Gates run: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm spec`, `pnpm trace` (52 requirements), `vitest` on `src/domain/programs` (31 passed), `pnpm build`, and `e2e/today.spec.ts` on Chromium and Firefox three times over: 42 passed. The Firefox timing failure of round 1's notes did not recur here.

## Round 3

Reviewed: 82890e822af8
Verdict: approved

### Notes

Since round 2: a merge of `main` without conflicts (the files of this change are untouched by it; `git diff origin/main...HEAD` still holds the same 19 files), task 3.3 ticked by the owner, and ab2e6a8, which moves the tests of a passed topic and of the done signs in `e2e/today.spec.ts` from work in Study to `completeInStore`, the helper the test of a complete program used since round 2 (F2), to keep the run within C-19.

- The helper: it writes, with each stored pack's id and version, a `check` with every item's first accepted answer, `ok` and `complete: true`, or a `mark-done` with `{ text: "" }` for an exercise shown as open, which are what `checkAttempt` and `markDoneAttempt` write; `only` picks `pack/exercise`. The passed-topic test writes unit 1 of the course and drills 1.1 and 1.2, the scenario «Progress shown» of PROG-006; the done-signs test writes 1.1 and 1.2 of the course, the scenario «Not by colour alone». Both scenarios keep their assertions on Today.
- UI coverage that remains: Today → Study is still driven by clicks in «the steps lead to Study» (course unit, course exercise, drill exercise). Study → Today is covered by `e2e/study-frame.spec.ts` (`@req PROG-014`): work done in Study, then «Сегодня», and the counts follow; the program card computes from the same `doneExercises` that `StartView.vue` reads on every mount, so it follows too, though no test now does work in Study and then reads the program card itself. Not a requirement of this change's scenarios, which state what Today shows for given done states.
- Small points, not blocking: the test of a complete program reloads twice (once in the helper, once after it); an entry of `only` that names no stored exercise is skipped without a word, which a typo would turn into a failing assertion rather than a false pass.
- Gates run: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm trace` (52 requirements), `pnpm build`, and `e2e/today.spec.ts` with `e2e/study-frame.spec.ts` on Chromium and Firefox three times over: 90 passed.

## Requirement coverage

| Requirement | Implemented in | Covered by |
| --- | --- | --- |
| PROG-001 | `src/domain/programs/progress.ts` (`topicProgress`) | `src/domain/programs/progress.test.ts`, `e2e/today.spec.ts` |
| PROG-002 | `src/domain/programs/progress.ts` (`levelShares`), `src/ui/components/ProgramToday.vue` | `src/domain/programs/progress.test.ts`, `e2e/today.spec.ts` |
| PROG-003 | `src/domain/programs/progress.ts` (`currentLevel`), `src/ui/components/ProgramToday.vue` | `src/domain/programs/progress.test.ts`, `e2e/today.spec.ts` |
| PROG-004 | `src/domain/programs/progress.ts` (`currentLevel`), `src/ui/components/ProgramToday.vue` | `src/domain/programs/progress.test.ts`, `e2e/today.spec.ts` |
| PROG-005 | `src/domain/programs/progress.ts` (`todayTopic`), `src/ui/components/ProgramToday.vue` | `src/domain/programs/progress.test.ts`, `e2e/today.spec.ts` |
| PROG-006 | `src/ui/components/ProgramToday.vue`, `src/ui/views/StartView.vue` | `e2e/today.spec.ts`, `e2e/a11y.spec.ts` (state `start-demo-added`) |
| PROG-010 | `src/domain/programs/demo.json` (checked in the test, by design D2) | `src/domain/programs/programs.test.ts` |
| PROG-013 | `src/ui/views/StartView.vue`, `src/domain/programs/index.ts` | `e2e/today.spec.ts` |
| PROG-015 | `src/domain/programs/demo.json`, `src/domain/programs/types.ts` | `src/domain/programs/programs.test.ts` |

## Outside the listed requirements

Reading the done states moved from `BookCards.vue` to `StartView.vue` (design D4), with no change to what the book cards show (PROG-014). `e2e/demo.ts` gains `bookHeadings`, used by `e2e/demo.spec.ts` and `e2e/storage.spec.ts`, since Today's topic is now a heading of the same level as the book cards.
