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
