# Review

## Round 1

Reviewed: a1f350d2f6b9
Verdict: changes requested

### F1 Unneeded `contents: read` on `deploy`

Severity: minor

Where: `.github/workflows/main.yml`, job `deploy`, `permissions`.
What: the job no longer checks out the repository; its only steps are `actions/deploy-pages`, which needs `pages: write`, `id-token: write` and `actions: read` (to list the run's artifacts), not `contents`.
Why: the job sets its permissions explicitly to keep them least; `contents: read` is a leftover of the merged job. Drop it (or say in a comment why it stays).

### F2 The comment on the `pages-build` output does not read

Severity: minor

Where: `.github/workflows/main.yml`, job `pages-build`, the comment above `outputs`.
What: "Read by `deploy`, which a rerun of itself alone still finds the artifact of this build by." is hard to parse.
Why: it carries the one non-obvious reason of the design (the output is fixed at the build's attempt, so a rerun of `deploy` alone, with a higher `run_attempt`, still names the build's artifact). Suggested: "The name is fixed when this job runs: a rerun of `deploy` alone has a higher run attempt and still deploys this artifact."

### Notes

- Rerun of failed `deploy` alone: outputs of a job that is not rerun are kept, so `needs.pages-build.outputs.artifact` stays `github-pages-<build attempt>`; correct. That `deploy-pages` lists an artifact of an earlier attempt of the same run is not provable locally; worth confirming on the first such rerun.
- Retry: the first try has `continue-on-error`, the pause and the second try run only on its failure, the second has no `continue-on-error`, so both failing fails the job and either succeeding passes it. The environment url `second || first` is right in both cases.
- `pages: read` on `pages-build` is the least that `configure-pages` needs (it reads the Pages site through the API, without enablement); dropping `actions: read`, `pages: write` and `id-token: write` from the build is right.
- `needs: [checks, pages-build]`: `checks` is already implied by `pages-build`; harmless and as tasks 1.1 asks.
- The artifact name expression appears twice in `pages-build` (output and upload `name`); acceptable for a one-line value.
- The REST wait is gone completely; no dead code left. `concurrency` unchanged, as the proposal says.

## Round 2

Reviewed: 4e9266015a1b
Verdict: approved

- F1: fixed
- F2: fixed

### Notes

- Fresh agent for this round; round 1 was written by another agent.
- F1: `deploy` now has `actions: read`, `pages: write`, `id-token: write` only.
- F2: the comment above `outputs` now reads as suggested.
- Whole diff read again: split into `pages-build` and `deploy`, artifact name as job output, REST wait removed, retry with `continue-on-error` on the first try and none on the second, environment url `second || first` (a skipped step gives an empty output, so the first's url is used). No new findings.
- Still to confirm in practice: that `deploy-pages` on a rerun of `deploy` alone finds the artifact of the earlier attempt of `pages-build`.
