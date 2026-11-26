# Review

## Round 1

Reviewed: e6efffe42f81
Verdict: changes requested

### F1 The design describes interfaces the code does not have

Severity: minor

Where: `openspec/changes/study-split/design.md`, D1 and D2. What: D2 says `StudyView` passes `() => fieldBeingEdited(root)`. The code passes the exercise ids (`fieldBeingEdited(exercises)`) and matches the focused field against them. D1 says `useDrafts(pack)`; the code is `useDrafts(pack, entries)`. The `visibilitychange` and `pagehide` listeners moved from `useUnit` to `StudyView`, and no decision mentions it. `SourcePages` takes `zoomOf` and emits `zoom(pack, zoom)`, which is also not described. Why: all four deviations can be defended. Passing the ids keeps the reread comparing exercise ids, the listeners keep `document` out of the state, and one zoom pair serves the two packs the component draws. But the design is the record a later reader trusts, and right now it describes interfaces that were never built. Fix: change D1 and D2 to match the code, and add one sentence each on where the listeners and the zoom live.

### F2 The element id of an exercise block is built in three places

Severity: minor

Where: `src/ui/study/focus.ts` (`blockIdOf`), `src/ui/study/ExerciseBlock.vue` (`base`), `src/ui/study/StudyView.vue` (`scrollToExercise`). What: `ex-` plus the exercise id with dots replaced by dashes is written out three times. `focus.ts` also assumes the field suffixes that `ExerciseBlock` sets (`-field`, `-text`), and its comment says "as `ExerciseBlock` sets it". Why: the change sets out to put each concern in one place, and the reread depends on this id matching. If one copy changes, the field being typed in is no longer recognised, and a reread may overwrite what the learner is typing, with no test failing at the place of the change. Fix: export one helper (from `focus.ts` or a small ids module) and use it in all three places. This changes the code only, no test.

### Notes

Gates on the reviewed commit: `pnpm check` exits 0 and `pnpm test` passes (79 files, 996 tests). No test file is in the diff. `git grep` finds no `document` or `window` in `unit.ts`, `unit-read.ts`, `drafts.ts`, `attempts.ts` or `reread.ts`. The only matches in `src/ui/study/*.ts` are `focus.ts` (by design) and `window.devicePixelRatio` in the view composable `pages-drawing.ts`.

Moves checked against `origin/main` and found the same:
- The reread takes its snapshot after `writeUnsaved()` and before the `await`, asks `editing()` after the read, and runs the same comparisons.
- `writeDraft`, `flush` and the retry of failed drafts are the same code, and so are the timers, the `writing` set and the `failed` set.
- The draft flush on unmount still runs before the listeners are removed, since the hooks are registered in that order.
- The storage subscription now starts before `load` in `onMounted`, which is harmless because the reread returns until the phase is ready.
- The focus on open still goes to the first `h1` through `focusTitle`.
- The teleport into `#bar-unit` now lives in `UnitHeader`.
- `.with-source` and `--pages-head-top` stay in `StudyView` and reach `PagesPanel` by inheritance.
- Every scoped rule removed from `StudyView` and `PagesPanel` appears once in the new component. `.tool` is in both `PagesPanel` (for its hide button) and `ZoomBar`, which is correct, since each is scoped.
- The `ResizeObserver` and `IntersectionObserver` are created in `onMounted` and disconnected on unmount.
- No code comment cites a design document, a decision or a requirement ID.

Not raised as a finding: `usePageDrawing` returns `measure` and `observe` so that `extend` in `PagesPanel` can call them. One `addPages(pdf, numbers)` in the composable would keep the order of the two calls private. Fixing this is up to the author.

Commits are each under 310 changed lines.
