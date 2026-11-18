# Tasks

Tasks marked **(owner)** need the owner and cannot be done by an agent.

## 1. Ignore the advisory

- [x] 1.1 Add `auditConfig.ignoreGhsas` for GHSA-fc5q-39xc-vjpf to `pnpm-workspace.yaml` and the tech-debt line to `docs/roadmap.md`; verify `pnpm audit` passes
- [x] 1.2 **(owner)** Approve ignoring the advisory

## 2. Pipeline duration

- [x] 2.1 Move the Duration step of the evidence job after the check requirement, behind a sparse checkout of `scripts/`

## 3. Review and evidence

- [ ] 3.1 A reviewing agent with a fresh context writes round 1 in `review.md`; the same agent, resumed, writes each later round until one approves; verify the `evidence` check is green
- [ ] 3.2 Open the pull request as the bot with the sections of C-18 item 1
- [ ] 3.3 **(owner)** Read the pull request and merge
