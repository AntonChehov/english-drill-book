# Tasks

Tasks marked **(owner)** need the owner and cannot be done by an agent.

## 1. The checker

- [x] 1.1 Narrow `near` in `checkAnswer` as in design D1–D3; verify with unit tests named `@req CHK-006` for every scenario of the delta spec, the examples of the proposal, and the existing near cases that stay near — `src/domain/checking/check.test.ts` passes, 149 tests of the checker; the delta scenarios, the examples of the proposal, an answer reading `'s` or `'d` as two words and an edit where two words meet are covered; the near cases kept: *beatiful*, *beautifull*, *cuts*, *knaw*, *then*, *boys room*
- [x] 1.2 Run the speed tests; verify CHK-014 holds — `pnpm test:speed` passes, 13 tests; the near case with `'s` and `'d` now ends in a long word (*travek*), median 0.04 ms

## 2. Study and the product description

- [x] 2.1 Update the hint of Study and the end-to-end tests that type an almost-right answer; verify the Study tests pass on Chromium and Firefox — the hint says a wrong short word or ending is «Неверно»; the almost-right answer of the Study tests is *lote* for *late*; 154 end-to-end tests pass on Chromium and Firefox
- [x] 2.2 Update CHK-006 in `docs/product/03-answer-checking.md` and record the technical debt in `docs/roadmap.md` — CHK-006 in `docs/product/03-answer-checking.md` says why; the technical debt is under Later, unscheduled in `docs/roadmap.md`

- [x] 2.3 Give WebKit more time where its speed alone failed the end-to-end tests on `main` and on the archive pull request of `study-screen` (the owner's technical debt): longer waits for the WebKit project in `playwright.config.ts`, and a longer test timeout for the walk through every link of Study; verify they pass on Chromium and Firefox and, in the pipeline, on WebKit — the WebKit halves pass in the pipeline of pull request #18

- [x] 2.4 Run the WebKit end-to-end tests in three parts instead of two, as the longer waits of 2.3 put the pipeline over C-19 (194 s); verify the pipeline of pull request #18 is within 180 s — the pipeline of pull request #18 took 153 s with WebKit in three parts

## 3. Review and evidence

- [x] 3.1 Run `pnpm verify`; verify it passes, WebKit by the pipeline — every gate passes in the pipeline of pull request #18 (WebKit there); locally `pnpm check`, 750 unit tests, 14 speed tests, 154 end-to-end tests on Chromium and Firefox
- [x] 3.2 Open the pull request as the bot with the sections of C-18 item 1 — pull request #18
- [x] 3.3 A reviewing agent with a fresh context writes round 1 in `review.md`; the same agent, resumed, writes each later round until one approves; verify the `evidence` check is green — three rounds in `review.md`, round 3 approves `9c70dc76a21e`
- [ ] 3.4 **(owner)** Read the pull request and merge
