# Roadmap

## Now

**M1 — Public demo.** Slice 1.1 is done: the app shell, every gate of the constitution and the pipeline are on `main`, and the demo is deployed at https://antonchehov.github.io/english-drill-book/. The change `pipeline-follow-ups` closes what its first run showed (the archive pull request, the first version `0.1.0`, the evidence check refusing on a real pull request). Slice 1.2 is done: the answer checker is in `src/domain/checking`, not yet called by any screen. Slice 1.3 is done: two demo books are served with the app, read into packs in the browser and listed on the start screen. Next: slice 1.4, storage and the attempt log.

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
| 1.5 Study: pages and exercises | PLAY-001 – PLAY-011, PLAY-015, DOC-001 – DOC-006, DOC-008, DOC-009 |
| 1.6 Shell: first run, Today as a unit list, themes | PROD-002 – PROD-007, PROD-009, PROD-011, PROG-014 |

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

## Done

- 2026-11-10 — first draft of the specification, contracts, constitution, factory graph, role prompts, holdout scenarios.
- 2026-11-11 — model changed after review: the app knows supported books through built-in profiles and reads the learner's own PDFs; programs are built in and join books; Russian-only interface; demo is two original PDF books.
- 2026-11-11 — process moved to OpenSpec: the whole-app description became `docs/product/`, the living specification starts empty and grows change by change.
- 2026-11-11 — slice 1.1 (`bootstrap-app-and-ci`, pull request #1): the app shell with PROD-001 and PROD-008, the gates of the constitution, the pull request evidence check, deploy of the demo, release-please; branch protection on `main`. Archived; `openspec/specs/app-shell` holds its requirements.
- 2026-11-12 — `review-rounds` (pull request #6): the review record is kept in rounds bound to a hash of the reviewed content. Archived.
- 2026-11-12 — slice 1.2 (`answer-checker`, pull request #8): key patterns, normalisation and the verdicts `ok`, `near` and `bad`, CHK-001 – CHK-009 and CHK-012 – CHK-014, with limits on the size of a pattern, a key and an answer. Archived; `openspec/specs/answer-checking` holds its requirements.
- 2026-11-12 — `review-follow-ups` (pull request #10): the same reviewing agent writes every round of a change; an HTML comment anywhere in the review record is refused. Archived.
- 2026-11-13 — slice 1.3 (`demo-books`, pull request #12): two original demo books as PDFs, the reader of their layout, validation of packs, "Try the demo" on the start screen; PACK-001 – PACK-003. Archived; `openspec/specs/content-packs` holds its requirements.
