# Tasks

Tasks marked **(owner)** need the owner and cannot be done by an agent.

## 1. Pipeline

- [x] 1.1 **(owner)** Approve splitting Chromium and Firefox end-to-end tests into two shards each — approved 2026-11-19
- [x] 1.2 Split the `e2e` matrix of `.github/workflows/checks.yml`; verify `actionlint` and `pnpm format:check` pass and the evidence job lists all seven `e2e-*` artifacts

## 2. Review and evidence

- [x] 2.1 A reviewing agent with a fresh context writes round 1 in `review.md`; the same agent, resumed, writes each later round until one approves; verify the `evidence` check is green
- [x] 2.2 Open the pull request as the bot with the sections of C-18 item 1
- [x] 2.3 **(owner)** Read the pull request and merge
