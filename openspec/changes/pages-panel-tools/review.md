# Review of pages-panel-tools

## Round 1

Reviewed: 50432e83ec35
Verdict: changes requested

### F1 The separator reports a share the row does not have
Severity: minor

Where: `src/ui/study/SplitSeparator.vue` (`aria-valuenow`), `src/ui/study/StudyView.vue` (`grid-template-columns` with `min(var(--pages), calc(100% - 22rem - 0.75rem))`), `src/ui/study/preferences.ts` (`setSplit`).

What: the 22rem floor of the exercises is applied only in CSS. On a row narrower than about 1 470 px the pages cannot reach 75 %, yet Arrow Right, End and a drag still raise the stored split and `aria-valuenow` up to 75. At 1024 px everything above about 60 % looks the same, and a screen reader hears «75» while the pages hold about 60 %. Arrow Left then seems to do nothing for a few presses, because it only lowers a value nobody can see.

Why: the design asks for the value to be clamped and the 22rem minimum to be kept, and the separator's value should say what is on screen. Clamp the value to the row's real maximum, measured from the row's width, before it is stored and announced (or cap `aria-valuemax` the same way), so that the keys and the announced value match the layout.

### F2 The wait for the artifact stops at the first failed API call
Severity: minor

Where: `.github/workflows/main.yml`, step «Wait until the artifact is listed».

What: the `run` shell of GitHub Actions is `bash -e`. If `gh api` fails once, for example with a 5xx or a rate limit, the assignment `found=$(gh api ...)` exits the step at once instead of trying again. The loop only covers the case it was written for, a listing that is late. A failed request gets no retry, though it is the same kind of passing problem.

Why: the step exists to make the deploy of `main` reliable. Use `found=$(gh api ... || echo 0)`, or test the command in the `if`, so that a failed call counts as "not listed yet".

### Notes

- Deviations of the implementer, judged:
  - The separator is sticky and as high as the window, not stretched to the content. Accepted: it stays reachable on a long unit, it keeps the 12 px hit area, and focus and the keys do not depend on its height.
  - `pageZoom` is written as a plain copy (`{ ...zooms.value }`). Accepted: IndexedDB cannot clone a Vue proxy, and the copy is the right fix.
  - The zoom level is `role="status"`, so the `announced` helper now matches `/^Упражнение \d/`. Accepted: the zoom is a real second live region, as D2 asks, and the helper has a single use, which still matches. `nothingToCheck` does not start with «Упражнение», so a future test of that message through `announced` would not find it; the helper's comment could say so.
  - The preferences are module-level refs, so the next unit opens with the last layout. Accepted: it avoids a flash of the defaults between units. Each Study still reads the store once, as D1 says. The pending writes are flushed when the scope is disposed, so nothing is lost when a unit changes.
- `contracts/export.schema.json` is additive: the three settings are optional, `additionalProperties: false` still holds, and the contract test shows that a file exported before still validates. Changing a file the owner controls is covered by the approved D1.
- `docs/product/08-interface-reference.md` is changed under task 5.1 of the approved change. The top bar's zoom wording now agrees with the panel.
- All six requirement IDs are named by tests: unit, contract and store tests, and `e2e/pages-tools.spec.ts`. No text from a textbook was found in the diff. The DOC-009 test picks a word from the demo PDF's own text layer.
- The zoom toolbar is `role="toolbar"`, but each button is its own tab stop and there are no arrow keys inside it. The buttons work fully by keyboard, so this is not a finding; arrow keys would follow the ARIA toolbar pattern more closely.
- When this round was written, CI on the PR showed build and unit as passing and the e2e, Lighthouse, screenshot and static jobs as pending. A red one among them would be a critical finding in the next round.
