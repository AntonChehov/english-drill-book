# Proposal

## Why

M1 is done and delivered most of the old M2. M2 is now version 1.0: the base, then own books.

## What Changes

Small, documentation only. It edits `docs/roadmap.md` and `docs/product/`, M2 as four slices:

0. **Base**: README (status, demo, screenshot, roles, a note: no textbook material, the user connects own copies, answers extracted on their device, sent nowhere); `docs/how-it-works.md`; a `CLAUDE.md` rule (no design references in comments, IDs only in tests). Code work of the base is its own change.
1. **Own book**: the learner picks an edition and gives their own PDF: the app builds the pack, keys included, on the device by a parser for this set with a per-edition profile of numbers, regular expressions and flags, never book text. Each answer has a confidence flag; the import ends with a review queue, «N ответов проверить», each answer beside its PDF page: accept or edit, kept as a correction. Correcting a key («Мой ответ верный», «Исправить ключ») sits behind a small icon on the item's result, by keyboard and screen reader, never a main control; corrections are exported with progress. Library in Pinia. Editions: *Essential Grammar in Use*, 4th; *English Grammar in Use*, 4th; Golitsynsky, 9th (book, keys).
2. **Text exercises**: PLAY-012, CHK-010, CHK-011.
3. **Export, import, storage**: DATA-007 – DATA-009, DATA-011, DATA-013, DATA-014.

Later: DATA-006, DATA-010, PLAY-014, PROD-010; unscheduled: opt-in translation help. No converter, no progress migration. Demo and own books: a clean browser offers «Попробовать демо» and «Добавить свою книгу» equally; once an own book is added the demo is never offered; an earlier demo stays with «Убрать демо» (erases it, progress too); a demo alone keeps «Добавить свою книгу».

## Requirements

New: PACK-005 – PACK-008, PLAY-022. Changed: PROD-002, PROG-013, DATA-007, DATA-009, DATA-014. Retagged: delivered ones to M1, four to later.
