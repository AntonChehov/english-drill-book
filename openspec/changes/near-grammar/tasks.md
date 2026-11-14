# Tasks

Tasks marked **(owner)** need the owner and cannot be done by an agent.

## 1. The checker

- [x] 1.1 Narrow `near` in `checkAnswer` as in design D1–D3; verify with unit tests named `@req CHK-006` for every scenario of the delta spec, the examples of the proposal, and the existing near cases that stay near — `src/domain/checking/check.test.ts` passes, 149 tests of the checker; the delta scenarios, the examples of the proposal, an answer reading `'s` or `'d` as two words and an edit where two words meet are covered; the near cases kept: *beatiful*, *beautifull*, *cuts*, *knaw*, *then*, *boys room*
- [x] 1.2 Run the speed tests; verify CHK-014 holds — `pnpm test:speed` passes, 13 tests; the near case with `'s` and `'d` now ends in a long word (*travek*), median 0.04 ms

## 2. Study and the product description

- [x] 2.1 Update the hint of Study and the end-to-end tests that type an almost-right answer; verify the Study tests pass on Chromium and Firefox — the hint says a wrong short word or ending is «Неверно»; the almost-right answer of the Study tests is *lote* for *late*; 154 end-to-end tests pass on Chromium and Firefox
- [x] 2.2 Update CHK-006 in `docs/product/03-answer-checking.md` and record the technical debt in `docs/roadmap.md` — CHK-006 in `docs/product/03-answer-checking.md` says why; the technical debt is under Later, unscheduled in `docs/roadmap.md`

## 3. Review and evidence

- [ ] 3.1 Run `pnpm verify`; verify it passes, WebKit by the pipeline
- [ ] 3.2 Open the pull request as the bot with the sections of C-18 item 1
- [ ] 3.3 A reviewing agent with a fresh context writes round 1 in `review.md`; the same agent, resumed, writes each later round until one approves; verify the `evidence` check is green
- [ ] 3.4 **(owner)** Read the pull request and merge
