# Proposal

## Why

Slice 0 of M2 (the base). Comments in the code cite design documents of archived changes ("design D7") and requirement IDs, which a reader of the code cannot follow; `CLAUDE.md` now forbids both. The roles in `README.md` and `docs/how-it-works.md` do not say that the owner writes the core of each slice. The speed test of CHK-014 fails locally when the machine is busy.

## What Changes

Small, no behaviour change.

- Comments in `src/`, `e2e/` and `scripts/` cite no design document, decision or section; a comment that carried a reason through such a reference states the reason in words or is removed when the code says it. Comments outside tests name no requirement ID; test names keep `@req`.
- Roles in `README.md` and `docs/how-it-works.md`: the owner is responsible for the specification, the architecture and the core of each slice, the process and acceptance; agents do the rest of the implementation, the review and the validation.
- CHK-014: the speed tests run alone, not in parallel with other test files, after a warm-up; the limit of 5 ms stays.

## Requirements

None changed. CHK-014 keeps its limit; only how its test runs changes.
