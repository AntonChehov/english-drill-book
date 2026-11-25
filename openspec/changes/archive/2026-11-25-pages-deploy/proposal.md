# Proposal

## Why

The deploy to GitHub Pages failed on 4 of the last 5 pushes to `main`, the release commit 0.2.0 among them, so the demo shows an older build. The failing step is `actions/deploy-pages`: "No artifacts named github-pages-N were found" a second after the artifact was uploaded in the same job. The wait added in `pages-panel-tools` polls the REST API, which already lists the artifact; `deploy-pages` asks the artifact service, which lists it later. Earlier failures, "Multiple artifacts named github-pages", came from reruns reusing one name.

## What Changes

Size: small (one workflow, no behaviour of the app).

- **Build and deploy in two jobs**, as GitHub documents for Pages: `pages-build` builds and uploads the artifact; `deploy` (`needs: pages-build`) only deploys. An artifact of a finished job is listed by the artifact service when the next job starts. The REST wait is removed.
- **One artifact name per build**: `github-pages-<run attempt of the build>`, passed to `deploy` as an output of `pages-build`, so a rerun of the failed `deploy` alone finds the artifact of its build, and a rerun of the whole run uploads a new one.
- **A retry**: when the first `deploy-pages` fails, the job waits 30 s and deploys once more; only the second failure fails the job.
- **Concurrency stays**: `main` runs one at a time and are never cancelled.
- **After the merge** the push of this change deploys `main`, which contains 0.2.0; that the demo serves this commit is checked through the Pages API and reported to the owner (after the archive commit, so not a task).

## Requirements

None from `docs/product/`; pipeline only (C-16 names the demo on Pages).

Left for later: nothing known.

## Capabilities

None.
