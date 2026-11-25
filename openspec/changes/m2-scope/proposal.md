# Proposal

## Why

M1 is done (the demo and the 0.x releases). The old M2, "two books joined", was mostly delivered inside M1 (slice 1.6: PROG-001 – PROG-010, PROG-013, PROG-015, PROG-018). The owner now defines M2 as the first product version, 1.0: finish the base, then study by one's own books.

## What Changes

Size: small (documentation only; no code, no design, no delta spec).

The change edits, after approval and in this change's own commits:

- **`docs/roadmap.md`**: M2 renamed "First product version 1.0", with three slices in order:
  1. **Own book**: a pack per `contracts/pack.schema.json` and its own PDF, checked against its `sha256`, added in the app, with its program. New IDs (owner names them): add an own book from a pack file and its PDF; refuse a PDF whose sha256 differs; remove the demo.
  2. **Text exercises**: PLAY-012, CHK-010, CHK-011.
  3. **Export, import, storage**: DATA-007, DATA-008, DATA-009, DATA-013, DATA-011, DATA-014.
- **Later, after 1.0** (tagged `[Later]` in `docs/product/`): DATA-006 Mistakes (and its mention in DATA-009), DATA-010 erase all data, PLAY-014 clear answers, PROD-010 PWA install. Already M3 and stay there: audio, recognition (BOOK-003 – BOOK-005), the catalogue, profiles.
- **No converter** in the repository (the owner's tool, kept outside git) and **no progress migration** from other apps; both stated in `docs/product/`.
- **Demo and own books** (PROG-013 and PROD-002 change): a clean browser with no own book offers «Попробовать демо» and «Добавить свою книгу» equally. Once an own book is added, the demo is never offered. A demo added earlier stays beside own books with «Убрать демо», which erases the demo and its progress. A demo added and no own book: «Добавить свою книгу» stays visible. The scenario "No books, no program" of `today` changes to match, by a delta in the change that implements the slice.

## Requirements

Changed: PROG-013, PROD-002, DATA-009 (Mistakes out), DATA-014 (Library is not in 1.0: the notice is shown where export is). Moved to later: DATA-006, DATA-010, PLAY-014, PROD-010. M2 scope: PLAY-012, CHK-010, CHK-011, DATA-007 – DATA-009, DATA-011, DATA-013, DATA-014, plus the new own-book IDs.

Left for later: M3 and the requirement texts, written by each slice's own change.

## Capabilities

None.
