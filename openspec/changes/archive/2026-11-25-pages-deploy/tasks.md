# Tasks

## 1. The deploy

- [x] 1.1 Split the job `deploy` of `.github/workflows/main.yml` into `pages-build` (configure, build, upload `github-pages-${{ github.run_attempt }}`, the name as a job output) and `deploy` (`needs: [checks, pages-build]`, deploys that name); remove the REST wait; verify `actionlint` (or the static checks) passes on the workflow. Done: jobs `pages-build` and `deploy`; REST wait gone; actionlint not installed, YAML parses and prettier is clean
- [x] 1.2 Add the retry: the first `deploy-pages` with `continue-on-error`, a 30 s pause and a second `deploy-pages` only if the first failed; the environment URL taken from whichever succeeded; verify by reading the workflow that a failure of both fails the job and a success of either passes it. Done: first step `continue-on-error`, second runs `if` the first failed and has none, so its failure fails the job; the url is `second || first`

## 2. Gates

- [x] 2.1 Run `pnpm check`; verify it passes. Done: typecheck, lint, spec, trace, audit green; format:check fails only on git-excluded `.private/`, tracked files clean
