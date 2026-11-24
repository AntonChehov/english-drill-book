# Review: shell-offline-themes

## Round 1

Reviewed: 34055d600201
Verdict: changes requested

### F1 The service worker sits outside the C-03 network rule

Severity: critical

Where: `.oxlintrc.json`, `src/sw/worker.ts`. What: the override that forbids `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` and `sendBeacon` lists only `src/storage/**` and `src/ui/**`, so the new directory `src/sw/` has no network restriction at all. `worker.ts` calls `fetch`, and any later file under `src/sw/` could too without the lint gate noticing. Why: C-03 is measured by a lint rule that allows network use only in the module that loads the app's own static files. The worker's own use is legitimate (a same-origin GET the page already made), but it has to be a named exception, not a directory the rule never covers. Fix: add `src/sw/**` to the restricted override (with `self`/`globalThis` property forms) and exempt `src/sw/worker.ts` by `excludeFiles` beside `src/storage/static-files.ts`, with the messages naming both modules. This deviation was not in the approved design.

### F2 An error in the boundary's own slot expressions escapes to the route

Severity: minor

Where: `src/ui/components/FailureBoundary.ts`, `src/ui/study/StudyView.vue`. What: `onErrorCaptured` sees errors of descendant components only. The slot content is StudyView's template, rendered inside the boundary's render, so an exception in a slot expression (for example `study.viewOf(entry)` or `topic.course.unit.id`) is handled from the boundary's parent upward, and the route boundary replaces the whole of Study, pages included. The scenario of PROD-011 holds for a failing ExerciseBlock or PagesPanel, which the e2e test exercises. Why: the file comment says the parent's own template is the parent's to catch, which reads as if the slot were outside it; state plainly that the column boundary catches failures of the components inside the column, not of the slot's own bindings, or move the column content into child components.

### F3 A failed exercises column leaves dangling references

Severity: minor

Where: `src/ui/study/StudyView.vue`. What: with the exercises column failed, `section aria-labelledby="exercises-heading"` points to an id that is not in the page, so the section loses its name, and «К упражнениям» in the pages column does nothing (the `exercisesHeading` ref is null). Why: the failure message is announced, but the region is unnamed and a visible control silently fails. Keep the heading outside the boundary, or label the section by text that stays.

### F4 The drawing failure is injected through an implementation detail

Severity: minor

Where: `e2e/failures.spec.ts`, the PROD-011 column test. What: it breaks `String.prototype.replaceAll` when called with `"."`, relying on ExerciseBlock being the only code calling it that way while the flag is on. Why: a rename in ExerciseBlock, or another caller in the pages panel, makes the test fail or test the wrong part, with no hint why. Name the dependency in a comment pointing to the exact call in ExerciseBlock, or inject the failure through something the component owns.

### Notes

The implementer's stated deviations from the design, judged:

- Cache name hashed from file contents instead of the list: accepted, strictly better (`index.html` and `favicon.svg` keep their names across builds).
- `skipWaiting` in `install` instead of `activate`: accepted; it has effect only there.
- No global `errorHandler` or `unhandledrejection` listener: accepted; Vue in production and the browser log to the console already, which is all D3 asked of them.
- FailureBoundary as a `.ts` render-function component with global CSS: accepted, tested without a browser; the `.part-failed` styles are small.
- Boundaries inside Study's columns: this is design D3, not a deviation.
- `src/sw` outside the C-03 lint scope: not accepted, F1.
- PROD-009 test in `src/ui/dialogs.test.ts`: accepted; it reads the configuration as D4 says.
- Playwright `serviceWorkers: "block"` except the offline spec: accepted; the reason (route interception) is real and PROD-003 keeps its own spec with the worker on.

Also observed, not findings: online, a stored pack that fails validation is read again from the PDF (DATA-001), so the «Книгу не удалось прочитать» card shows only when that read fails; the e2e test aborts the PDF to reach it, which is a fair reading of the scenario. The own-books line also shows during the brief `loading` phase. The automated review pass over the diff returned nothing usable (it read the wrong files); this round rests on a manual read of the whole diff. CI on 4c7a832 was green where finished when read.

## Round 2

Reviewed: 142d16cf4b70
Verdict: approved

- F1: fixed
- F2: fixed
- F3: fixed
- F4: fixed

### Notes

This round is written by a fresh reviewing agent; the round-1 reviewer could not be resumed. It rests on the round-1 record, the whole diff against `main` and a close read of the four commits since round 1 (0792400, a7af9cf, 4c7a832, 7f3c556).

On F1: `src/sw/**` is now in the override with the `self` and `globalThis` forms, `excludeFiles` names only `src/storage/static-files.ts` and `src/sw/worker.ts`, the messages name both, and `scripts/lint-config.test.mjs` pins the list. Lint on `src/sw` and the touched tests pass locally.

On F2: the comment of FailureBoundary now says plainly that slot bindings are raised in the parent and caught above it.

On F3: the section is named by `aria-label` «Упражнения», takes `tabindex="-1"`, and «К упражнениям» falls back to it when the heading is gone; the e2e test checks both the name and the focus on a narrow screen. The global `:focus-visible` rule marks it when reached by keyboard.

On F4: the comment names the exact call in `ExerciseBlock.vue` and the condition under which the test would break.

The WebKit failure of study-layout on 4c7a832: waiting for the h1 is the right fix, not a hidden product defect. `src/ui/main.ts` awaits the theme before mounting, but `storedTheme` races the read against a 300 ms limit, so the app always mounts promptly; before that the page is empty and there is nothing a learner could aim a key at. A Tab pressed then moves the browser's focus as on any page still loading, and the next Tab after the screen appears reaches the app. No learner input is lost, since none can be entered before the first screen.

CI on the head was still running when read (build green); the approval assumes the gates finish green.
