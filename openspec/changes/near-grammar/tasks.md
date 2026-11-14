# Tasks

Tasks marked **(owner)** need the owner and cannot be done by an agent.

## 1. The checker

- [ ] 1.1 Narrow `near` in `checkAnswer` as in design D1–D3; verify with unit tests named `@req CHK-006` for every scenario of the delta spec, the examples of the proposal, and the existing near cases that stay near
- [ ] 1.2 Run the speed tests; verify CHK-014 holds

## 2. Study and the product description

- [ ] 2.1 Update the hint of Study and the end-to-end tests that type an almost-right answer; verify the Study tests pass on Chromium and Firefox
- [ ] 2.2 Update CHK-006 in `docs/product/03-answer-checking.md` and record the technical debt in `docs/roadmap.md`

## 3. Review and evidence

- [ ] 3.1 Run `pnpm verify`; verify it passes, WebKit by the pipeline
- [ ] 3.2 Open the pull request as the bot with the sections of C-18 item 1
- [ ] 3.3 A reviewing agent with a fresh context writes round 1 in `review.md`; the same agent, resumed, writes each later round until one approves; verify the `evidence` check is green
- [ ] 3.4 **(owner)** Read the pull request and merge
