# Proposal

## Why

M1 is done and delivered most of the old M2. M2 is now version 1.0: finish the base, then study by one's own books.

## What Changes

Small, documentation only. After approval it edits `docs/roadmap.md` (M2 is "First product version 1.0") and `docs/product/`, with slices in order:

0. **Base**:
   - README: status, demo link, screenshot, roles (owner: specification, architecture, process, acceptance; agents: implementation, review, validation), and a note: no textbook material in the app; the user connects own copies, answers extracted on their device and sent nowhere.
   - `docs/how-it-works.md`: roles diagram, numbers, links.
   - Code comments cite no design documents, IDs only in tests (rule in `CLAUDE.md`).
   - Split `useUnit`, `StudyView.vue`, `PagesPanel.vue`; no `document.activeElement` in the state layer.
   - Coverage at least 70 % for `src/ui` and `src/storage`; component tests of `StudyView`, `ExerciseBlock`.
   - Timing tests (CHK-014) get headroom.
1. **Own book**: the learner picks an edition and gives their own PDF. The app builds the pack, keys included, on the device: a PDF text parser for this Murphy–Golitsynsky set, with a per-edition profile of numbers, regular expressions and flags only (page ranges, columns, ID patterns, file `sha256`), never book text. The repository holds code, profiles and the mapping as numbers only (C-01). Each extracted answer has a confidence flag; the import ends with a review queue, «N ответов проверить», answer beside its PDF page: accept or edit. Correcting a key locally («Мой ответ верный», «Исправить ключ») sits behind a small icon on the item's result, reachable by keyboard and screen reader, never a main control; kept and exported with progress. Library state in Pinia. Editions: Essential Grammar in Use 4th, English Grammar in Use 4th (red and blue), Golitsynsky 9th (book, keys); other sets later.
2. **Text exercises**: PLAY-012, CHK-010, CHK-011.
3. **Export, import, storage**: DATA-007 – DATA-009, DATA-011, DATA-013, DATA-014.

Later, after 1.0: DATA-006, DATA-010, PLAY-014, PROD-010. Unscheduled: opt-in translation help by an external service, after sign-in. No converter in the repository or progress migration. Demo and own books (PROG-013, PROD-002): a clean browser offers «Попробовать демо» and «Добавить свою книгу» equally; after an own book is added the demo is never offered; an earlier demo stays with «Убрать демо» (erases it with its progress); a demo alone keeps «Добавить свою книгу».

## Requirements

New: PACK-008 (review queue), PLAY-022 («Мой ответ верный»). Rewritten: PACK-005. Kept: PACK-006. Changed: PROG-013, PROD-002, DATA-009, DATA-014.

## Capabilities

None.
