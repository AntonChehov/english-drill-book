# Review of phone-bar

## Round 1

Reviewed: 661fcda908c9
Verdict: changes requested

### F1 The change is larger than a small change

Severity: minor

Where: the whole diff, `git diff origin/main...HEAD` without `openspec/`: 542 insertions and 68 deletions, about 610 changed lines (401 + 66 in `src/` and `scripts/` alone).
What: the proposal says "Size: small", and C-14 with `docs/process.md` ("Two sizes of change") puts a small change at about 400 changed lines or fewer; "a change found larger than it was judged moves to the schema `spec-driven` before its review". The change still has the schema `lite`.
Why: the size decides which artifacts the change owes. Either the owner confirms in the PR that the change stays small (one requirement, no schema or storage, most of the excess is tests), or it moves to `spec-driven` with a design and a delta spec. The decision is the owner's; the reviewer only records the mismatch.

### F2 The mark of a finished book is not tested

Severity: minor

Where: `src/ui/components/BookCards.vue` (the `finished` class and the `CheckMark` in the book's `h3`); `e2e/phone-bar.spec.ts` checks only the card of unit 1; `src/domain/study/view.test.ts` checks only `isFinished`.
What: task 3.1 says the mark is used "on the cards of units and books", and PROD-012 asks the same mark for "a book whose units are all done". Nothing renders a finished book and checks its green border, its heading and «выполнено» in the heading.
Why: half of the mark's requirement is only covered by a pure function; a regression in the template (for example the mark on the wrong element, or `finished` computed per unit instead of per book) would pass. A component test of `BookCards` with one book whose counts are all done, and one not, would close it.

### F3 The compact bar can cover the element that has focus

Severity: minor

Where: `src/ui/App.vue`, the `.topbar` below 1024 px (`position: sticky; top: 0`); no `scroll-padding-top` on the page.
What: on a scroll up the bar comes back over the top of the window. When the learner moves backwards with Shift+Tab, the browser scrolls the focused field or button to the top edge, the scroll is upwards, the bar returns and sits over it (the existing `scroll-margin-top: 1rem` of exercises and pages is smaller than the bar's height, about 2.5 rem and up to twice that in Study).
Why: the flow stays possible by keyboard, so this is not critical, but a hidden focus indicator weakens C-07. A `scroll-padding-top` on the root equal to the bar's height below 1024 px would keep focused elements clear of it.

### Notes

- Fresh agent for round 1.
- The implementer's doubts. `position: sticky` in place of `fixed`: the header is a child of the frame that spans the whole page, so with `top: 0` it stays at the top of the window throughout, as the end-to-end test at 1 500 and 2 000 px shows; it also keeps its place in the flow, so the page needs no padding to start under it. Visibly it is "fixed to the top of the screen"; accepted. The expected text «выполнено сделано 3 из 3» in `e2e/study-frame.spec.ts`: the old «✓» was `aria-hidden`, the new hidden word is what PROD-012 asks a screen reader to hear; accepted. `SCROLL_THRESHOLD` and `TOP_ZONE` exported for `bar.test.ts`: the tests state the rule in terms of the constants instead of copying numbers; accepted.
- Checked and found right: Study is keyed by the path in `App.vue`, and `done` is filled in the same tick as `pack` and `unit` in `unit.ts`, so opening an already finished unit shows the mark drawn, not drawing; reduced motion removes both the slide and the drawing; Tab into a hidden bar shows it; the list of units holds it in view and resets the hold on unmount.
- In the bar the unit's label «Раздел N» stays in the text colour and only the mark is green; the list of units and the cards colour the count. Consistent enough with "marked in green with a check mark".
- The CI check `evidence` fails on this head, waiting for this review.

## Round 2

Reviewed: 2d97a254912d
Verdict: approved

- F1: declined — the owner confirmed the size small on 2026-11-24 (one requirement, no schema or storage change; the excess is tests and CSS).
- F2: fixed
- F3: fixed

### Notes

- Fresh agent for round 2; the round-1 agent was not resumed.
- On F2, `src/ui/components/BookCards.test.ts` renders one book with all units done and one partly done, and checks the `finished` class and «выполнено» in the heading of the first only, and nothing marked when nothing is done. It clears the shared `doneExercises` after each test, so it does not depend on order.
- On F3, `scroll-padding-top: 6rem` on the root below 1024 px in `src/ui/styles/base.css`, larger than the two-row bar of Study. The new end-to-end test in `e2e/phone-bar.spec.ts` scrolls a field of Study to the top edge from below with the bar away, waits for the bar to return, then checks the field sits below its bottom edge; `scrollIntoView` honours `scroll-padding-top` as focus scrolling does.
- 7c8ca4a only widens a line of `docs/tech-debt.md` (the offline reload, H-05, pre-existing on main) by the owner's decision; no code.
- The CI check `evidence` waits for this round.
