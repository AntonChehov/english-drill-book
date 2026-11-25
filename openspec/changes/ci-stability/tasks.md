# Tasks

## 1. Tests

- [ ] 1.1 `playwright.config.ts`: in the `webkit` project `timeout: 60_000`; `retries: ci ? 1 : 0` applied to WebKit only; verify the report marks a retried pass as flaky
- [ ] 1.2 `e2e/study-frame.spec.ts` (PROG-014, ~:162): wait for the unit's result before clicking «Сегодня»; verify it passes 10 times on WebKit
- [x] 1.3 `e2e/pages-tools.spec.ts` (DOC-003, ~:180): `toEqual` after the click becomes `expect.poll`; `e2e/study-layout.spec.ts` (PROD-006, ~:83, :90): the outline after Tab is a retrying assertion
- [ ] 1.4 `e2e/demo.spec.ts` (PACK-003, ~:53): the 2 000 ms budget is not asserted on WebKit, as in DOC-004 and DOC-001; verify with `pnpm e2e`
- [x] 1.5 `playwright.config.ts`: `PREVIEW_PORT` (default 4173, a non-number fails) and the README line; verify e2e on another port

## 2. Review hash

- [x] 2.1 `scripts/review-hash.mjs`: hash the change's `git diff` against the merge base (SHA-256, hunk-header numbers and `index` lines removed), with `review.md` and `tasks.md` excluded; update its header comment and the tests of the script; verify the hash survives a rebase onto a `main` with an unrelated commit and changes on a moved line, a whitespace edit or an edit of a line of the change
- [x] 2.2 `scripts/review-check.mjs`, `scripts/pr-evidence.mjs`: use it unchanged in interface; verify `pnpm review:check` and the evidence tests pass

## 3. Draft pull request

- [x] 3.1 `.github/workflows/pull-request.yml`: `evidence` gets `if: ${{ !cancelled() && !github.event.pull_request.draft }}`; verify that `ready_for_review` is in `types`
- [x] 3.2 C-18 (item 2 and the measure), `docs/process.md` steps 4 and 5: draft first, ready after the approving round; verify the texts agree
- [x] 3.3 Check whether branch protection counts the skipped `evidence` of a draft as passing; report to the owner

## 4. Debt and gates

- [x] 4.1 `docs/tech-debt.md`: the WebKit PDF draw as the cause of the timeouts; CHK-014 timing under local load
- [x] 4.2 Run `pnpm check`; verify it passes
