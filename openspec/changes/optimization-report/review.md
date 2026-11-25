# Review

## Round 1

Reviewed: 1c1d6665cc83
Verdict: changes requested

### F1 The critical finding of #37 is misstated

Severity: minor

Where: `docs/process/optimization-round-1.md`, section "Review still finds real defects". What: "the service worker outside C-03" reads as if the service worker broke C-03. The archived finding (F1 of `shell-offline-themes`) says the worker's own network use was legitimate; the defect was that `src/sw/` lay outside the lint rule that enforces C-03. Why: the page claims accuracy for its few facts; a reader following the link to C-03 would look for a data leak that never existed. Suggested: "the service worker's directory outside the lint rule that enforces C-03".

### F2 The new row of `docs/process.md` mis-describes `docs/process/`

Severity: minor

Where: `docs/process.md`, table "Where things live", row `docs/process/`. What: it calls the directory "reports on the process itself", but the directory also holds `validator-prompt.md`, which is a prompt, not a report. Why: the table is the map a reader trusts. Suggested: "the validator's prompt and reports on the process itself, such as ...".

### Notes

Fresh agent for round 1. All relative links resolve (archived `workflow-retro`, `phone-bar`, `shell-offline-themes`, `pages-panel-tools`, `docs/process.md`, `docs/tech-debt.md`, `docs/constitution.md`). PR numbers #36, #37, #38 match the merge commits on `main`. The "What was changed" list matches items 1 to 8 of the archived `workflow-retro` proposal. The count of 9 findings, one critical, matches the three archived `review.md` files. No textbook text, no money, no subscription limits, no personal details. Measured numbers not checked, as agreed.
