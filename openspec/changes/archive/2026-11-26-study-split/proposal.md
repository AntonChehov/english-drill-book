# Proposal

## Why

Slice 0 of M2 (the base). The study screen is the next to grow: own books (slice 1) add a review queue and key corrections to it. Today its state is one composable, `useUnit` in `src/ui/study/unit.ts` (565 lines), which also reads which field has focus from `document.activeElement`; `StudyView.vue` (666) and `PagesPanel.vue` (511) each hold several parts of the screen. A change to drafts, checking or page drawing means reading all of it, and the state cannot be tested without a DOM.

## What Changes

Large, no change in behaviour.

- The state of a unit is split by what it owns: reading the store (`unit-read.ts`), drafts and their writing (`drafts.ts`), checking, revealing and marking done (`attempts.ts`), reading the unit again after another tab changed it (`reread.ts`); `useUnit` wires them and keeps its return.
- No `document` in the state: `useUnit` is given a function that tells which exercise is being edited; the view answers it. Every focus query is in one view module, `focus.ts`.
- `StudyView.vue` gives the header and its bar (`UnitHeader.vue`), the screens of a unit that cannot open (`UnitUnavailable.vue`) and the source pages with their switch (`SourcePages.vue`) to components of their own; `PagesPanel.vue` gives drawing the pages (`pages-drawing.ts`) and the zoom bar (`ZoomBar.vue`).
- The tests of `ui-coverage` and the end-to-end tests are unchanged and pass after every commit; the screenshot check shows no visual change.

## Requirements

None changed.
