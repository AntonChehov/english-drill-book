# Proposal

## Why

A retrospective of the first sixteen changes (2026-11-23) found that the process, not the product, took a large share of the work:

- 13 of 30 merged pull requests were archive pull requests, each with its own pipeline, approval and merge by the owner, for a commit that `openspec archive` writes.
- The release pull request and every documentation-only pull request ran the whole pipeline, seven end-to-end jobs included, for files no build or test reads. The release branch alone made about a quarter of all pull request runs.
- Validation ran after review, so its fixes reset the review hash: 7 of 42 review rounds only approved again content already approved.
- About half of the 80 review findings were about the pipeline's own tooling, many of them edge cases of the grammar of `review.md`. Its coverage table repeats what `pnpm trace` measures.
- Agents were briefed by hand each time. The same rules were lost again (dead exports in three changes in a row, a commit message that failed commitlint), the costliest model ran routine steps, and the coordinating session grew to hundreds of thousands of tokens by polling CI and waiting.

The owner approved six results of the retrospective; this change delivers exactly those.

## What Changes

1. **Archive in the same pull request.** The last commit of a change's branch, after the review approves and validation passes, is the archive commit: `openspec archive <name>`, every task ticked, `docs/roadmap.md` updated. There is no archive pull request and no step 8. The evidence check computes the review hash at the parent of the archive commit and checks the archive commit itself (design D1, D2). The exemption of the archive pull request is removed from C-14, C-18 and `scripts/pr-evidence.mjs`.
2. **No build for pull requests without code.** A cheap `changes` job lists the pull request's files. When every file is one no build or test reads (`docs/`, `openspec/`, `.claude/`, the Markdown files at the root, `LICENSE`), or the pull request is the release pull request, only `static` and `evidence` run; unit, build, end-to-end, Lighthouse and screenshots are skipped. The evidence check decides on its own from the same file list, so a skipped job can make it fail but never pass (design D3, D4). C-19 is unchanged.
3. **Validation alongside review.** Review round 1 and validation run in parallel on the build of the same commit. After fixes the validator reruns only the scenarios the fixes may touch, decided by the validator from a summary of the fixes in terms of behaviour, and all of them when unsure (design D5).
4. **A smaller `review.md`, frozen.** A round keeps `Reviewed: <hash>`, `Verdict:`, the outcome lines of open findings, its findings `### F<n> <title>` each with `Severity: critical` or `Severity: minor`, and `### Notes`. `## Requirement coverage` and `## Outside the listed requirements` are dropped. Any other line is free text. `scripts/review-record.mjs` reads only these lines (design D6). Archived records are not read again.
5. **Project agents** in `.claude/agents/`: `implementer` (Sonnet, high effort), `reviewer` (Opus, medium), `validator` (Sonnet, high), `mechanic` (Haiku, low: push, pull request, ticks, archive), each with the standing rules of design D7.
6. **A project skill for the coordinating session**, `.claude/skills/drive-change/`: one change per session with a handoff note and `/clear` before long waits, no code edits or CI polling of its own; the model of each role; a fresh reviewer when the last one paused over 5 minutes or holds over 100 thousand tokens; the owner asked only to approve the proposal, to read the texts and to merge (design D8).

Review rule: findings carry `Severity: critical` or `Severity: minor`; from round 3 on only critical findings block approval.

Requirements delivered: none. No requirement of `docs/product/` changes; the rules live in the process documents, the constitution and the pipeline's scripts.

Left for later: a dead-code tool such as knip (design D7); WebKit and the other technical debt of `docs/roadmap.md`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None.

## Impact

- Process text: `docs/process.md`, `docs/process/validator-prompt.md`, `docs/constitution.md` (C-14, C-18: the archive pull request goes, the archive commit and the no-code pull request come in), `CLAUDE.md`, `openspec/config.yaml` (the task group "Review and evidence" ends with the archive commit).
- Scripts: `scripts/pr-evidence.mjs`, `scripts/review-record.mjs`, `scripts/review-hash.mjs`, `scripts/evidence-comment.mjs`, a new `scripts/changes.mjs`, with their tests.
- Workflows: `.github/workflows/pull-request.yml` (the `changes` job), `.github/workflows/checks.yml` (an input `full`). `main.yml` always runs everything. The required check stays `evidence`.
- New: `.claude/agents/{implementer,reviewer,validator,mechanic}.md`, `.claude/skills/drive-change/SKILL.md`.
- No app code, schema, contract or living spec. Changes already archived, and their records, are not touched.
- This change follows its own rules: its pull request runs the workflows and scripts of its head commit, so it is the first one judged by the new check, and it ends with its own archive commit.
