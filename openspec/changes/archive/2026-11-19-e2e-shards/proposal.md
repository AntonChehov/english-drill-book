# Proposal

## Why

The pipeline budget of C-19 (3 minutes from the start of the run to the `evidence` job) is exceeded by runner variance: runs took 184 to 194 seconds. The critical path is the Firefox end-to-end job, about 2 minutes 28 seconds, since Chromium and Firefox each run in one job while WebKit already runs in three.

## What Changes

- **Chromium and Firefox end-to-end tests run in two shards each**, the same way WebKit runs in three: the matrix of the `e2e` job in `.github/workflows/checks.yml` gets `chromium-1-of-2`, `chromium-2-of-2`, `firefox-1-of-2` and `firefox-2-of-2` instead of `chromium` and `firefox`. Nothing else changes: the artifacts are still named `e2e-<label>`, and the evidence job already collects every `e2e-*` artifact.
- Effect: wall-clock time of a run about 40 seconds shorter; runner minutes about 1 to 1.5 minutes more per run.

Review rule: findings carry `Severity: critical` or `Severity: minor`; from round 3 on only critical findings block approval.

Requirements delivered: none. C-19 and C-13 are not changed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None.

## Impact

- Changed: `.github/workflows/checks.yml` only. No code, schema, test or living spec.
- The required check of `main` is `evidence`; it is unchanged. The names of the `e2e (...)` jobs change, so any branch protection rule that lists them by name needs updating.
