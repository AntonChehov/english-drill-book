# Proposal

## Why

A visitor can add the demo books and then do nothing with them: the units are listed and lead nowhere. Everything built so far — the checker, the reader, the storage — exists for one screen, and that screen is missing. This change builds it, so that a unit can be opened, its exercises answered and checked, and the work found again the next day.

The owner's private predecessor of this app has this screen and it works well in daily use. The public app follows its layout (`docs/product/08-interface-reference.md`, added by this change) instead of inventing another.

## What Changes

- **Study**, a screen for one unit: the unit's pages from the book's PDF on the left, its exercises on the right; stacked on a narrow screen. Previous and next unit and a list of units are in its header.
- **Exercises**: a field or options for each item; **Проверить** grades the items that are not blank and shows a verdict per item in words and signs; "almost" asks to check the spelling and does not show the key.
- **The learner has the last word**: the key of a single item can be shown on request; a verdict can be changed by hand in either direction and the change undone.
- **Work is kept**: answers are saved as drafts while typing; every check, reveal and change by hand is recorded as an attempt; an exercise once done stays done.
- **The unit list leads somewhere**: each unit on the start screen is a link to Study and shows how many of its exercises are done.
- **A top bar** on every screen, as in the predecessor.
- **Roadmap**: the order of the remaining slices changes as the owner asked on 2026-11-13: after this slice, the joining of the two books; then the tools of the pages panel and the rest of the shell.

Requirements delivered: **PLAY-001** – **PLAY-011**, **PLAY-013**, **PLAY-015** (`04-exercise-player.md`); **DOC-001**, **DOC-008** (`07-source-documents.md`); **PROG-014** (`05-program-and-levels.md`); **PROD-006**, **PROD-007** (`01-product.md`).

PLAY-013 is brought forward from milestone 2 because the demo course has an open exercise, and a unit could otherwise never be finished. The connected-text exercise of the demo is presented the same way — a field, the model on request, "mark as done" — until its word-by-word comparison (PLAY-012) is built.

Left for later changes: zoom, extending the range of pages, dragging the border, selecting text, loading only the pages shown (DOC-002 – DOC-006, DOC-009); the two books joined into topics; first run, themes; Mistakes.

## Capabilities

### New Capabilities

- `study`: the screen where exercises are answered and checked.
- `pages`: showing the pages of a book beside its exercises.
- `today`: what the learner is offered to do on opening the app.

### Modified Capabilities

- `app-shell`: layout by width (PROD-006) and the keyboard (PROD-007) are added.

## Impact

- New: `src/ui/study/`, `src/domain/study/` (the state of an exercise on screen, building attempts), `src/storage/pdf/render.ts`, end-to-end tests.
- Changed: the start screen (links and done counts), the frame of the app, `docs/roadmap.md`, `docs/product/README.md`; new `docs/product/08-interface-reference.md`.
- Runtime dependencies: none new (pdf.js is already there).
- Depends on the change `storage` being merged.
- Validation: the holdout scenarios of milestone 1 about answering, checking, verdicts, keeping work and the keyboard can now be driven in a browser and are run for this change.
