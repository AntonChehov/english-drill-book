# Proposal

## Why

M1 is done. The old M2 was mostly delivered in M1 (slice 1.6: PROG-001 – PROG-010, PROG-013, PROG-015, PROG-018). M2 is now the first product version, 1.0: finish the base, then study by one's own books.

## What Changes

Size: small (documentation only; no code, no design, no delta spec). After approval this change edits `docs/roadmap.md` (M2 renamed "First product version 1.0", the note on the old M2) and `docs/product/`, with slices in order:

0. **Base**:
   - README current: status, demo link, a screenshot, the roles (owner: specification, architecture, process, acceptance; agents: code), and a note: a personal learning project; the app contains no textbook material; the user connects their own copies, answers are extracted on their device and sent nowhere.
   - `docs/how-it-works.md`, one page: roles diagram, numbers, links.
   - Code comments cite no design documents; requirement IDs only in tests; a rule in `CLAUDE.md`.
   - Smaller units: `useUnit`, `StudyView.vue`, `PagesPanel.vue`; no `document.activeElement` in the state layer.
   - Coverage thresholds for `src/ui` and `src/storage` (at least 70 %); component tests for `StudyView` and `ExerciseBlock`.
   - Timing tests get headroom (CHK-014).
1. **Own book**: the learner picks a supported edition and gives their own PDF (Golitsynsky: book and keys). The app builds the pack on the device: a generic PDF text parser and a per-edition profile of numbers, regular expressions and flags only (page ranges, columns, ID patterns, the `sha256` of the edition's file), never book text. Keys never leave the device. The repository holds code, profiles and the Murphy–Golitsynsky mapping as numbers only (C-01). Each extracted answer has a confidence flag; the import ends with a review queue, «N ответов проверить»: the answer beside its PDF page, accept or edit. «Мой ответ верный» overrides a key locally, stored and exported with progress. Library state in a Pinia store. Editions: Essential Grammar in Use 4th, Golitsynsky 9th.
2. **Text exercises**: PLAY-012, CHK-010, CHK-011.
3. **Export, import, storage**: DATA-007 – DATA-009, DATA-011, DATA-013, DATA-014.

Also: later after 1.0 are DATA-006 Mistakes, DATA-010, PLAY-014, PROD-010; unscheduled, translation help through an external service, opt-in, after sign-in only. No converter in the repository, no progress migration. Demo and own books (PROG-013, PROD-002): a clean browser offers «Попробовать демо» and «Добавить свою книгу» equally; after an own book is added the demo is never offered; an earlier demo stays with «Убрать демо» (erases it and its progress); demo without own book keeps «Добавить свою книгу».

## Requirements

New: PACK-008 (review queue), PLAY-022 («Мой ответ верный»). Rewritten: PACK-005. Kept: PACK-006. Changed: PROG-013, PROD-002, DATA-009 (Mistakes dropped), DATA-014 (notice beside export).

## Capabilities

None.
