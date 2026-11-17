# Proposal

## Why

Review rounds ran up to six per change: every finding, however small, was fixed and reviewed again. A change whose work is only texts or only documentation carried a `design.md` that said nothing its proposal did not.

## What Changes

- **Findings have a severity.** Every finding in `review.md` carries `Severity: critical` or `Severity: minor`, defined in `docs/process.md` step 4. Rounds 1 and 2 fix every finding; from round 3 on only critical findings must be fixed before approval, the reviewer lists minor ones under `### Notes` as technical debt and the implementer records them in `docs/roadmap.md`. A round 4 or later happens only because of critical findings. Approval stays required and the review check is unchanged.
- **`design.md` is optional for text-only and documentation-only changes.** A change that touches code, schema or tests has one. This change is documentation only, so it has none.

Decided by the owner on 2026-11-16 and committed in `77593cd`: `CLAUDE.md`, `docs/constitution.md` (C-14, C-18), `docs/process.md`, `openspec/config.yaml`.

Requirements delivered: none. No requirement of `docs/product/` changes; the rules live in the process documents, not in a living spec.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None.

## Impact

- Changed: only the four files above. No code, schema, test or living spec.
- Reviews of changes already merged are not redone.
