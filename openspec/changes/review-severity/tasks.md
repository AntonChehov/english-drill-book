# Tasks

Tasks marked **(owner)** need the owner and cannot be done by an agent.

## 1. Process text

- [x] 1.1 Grade findings by severity and let text-only and documentation-only changes omit `design.md` in `docs/process.md`, `docs/constitution.md`, `CLAUDE.md` and `openspec/config.yaml`; verify `pnpm format:check` and `pnpm spec` pass — commit `77593cd`

## 2. Review and evidence

- [x] 2.1 A reviewing agent with a fresh context writes round 1 in `review.md`; the same agent, resumed, writes each later round until one approves; verify the `evidence` check is green
- [x] 2.2 Open the pull request as the bot with the sections of C-18 item 1 — pull request #20
- [ ] 2.3 **(owner)** Read the pull request and merge
