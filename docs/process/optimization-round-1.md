# Optimization, round 1

The first round of process optimization is the change [`workflow-retro`](../../openspec/changes/archive/2026-11-24-workflow-retro/), archived on 2026-11-24. This page compares the period before it (2026-11-09 to 2026-11-23, 16 changes) with the period after it (2026-11-23 to 2026-11-25: `workflow-retro` itself and three product changes). The process itself is described in [`docs/process.md`](../process.md); the numbers below are the only ones this page claims.

"The coordinating session" is the session that routes a change through the project's agents: implementer, reviewer, validator and mechanic.

## What was changed

From the [proposal](../../openspec/changes/archive/2026-11-24-workflow-retro/proposal.md) of `workflow-retro`:

- Archiving moved into the change's own pull request, as its last commit, checked by rule. No separate archive pull request.
- Pull requests that change no code run only the static checks and the evidence check.
- Validation starts together with review round 1 and reruns only the scenarios the fixes may touch.
- `review.md` became smaller and frozen: rounds, hash, verdict, outcomes, findings with severity, notes.
- A small change uses the schema `lite`: a proposal and tasks only. A requirement's wording lives in one place, `docs/product/`.
- Word limits for planning artifacts, no boilerplate task group, a shorter start context, technical debt kept in [`docs/tech-debt.md`](../tech-debt.md), and a moratorium on new process rules for three product changes.

## What it gave

The three product changes after the retrospective are [`phone-bar`](../../openspec/changes/archive/2026-11-24-phone-bar/) (#36), [`shell-offline-themes`](../../openspec/changes/archive/2026-11-25-shell-offline-themes/) (#37) and [`pages-panel-tools`](../../openspec/changes/archive/2026-11-25-pages-panel-tools/) (#38).

| Measure | Before | After |
| --- | --- | --- |
| Average context of the coordinating session | 210k tokens | 112k tokens (-47 %) |
| Maximum context of the coordinating session | 491k tokens | 167k tokens (-66 %) |
| Calls over 200k tokens | 30 % of calls | none |
| Relative token cost per call of the coordinating session | baseline | -68 % |
| Cache rebuilds of the coordinating session after pauses | 120 | 1 |
| Words of planning and review artifacts per added line of code | 4-7 | 1-2 |

Smaller context means each call carries less, and the session no longer grows to a size where it has to be rebuilt after a pause.

### Review still finds real defects

Lighter artifacts did not make review shallower. Of 9 findings on the three product changes, 5 were defects. One was critical: the service worker outside [C-03](../constitution.md). The review is where such a defect is caught, before the owner reads the pull request.

### Cheap mechanical work

Push, CI watch and archive run on the smallest model. Together they cost about 0.2 % of the total, so the steps that need no judgment add almost nothing.
