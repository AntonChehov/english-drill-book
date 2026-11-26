# Tasks

## 1. Setup

- [x] 1.1 Add `happy-dom` as a development dependency (mounting uses Vue's own `createApp`: `@vue/test-utils` fails `pnpm audit` through `js-beautify`); a mounting helper with router, demo pack and `fake-indexeddb`; a `PdfPages` stub; verify one mounted test passes

## 2. Study screen

- [x] 2.1 `StudyView`: opening a unit, steps, pages panel, theory, unit menu, failure boundary
- [x] 2.2 `ExerciseBlock` and `ItemRow`: typing, checking, verdicts, kept draft, focus after a check
- [x] 2.3 `unit.ts`, `preferences.ts`, `pages.ts`, `messages.ts` through their exports

## 3. Rest of `src/ui` and `src/storage`

- [x] 3.1 `src/ui/demo/`, `src/ui/storage.ts`, `DemoBooks`, `DailyChecklist`, `TopicsView`, `AboutView`, `src/storage/static-files.ts`

## 4. Thresholds

- [x] 4.1 `vitest.config.ts`: include `src/ui` and `src/storage`, thresholds 70/70 beside 95/95, exclusions with reasons; verify `pnpm test:coverage` passes and fails when a threshold is raised above the measured value

## 5. Gates

- [x] 5.1 `pnpm check`, `pnpm test`, `pnpm test:coverage`, `pnpm e2e` on Chromium pass; no test file over 5 s
