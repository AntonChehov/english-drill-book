# Tasks

## 1. The deploy

- [ ] 1.1 Split the job `deploy` of `.github/workflows/main.yml` into `pages-build` (configure, build, upload `github-pages-${{ github.run_attempt }}`, the name as a job output) and `deploy` (`needs: [checks, pages-build]`, deploys that name); remove the REST wait; verify `actionlint` (or the static checks) passes on the workflow
- [ ] 1.2 Add the retry: the first `deploy-pages` with `continue-on-error`, a 30 s pause and a second `deploy-pages` only if the first failed; the environment URL taken from whichever succeeded; verify by reading the workflow that a failure of both fails the job and a success of either passes it

## 2. Gates

- [ ] 2.1 Run `pnpm check`; verify it passes
