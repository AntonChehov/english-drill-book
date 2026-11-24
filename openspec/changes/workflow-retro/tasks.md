# Tasks

## 1. Archive commit (D1, D2)

- [x] 1.1 `archiveOf` and `reviewHash` at the parent, with tests
- [x] 1.2 Check 7 in `pr-evidence.mjs`, archive exemption removed, with tests
- [x] 1.3 Review line of an archived change in `evidence-comment.mjs`, with tests

## 2. Pull requests without code (D3, D4)

- [x] 2.1 `scripts/changes.mjs` with tests
- [x] 2.2 Job `changes` and output `code` in the workflows
- [x] 2.3 Checks 5 and 6 not applicable without code, with tests

## 3. `review.md` (D6)

- [x] 3.1 `review-record.mjs` reduced, `Severity:` checked, with tests
- [x] 3.2 Coverage comparison removed from `pr-evidence.mjs`
- [x] 3.3 No script reads older archived records; `pnpm test` green

## 4. Lighter specifications (D7, D8, D9)

- [x] 4.1 `openspec/schemas/lite/` with templates; `pnpm exec openspec schema validate lite` passes
- [x] 4.2 Check 2 reads IDs from `docs/product/`, not delta specs; tests for an ID defined there, missing there and named by no test
- [x] 4.3 `openspec/config.yaml`: `context` of three lines, word limits, no "Review and evidence" rule; `pnpm spec` green
- [x] 4.4 `docs/tech-debt.md` from "Later, unscheduled"; pointers in C-18, `docs/process.md`, `CLAUDE.md`

## 5. Process text (D5, D7–D9)

- [x] 5.1 Steps of `docs/process.md` and the validator prompt for reruns
- [x] 5.2 C-14 and C-18 for the archive commit and pull requests without code
- [x] 5.3 `docs/process.md`: sizes of change, `lite`, word limits as minor findings, moratorium; C-14 and C-18 item 1 for small changes
- [x] 5.4 `CLAUDE.md`: only rules every role needs, no reference to `.claude/`; drop the handoff line of `.gitignore`
- [x] 5.5 `docs/roadmap.md`: this change under Done
