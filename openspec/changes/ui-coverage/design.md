# Design

## Context

Unit tests run in `node`; the component tests render with `renderToString`. The study screen (`StudyView.vue` 666 lines, `unit.ts` 565, `PagesPanel.vue` 511, `ExerciseBlock.vue` 343) is checked only by Playwright. Coverage includes `src/domain/**` with thresholds 95 %.

## Decisions

### D1 A DOM per test file, not for all

Files that mount components declare `// @vitest-environment happy-dom`; the default stays `node`, so domain tests keep their speed and their freedom from a DOM. `happy-dom` over `jsdom`: faster to start, enough for events, focus and `IntersectionObserver` stubs; a missing API is stubbed in the test that needs it.

### D2 Tests through the learner's view

Queries by role, label and text (`@vue/test-utils` `find` on roles via attributes, or a small helper), events as the learner makes them (`setValue`, `trigger("keydown")`). No test reads a component's internal state or calls an unexported function. This is what lets the same tests pass before and after `study-split`.

### D3 Real packs, real storage

The tests load the demo packs from `public/demo/` and store through `fake-indexeddb`, so they cover the path the app takes. pdf.js is replaced by a stub of `PdfPages` with fixed page sizes; text extraction keeps its existing tests.

### D4 Thresholds per directory

`coverage.include` grows to `src/ui/**` and `src/storage/**`; `coverage.thresholds` takes a glob per directory: `src/domain/**` 95/95, `src/ui/**` 70/70, `src/storage/**` 70/70. Exclusions are listed with a comment giving the reason. 70 % is the floor that the tests of this change reach with margin; it is raised later rather than met with filler tests.

## Risks

- Focus in `happy-dom` differs from browsers in details; focus tests assert only the element that has focus, and the end-to-end tests stay the check in a browser.
- Mounting `StudyView` with storage may be slow; a test file over 5 s is split.
