# Review

## Round 1

Reviewed: e37926455267
Verdict: approved

### Notes

Reviewed the whole diff of `main...HEAD` (5 files) against the proposal, `docs/process.md` and the constitution.

Checked and found right:

- The ignore is scoped: `auditConfig.ignoreGhsas` in `pnpm-workspace.yaml` lists only GHSA-fc5q-39xc-vjpf, with a comment saying why and when to remove it; no severity level or package is ignored wholesale.
- `pnpm audit` exits 0 and reports "1 high (1 ignored)": no other advisory is hidden.
- `docs/roadmap.md` gains one technical-debt line naming the removal condition (picomatch >= 4.0.8).
- Nothing else changed: no code, lockfile, schema, test or living spec.

## Round 2

Reviewed: 80dc6c157aa8
Verdict: approved

### Notes

Round 1 lacked the closing sections, so the `evidence` check failed; this round adds them. Reviewed the new commit 747884d (Duration step moved earlier in the evidence job) and the updated proposal and tasks.

Checked and found right:

- The Duration step now runs right after the step that requires every check to pass, behind a sparse checkout of `scripts/` at the head commit with `persist-credentials: false`. The later full checkout (no `sparse-checkout`) turns the sparse state off, so the steps after it see the whole tree.
- `scripts/duration.mjs` imports only `common.mjs` and `github.mjs`, both on `node:` modules only, so the runner's Node runs it without `setup-node` or `pnpm install`. It needs `GITHUB_TOKEN`, `GITHUB_REPOSITORY` and `GITHUB_RUN_ID`, all given; the job keeps `actions: read`. The output `seconds` still feeds the Numbers step by the same `id`.
- C-19 keeps its meaning: the time from the start of the run to the evidence job, as the summary line says; only the job's own fixed setup is no longer counted.
- The proposal names the workflow in What Changes and Impact; `pnpm audit` still exits 0 with one ignored advisory.

## Requirement coverage

The change delivers no requirement of `docs/product/`: it changes configuration, the workflow and documentation only, so there is no implementation and no test to name.

## Outside the listed requirements

The whole change is outside listed requirements: `pnpm-workspace.yaml` (the ignored advisory), `.github/workflows/pull-request.yml` (the Duration step moved earlier), `docs/roadmap.md` (the tech-debt line), and the change's own `.openspec.yaml`, `proposal.md`, `tasks.md` and `review.md`. No code, schema, test or living spec.
