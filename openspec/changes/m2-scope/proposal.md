# Proposal

## Why

M1 is done and delivered most of the old M2 (slice 1.6). M2 is now the first product version, 1.0: finish the base, then study by one's own books.

## What Changes

Small, documentation only. After approval it edits `docs/roadmap.md` (M2 renamed "First product version 1.0", the note on the old M2) and `docs/product/`, with slices in order:

0. **Base**:
   - README current: status, demo link, screenshot, the roles (owner: specification, architecture, process, acceptance; agents: code), and a note: a personal learning project; no textbook material in the app; the user connects own copies, answers extracted on their device and sent nowhere.
   - `docs/how-it-works.md`: one page, roles diagram, numbers, links.
   - Code comments cite no design documents; requirement IDs only in tests; a rule in `CLAUDE.md`.
   - Split `useUnit`, `StudyView.vue`, `PagesPanel.vue`; no `document.activeElement` in the state layer.
   - Coverage thresholds for `src/ui` and `src/storage` (at least 70 %); component tests for `StudyView` and `ExerciseBlock`.
   - Timing tests (CHK-014) get headroom.
1. **Own book**: the learner picks a supported edition and gives their own PDF (Golitsynsky: book and keys). The app builds the pack on the device: a generic PDF text parser and a per-edition profile of numbers, regular expressions and flags only (page ranges, columns, ID patterns, the `sha256` of the edition's file), never book text. The repository holds code, profiles and the Murphy–Golitsynsky mapping as numbers only (C-01). Each extracted answer has a confidence flag; the import ends with a review queue, «N ответов проверить»: answer beside its PDF page, accept or edit. «Мой ответ верный» overrides a key locally, stored and exported with progress. Library state: a Pinia store. Editions: Essential Grammar in Use 4th, Golitsynsky 9th.
2. **Text exercises**: PLAY-012, CHK-010, CHK-011.
3. **Export, import, storage**: DATA-007 – DATA-009, DATA-011, DATA-013, DATA-014.

Later, after 1.0: DATA-006, DATA-010, PLAY-014, PROD-010. Unscheduled: translation help through an external service, opt-in, after sign-in. No converter in the repository, no progress migration. Demo and own books (PROG-013, PROD-002): a clean browser offers «Попробовать демо» and «Добавить свою книгу» equally; after an own book is added the demo is never offered; an earlier demo stays with «Убрать демо» (erases it and its progress); a demo alone keeps «Добавить свою книгу».

## Requirements

New: PACK-008 (review queue), PLAY-022 («Мой ответ верный»). Rewritten: PACK-005. Kept: PACK-006. Changed: PROG-013, PROD-002, DATA-009 (Mistakes dropped), DATA-014 (notice beside export).

## Capabilities

None.
