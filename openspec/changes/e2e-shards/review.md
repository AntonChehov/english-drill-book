# Review

## Round 1

Reviewed: cd80ec0c4821
Verdict: approved

### Notes

- Scope: the whole diff `origin/main...HEAD` (commit fb00648, four files): `.github/workflows/checks.yml` and the change's own `.openspec.yaml`, `proposal.md` and `tasks.md`; `playwright.config.ts`, `scripts/metrics.mjs`, `scripts/pr-evidence.mjs` and `scripts/evidence-comment.mjs` read for the artifact names. Run here: `pnpm format:check` (passes), `pnpm review:hash e2e-shards`. `actionlint` is not installed here; CI runs it.
- Shard matrix: Chromium gets `1/2` and `2/2`, Firefox `1/2` and `2/2`, WebKit keeps `1/3` to `3/3`; each entry passes `--project` and `--shard` to one `playwright test` run. Playwright splits a project's tests into disjoint shards whose union is the whole project, and with `fullyParallel: true` it splits by test, so every test runs exactly once per browser, none lost or duplicated. Labels are unique, so the JUnit files and the `e2e-<label>` and `playwright-report-<label>` artifacts do not collide.
- Aggregation: `scripts/metrics.mjs` takes every directory starting with `e2e-`, so seven artifacts are collected instead of five; no script names `e2e-chromium` or `e2e-firefox` except fixtures in `scripts/metrics.test.mjs`, which stay valid. The header comment of the workflow already says `e2e-<browser or shard>`.
- The `screenshots` project and its job are not in the matrix and are unchanged. Nothing else in the workflow changed; the required check `evidence` keeps its name, and the proposal names the job-name change for branch protection.
- Proposal and tasks follow the archived changes (`skip_specs`, "Requirements delivered: none", the **(owner)** tasks). No constitution constraint is touched beyond C-19, which the change serves without changing; nothing from a published textbook is in the diff (C-01).

## Requirement coverage

The change delivers no requirement of `docs/product/`: it changes the CI workflow only, so there is no implementation and no test to name.

## Outside the listed requirements

The whole change is outside listed requirements: the `e2e` matrix and its comment in `.github/workflows/checks.yml`, and the change's own `.openspec.yaml`, `proposal.md` and `tasks.md`. No code, schema, test or living spec.
