# Tasks

Tasks marked **(owner)** need the owner's GitHub account and cannot be done by an agent.

## 1. Repository and identity

- [x] 1.1 **(owner)** Confirm the project name and the licences; verify `LICENSE` exists with the chosen text
- [x] 1.2 **(owner)** Create the public repository and the private holdout repository; verify both are reachable with `gh repo view`
- [x] 1.3 **(owner)** Create the GitHub App with the permissions of design D11, install it on the public repository, store the private key outside the repository; verify the App appears under the repository's installed apps
- [x] 1.4 Write `scripts/bot-token.mjs` and verify it prints a token with which `gh api /installation/repositories` lists exactly this repository
- [x] 1.5 Commit the documents and the OpenSpec setup as the baseline of `main` and push; verify the repository shows them

## 2. Project scaffold

- [x] 2.1 Create the Vite + Vue 3 + TypeScript project with pnpm, Node pinned, and the directories of design D1; verify `pnpm build` succeeds
- [x] 2.2 Add the router in hash mode with the start screen and the not-found view, interface text in Russian, `lang="ru"`; verify with end-to-end tests named `@req PROD-001` and `@req PROD-008` covering every scenario of the delta spec
- [x] 2.3 Add light and dark styles that follow the system setting, as a base for the screenshot themes; verify both render in the end-to-end run
- [x] 2.4 Add the `Content-Security-Policy` meta tag; verify the built page loads with no console violation

## 3. Static gates

- [x] 3.1 Configure oxlint with zero warnings, the layer rule and the network rule; verify each rule with a deliberately failing file that is then removed, and record the outcome in design D4 if a second tool is needed
- [x] 3.2 Configure `vue-tsc` in strict mode and Prettier in check mode; verify `pnpm check` runs types, lint and format and fails on a seeded error of each kind
- [x] 3.3 Add commitlint over a commit range; verify it rejects a non-conventional message
- [x] 3.4 Write `scripts/traceability.mjs` with unit tests; verify it fails when a requirement ID in `openspec/` has no `@req` in tests
- [x] 3.5 Add `openspec validate --all --strict` and the dependency audit to `pnpm check`; verify both pass

## 4. Test gates

- [x] 4.1 Configure Vitest with coverage thresholds on `src/domain`; verify the thresholds fail on an uncovered seeded function that is then removed
- [x] 4.2 Configure Playwright against the preview of the production build with the three projects of design D5; verify `pnpm e2e` passes on all three
- [x] 4.3 Add the third-party request fixture; verify it fails a test that loads a seeded external image, then remove the seed
- [x] 4.4 Add the axe check on every route in both themes; verify it fails on a seeded contrast error, then remove the seed

## 5. Budgets

- [x] 5.1 Write `scripts/size.mjs` producing `metrics.json` with unit tests; verify it fails when the budget is set below the current size, and correct the sizes in design D12
- [x] 5.2 Configure Lighthouse CI with the assertions of design D6; verify the run passes locally against the preview

## 6. Pipeline

- [ ] 6.1 Write the pull request workflow with the jobs of design D7, caching, cancellation, the Playwright container and JUnit summaries; verify a run is green on a test pull request
- [ ] 6.2 Add the duration report; verify the job summary shows wall-clock time and that it is under 3 minutes, or record the measured time and the plan in design D7

## 7. Evidence

- [x] 7.1 Write the screenshot spec for every route, both themes, two widths; verify the PNG set is produced locally
- [ ] 7.2 Add the job that publishes screenshots to the `evidence` branch and writes the sticky comment with the comparison against `main`; verify the comment appears on the test pull request and updates on a new commit
- [x] 7.3 Write `scripts/pr-evidence.mjs` implementing the six checks of design D9, with unit tests over fixture descriptions and review records covering each way to fail; verify the unit tests pass
- [ ] 7.4 Add the `evidence` job; verify on the test pull request that it fails without `review.md`, fails with an open finding, and passes with a complete record
- [ ] 7.5 Add the scheduled pruning of closed pull requests' screenshot directories; verify by a manual run

## 8. Deploy and releases

- [ ] 8.1 Write the deploy workflow for GitHub Pages; verify the demo address serves the start screen and that reloading a deep link keeps the view
- [ ] 8.2 Add release-please; verify it opens a release pull request with a changelog after the first merge
- [x] 8.3 Update `README.md` with the demo address and the commands; verify each documented command runs as written

## 9. Review and evidence

- [ ] 9.1 Run the code-review skill on the whole diff, fix or decline each finding, and commit `review.md` in this change's directory in the format of design D9
- [ ] 9.2 Open the pull request as the bot with the description sections of design D9; verify the `evidence` check is green
- [ ] 9.3 **(owner)** After merge, switch on branch protection for `main` as in design D11; verify a direct push to `main` is rejected

## Workflow follow-up

- Run the holdout scenarios that apply to the shell and attach the validator's report to the pull request.
- Archive the change after merge.
