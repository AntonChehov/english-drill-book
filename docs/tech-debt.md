# Technical debt

What is known and not scheduled: from the validations of changes, and from review rounds 3 and later, where an open minor finding is closed as `declined — technical debt, recorded in docs/tech-debt.md` after it is added here, one line per item (`docs/process.md` step 5). The first items were recorded at the owner's request on 2026-11-14, from the validation of `study-screen`.

- The speed of Study on WebKit. In the pipeline's WebKit (two pixels per CSS pixel) the first page of a unit is drawn in 1.5–2 s, against about 0.1 s on Chromium and Firefox, and the end-to-end check of that time is skipped there. WebKit is not a target of the app for now; C-13, which requires the end-to-end tests on WebKit, may need the same answer.
- A verdict counted by hand looks nearly the same as one the app gave: only the words «засчитано вручную» differ, not the colour or the sign.
- Small touch targets on a phone: the "⋯" menu of a row is 36 × 36 px and an option chip about 34 px high, under the usual 44–48 px.
- Tab stops on every row's "⋯" between the answer fields, so going through an exercise by keyboard takes twice the presses.
- Twice in about 50 tries, right after a new build was served, the worker of the PDF library did not load and adding the demo said there was no connection; not seen again in 40 tries. A failed load of the app's own script could be retried once, or named for what it is.
- The start screen reads the derived state of every exercise of both books again on each write in another tab; to be coalesced before real books.
- CI: `pnpm install` spends up to 70 s verifying the lockfile against supply-chain policies with the npm registry when it is slow, which pushed a run over C-19 (PR #22, run 44098893926); cache the verification or skip it when the lockfile is unchanged.
- Offline after a fresh start, Today shows the "demo not added" state instead of the stored books and progress (validation of PR #22).
- Checking a long exercise with Enter in its last field lets the verdicts push the focused field below the window (validation of PR #22).
- In a clean browser, a link to a demo unit that does not exist promises the unit will open after adding the demo, then says not found (validation of PR #22).
- At 360 px some touch targets are 34–38 px high (option pills, ⋯ ‹ › buttons, fields), below 44–48 px; tapping an option flashes the default tap highlight (validation of PR #22).
- Answers typed less than about 0.3 s before a reload or closing the tab are lost: the draft is not saved when the page unloads (validation of PR #26).
- Two swapped letters in a long word are judged wrong, not «Почти» (validation of PR #26).
- Remove `auditConfig.ignoreGhsas` (GHSA-fc5q-39xc-vjpf) from `pnpm-workspace.yaml` once picomatch >= 4.0.8 is published (change `audit-ignore-picomatch`): the high advisory is dev-only, through vite, vue-tsc and openspec.
- The demo read time of PACK-003 has a small margin to its 2 s limit; the check fails locally when two browsers run in parallel, and failed on CI end-to-end Firefox (shard 1 of 2, run 45456664912 on main).
- The speed test of the checker (CHK-014) took 100.36 ms against its 100 ms budget on a loaded CI runner; the budget has no margin for such a runner.
- The same unit open in two tabs: an unchecked draft from one tab can arrive about 0.5 s later and overwrite text just typed in the other; the newest edit should win.
- A failed demo download shows a technical code such as "(ошибка 503)" to the learner.
- After a reload with the network off, «Открыть раздел» on Today does nothing, with no message.
- Opening a unit by an exercise link scrolls the page so the top header is out of view.
