# Proposal

## Why

`pnpm audit` fails on GHSA-fc5q-39xc-vjpf, a high advisory in picomatch. picomatch is a dev-only transitive dependency (vite, vue-tsc, openspec); it is not in the shipped app. The patched version 4.0.8 is not on npm yet (latest 4.0.7), so the pipeline cannot be made green by an upgrade.

The pipeline also runs close to the 3-minute budget of C-19. The evidence job spent about 15-20 s on a full checkout, setup, token and downloads before it measured the time, so runner variance alone could push a run over.

## What Changes

- **The advisory is ignored for now.** `pnpm-workspace.yaml` gets `auditConfig.ignoreGhsas` with GHSA-fc5q-39xc-vjpf and a comment saying why and when to remove it.
- **The duration is measured earlier.** In the evidence job of `pull-request.yml` the Duration step runs right after the step that requires every check to pass, behind a sparse checkout of `scripts/` only. The meaning is unchanged (run start to the evidence job); about 15-20 s of fixed setup no longer counts.
- **Tech debt is recorded.** `docs/roadmap.md` says to remove the ignore once picomatch >= 4.0.8 is published.

Approved by the owner on 2026-11-18. Review rule: every finding carries `Severity: critical` or `Severity: minor`; from round 3 on only critical findings must be fixed before approval.

Requirements delivered: none. This change has no `design.md`: it touches configuration, workflow and documentation only.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None.

## Impact

- Changed: `pnpm-workspace.yaml`, `docs/roadmap.md`, `.github/workflows/pull-request.yml`. No code, schema, test or living spec.
- Every other advisory still fails `pnpm audit`.
