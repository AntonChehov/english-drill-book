# Design

## Context

The repository holds documents only. This change creates the project and its pipeline. Constraints come from `docs/constitution.md`; the stack from `docs/decisions/0004-stack.md`. The demo is hosted on GitHub Pages, which serves static files and cannot rewrite URLs or set response headers.

## Goals / Non-Goals

**Goals:**

- Every gate of the constitution that can exist without features exists, runs with one command locally, and blocks a pull request in CI.
- The checks of a pull request finish within 3 minutes (C-19).
- A pull request cannot be merged without the evidence of C-18, and the evidence cannot be produced by hand.

**Non-Goals:**

- Offline use and the service worker (C-04), storage and migrations (C-05): introduced with the features that need them.
- Any real screen. The start screen is a placeholder with the app's name and one link.

## Decisions

### D1. Layout

```
src/domain/    pure TypeScript, no imports from vue, storage or ui
src/storage/   may import domain
src/ui/        may import domain and storage; components, router, styles
e2e/           Playwright tests
scripts/       CI scripts, plain Node (.mjs), no build step
```

Unit tests sit next to the code as `*.test.ts`. Why: the layers are the constitution's C-08; scripts stay dependency-free so the pipeline does not wait for a compile.

### D2. Hash routing

`vue-router` with hash history (`/#/…`). Why: GitHub Pages cannot rewrite unknown paths to `index.html`, so a reload of `/study/5` would return its 404 page. Alternative considered: copying `index.html` to `404.html` — works for people, but answers with HTTP status 404 and breaks once a service worker is added. Hash URLs satisfy PROD-008 on any static host.

### D3. Package manager and Node

`pnpm` through Corepack, Node 22 pinned in `.nvmrc` and `package.json#engines`. Why: fastest cold install, strict dependency resolution.

### D4. Static gates

| Gate | Tool | Constraint |
| --- | --- | --- |
| Types | `vue-tsc --noEmit`, `strict`, `noUncheckedIndexedAccess` | C-09 |
| Lint | `oxlint`, zero warnings | C-09 |
| Layers | `oxlint` `no-restricted-imports` with per-directory overrides | C-08 |
| Network use | `oxlint` `no-restricted-globals` for `fetch`, `XMLHttpRequest`, `WebSocket`, `navigator.sendBeacon` outside one loader module | C-03 |
| Format | Prettier, check mode | C-09 |
| Commits | `commitlint` with the conventional preset, over the commits of the pull request | C-15 |
| Specs | `openspec validate --all --strict` | C-14 |
| Traceability | `scripts/traceability.mjs`: IDs in requirement titles under `openspec/` against `@req` in tests | C-11 |
| Advisories | `pnpm audit --audit-level=high` | C-12 |

If oxlint cannot express the layer or network rule, `dependency-cruiser` is added for that rule alone (decision 0004). The first task of the lint group settles this with a failing example for each rule.

Prettier over the oxc formatter: Vue single-file components must be formatted, and Prettier's support for them is settled.

### D5. Tests

- **Unit:** Vitest, V8 coverage, thresholds of 95 % lines and branches on `src/domain/**` (C-10).
- **End-to-end:** Playwright against `vite preview` serving the production build. Projects: `chromium` (everything), `firefox` and `webkit` (tests tagged `@demo`) (C-13).
- **Accessibility:** `@axe-core/playwright` on every route, both themes; serious and critical violations fail (C-07).
- **Third-party requests:** a fixture attached to every end-to-end test fails it on any request to another origin (C-02). A `Content-Security-Policy` meta tag with `default-src 'self'` backs it up; a meta tag because Pages cannot set headers.

### D6. Budgets

`scripts/size.mjs` gzips the built entry chunk and CSS and compares them with C-06 (120 kB, 20 kB); it writes `metrics.json`. Lighthouse CI runs against the preview with the mobile profile and asserts performance ≥ 90 and accessibility ≥ 95.

### D7. Pipeline

One workflow for pull requests, jobs in parallel:

```
static ──┐
unit ────┤
build ───┼─ e2e (chromium | firefox | webkit) ─┐
         ├─ lighthouse ─────────────────────────┼─ evidence
         └─ screenshots ────────────────────────┘
```

- `concurrency` with `cancel-in-progress` per pull request; the pnpm store cached by the lockfile hash (C-19).
- Browser jobs run in the official Playwright container image, so no browser is downloaded per run. This is what makes the 3-minute budget reachable.
- Test results are written as JUnit and summarised in the job summary.
- Each run reports its wall-clock duration; a run over 3 minutes fails the `evidence` job once the pipeline is stable (a warning until the first three pull requests have run).

### D8. Screenshots as proof

A Playwright spec visits every route in both themes at 1280 px and 390 px and saves a PNG per view. CI pushes them to an orphan branch `evidence` under `pr-<number>/<sha>/` and, for `main`, under `main/`. The `evidence` job compares the pull request's set with `main/` pixel by pixel and writes one sticky comment: changed views side by side (before, after), unchanged views collapsed.

Why a branch: GitHub offers no API to attach images to a comment, and artifacts cannot be shown inline. The repository is public, so raw URLs of the branch render in comments. Directories of closed pull requests are removed by a scheduled job.

Why CI and not the author: a pasted image proves nothing; an image made from the commit under review proves that it builds and renders.

### D9. Evidence check

`scripts/pr-evidence.mjs` runs last and fails the pull request unless, for the head commit:

1. the description has the sections `Problem`, `Solution`, `Requirements`, `Self-review`, and a line `Change: <name>` naming a directory under `openspec/changes/`;
2. every ID under `Requirements` appears in that change's delta specs and in a test (`@req`);
3. `openspec/changes/<name>/review.md` exists and parses (format below), has no finding without an outcome and no declined finding without a reason;
4. every commit after the reviewed commit is either named as the fix of a finding or touches only the change's directory;
5. the screenshot comment for this commit exists, and if files under `src/ui` changed, either some view differs from `main` or the description says `Visual changes: none`;
6. `metrics.json` exists for this commit; the comment shows tests, coverage, sizes and Lighthouse scores with their difference from `main`.

The script has its own unit tests over fixture descriptions and review records, because a broken gate is worse than none.

Review record format:

```markdown
# Review

Reviewed commit: <sha>

## Findings

### F1 <title>
- Where: <file>:<line>
- Outcome: fixed in <sha> | declined
- Reason: <required when declined>

## Requirement coverage

| ID | Implemented in | Test |
| --- | --- | --- |

## Outside the listed requirements

<list, or "none">
```

A review with no findings has `## Findings` followed by `none`.

### D10. Deploy and releases

On push to `main`: build with the Pages base path, upload, deploy (`actions/deploy-pages`). `release-please` maintains a release pull request with the version and changelog from Conventional Commits (C-16).

### D11. Bot identity

A GitHub App installed on this repository only, with permissions: contents (write), pull requests (write), commit statuses (write). `scripts/bot-token.mjs` signs a JWT with Node's `crypto` from the App ID and a private key whose path comes from the environment, and exchanges it for a one-hour installation token. The key is kept outside the repository. In workflows the same token comes from `actions/create-github-app-token`.

Branch protection on `main`: pull request required, the `evidence` check required, conversations resolved, approval by the owner, no direct pushes. It is switched on after this change is merged, because the required check does not exist before.

### D12. Runtime dependencies

| Package | Replaces | Size (gzip) |
| --- | --- | --- |
| `vue` | hand-written DOM updates across six screens | about 35 kB |
| `vue-router` | hand-written hash routing and guards | about 10 kB |

Sizes are measured by `scripts/size.mjs` once the project builds and corrected here if they differ.

## Risks / Trade-offs

- [oxlint cannot express the layer or network rule] → settled by the first lint task; `dependency-cruiser` for that rule only.
- [The 3-minute budget is missed] → the budget is a warning for the first three pull requests; if still missed, split end-to-end tests into shards before relaxing C-19.
- [Screenshots differ between runs without a real change] → one container image for all browser jobs, system font stack, animations disabled in the spec; a comparison threshold of 0.1 % of pixels.
- [The `evidence` branch grows] → scheduled pruning of closed pull requests' directories.
- [This change cannot pass a gate it introduces] → it is the one change merged before branch protection exists; its own evidence is still produced and checked by its own pipeline run.
- [The owner-only steps block the agent] → they are grouped first in `tasks.md`; everything else can be built and run locally before them.
