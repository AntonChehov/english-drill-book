# Tasks

## 1. State layer

- [x] 1.1 `unit-read.ts`: reading the store, types re-exported from `unit.ts`
- [x] 1.2 `drafts.ts`: `useDrafts`
- [x] 1.3 `attempts.ts`: `useAttempts`
- [x] 1.4 `reread.ts`: `useReread` with `editing`; no `document` in `unit.ts` and the composables; verify with `git grep`
- [x] 1.5 `focus.ts`: `fieldBeingEdited`, `focusIfLost`, used by `StudyView` and `ExerciseBlock`

## 2. Components

- [x] 2.1 `UnitUnavailable.vue`
- [x] 2.2 `UnitHeader.vue` with its bar
- [x] 2.3 `SourcePages.vue`
- [x] 2.4 `pages-drawing.ts`: `usePageDrawing`
- [x] 2.5 `ZoomBar.vue`

Each task: `pnpm check` and `pnpm test` pass after its commit; no test changed.

## 3. Gates

- [x] 3.1 `pnpm test:coverage`, `pnpm e2e` on Chromium pass; screenshot check in CI shows no visual change
