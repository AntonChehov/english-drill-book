# Review

Reviewed commit: d293aa5

The code-review skill was run at effort `high` on the whole diff `main..d293aa5` (20 commits). F1 to F10 are its findings. F11 and F12 came from the implementing agent's own pass over the workflows and lint rules just before it, and are fixed in commits up to the reviewed one.

## Findings

### F1 Merge commits pass check 4 as touching only the review record
- Where: scripts/pr-evidence.mjs:306
- Outcome: fixed in 8a4022d

### F2 A "fixed in" commit is never checked against the pull request
- Where: scripts/pr-evidence.mjs:100
- Outcome: fixed in 8a4022d

### F3 Repeated headings overwrite earlier sections, hiding an open finding
- Where: scripts/pr-evidence.mjs:53
- Outcome: fixed in 8a4022d

### F4 globalThis and self bypass the C-03 and C-08 rules in src/domain
- Where: .oxlintrc.json:75
- Outcome: fixed in ee35db6

### F5 The evidence check reads the head commit live instead of the commit the run measured
- Where: scripts/pr-evidence.mjs:299
- Outcome: fixed in 8a4022d

### F6 Re-running failed jobs resets the measured duration
- Where: scripts/duration.mjs:37
- Outcome: declined
- Reason: GitHub keeps no wall-clock time for a run across attempts: `created_at` would count the idle time between attempts and fail every re-run, and the attempt start is all the API offers. A re-run is visible in the run's history, the duration in the evidence comment is labelled with its run, and the owner reads both before approving. Revisit if the budget is gamed in practice.

### F7 Editing the description re-runs the whole pipeline
- Where: .github/workflows/pull-request.yml:9
- Outcome: declined
- Reason: the evidence check must judge the latest description against screenshots and numbers made for the same commit. A light workflow would have to find and trust another run's artifacts, which is the kind of hand-carried evidence C-18 rules out. An edit costs one pipeline run of about three minutes, and its result is the same commit's evidence, so the cancelled run loses nothing.

### F8 The bot token is part of the git remote URL and is printed when git fails
- Where: scripts/evidence-branch.mjs:182
- Outcome: fixed in 85ec1e1

### F9 The artifact paths are copied between the pull request and main workflows
- Where: .github/workflows/main.yml:55
- Outcome: fixed in 84620a9

### F10 bot-token.mjs and traceability.mjs duplicate the GitHub client and the entry-point check
- Where: scripts/bot-token.mjs:41
- Outcome: fixed in b5fb156

### F11 commitlint always got a shallow clone in pull requests
- Where: .github/workflows/checks.yml:36
- Outcome: fixed in 0c20c42

### F12 new Date() reads the clock in src/domain without a lint error
- Where: .oxlintrc.json:60
- Outcome: fixed in d293aa5

## Requirement coverage

| ID | Implemented in | Test |
| --- | --- | --- |
| PROD-001 | src/ui/App.vue, src/ui/router.ts, src/ui/views/*.vue (`RouterLink` without `target`, one window) | e2e/app-shell.spec.ts "every link on … opens its destination in the same window" (Chromium, Firefox, WebKit) |
| PROD-008 | src/ui/router.ts (hash history, a route per view, catch-all to the not-found view), src/ui/views/NotFoundView.vue | e2e/app-shell.spec.ts "reloading … keeps the view", "the address of … opens it in a clean profile", "unknown address … shows the not-found view"; src/ui/router.test.ts |

## Outside the listed requirements

- The project scaffold and the layers of C-08: Vue 3, TypeScript, Vite, pnpm, Node 22; `src/domain/document-title.ts` for the tab titles; light and dark styles that follow the system setting; a Content-Security-Policy meta tag (C-02).
- The static gates: oxlint with the layer and network rules, vue-tsc, Prettier, commitlint, OpenSpec validation, `scripts/traceability.mjs`, the dependency audit with an override of `basic-ftp` (design D4).
- The test gates: Vitest with coverage thresholds on `src/domain`, Playwright against the production build on three browsers, the third-party request fixture, axe in both themes.
- The budgets: `scripts/size.mjs` and Lighthouse CI.
- The pipeline and evidence: `.github/workflows/` (checks, pull request, main, pruning), `.github/actions/setup`, and the scripts `junit`, `metrics`, `duration`, `screenshots`, `evidence-branch`, `evidence-comment`, `pr-evidence`, `github`, `common` and `bot-token`.
- Deploy to GitHub Pages and release-please (`release-please-config.json`, `.release-please-manifest.json`).
- README: the demo address and the commands.
