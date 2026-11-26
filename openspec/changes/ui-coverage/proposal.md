# Proposal

## Why

Slice 0 of M2 (the base). Coverage is measured only for `src/domain`; `src/ui` and `src/storage` have 33 % of lines covered, the study screen (`src/ui/study`) almost none. Component tests render to a string, so no test clicks, types or moves focus. The study screen is split next (`study-split`); tests of how it behaves now are what show that the split changed nothing.

## What Changes

Large: tests and test configuration only, no change in the app.

- Component tests mount in a DOM (`@vue/test-utils`, `happy-dom`, development dependencies only), with IndexedDB from `fake-indexeddb` as in the storage tests.
- Tests of the study screen through what the learner sees and does: `StudyView` with a demo pack (opening a unit, the steps, the pages panel, the theory, the unit menu, a failure shown by the boundary) and `ExerciseBlock` with `ItemRow` (typing, checking, verdicts, a kept draft, focus after a check). They use roles, labels and text, not the inside of a component, so they hold across `study-split`.
- Tests of the parts the screen uses: `unit.ts`, `preferences.ts`, `pages.ts`, `messages.ts`, the demo adding and checking in `src/ui/demo/`, `src/ui/storage.ts`.
- Coverage thresholds in CI: lines and branches ≥ 70 % for `src/ui` and for `src/storage`, beside 95 % for `src/domain`. Excluded, each with its reason in the configuration: the entry `main.ts`, type declarations, styles, and drawing on a canvas in `src/storage/pdf/render.ts`, which `happy-dom` does not have and the end-to-end tests cover.
- `docs/process.md` gains no step; the thresholds are checked by the existing `pnpm test:coverage` in CI.

## Requirements

None changed. The new tests name the IDs whose behaviour they check (`@req`), as the existing tests do.
