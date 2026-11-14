# Roadmap

## Now

**M1 — Public demo.** Slice 1.1 is done: the app shell, every gate of the constitution and the pipeline are on `main`, and the demo is deployed at https://antonchehov.github.io/english-drill-book/. The change `pipeline-follow-ups` closes what its first run showed (the archive pull request, the first version `0.1.0`, the evidence check refusing on a real pull request). Slice 1.2 is done: the answer checker is in `src/domain/checking`, not yet called by any screen. Slice 1.3 is done: two demo books are served with the app, read into packs in the browser and listed on the start screen. Slice 1.4 is done: packs, the attempt log and its derived state are kept in the browser, and the demo stays added. Next: the study screen.

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
| 1.8 Shell: first run, themes, failures | PROD-002 – PROD-005, PROD-009, PROD-011 |

The order was changed on 2026-11-13 at the owner's request: what a visitor can use comes first, and the interface follows the owner's private predecessor (`docs/product/08-interface-reference.md`).

### M2 — Program: two books joined

The demo program ties the demo course to the demo drill book. Today, Topics, levels, the two-step lesson, Mistakes, data export and import, text and open exercises, PWA install.
PROG-001 – PROG-010, PROG-013, PROG-015, PLAY-012 – PLAY-014, PLAY-017, PLAY-018, CHK-010, CHK-011, DATA-006 – DATA-011, DATA-013, DATA-014, PROD-010.

### M3 — The learner's own books

The catalogue, adding a book by pointing to its file, recognition, profiles for Murphy and Golitsynsky, audio, key pages, the real program.
BOOK-001 – BOOK-016, PROG-011, PROG-012, PROG-016, PROG-017, PLAY-016, PLAY-019, DOC-007.

### M4 — Review

Spaced repetition over the mistakes list. To be specified.

### M5 — Backend

Accounts and sync of the attempt log between devices. To be specified, with its own contract.

### Later, unscheduled

Placement test (find the learner's level and the topics to skip). Own exercise bank (original drills per topic, built in). See `docs/product/05-program-and-levels.md`, section Later.

Technical debt, decided by the owner on 2026-11-14: the speed of Study on WebKit. In the pipeline's WebKit (two pixels per CSS pixel) the first page of a unit is drawn in 1.5–2 s, against about 0.1 s on Chromium and Firefox, and the end-to-end check of that time is skipped there. WebKit is not a target of the app for now; the test of PROD-002 and C-13 may need the same answer.

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
