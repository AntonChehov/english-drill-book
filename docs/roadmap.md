# Roadmap

## Now

**M1 — Public demo.** Slice 1.1 is done: the app shell, every gate of the constitution and the pipeline are on `main`, and the demo is deployed at https://antonchehov.github.io/english-drill-book/. The change `pipeline-follow-ups` closes what its first run showed (the archive pull request, the first version `0.1.0`, the evidence check refusing on a real pull request). Slice 1.2 is done: the answer checker is in `src/domain/checking`, not yet called by any screen. Slice 1.3 is done: two demo books are served with the app, read into packs in the browser and listed on the start screen. Slice 1.4 is done: packs, the attempt log and its derived state are kept in the browser, and the demo stays added. Slice 1.5 is done: a unit of either demo book opens in Study, its pages beside its exercises, which are answered, checked and kept. The change `near-grammar` narrowed «Почти» to a slip inside a longer word. Version 0.1.0 is released (2026-11-16): the demo with Study on both demo books. Slice 1.6 is done: three changes, `demo-program` (the demo program on Today), `topics-and-checklist` (Topics with the focus, the daily checklist, a hover highlight on Today items, «Выполнить упражнение» for all users) and `two-step-study` (PLAY-017, PLAY-018, PROG-007: the two-step Study, pages switching to the course, a topic opened at its first unfinished step). Slice 1.8 is done: `phone-bar` (PROD-012), a compact bar on a narrow screen that hides on a scroll down, and a green check mark on a finished unit or book; `shell-offline-themes` (PROD-002 – PROD-005, PROD-009, PROD-011): the app opens offline after its first load, a theme chosen on «О приложении», a failure shown in its own part, no browser dialogs. Slice 1.7 is done: `pages-panel-tools` (DOC-002 – DOC-006, DOC-009): zoom kept per book, the neighbouring pages, selectable text, and a movable split with either panel collapsible. Milestone 1 is complete. Milestone 2 is the first product version 1.0: the base, the own book, text exercises, export and import (change `m2-scope`).

## Milestones

Each milestone is delivered as slices. One slice is one OpenSpec change and one pull request (`docs/process.md`).

### M1 — Public demo: one book in one window

A visitor opens the link, tries the demo book, sees its pages beside its exercises, answers, gets checked, comes back later and their work is there.

| Slice | Requirements |
| --- | --- |
| 1.1 Scaffold, CI, deploy | tooling for every gate of the constitution, including the pull request evidence check (C-18); PROD-001, PROD-008 |
| 1.2 Answer checker | CHK-001 – CHK-009, CHK-012 – CHK-014 |
| 1.3 Demo books and their reader | two original PDFs (a short course, a short drill book); the profile and reader for their layout; PACK-001 – PACK-003 |
| 1.4 Storage and attempt log | DATA-001 – DATA-005, DATA-012 |
| 1.5 Study: exercises beside pages | PLAY-001 – PLAY-011, PLAY-013, PLAY-015, DOC-001, DOC-008, PROG-014, PROD-006, PROD-007 |
| 1.6 Two books joined, first cut | brought forward from milestone 2: a topic is a unit of the course with its exercises in the drill book; Today with the two steps, Topics; PLAY-017, PLAY-018 and the PROG requirements its proposal names |
| 1.7 Pages panel tools | DOC-002 – DOC-006, DOC-009 |
| 1.8 Shell: first run, themes, failures, the bar on a phone | PROD-002 – PROD-005, PROD-009, PROD-011, PROD-012 |

The order was changed on 2026-11-13 at the owner's request: what a visitor can use comes first, and the interface follows the owner's private predecessor (`docs/product/08-interface-reference.md`).

### M2 — First product version 1.0

Finish the base, then study by one's own books. The old M2 (programs, levels, Today, Topics, the two-step lesson: PROG-001 – PROG-010, PROG-015, PROG-018, PLAY-017, PLAY-018, PLAY-021) was delivered in M1 by slice 1.6.

| Slice | Contents |
| --- | --- |
| 0 Base | README current (status, demo link, a screenshot, the roles); `docs/how-it-works.md`, one page; code comments cite no design documents and requirement IDs appear only in tests; smaller units (`useUnit`, `StudyView.vue`, `PagesPanel.vue`) and no `document.activeElement` in the state layer; coverage thresholds of at least 70 % on `src/ui` and `src/storage`, component tests for `StudyView` and `ExerciseBlock`; headroom in timing tests (CHK-014) |
| 1 Own book | the learner picks an edition and gives their own PDF; the app builds the pack, keys included, on the device with a parser for this Murphy and Golitsynsky set and a per-edition profile of numbers, regular expressions and flags only, never book text (C-01); a review queue of extracted answers, «N ответов проверить», each beside its PDF page; a key corrected locally behind an icon on the item's result, kept and exported with progress; the library state in a Pinia store; the demo and own books side by side; editions: *Essential Grammar in Use*, 4th; *English Grammar in Use*, 4th; Golitsynsky, 9th (the book and its keys); other sets later; PACK-005 – PACK-008, PLAY-022, PROD-002, PROG-013 |
| 2 Text exercises | PLAY-012, CHK-010, CHK-011 |
| 3 Export, import, storage | DATA-007 – DATA-009, DATA-013, DATA-011, DATA-014 |

No converter from a book to a pack in this repository (the owner's tool, outside git) and no migration of progress from other apps.

Demo and own books: a clean browser offers «Попробовать демо» and «Добавить свою книгу» equally. Once an own book is added, the demo is never offered. A demo added earlier stays beside own books with «Убрать демо», which erases the demo and its progress.

After 1.0, not scheduled: DATA-006 Mistakes, DATA-010 erase all data, PLAY-014 clear answers, PROD-010 PWA install. Audio, recognition and the catalogue stay in M3. Unscheduled: opt-in translation help by an external service, after sign-in.

### M3 — Catalogue, recognition, audio

The catalogue, adding a book by pointing to its file, recognition by content, more profiles, audio, key pages, the real program.
BOOK-001 – BOOK-016, PROG-011, PROG-012, PROG-016, PROG-017, PLAY-016, PLAY-019, DOC-007.

### M4 — Review

Spaced repetition over the mistakes list. To be specified.

### M5 — Backend

Accounts and sync of the attempt log between devices. To be specified, with its own contract.

### Later, unscheduled

After version 1.0: Mistakes (DATA-006), erase all data (DATA-010), clear answers (PLAY-014), PWA install (PROD-010). Opt-in translation help by an external service, after sign-in. Placement test (find the learner's level and the topics to skip). Own exercise bank (original drills per topic, built in). See `docs/product/05-program-and-levels.md`, section Later.

Technical debt is in [`docs/tech-debt.md`](tech-debt.md).

## Done

- 2026-11-10 — first draft of the specification, contracts, constitution, factory graph, role prompts, holdout scenarios.
- 2026-11-11 — model changed after review: the app knows supported books through built-in profiles and reads the learner's own PDFs; programs are built in and join books; Russian-only interface; demo is two original PDF books.
- 2026-11-11 — process moved to OpenSpec: the whole-app description became `docs/product/`, the living specification starts empty and grows change by change.
- 2026-11-11 — slice 1.1 (`bootstrap-app-and-ci`, pull request #1): the app shell with PROD-001 and PROD-008, the gates of the constitution, the pull request evidence check, deploy of the demo, release-please; branch protection on `main`. Archived; `openspec/specs/app-shell` holds its requirements.
- 2026-11-12 — `review-rounds` (pull request #6): the review record is kept in rounds bound to a hash of the reviewed content. Archived.
- 2026-11-12 — slice 1.2 (`answer-checker`, pull request #8): key patterns, normalisation and the verdicts `ok`, `near` and `bad`, CHK-001 – CHK-009 and CHK-012 – CHK-014, with limits on the size of a pattern, a key and an answer. Archived; `openspec/specs/answer-checking` holds its requirements.
- 2026-11-12 — `review-follow-ups` (pull request #10): the same reviewing agent writes every round of a change; an HTML comment anywhere in the review record is refused. Archived.
- 2026-11-13 — slice 1.3 (`demo-books`, pull request #12): two original demo books as PDFs, the reader of their layout, validation of packs, "Try the demo" on the start screen; PACK-001 – PACK-003. Archived; `openspec/specs/content-packs` holds its requirements.
- 2026-11-13 — slice 1.4 (`storage`, pull request #14): IndexedDB behind a typed store, the append-only attempt log with derived state, a versioned schema, two tabs; DATA-001 – DATA-005, DATA-012. Archived; `openspec/specs/progress-data` holds its requirements.
- 2026-11-14 — slice 1.5 (`study-screen`, pull request #16): Study with the pages of a unit beside its exercises, verdicts, one answer on request, a verdict changed by hand, drafts and attempts kept, two tabs, the keyboard and layout by width, the address of a demo unit in a clean browser, WebKit end-to-end tests in two halves; PLAY-001 – PLAY-011, PLAY-013, PLAY-015, DOC-001, DOC-008, PROG-014, PROD-006, PROD-007. Archived; `openspec/specs/study`, `pages` and `today` hold its requirements.
- 2026-11-16 — `near-grammar` (pull request #18): «Почти» only for a slip inside one word of at least 4 letters of the key that does not differ by an ending; the WebKit end-to-end tests wait longer and run in three parts; CHK-006 modified. Archived. Release 0.1.0 (pull request #4) after it: the first public version of the demo.
- 2026-11-17 — `review-severity` (pull request #20): every review finding carries a severity, critical or minor; from round 3 on only critical findings must be fixed, minor ones become technical debt; `design.md` is optional for a change of only texts or only documentation. Archived.
- 2026-11-17 — `russian-demo` (pull request #22): the demo packs carry Russian unit titles, the explanation of each unit's grammar and what to do in each exercise, shown in Study beside the exercises; PACK-004, PLAY-020. Archived.
- 2026-11-23 — slice 1.6 (`two-step-study`, pull request #32): Study with the two steps of a topic, pages of the course switched in step 2, «Открыть раздел» on Today opens a topic at its first unfinished step; PLAY-017, PLAY-018, PROG-007. Archived; `openspec/specs/pages` and `study` hold its requirements, `today` is updated.
- 2026-11-23 — `workflow-retro`: the archive is the last commit of the change's own pull request (no archive pull request); a pull request without code, and the release pull request, run only the static and evidence checks; validation runs alongside review round 1 and reruns only the scenarios the fixes may touch; `review.md` keeps a smaller frozen form with a severity per finding; a small change uses the schema `lite` (a proposal and tasks, no design and no delta spec) and a requirement's wording lives only in `docs/product/`; word limits for artifacts; a moratorium on process changes for three product changes; technical debt moved to `docs/tech-debt.md`.
- 2026-11-24 — slice 1.8 (`phone-bar`, pull request #36): a compact bar on a narrow screen, hidden on a scroll down and back on a scroll up, and the green check mark of a finished unit or book; PROD-012. Archived.
- 2026-11-25 — slice 1.7 (`pages-panel-tools`, pull request #38): zoom kept per book, the previous and next page, selectable text, a movable split and collapsible panels; DOC-002 – DOC-006, DOC-009. Milestone 1 complete. Archived.
- 2026-11-25 — `pages-deploy` (pull request #39): the Pages deploy builds and deploys in two jobs and retries once, after 4 of 5 failed deploys on `main`. Archived.
- 2026-11-25 — `optimization-report` (pull request #40): a public report of the results of the first optimization round, `docs/process/optimization-round-1.md`. Archived.
- 2026-11-25 — `workflow-retro-2` (pull request #41): the pipeline budget of C-19 is 4 minutes; `pnpm review:check` checks a review record before a push; validation covers the scenarios a change touches, the full set before a release; the archive commit follows green CI; only the mechanic watches CI; word limits are a ceiling. Archived.
- 2026-11-26 — M2 is planned as version 1.0 in four slices (change `m2-scope`).
- 2026-11-26 — `ci-stability` (pull request #43): WebKit end-to-end tests get a 60 s timeout and one retry in CI, the review hash is taken from the change's diff, and a pull request stays a draft until its review approves. Archived.
