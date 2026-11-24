# Constitution

These constraints apply to every change. Each names its measurement; a constraint that cannot be measured does not belong here. A pull request that breaks one is not merged.

## Content and privacy

- **C-01 No book text.** Nothing under version control reproduces text from a published textbook, in whole or in part: not in content, tests, fixtures, comments or screenshots. Book profiles and programs hold numbers, structure rules and code. The demo books and the synthetic test PDFs are written for this project.
  *Measured by:* PDF files are ignored by git except in the demo and fixtures directories; human review of content changes.
- **C-02 No third-party requests.** The running app requests only its own origin. No analytics, fonts, scripts or images from elsewhere.
  *Measured by:* an end-to-end test that fails on any request to another origin; a Content-Security-Policy with `default-src 'self'`.
- **C-03 Learner data stays on the device.** No learner answer, pack or book leaves the browser, except a data export the learner sends themselves (`DATA-013`). A book or its audio is never copied into browser storage.
  *Measured by:* C-02, plus no `fetch`/`XMLHttpRequest`/`sendBeacon`/WebSocket use outside the module that loads the app's own static files (lint rule); an end-to-end test in which adding a book grows the site's storage by less than 5 MB.

## Reliability

- **C-04 Offline.** After one online load, every milestone-delivered feature works with the network disabled, for books added from the learner's files. The demo books are the exception.
  *Measured by:* an end-to-end test that loads once, goes offline, reloads and completes an exercise.
- **C-05 No data loss.** Storage migrations are covered by tests that open a fixture of every earlier schema version. Export then import into an empty profile reproduces the derived state.
  *Measured by:* migration tests; the round-trip test (`DATA-009`).

## Performance

- **C-06 Budgets.** Initial JavaScript ≤ 120 kB gzip, initial CSS ≤ 20 kB gzip (the PDF library is excluded and loads after the first screen). Lighthouse on the production build, mobile profile: performance ≥ 90. Checking one item < 5 ms.
  *Measured by:* a bundle-size check and Lighthouse CI on every pull request; a benchmark test for the checker.

## Accessibility

- **C-07 WCAG 2.1 AA.** No serious or critical axe violations on any screen, in both themes. All functions work by keyboard with a visible focus indicator. Lighthouse accessibility ≥ 95.
  *Measured by:* axe in end-to-end tests on each screen; a keyboard-only end-to-end test of the main flow.

## Code

- **C-08 Layering.** `src/domain` is pure TypeScript: no Vue, no DOM, no storage, no clock (time is passed in). `src/storage` depends on `domain`. `src/ui` depends on both. Nothing depends on `ui`.
  *Measured by:* restricted-import lint rules per directory.
- **C-09 Static checks.** TypeScript `strict` with `noUncheckedIndexedAccess`; no `any` and no `@ts-ignore` without a comment naming the reason; the linter (oxlint) with zero warnings; one automatic formatter.
  *Measured by:* CI.
- **C-10 Tests.** Line and branch coverage of `src/domain` ≥ 95 %. Every exported domain function has unit tests. Tests do not depend on the network, on the real clock or on test order.
  *Measured by:* coverage thresholds in CI.
- **C-11 Traceability.** Every requirement in `openspec/specs` carries its ID in its title (`### Requirement: CHK-005 …`) and is named by at least one test (`@req CHK-005` in the test title or tags).
  *Measured by:* a script in CI comparing IDs in `openspec/specs` and in the change under review with IDs in tests.
- **C-12 Dependencies.** A new runtime dependency needs a decision record stating what it replaces and its size. No dependency with a known high-severity advisory.
  *Measured by:* review; `npm audit --audit-level=high` in CI.
- **C-13 Supported browsers.** Everything: the two latest versions of Chrome and Edge on desktop. The demo books only: also Firefox and Safari, and phones.
  *Measured by:* the full end-to-end suite on Chromium; the demo flow on Firefox and WebKit.

## Process

- **C-14 Specification first.** Work is done as OpenSpec changes. A change has a proposal, a design where one is warranted (a change whose work is only texts or only documentation may omit it; one that touches code, schema or tests has it), tasks, and delta specs for any change in behaviour, and the owner approves these before implementation starts. A small change (about 400 changed lines or fewer, at most 3 requirements, no schema or storage format) has a proposal and tasks only, no design and no delta specs: the requirement's wording is in `docs/product/` and the tests that name its ID carry it (`docs/process.md`, sizes of change). A pull request implements exactly one change. Only the release pull request that release-please opens implements none and names none; the evidence check recognises it by the conditions stated in C-18.
  *Measured by:* `openspec validate --strict` in CI; the evidence check (C-18) requires every other pull request to name its change.
- **C-15 History.** Conventional Commits. `main` is protected: changes arrive by pull request, with every required check green, every review thread resolved, and the approval of the repository owner. One pull request delivers one slice of requirements.
  *Measured by:* commit lint in CI; branch protection.
- **C-16 Releases.** Every merge to `main` deploys the demo. Versions and the changelog are generated from commit history.
  *Measured by:* the deploy workflow.
- **C-18 Pull request evidence.** A pull request cannot be merged until it shows, for its latest commit:
  1. *What changed* — a description with the sections Problem, Solution, Requirements (the IDs delivered) and Self-review (the checks actually run). It names the OpenSpec change it implements; every listed ID is defined in `docs/product/` and is named by a test.
  2. *That it was reviewed* — a review record committed as `review.md` in the change's directory, kept in rounds as a review in a team is. In each round a reviewing agent, not the author, runs the review skill on the whole diff and records the hash of the content it read, its findings and a verdict: **changes requested** or **approved**. A later round states for every open finding whether it is fixed. A finding is closed only as **fixed**, confirmed by a later round, or **declined**, with the reason; declined findings are shown to the owner at approval. Every finding carries a severity, critical or minor (`docs/process.md` step 5). In rounds 1 and 2 every finding is fixed or declined with a reason; from round 3 on an open minor finding is closed as declined, as technical debt recorded in `docs/tech-debt.md`, new minor observations go in the round's notes and not as findings, and critical findings are fixed in any round. The pull request passes when the last round is approved, no finding is open, and the hash of that round equals the hash of the latest commit's content: any change to the reviewed files makes the approval stale.
  3. *That it builds and runs* — screenshots of every screen, taken by CI from the production build of that commit, in both themes, attached to the pull request. When files under `src/ui` change, the screenshots that differ from `main` are shown side by side with the previous ones, or the description states that there is no visual change.
  4. *The numbers* — test results, coverage of `src/domain`, bundle sizes and Lighthouse scores, each with its change against `main`.
  5. *That it ends with its archive* — the last commit of the branch archives the change (`openspec archive`, `docs/process.md` step 6): it only moves the change's files to a new `openspec/changes/archive/<date>-<name>/`, each unchanged except `tasks.md`, which has every task ticked, with a `review.md`; it adds or changes living specs only of the capabilities whose delta specs it archives, deleting none; it may update `docs/roadmap.md`; it changes nothing else, and no change is left in flight. The hash of item 2 is then taken at the parent of that commit, where the change is still in flight, so the archive commit does not make the approval stale.
  A new commit invalidates items 3 and 4 until they are produced again, and item 2 when it changes the reviewed content.
  Items 3 and 4 do not apply to a pull request that changes only files that no build or test reads (`docs/`, `openspec/`, `.claude/`, the Markdown files at the root and `LICENSE`), because its build and numbers are those of `main`; the evidence check decides this from the pull request's own files, and the build, the tests, Lighthouse and the screenshots are skipped for it (C-19). The *release pull request* implements no change (C-14) and is exempt from items 1 – 5; the other checks of the pipeline still run on it and must pass. It is opened by the bot from a `release-please--` branch and changes only `CHANGELOG.md`, `package.json` and `.release-please-manifest.json`; a pull request that misses any condition is judged by items 1 – 5.
  *Measured by:* a required `pr-evidence` check in CI that reads the pull request and fails when any item is missing or belongs to an older commit.
- **C-19 Pipeline hygiene.** A newer commit cancels the running pipeline of the older one. Dependencies are cached by the lockfile's hash. Test results are published in a machine-readable format and summarised on the pull request. The checks of a pull request finish within 3 minutes, and the fast ones (types, lint, unit tests) within 1 minute.
  *Measured by:* the workflow configuration; pipeline duration reported on each run.
- **C-17 Holdout isolation.** Agents that write implementation code are not given the holdout scenarios, and validation agents are not given the source code.
  *Measured by:* the roles in `docs/process.md`; the holdout scenarios live in a separate repository.
