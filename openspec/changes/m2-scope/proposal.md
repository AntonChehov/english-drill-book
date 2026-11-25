# Proposal

## Why

M1 is done. The old M2 was mostly delivered in M1 (slice 1.6: PROG-001 – PROG-010, PROG-013, PROG-015, PROG-018). M2 is now the first product version, 1.0: finish the base, then study by one's own books.

## What Changes

Size: small (documentation only; no code, no design, no delta spec). After approval this change edits:

- **`docs/roadmap.md`**: M2 renamed "First product version 1.0", with slices in order, and a note that the old M2 was delivered in M1 by slice 1.6.
  0. **Base**,:
     - README current: status, demo link, a screenshot, the roles (owner: specification, architecture, process, acceptance; agents: code).
     - `docs/how-it-works.md`, one page: roles diagram, numbers, links to `process.md` and the constitution.
     - Code comments cite no design documents; requirement IDs appear only in tests. A rule for the implementer in `CLAUDE.md`.
     - Smaller units: `useUnit` (`src/ui/study/unit.ts`), `StudyView.vue` and `PagesPanel.vue` split; no `document.activeElement` in the state layer.
     - Coverage thresholds extended to `src/ui` and `src/storage` (at least 70 %); component tests for `StudyView` and `ExerciseBlock`.
     - Timing tests get headroom (CHK-014).
  1. **Own book**: a pack per `contracts/pack.schema.json` and its own PDF, checked by `sha256`, added in the app, with its program; the library state in a Pinia store. New IDs, prefix PACK: add an own book from a pack file and its PDF; refuse a PDF of another hash; remove the demo.
  2. **Text exercises**: PLAY-012, CHK-010, CHK-011.
  3. **Export, import, storage**: DATA-007 – DATA-009, DATA-013, DATA-011, DATA-014.
- **Later, after 1.0**: DATA-006 Mistakes, DATA-010 erase all data, PLAY-014, PROD-010 PWA install; audio, recognition and the catalogue stay in M3.
- **No converter** in the repository (the owner's tool, outside git) and **no progress migration** from other apps;.
- **Demo and own books** (changes PROG-013 and PROD-002): a clean browser offers «Попробовать демо» and «Добавить свою книгу» equally. Once an own book is added, the demo is never offered. A demo added earlier stays beside own books with «Убрать демо», which erases the demo and its progress. Demo added, no own book: «Добавить свою книгу» stays visible. The scenario "No books, no program" of `today` changes in slice 1.

## Requirements

Changed: PROG-013, PROD-002, DATA-009 (Mistakes dropped), DATA-014 (the notice sits beside export, not in Library). Moved to later: DATA-006, DATA-010, PLAY-014, PROD-010.

## Capabilities

None.
