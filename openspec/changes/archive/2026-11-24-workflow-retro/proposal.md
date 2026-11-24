# Proposal

## Why

The retrospective of 2026-11-23 found the process costlier than the product. 13 of 30 pull requests only archived a change. Documentation-only and release pull requests ran the whole pipeline. 7 of 42 review rounds only re-approved after validation fixes. About half of 80 findings were about the grammar of `review.md`. Specification texts cost 23 % of the work against 13 % for code, 4–7 words of artifacts per line of code, one requirement written four times.

## What Changes

1. **Archive in the same pull request**: its last commit is `openspec archive`, checked by rule; no archive pull request (D1, D2).
2. **No build for pull requests without code**: only `static` and `evidence` run (D3, D4).
3. **Validation alongside review round 1**; reruns only the scenarios the fixes may touch (D5).
4. **A smaller, frozen `review.md`**: rounds, hash, verdict, outcomes, findings with severity, notes; no coverage sections (D6).
5. **Two sizes of change**: a small change uses the schema `lite`, a proposal and tasks only (D7).
6. **A requirement in one place**: its wording lives only in `docs/product/`; a small change has no delta spec (D8).
7. **Word limits** for artifacts, **no boilerplate task group**, a **moratorium** on process changes for three product changes, a **shorter start context** (D9).
8. **Technical debt** moves from `docs/roadmap.md` to `docs/tech-debt.md` (D9).

Requirements delivered: none.

Left for later: a dead-code tool; a script that checks only the files named in tasks were touched (after the moratorium); the agents and the skill of the coordinating session, kept local by the owner's decision.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None.

## Impact

- Texts: `docs/process.md`, `docs/process/validator-prompt.md`, `docs/constitution.md` (C-14, C-18), `docs/roadmap.md`, new `docs/tech-debt.md`, `CLAUDE.md`, `openspec/config.yaml`.
- New schema: `openspec/schemas/lite/`.
- Scripts and tests: `pr-evidence.mjs`, `review-record.mjs`, `review-hash.mjs`, `evidence-comment.mjs`, new `changes.mjs`.
- Workflows: `checks.yml`, `pull-request.yml`. The required check stays `evidence`.
- No app code, contract or living spec. Archived changes are untouched. This change is the first judged by its own rules and ends with its own archive commit.
