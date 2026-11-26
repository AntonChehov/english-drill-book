# Design

## Context

`useUnit` holds the phase of the unit, loading, navigation, drafts with their timers and failed writes, checking and announcing attempts, and the reread when another tab changes storage. To keep the field being typed in, the reread reads `document.activeElement`. `StudyView.vue` holds the header, the bar teleported into the app's bar, three screens of failure, the source switch and both page panels, layout and focus on open. `PagesPanel.vue` holds the canvases, observers, zoom and the panel's interactions. The DOM tests mount `StudyView` and query by role, label, text, field ids and `data-page`; none imports `unit.ts`.

## Decisions

### D1 Composables by owner, one wiring

`unit-read.ts` is plain functions from the store to data (no Vue). `useDrafts(pack)`, `useAttempts(...)` and `useReread(...)` each own their refs and timers; `useUnit` creates them, passes what one needs from another, and returns the same object as now. Types (`ExerciseEntry`, `UnitLink`, `TopicOfUnit`) are re-exported from `unit.ts`, so importers do not change. Fewer, larger modules over many small ones: each is a reason to change.

### D2 The view answers "what is being edited"

`useUnit(packId, unitId, { editing })` with `editing: () => { exercise, item } | undefined`. `StudyView` passes `() => fieldBeingEdited(root)` from `focus.ts`. The reread compares exercise ids, not element ids. Tracking focus and blur events in the state instead would change behaviour: a test sends `blur` and then focuses a field that already has focus, so no event fires and the field would be overwritten. Asking at the moment of the reread avoids that.

### D3 Focus queries in one view module

`focus.ts`: `fieldBeingEdited(root)` and `focusIfLost(element)`; the check in `ExerciseBlock.vue` moves there. Components keep calling `focus()` on their own elements.

### D4 Components keep the DOM order and classes

`UnitHeader` stays the first `h1` and exposes `focusTitle()`; `UnitUnavailable` keeps the first link of not-found; `SourcePages` exposes `scrollToPage` and `focusHide`. The sticky and grid classes stay on direct children of the body, no wrapper is added, `--pages-head-top` still reaches `PagesPanel`. `usePageDrawing` creates its observers in `onMounted`, as now.

### D5 Commits small and green

Ten commits, each about 300 changed lines or fewer, each passing `pnpm check` and `pnpm test`: the state layer first (D1, D2, D3), then the components.

## Risks

- Watch timing after the split: the reread takes its snapshot before the `await` and compares the same arrays; `ExerciseBlock.keeping.test.ts` covers it.
- Styles moved into scoped components; the screenshot check in CI shows a difference if one is lost.
